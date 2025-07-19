import * as vscode from 'vscode';
import { setIsUninstalling } from '../shared';
import { getProjectWorkspaceFolder } from '../libs/ueHelpers';
import * as tr from '../tr/text';
import type { CfgSettings, KeysOfAllSettingExtensionNames, ProjectFiles, ValuesOfAllSettingNames } from '../libs/types';
import * as consts from '../libs/consts';
import {setTimeout} from "timers/promises";
import { doesUriExist, getUnrealClangdCompileCommandsUri } from '../libs/projHelpers';

import * as console from '../libs/console';


export async function uninstallExtensionProject() {
    setIsUninstalling(true);

    const projectWorkspaceFolder = getProjectWorkspaceFolder();
    if (!projectWorkspaceFolder) {
        console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
        return;
    }

    // First remove settings
    if (!await uninstallSettings(projectWorkspaceFolder)) {
        return;
    }

    // Now remove files
    const ueClangdProjectFiles = await getAllUrisToDelete(projectWorkspaceFolder);

    if (!ueClangdProjectFiles) {
        setIsUninstalling(false);
        return;
    }

    if (ueClangdProjectFiles.clangdCfgFiles.length === 0 && ueClangdProjectFiles.intellisenseFiles.length === 0 && ueClangdProjectFiles.compileCommandsDirFiles.length === 0) {
        console.log(tr.FOUND_NO_FILES_TO_UNINSTALL);
    }
    else {
        const detailString = getDeleteFilesWindowDetailString(projectWorkspaceFolder, ueClangdProjectFiles);

        const deleteFilesResult = await vscode.window.showInformationMessage(
            tr.THESE_WILL_BE_DELETED_PROCEED,
            {
                detail: detailString,
                modal: true
            },
            tr.BTTN_DEL, tr.BTTN_TO_TRASH, tr.BTTN_SKIP
        );


        if (deleteFilesResult && [tr.BTTN_DEL, tr.BTTN_TO_TRASH].includes(deleteFilesResult)) {
            const filesToDelete = [];

            for (const fileUris in ueClangdProjectFiles) {
                if (Object.prototype.hasOwnProperty.call(ueClangdProjectFiles, fileUris)) {
                    const element = ueClangdProjectFiles[fileUris as keyof ProjectFiles];
                    filesToDelete.push(...element);
                }
            }

            const isToTrash: boolean = deleteFilesResult === tr.BTTN_TO_TRASH;

            for (const uri of filesToDelete) {
                const trashLabel = isToTrash ? tr.TRASH : tr.DELETE;
                console.log(`${trashLabel}: ${uri.fsPath}`);
                await vscode.workspace.fs.delete(uri, { useTrash: isToTrash });
            }

        }
    }

    await setTimeout(consts.END_OF_UNINSTALL_DELAY); // Prevents uninstall var updating before file deletion lag (triggers gcd delete detect without)
    setIsUninstalling(false);

    console.log(tr.DONE_WITH_UE_CLANGD_PROJECT_UININSTALL);
}


async function uninstallSettings(projectWorkspaceFolder: vscode.WorkspaceFolder){
    for (const nameKey in consts.settingNames) {
        if (Object.prototype.hasOwnProperty.call(consts.settingNames, nameKey)) {
            const settings = consts.settingNames[nameKey as KeysOfAllSettingExtensionNames];
            
            // Check if we can skip
            let hasSettingsSet = false;
            const config = vscode.workspace.getConfiguration(settings.extensionSection, projectWorkspaceFolder);
            const names: CfgSettings<string, undefined> = settings.settings; 
            for (const key in names) {
                if (Object.prototype.hasOwnProperty.call(names, key)) {

                    const settingName = names[key];
                    
                    const settingInspection = config.inspect(settingName);
                    if(settingInspection?.globalValue !== undefined || settingInspection?.workspaceFolderValue !== undefined || settingInspection?.workspaceValue !== undefined){
                        hasSettingsSet = true;
                    }
                }
            }

            if(!hasSettingsSet){
                console.log(`${tr.left_NO_SETTING_FOR}${nameKey}${tr.right_NO_SETTING_FOR}`);
                continue;
            }

            const deleteSettingsResult = await askDeleteSettings(nameKey, names);
            if (deleteSettingsResult === tr.BTTN_ALL || deleteSettingsResult === tr.BTTN_PROJECT) {
                await processDeleteSettingsResult(projectWorkspaceFolder, settings, deleteSettingsResult === tr.BTTN_ALL);
            }
            else if(deleteSettingsResult === undefined){
                console.log(tr.USER_CANCELLED_RUN);
                return false;
            }
        }
    }

    return true;
}


