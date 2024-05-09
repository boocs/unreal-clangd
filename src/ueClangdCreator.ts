import * as vscode from 'vscode';

import { TextEncoder } from 'util';

import * as consts from './libs/consts';
import type { ProjectInfoVars, CreationCmdLineArgs, CreationCmdLineValue, ClangdExtensionFile, AllDefaultSettings, KeysOfAllDefaultSettings, ValuesOfAllDefaultSettings, CfgSettings, CfgSettingValue } from './libs/types';

import * as tr from './tr/text';

import * as console from './libs/console';


export class UeClangdCreator {

    constructor(
        readonly creationArgs: CreationCmdLineArgs,
        readonly projectInfo: ProjectInfoVars,
        readonly defaultSettings: AllDefaultSettings,
        readonly clangdExtensionFiles: ClangdExtensionFile[]) {
        return;
    }

    public async create() {

        await this.setProjectVSCodeSettings();
        await this.createClangdExtFiles();
    }
    
    protected get overwrite(): boolean {
        return this.creationArgs.get('overwrite') === consts.OVERWRITE_FULL;
    }

    protected async setVSCodeSettings(defaultSettings: ValuesOfAllDefaultSettings, workspaceFolder: vscode.ConfigurationScope) {

        const section = defaultSettings?.extensionSection;
        const settings = defaultSettings?.settings as CfgSettings<string, CfgSettingValue>;  // TODO: Do better?

        if(!section === undefined || !settings){
            console.error(`${tr.left_COULDNT_GET_SECTION_section_name} ${section} ${tr.right_COULDNT_GET_SECTION_setting_name} ${settings}`);
            return;
        }

        console.log(`${tr.left_ATTEMPING_TO_SET_section_name} ${section} ${tr.right_ATTEMPING_TO_SET}`);
        const config = vscode.workspace.getConfiguration(section, workspaceFolder);
        

        for (const settingKey in settings) {
            if (Object.prototype.hasOwnProperty.call(settings, settingKey)) {
                
                const sectionSetting = settings[settingKey];
                
                const configInspection = config.inspect(settingKey);

                if (!configInspection) {
                    console.error(`${tr.CONFIG_INSPECTION_WAS_UNDEFINED_FOR_SETTING_setting_name} ${settingKey}!`);
                    return;
                }

                let value;
                if (sectionSetting.configTarget === vscode.ConfigurationTarget.Workspace) {
                    value = configInspection.workspaceValue;
                }
                else if (sectionSetting.configTarget === vscode.ConfigurationTarget.WorkspaceFolder) {
                    value = configInspection.workspaceFolderValue;
                }
                else {
                    value = configInspection.globalValue;
                }

                if (value !== undefined) {
                    // Test if values are equal and don't set the setting if they are
                    if (typeof value === 'object') {
                        if (typeof sectionSetting.value !== 'object') {
                            console.error(`${tr.TRYING_TO_COMPARE_TWO_DIFF_TYPES} ${value} / ${sectionSetting.value}`);
                            continue;
                        }

                        if (JSON.stringify(value) === JSON.stringify(sectionSetting.value)) {
                            continue;
                        }
                    }
                    else {

                        if (typeof value !== typeof sectionSetting.value) {
                            console.error(`${tr.TRYING_TO_COMPARE_TWO_DIFF_TYPES} ${value} / ${sectionSetting.value}`);
                            continue;
                        }

                        if (value === sectionSetting.value) {
                            continue;
                        }
                    }
                }



                // If value has a value and overwrite is false don't set
                if (value !== undefined && this.overwrite === false) {
                    continue;
                }

                try {
                    await config.update(settingKey, sectionSetting.value, sectionSetting.configTarget);
                }
                catch (e) {
                    console.error(`${tr.COULDNT_UPDATE_SETTING} ${section}${sectionSetting}`);
                    if (e instanceof Error) {
                        console.error(`${e.message}`);
                    }
                    continue;
                }

            }
        }

        console.log(`${tr.END_SET_SETTINGS_section_name} ${section}\n`);
    }


    protected async setProjectVSCodeSettings() {
        const mainWorkspaceFolder = this.projectInfo.mainWorkspaceFolder;

        for (const section in this.defaultSettings) {
            await this.setVSCodeSettings(this.defaultSettings[section as KeysOfAllDefaultSettings], mainWorkspaceFolder);
        }
    }


    protected async createClangdExtFiles() {
        for (const file of this.clangdExtensionFiles) {
            for (const uri of file.uris) {
                const fileNameUri = vscode.Uri.joinPath(uri, file.fileName);
                await createFileWithLog(fileNameUri, file.file, this.overwrite);
            }
        }
    }
}


async function createFile(uri: vscode.Uri, content: Uint8Array, overwrite: CreationCmdLineValue) {

    let fileStat;
    try {
        fileStat = await vscode.workspace.fs.stat(uri);
    } catch (error) {
        // Don't do anything since it means there's no file to overwrite
    }

    if (overwrite !== true && fileStat) {
        console.log(`${tr.FILE_CANT_BE_OVERWRITTEN_IF_OVERWRITE_path} ${uri.fsPath} ***`);
        return;
    }

    try {
        await vscode.workspace.fs.writeFile(uri, content);
    } catch (error) {
        console.error(`${tr.ERROR_CREATING_FILE}`);
        if (error instanceof Error) {
            console.error(`${error.message}`);
        }
        return;
    }

}


async function createFileWithLog(uri: vscode.Uri | undefined, content: string[] | Uint8Array, overwrite: CreationCmdLineValue | undefined, separator = '\n') {
    console.log(`${tr.START_CREATION_path} ${uri?.fsPath}`);

    if (!uri) {
        console.error(`${tr.URI_ERR_IN_CREATE_FORMATE_FILE}`);
        return undefined;
    }

    if (overwrite === undefined) {
        console.warning(`${tr.OVERWRITE_IS_UNDEFINED}`);
        overwrite = false;
    }

    let encodedFileString: Uint8Array;

    if (content instanceof Uint8Array) {
        encodedFileString = content;
    }
    else {
        const fileString = content.join(separator);
        const enc = new TextEncoder();
        encodedFileString = enc.encode(fileString);
    }


    // todo: check if file is excluded, I don't understand this todo any more...
    await createFile(uri, encodedFileString, overwrite);

    console.log(`${tr.END_CREATION_path} ${uri?.fsPath}\n`);

}
