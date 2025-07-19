import * as vscode from 'vscode';
import { SemVer } from 'semver';
import semver from 'semver';
import * as yaml from 'yaml';

import * as projH from '../libs/projHelpers';
import * as ueH from '../libs/ueHelpers';
import * as tr from '../tr/text';
import * as consts from '../libs/consts';
import * as path from 'path';
import * as dyn from '../dynamic';
import { type ClangdCfgFileSettings, type ClangdExtensionFile, ValidateUnrealResults, type YamlFile, type AllDefaultSettings, type CreationCmdLineArgs, type CreationCmdLineSettings, type CreationCmdLineValue, type ExtensionYamlFiles, type ProjectInfoVars, DiagnosticsFlags } from '../libs/types';
import { UeClangdCreator } from '../ueClangdCreator';
import { TextEncoder } from 'util';
import { getCfgValue, getIntellisenseType, getIsWantingToCreate, getSourceFilesFirstChildFolderUris, setCompilerSetting, setIsWantingToCreate } from '../shared';
import { UnrealPlatform } from '../libs/indexTypes';
import { updateCompileCommands } from "./updateCompileCommands";
import { onSetCustomSystemIncludes } from './setCustomSysInc';
import { EOL } from 'os';
import { createCompletionFiles, getMacroCompletionHelperPath } from './completionFiles';
import { getFullPreparseIncludeLine } from './preParseIncludes';

import * as console from '../libs/console';


export async function startCreateUnrealClangdProject() {
    const result = await createUnrealClangdProject();

    const mainWorkspaceFolder = ueH.getProjectWorkspaceFolder();
    if (!mainWorkspaceFolder) {
        console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
        return;
    }

    if(result === 'cancelled') {
        const ueClangdConfig = projH.getUnrealClangdConfig(mainWorkspaceFolder);
        const creatingProjectAfterReload = ueClangdConfig.get<string>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);
        if(creatingProjectAfterReload){
            await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup'], false);
        }
    }
}


export async function createUnrealClangdProject(): Promise<"ran" | "cancelled"> {
    console.log(tr.RUNNING_COMMAND_CREATE_UECLANGD_PROJECT);

    const mainWorkspaceFolder = ueH.getProjectWorkspaceFolder();
    if (!mainWorkspaceFolder) {
        console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
        return "cancelled";
    }

    const ueClangdConfig = projH.getUnrealClangdConfig(mainWorkspaceFolder);

    const creatingProjectAfterReload = ueClangdConfig.get<string>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);
    if (!creatingProjectAfterReload && !getIsWantingToCreate()) {
        const installTypeResult = await vscode.window.showWarningMessage(tr.WHAT_INSTALL_TYPE, { detail: tr.FULL_OR_PARTIAL, modal: true }, tr.BTTN_FULL, tr.BTTN_PARTIAL);

        if (!installTypeResult) {
            return "cancelled";
        }

        if (installTypeResult === tr.BTTN_FULL) {
            await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['creation.overwrite'], consts.OVERWRITE_FULL, vscode.ConfigurationTarget.WorkspaceFolder);
        }
        else {
            await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['creation.overwrite'], consts.OVERWRITE_PARTIAL, vscode.ConfigurationTarget.WorkspaceFolder);
        }
    }

    if (!(await handleUnrealVersionCheck(await ueH.getUnrealVersion(), projH.getUnrealVersionBypass(mainWorkspaceFolder)))) {
        return "cancelled";
    }

    //const compileCommandsUri = projH.getCompileCommandsUri(mainWorkspaceFolder.uri, { withFileName: true });
    

    // Prevent redoing setup after a reload. We reload after handle extensionConflict()
    // After reloading once after handleExtensionConflict() has run it shouldn't reload again
    await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup'], false);
    const handleConflictResult = await handleExtensionConflict(mainWorkspaceFolder);
    if (handleConflictResult === 'reloading') {
        return 'ran';
    }
    else if(handleConflictResult === 'cancelled'){
        return 'cancelled';
    }

    setIsWantingToCreate(true); // allows creation to continue after compile commands task ends

    //const gcdRelativePattern = new vscode.RelativePattern(mainWorkspaceFolder, consts.GLOB_GCD_FILES);

    //if (getIsWantingToCreate()) {
    //    setIsWantingToCreate(false);
    //}
    /* const hasFoundIntellisense = await checkForIntellisenseFilesAndAskToCreate(
        compileCommandsUri,
        gcdRelativePattern,
        async () => {
            const runUpdateCCResult = await askAndRunUpdateCompileCommands([tr.BTTN_YES, tr.BTTN_NO], [tr.BTTN_YES], tr.WARN_INTELLISENSE_FILES_NOT_FOUND, tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);

            if (runUpdateCCResult === tr.BTTN_YES) {
                setIsWantingToCreate(true);
            }
            return runUpdateCCResult;
        }
    ); */

    //if (hasFoundIntellisense === tr.BTTN_NO) {  // We process creation later when cc is created and then copied
    //    return;
    //}
    await updateCompileCommands();
    return 'ran';
}