async function getAllUrisToDelete(workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<ProjectFiles | undefined> {
    if(!workspaceFolder){
        console.log(tr.NO_WRK_SPACE_FOLDER_FOUND);
        return;
    }

    const clangdCfgFilesRelP = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_CLANGD_CFG_FILES);
    const projectFilesGCDRelP = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_GCD_AND_GCD_OLD_FILES);

    const ccDirFiles = await getDeletableFilesFromCompileCommandsDirectory(workspaceFolder);
    
    const clangdCfgFiles = await vscode.workspace.findFiles(clangdCfgFilesRelP);
    const intellisenseFiles = await vscode.workspace.findFiles(projectFilesGCDRelP);

    

    return {
        clangdCfgFiles: clangdCfgFiles,
        intellisenseFiles: intellisenseFiles,
        compileCommandsDirFiles: ccDirFiles
    };
}


function getDeleteFilesWindowDetailString(workspace: vscode.WorkspaceFolder, ueClangdProjectFiles: ProjectFiles) {
    let ccPath = "";

    if (ueClangdProjectFiles.compileCommandsDirFiles.length > 0) {
        const compileCommandsUri = getUnrealClangdCompileCommandsUri(workspace.uri, { withFileName: false });
        ccPath = `${ueClangdProjectFiles.compileCommandsDirFiles.length.toString()} ${compileCommandsUri.fsPath}\n${tr.SEE_LOGS}`;

        if (ueClangdProjectFiles.clangdCfgFiles.length > 0 || ueClangdProjectFiles.intellisenseFiles.length > 0) {
            ccPath += "\nand\n";
        }
    }

    let detailString = ccPath;

    for (const uri of ueClangdProjectFiles.clangdCfgFiles) {
        detailString += `${uri.fsPath}\n`;
    }

    if (ueClangdProjectFiles.intellisenseFiles.length > 0) {
        detailString += `\nAnd ${ueClangdProjectFiles.intellisenseFiles.length.toString()} intellisense files(see logs)`;
    }

    if(ueClangdProjectFiles.compileCommandsDirFiles.length > 0 || ueClangdProjectFiles.intellisenseFiles.length > 0){
        const filesToShow = ueClangdProjectFiles.intellisenseFiles.concat(ueClangdProjectFiles.compileCommandsDirFiles);
        console.outputChannel?.show(true);
        for (const file of filesToShow) {
            console.log(file.fsPath);
        }
    }
    
    return detailString;
}


async function askDeleteSettings(extensionName: string, settingNames: Record<string, string>) {
    let settingNamesString = "";
    for (const name in settingNames) {
        if (Object.prototype.hasOwnProperty.call(settingNames, name)) {
            settingNamesString += `${settingNames[name]}\n`;
        }
    }

    return await vscode.window.showInformationMessage(
        `${tr.left_SETTINGS_WILL_BE_DELETED_ext_name}${extensionName} ${tr.right_ext_name_SETTINGS_WILL_BE_DELETED}`,
        {
            detail: settingNamesString,
            modal: true
        },
        tr.BTTN_ALL, tr.BTTN_PROJECT, tr.BTTN_SKIP
    );
}



async function processDeleteSettingsResult(projectWorkspaceFolder: vscode.WorkspaceFolder, settings: ValuesOfAllSettingNames, isDeleteAll: boolean) {
    const config = vscode.workspace.getConfiguration(settings.extensionSection, projectWorkspaceFolder);

    const settingNames: CfgSettings<string, undefined> = settings.settings;
    for (const nameKey in settingNames) {
        if (Object.prototype.hasOwnProperty.call(settingNames, nameKey)) {
            
            try {
                await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.Workspace);
            } catch  { // We don't do anything
            }
            
            try {
                await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.WorkspaceFolder);
            } catch  {  // We don't do anything
            }
            

            if (isDeleteAll) {
                try {
                    await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.Global);
                } catch  { // We don't do anything
                }
                
            }
        }
    }
}


async function getDeletableFilesFromCompileCommandsDirectory(workspaceFolder: vscode.WorkspaceFolder) {
    const ccPathUri = getUnrealClangdCompileCommandsUri(workspaceFolder.uri, {withFileName: false});

    const doesCCDirExist = await doesUriExist(ccPathUri);
    if(!doesCCDirExist){
        return [];
    }
    
    const relPat = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_COMPILE_COMMANDS_DIR_FILES);

    return await vscode.workspace.findFiles(relPat);
}