export async function finishCreationAfterUpdateCompileCommands() {
    setIsWantingToCreate(false);

    await createCompletionFiles();

    const mainWorkspaceFolder = ueH.getProjectWorkspaceFolder();
    if(!mainWorkspaceFolder) {return;}
    const compileCommandsUri = projH.getUnrealClangdCompileCommandsUri(mainWorkspaceFolder.uri, { withFileName: true });
    
    const ueClangdConfig = projH.getUnrealClangdConfig(mainWorkspaceFolder);

    const uePlatform = ueH.getUnrealPlatform(process.platform);
    if (!uePlatform) {
        console.error(`${tr.COULDNT_GET_UNREAL_PLATFORM} ${process.platform}${tr.platform_ISNT_SUPPORTED}`);
        return;
    }

    const creationCmdLine: CreationCmdLineArgs = new Map<CreationCmdLineSettings, CreationCmdLineValue>(consts.defaultCreationCmdLine);
    setCreationCmdLineDynamicValues(mainWorkspaceFolder, creationCmdLine, uePlatform);
    const cmdLineString = getCmdLineString(creationCmdLine);

    const result = await vscode.window.showInformationMessage(tr.CREATION_CMD_LINE_OPTIONS, { detail: cmdLineString, modal: true }, tr.BTTN_OK);

    if (result !== tr.BTTN_OK) {
        console.log(tr.ERR_NO_CREATION_ARGS_WERE_FOUND);
        return;
    }

    const currentClangdPath = projH.getClangDPathFromConfig(mainWorkspaceFolder);
    const newClangdUri: vscode.Uri | undefined = await getClangDPathFromUser(currentClangdPath, process.platform);

    if (!newClangdUri) {
        console.log(tr.USER_CANCELLED_CLANGD_PATH_SELECTION);
        return;
    }

    const projectInfo: ProjectInfoVars | null = await getProjectInfo(mainWorkspaceFolder, compileCommandsUri);
    if (!projectInfo) {
        console.error(tr.COULDNT_CREATE_PROJECT_INFO_VARS);
        return;
    }

    const isClangTidyEnabled: boolean | undefined = getCfgValue(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.tidy']);

    if (isClangTidyEnabled === undefined) {
        console.error(tr.COULDNT_GET_CLANG_TIDY_SETTINGS);
        return;
    }

    let forcedCompiler: vscode.Uri | undefined = undefined;
    if (process.platform === "win32") {
        const clangdDirPath = path.parse(newClangdUri.fsPath).dir;
        forcedCompiler = vscode.Uri.joinPath(vscode.Uri.file(clangdDirPath), consts.CLANG_CL_FILE_NAME);
    }

    if (forcedCompiler) {
        await setCompilerSetting(mainWorkspaceFolder, forcedCompiler);
    }

    const defaultClangdCfgSettings = consts.defaultGeneralClangdCfgSettings;
    dyn.addSettingsToClangdCfg(mainWorkspaceFolder, defaultClangdCfgSettings);

    const clangdExtYamlFiles: ExtensionYamlFiles = getDefaultClangdExtYamlFiles(projectInfo, defaultClangdCfgSettings, isClangTidyEnabled);

    const defaultCfgSettings: AllDefaultSettings = consts.defaultConfigSettings;

    const ueVersion: ueH.UnrealVersion | undefined = await ueH.getUnrealVersion();
    const isError = dyn.addDynamicDefaultSettingsToConfig(ueVersion, clangdExtYamlFiles, defaultCfgSettings, newClangdUri.fsPath, projH.getUnrealClangdCompileCommandsUri(mainWorkspaceFolder.uri, { withFileName: false }));

    if (isError) {
        console.error(tr.ERROR_ADDING_DYNAMIC_SETTINGS);
        return;
    }

    dyn.addPlatformSpecificChanges(getIntellisenseType(), uePlatform, clangdExtYamlFiles);

    const clangdExtFiles = getClangdExtFiles(clangdExtYamlFiles);

    if (!clangdExtFiles) {
        console.error(tr.COULDNT_GET_CLANGD_EXT_FILES);
        return;
    }

    const creator = new UeClangdCreator(creationCmdLine, projectInfo, defaultCfgSettings, clangdExtFiles);
    await creator.create();

    //await resetOverwriteSetting(mainWorkspaceFolder);

    console.log(tr.END_CREATE_UE_CLANGD_PROJECT);
    await createUnrealSourceProject(); // Create Unreal Source support
    
    //await startSetPreParseIncludesInClangdCfg();

    const creationOverwriteSetting = getCfgValue<string>(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.overwrite']);
    if(creationOverwriteSetting !== consts.OVERWRITE_PARTIAL){
        await onSetCustomSystemIncludes(); 
        //await startConvertUnrealCompileCommands(); // Do we need this if they're going to reload? This will also run on reload/restart...
    }
    
    const endCreationResult = await vscode.window.showInformationMessage(
        `Unreal-clangd project creation successful!${EOL}${EOL}Choose 'Reload' to reload the VSCode window to finish creation.`,
        {
            detail: "If you need to read some log files then you can skip this. Restart VSCode after you're done reading logs.",
            modal: true
        },
        "Reload", "Skip"
    );

    if(endCreationResult === "Reload"){
        await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);
    }
}


async function handleUnrealVersionCheck(unrealVersion: ueH.UnrealVersion | undefined, isUnrealVersionBypass: boolean | undefined) {

    if (!unrealVersion) {
        console.error(tr.COULDNT_GET_UE_VERSION);
        console.error(tr.WARN_CREATION_WILL_CONTINUE);
    }
    else if (!isUnrealVersionBypass) {

        switch (isValidUnrealVersion(unrealVersion)) {
            case ValidateUnrealResults.passed:

                break;
            case ValidateUnrealResults.passWithWarning:
                if (!await isOkWithWarning(tr.WARN_OUT_OF_DATE_EXTENSION, tr.QST_DO_YOU_WISH_TO_CONTINUE)) {
                    console.log(tr.USER_CANCELLED_RUN);
                    return false;
                }
                break;
            case ValidateUnrealResults.failed:
            default:
                console.error(tr.EXT_WASNT_BUILT_FOR_YOUR_UE_VERSION);
                return false;
                break;
        }

    }
    else {
        console.warning(tr.UE_VERSION_CHECK_BYPASSED);
        console.warning(tr.WARN_CREATION_WILL_CONTINUE);
    }

    return true;
}


async function handleExtensionConflict(workspaceFolder: vscode.WorkspaceFolder): Promise< 'run' | 'reloading' | 'cancelled' > {
    
    const unrealClangdConfig = projH.getUnrealClangdConfig(workspaceFolder);
    const clangdConfig = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_CLANGD, workspaceFolder);
    const cCppConfig = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_CPP, workspaceFolder);
    const cCppSettingNames = consts.settingNames.cCpp.settings;

    const hasClangdSetting = clangdConfig.get(consts.settingNames.clangd.settings.detectExtensionConflicts) === false;
    const hasCCppSettings = 
        cCppConfig.get(cCppSettingNames.autocomplete) === consts.SETTING_DISABLED &&
        cCppConfig.get(cCppSettingNames.errorSquiggles) === consts.SETTING_DISABLED &&
        cCppConfig.get(cCppSettingNames.formatting) === consts.SETTING_DISABLED &&
        cCppConfig.get(cCppSettingNames.intelliSenseEngine) === consts.SETTING_DISABLED;

    const isCppExtEnabled = cCppConfig.has(cCppSettingNames.autocomplete);  // workaround to see if extension is disabled

    if((hasClangdSetting && hasCCppSettings) || !isCppExtEnabled){
        if(!isCppExtEnabled){
            console.warning("Microsoft Cpp extension is disabled!");
            return 'cancelled';
        }
        return 'run';       
    }

    const results = await vscode.window.showInformationMessage(
        tr.INFO_SET_CONFLICT_SETTINGS,
        {modal:true, detail: tr.WARN_CONFLICT_SETTINGS_RELOAD},
        tr.BTTN_OK);

    if(results !== tr.BTTN_OK){
        console.log(tr.USER_CANCELLED_PROJECT_CREATE);
        return 'cancelled';
    }

    await unrealClangdConfig.update(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup'], true, vscode.ConfigurationTarget.WorkspaceFolder);
    await clangdConfig.update(consts.settingNames.clangd.settings.detectExtensionConflicts, false, vscode.ConfigurationTarget.Workspace);
    
    try {	// Will fail if cpp ext is disabled. our workaround above should catch this but check anyway
        await cCppConfig.update(cCppSettingNames.autocomplete, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
        await cCppConfig.update(cCppSettingNames.errorSquiggles, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
        await cCppConfig.update(cCppSettingNames.formatting, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
        await cCppConfig.update(cCppSettingNames.intelliSenseEngine, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
    } catch (error) {
        if(error instanceof Error){
            console.warning(error.message);
            console.warning("This warning above isn't an error if you have the MS C++ extension disabled.");
        }
    }
    
    await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);
    
    return 'reloading';
}


async function getClangDPathFromUser(currentClangdPath: string | undefined, platform: NodeJS.Platform) {
    
    let currentClangdUri;
    
    try {
        currentClangdUri = currentClangdPath ? await checkValidUri(vscode.Uri.file(currentClangdPath)) : undefined;
    } catch (error) {
        console.error(tr.CLANGD_PATH_INVALID_URI_CONV_FAILED);
        if(error instanceof Error){
            console.error(error.message);
        }
        currentClangdUri = undefined;
    }
    
    let filter: Record<string, string[]> | undefined = undefined;
    if(platform === "win32"){
         
        filter = { 'clangd': ['exe'], 'All Files': ['*'] };
    }

    const result = await vscode.window.showOpenDialog(
        {
            canSelectFiles:false,
            canSelectFolders:false,
            canSelectMany: false,
            defaultUri: currentClangdUri,
            openLabel: tr.BTTN_CHOOSE_CLANGD,
            filters: filter
        }
    );

    if (!result || result.length === 0) {
        if (currentClangdUri) {
            return currentClangdUri;
        }
        else {
            return undefined;
        }
    }

    return result[0];

}


async function checkValidUri(uri: vscode.Uri){
    try {
        await vscode.workspace.fs.stat(uri);
    } catch  {
        return undefined;
    }

    return uri;
}


function isValidUnrealVersion(userVersion: ueH.UnrealVersion | null, extensionVersion = consts.VALIDATE_UNREAL_VERSIONS): ValidateUnrealResults {
    if (!userVersion) {
        console.error(tr.COULDNT_GET_UE_VERSION);
        return ValidateUnrealResults.failed;
    }

    console.log(`${tr.FOUND_UE_VERSION} ${userVersion.major.toString()}.${userVersion.minor.toString()}.${userVersion.patch.toString()}\n`);
    
    const extMinVer = new SemVer(`${extensionVersion.min.major.toString()}.${extensionVersion.min.minor.toString()}.${extensionVersion.min.patch.toString()}`);
    const extMaxVer = new SemVer(`${extensionVersion.max.major.toString()}.${extensionVersion.max.minor.toString()}.${extensionVersion.max.patch.toString()}`);
    const extPlusVer = new SemVer(`${extensionVersion.max.major.toString()}.${extensionVersion.max.minor.toString()}.${(extensionVersion.max.patch + 1).toString()}`);

    const userVer = new SemVer(`${userVersion.major.toString()}.${userVersion.minor.toString()}.${userVersion.patch.toString()}`);
    

    if( semver.lt(userVer, extMinVer)){
        console.error(`${tr.ERR_UNREAL_ISNT_COMPATIBLE_LEFT}(${userVer.raw})${tr.ERR_UNREAL_ISNT_COMPATIBLE_RIGHT}`);
        return ValidateUnrealResults.failed;
    }

    if(semver.lte(userVer, extMaxVer)){
        return ValidateUnrealResults.passed;
    }

    if(semver.eq(userVer, extPlusVer)){
        return ValidateUnrealResults.passWithWarning;
    }

    console.error(`${tr.ERR_UNREAL_ISNT_COMPATIBLE_LEFT}(${userVer.raw})${tr.ERR_UNREAL_ISNT_COMPATIBLE_RIGHT}`);
    return ValidateUnrealResults.failed;
    
}


async function isOkWithWarning(text: string, detail: string, modal = true): Promise<boolean> {
    const results = await vscode.window.showWarningMessage(
        text,
        { detail: detail, modal: modal },
        tr.BTTN_CONTINUE);

    if (results === tr.BTTN_CONTINUE) {
        return true;
    }

    return false;
}


/* export async function checkForIntellisenseFilesAndAskToCreate(compileCommandsUri: vscode.Uri, gcdRelativePattern: vscode.RelativePattern, askCreate: () => Promise<string | undefined>): Promise<string> {

    const doesCompilesCommandExist = await projH.doesUriExist(compileCommandsUri);

    if(getIntellisenseType() === "Native"){
        if(!doesCompilesCommandExist) {
            await askCreate();
            return tr.BTTN_NO;
        }
        
        let fileStat: vscode.FileStat;
        try {
            fileStat = await vscode.workspace.fs.stat(compileCommandsUri);
        } catch {
            console.error("Error getting compile commands file info!");
            return tr.BTTN_YES;
        }
        
        const fileDate = new Date(fileStat.ctime);
        
        const ccFileMinutesOld = getMinutesDifference(fileDate, new Date());

        const projectWorkspace = ueH.getProjectWorkspaceFolder();
        if(!projectWorkspace){
            console.error("Couldn't get project workspace!");
            return tr.BTTN_YES;
        }
        const compileCommandsIsTooOldInMinutes: number | undefined = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, projectWorkspace).get<number>("native.minutesTillIntellisenseFilesAreOld");

        if(compileCommandsIsTooOldInMinutes === undefined){
            console.error("Couldn't get Compile Commands too old minutes!");
            return tr.BTTN_YES;
        }

        if(ccFileMinutesOld > consts.NATIVE_COMPILE_COMMANDS_TOO_OLD_IN_MINUTES){
            await askCreate();
            return tr.BTTN_NO;
        }

        return tr.BTTN_YES;
    }

    // weak check
    const gcdFiles = await vscode.workspace.findFiles(gcdRelativePattern, undefined, 1);

    if (!doesCompilesCommandExist || gcdFiles.length === 0) {
        await askCreate();
        return tr.BTTN_NO;
    }
    else {
        console.log(tr.INTELLISENSE_FILES_HAVE_BEEN_FOUND);
        return tr.BTTN_YES;
    }

}
 */

/* function getMinutesDifference(date1: Date, date2: Date): number {
    const millisecondsDifference = date2.getTime() - date1.getTime();
    const minutesDifference = millisecondsDifference / (1000 * 60);
    return Math.abs(minutesDifference);
}
 */

async function getProjectInfo(mainWorkspaceFolder: vscode.WorkspaceFolder | undefined, compileCommandsUri: vscode.Uri): Promise<ProjectInfoVars | null> {

    if (!mainWorkspaceFolder) {
        console.error(`main workspace folder is undefined ${compileCommandsUri.fsPath}`);
        return null;
    }

    const compileCommands = await projH.getValidatedCompileCommandObjectsFromUri(compileCommandsUri);
    if (!compileCommands) {
        console.error(tr.CC_COULDNT_BE_CREATED);
        return null;
    }

    const firstChildUrisWithSource = getSourceFilesFirstChildFolderUris(mainWorkspaceFolder.uri, compileCommands);

    if (!firstChildUrisWithSource) {
        console.error(tr.COULDNT_GET_SOURCE_FILE_URIS);
        return null;
    }

    return {
        mainWorkspaceFolder: mainWorkspaceFolder,
        compileCommands: compileCommands,
        firstChildUrisWithSource: firstChildUrisWithSource
    };

}


function getClangdExtFiles(clangdYamlFiles: ExtensionYamlFiles): ClangdExtensionFile[] | undefined {
    
    const yamlFilesArray = Object.values(clangdYamlFiles).filter((value): value is YamlFile[] => value !== undefined);

    const clangdExtFiles: ClangdExtensionFile[] = [];

    for (const yamlFiles of yamlFilesArray) {

        for (const yamlFile of yamlFiles) {
            const yamlDocs = [];

            for (const doc of yamlFile.docObjects) {

                const yamlDoc = new yaml.Document(doc);


                if (yamlDoc.warnings.length !== 0 || yamlDoc.errors.length !== 0) {
                    console.error(tr.WARNINGS_ERRORS_IN_YAMLDOC);
                    return undefined;
                }

                yamlDocs.push(yamlDoc);
            }

            let yamlFileString = "";
            for (const doc of yamlDocs) {
                const yamlString = yaml.stringify(doc, yamlFile.stringifyOptions);
                yamlFileString += yamlString;
            }

            let file;
            try {
                file = new TextEncoder().encode(yamlFileString);
            }
            catch (error) {
                console.error(tr.COULDNT_ENCODE_YAML_STRING);
                if (error instanceof Error) {
                    console.error(error.message);
                }
                return;
            }

            const extFile: ClangdExtensionFile = {
                file: file,
                uris: yamlFile.installFolders,
                fileName: yamlFile.name
            };

            clangdExtFiles.push(extFile);
        }
        
    }

    return clangdExtFiles;
}


function getCmdLineString(creationCmdLine: CreationCmdLineArgs): string {
    let cmdLineString = "";

    for (const setting of creationCmdLine) {
        if(!setting[1]) {
            console.log(`Setting is disabled: ${setting[0]}`);
            continue;
        }
        cmdLineString += `-${setting[0]}=${setting[1].toString()} `;
    }

    return cmdLineString;
}


function setCreationCmdLineDynamicValues(workspaceFolder: vscode.WorkspaceFolder, creationCmdLine: CreationCmdLineArgs, uePlatform: UnrealPlatform) {
    const ueClangdConfig = projH.getUnrealClangdConfig(workspaceFolder);

    creationCmdLine.set('platform', uePlatform);
    creationCmdLine.set('overwrite', getCfgValue<string>(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.overwrite']));
    creationCmdLine.set('tidy', getCfgValue<boolean>(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.tidy']));
}


function getDefaultClangdExtYamlFiles(projectInfo: ProjectInfoVars, defaultClangdCfgSettings: ClangdCfgFileSettings, isTidyEnabled: boolean): ExtensionYamlFiles {

    const pathMatch : string[] = [consts.CLANGD_PATHMATCH_COMPLETION_HELPER_PATH];  // Add completionHelper.cpp to .clangd file

    for (const firstChildSourceFolderUri of projectInfo.firstChildUrisWithSource) {
        const lastFolderName = firstChildSourceFolderUri.fsPath.match(/[\w\s\-.]+$/gm);  // TODO Check not escaping .

        if(lastFolderName && lastFolderName.length > 0){
            // Check this. Changed lastFolderName to lastFolderName[0]
            pathMatch.push(`${lastFolderName[0]}/.*\\.${consts.UECPP_SOURCE_FILE_EXTENSIONS_REGEX}`);
        }
        
    }

    defaultClangdCfgSettings.If ??= {};
    defaultClangdCfgSettings.If.PathMatch = pathMatch;

    const installFolders = [projectInfo.mainWorkspaceFolder.uri];

    const clangdCfgFile: YamlFile = {
        docObjects: [defaultClangdCfgSettings],
        stringifyOptions: consts.CLANGD_STRINGIFY_OPTIONS,
        installFolders: installFolders,
        name: consts.FILE_NAME_CLANGD_CFG
    };

    const clangFormatFile: YamlFile = {
        docObjects: [consts.defaultGeneralClangFormatFile],
        stringifyOptions: consts.CLANG_FORMAT_STRINGIFY_OPTIONS,
        installFolders: installFolders,
        name: consts.FILE_NAME_CLANG_FORMAT
    };

    const clangdExtFiles: ExtensionYamlFiles = {
        clangd:[clangdCfgFile],
        format:[clangFormatFile]
    };

    if (isTidyEnabled) {
        const clangTidyFile: YamlFile = {
            docObjects: [consts.defaultGeneralClangTidySettings],
            stringifyOptions: consts.CLANG_TIDY_STRINGIFY_OPTIONS,
            installFolders: installFolders,
            name: consts.FILE_NAME_CLANG_TIDY
        };

        clangdExtFiles.tidy = [clangTidyFile];
    }


    return clangdExtFiles;
}


/**
 * Creates Unreal Source project for Unreal Source files
 * @returns 
 */
export async function createUnrealSourceProject() {
    console.log("Creating Unreal source clangd project...");
    const ueUri = ueH.getUnrealUri();

    if(!ueUri){
        await vscode.window.showInformationMessage("Error creating Unreal Source project!");
        return;
    }

    let compiler: string | undefined = undefined;
    const workspaceFolder = ueH.getProjectWorkspaceFolder();
    if(workspaceFolder){
        const config = projH.getUnrealClangdConfig(workspaceFolder);
        compiler = config.get(consts.settingNames.unrealClangd.settings['creation.compilerPath']);
    }
    
    const ueVersion = await ueH.getUnrealVersion();
    if(!ueVersion){
        console.error("Couldn't get ueVersion!");
        await vscode.window.showInformationMessage("Error creating Unreal Source project!");
        return;
    }
    
    const ueClangdCfgUri = vscode.Uri.joinPath(ueUri, consts.FILE_NAME_CLANGD_CFG);
    if(!(await projH.doesUriExist(ueClangdCfgUri))){

        const addValues =  await getAddForClangdCfg(process.platform, ueVersion);
        if(!addValues) {
            console.error("Couldn't set Add values for Unreal Source support!");
            return;
        }
        const ueCC: ClangdCfgFileSettings = {
            CompileFlags: {
                CompilationDatabase: consts.defaultCompilerFlags.CompilationDatabase,
                Compiler: compiler,
                Add: addValues
            },
            InlayHints: consts.defaultInlayHints
            
        };

        const diagnostics = getDiagnosticsForClangdCfg(ueVersion);
        if(diagnostics){
            ueCC.Diagnostics = diagnostics;
        }

        const clangdPageForNonFullSourceCppFiles = await getClangdPageForNonFullSourceCppFiles();
        
        const ueSourceClangdCfgDocs = !clangdPageForNonFullSourceCppFiles ? [ueCC] :  [clangdPageForNonFullSourceCppFiles,ueCC];
        
        let docsStrigified = "";
        for (const doc of ueSourceClangdCfgDocs) {
            docsStrigified += yaml.stringify(doc, consts.CLANGD_STRINGIFY_OPTIONS);
        }
                
        await projH.saveFile(docsStrigified, ueClangdCfgUri);

        await vscode.window.showInformationMessage(
            `Installation successful!${EOL}${EOL}Finished creating Unreal Source project`,
            {modal: true},
            tr.BTTN_OK
        );
    }
    else {
        await vscode.window.showInformationMessage(
            `Installation successful!${EOL}${EOL}Didn't overwrite Unreal Source .clangd file. Delete this file manually and use command 'Create Unreal Source support' if you want to remake. (not a bug)`,
            {modal: true},
            tr.BTTN_OK
        );
    }
}


async function getAddForClangdCfg(platform: NodeJS.Platform, ueVersion: ueH.UnrealVersion): Promise<string[] | undefined>{
    const cppVersion = dyn.getCppVersion(ueVersion);
    if(!cppVersion){
        console.error("Couldn't get cppVersion for Add in .clangd(UE Source)!");
        await vscode.window.showInformationMessage("Error creating Unreal Source project!");
        return;
    }

    const macroCompHelperPath = getMacroCompletionHelperPath();
    if(!macroCompHelperPath) { return; }
    const startingAdd = [cppVersion, getFullPreparseIncludeLine(macroCompHelperPath)];

    switch (platform) {
        case "win32":
            return startingAdd.concat(consts.WIN_COMPILER_FLAGS_TO_ADD);
            break;
        case "linux":
            return startingAdd.concat(consts.LINUX_STDLIB_SYS_INCLUDE_CPP_V1, consts.LINUX_COMPILER_FLAGS_TO_ADD);
            //return [cppVersion, consts.LINUX_STDLIB_SYS_INCLUDE_CPP_V1].concat(consts.LINUX_COMPILER_FLAGS_TO_ADD);
            break;
        case "darwin":
            const cfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, ueH.getProjectWorkspaceFolder());
            const macFileLanguage = cfg.get<string>(consts.CONFIG_SETTING_MAC_FILE_LANGUAGE);
            if(macFileLanguage){
                return startingAdd.concat(macFileLanguage, consts.MAC_COMPILER_FLAGS_TO_ADD);
                //return [cppVersion, macFileLanguage].concat(consts.MAC_COMPILER_FLAGS_TO_ADD);
            }
            else {
                console.error("No Mac file language found!");
                return startingAdd.concat(consts.FULL_MAC_FILE_LANGUAGE_CLANG_FLAG, consts.MAC_COMPILER_FLAGS_TO_ADD);
                //return [cppVersion, consts.FULL_MAC_FILE_LANGUAGE_CLANG_FLAG].concat(consts.MAC_COMPILER_FLAGS_TO_ADD);
            }
            
            break;
        default:
            console.error(`Platform not recognized! : ${process.platform}`);
            return undefined;
            break;
    }
}


function getDiagnosticsForClangdCfg(ueVersion: ueH.UnrealVersion){
    let diagnostics : DiagnosticsFlags | undefined = undefined;
    if(ueVersion.major > 5 || (ueVersion.major === 5 && ueVersion.minor >= 5)){
        diagnostics = {
            UnusedIncludes: "None"
        };
    }

    return diagnostics;
}


async function getClangdPageForNonFullSourceCppFiles() {

    const ueWorkspace = ueH.getUnrealWorkspaceFolder();
    if(!ueWorkspace){
        return;
    }

    if(await ueH.isFullSourceUnrealEngine(ueWorkspace)) {
        return;
    }
    
    return consts.NON_FULL_SOURCE_CLANGD_CFG_PAGE;
}