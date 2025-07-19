import * as vscode from 'vscode';

import { getUnrealClangdConfig, getUnrealCompileCommandsUriForProject, permDeleteUri } from '../libs/projHelpers';
import * as ueHelpers from '../libs/ueHelpers';
import * as tr from '../tr/text';
import * as consts from '../libs/consts';
import * as path from 'path';
import type { UpdateCompileCommandsDebugConfig } from '../libs/types';

import * as console from '../libs/console';
import { getIntellisenseType } from '../shared';


let _codeWorkspaceSettingsBackup: Record<string, unknown> | undefined = undefined;

let _isUpdateCompileCommands = false;

export async function updateCompileCommands() {

    console.log(tr.RUNNING_UPDATE_CC);
            
    const unrealWorkspaceFolder = ueHelpers.getUnrealWorkspaceFolder();
    const projectWorkspaceFolder = ueHelpers.getProjectWorkspaceFolder();
    if (!projectWorkspaceFolder || !unrealWorkspaceFolder) {
        console.error(`${tr.COULDNT_GET_WORKSPACE_FOLDERS} ${projectWorkspaceFolder?.name ?? ""}, ${unrealWorkspaceFolder?.name ?? ""} `);
        return;
    }

    const ueClangdConfig = getUnrealClangdConfig(projectWorkspaceFolder);
    const execType = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.execType']);
    let args: string[] | undefined = undefined;

    if (getIntellisenseType() !== "Native") {
        const targetNames: string[] | undefined = await ueHelpers.getBuildTargetNames(consts.BUILD_TARGET_EDITOR_SUFFIX);

        if (!targetNames || targetNames.length === 0) {
            console.error(`targetNames length was: ${targetNames?.length.toString() ?? ""}`);
            return;
        }

        let buildTargetName: string;
        if (targetNames.length > 1) {

            const target = await vscode.window.showQuickPick(targetNames, {
                ignoreFocusOut: true,
                title: tr.CHOOSE_BUILD_TARGET
            });

            if (!target) {
                return;
            }
            buildTargetName = target;
        }
        else {
            buildTargetName = targetNames[0];
        }

        // Delete old compile commands from unreal directory allows us to know for sure that new one was created
        if (!(await permDeleteUri(getUnrealCompileCommandsUriForProject(unrealWorkspaceFolder.uri)))) {
            return;
        }

        const platform: string | undefined = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.platform']);
        const architecture: string | undefined = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.architecture']);

        args = await getUpdateCCArgs(buildTargetName, platform, architecture);
    }
    else {
        const uprojectUri = await ueHelpers.getUprojectUri();
        if (!uprojectUri) {
            console.error("Project's uproject file not found!");
            return;
        }

        args = [
            "-projectfiles",
            `-project=${uprojectUri.fsPath}`,
            "-game",
            "-engine",
            "-dotnet"
        ];
    }

    let command = await ueHelpers.getUbtPath(unrealWorkspaceFolder.uri);

    if (!command || !args || args.length === 0) {
        return;
    }

    command = `.${path.sep}${path.relative(unrealWorkspaceFolder.uri.fsPath, command)}`;

    const ubtCommand = { command: command, args: args };
    //const ubtCommand: {command: vscode.ShellQuotedString | string, args: (vscode.ShellQuotedString | string)[]} = getShellQuoting(command, args);
    if (execType === consts.COMPILE_COMMANDS_EXEC_TYPE_TASK) {
        await runUpdateCompileCommandsWithTask(projectWorkspaceFolder, unrealWorkspaceFolder, ubtCommand);
    }
    else if (execType === consts.COMPILE_COMMANDS_EXEC_TYPE_DEBUG) {
        await runUpdateCompileCommandsWithDebug(projectWorkspaceFolder, unrealWorkspaceFolder, ubtCommand);
    }
    else {
        console.error(tr.EXEC_TYPE_NOT_FOUND);
    }

}


async function getUpdateCCArgs(buildTargetName: string, platform: string | undefined, architecture: string | undefined): Promise<string[] | undefined> {

    let unrealPlatform: string | undefined;

    if (platform) {
        unrealPlatform = platform;
    }
    else {
        
        unrealPlatform = ueHelpers.getUnrealPlatform(process.platform);
        if (!unrealPlatform) {
            console.error(`${process.platform}${tr.platform_ISNT_SUPPORTED}`);
            return undefined;
        }
    }

    const uprojectFileName = await ueHelpers.getUProjectFileName(ueHelpers.getProjectWorkspaceFolder());
    if (!uprojectFileName) {
        console.error(tr.COULDNT_GET_UPROJECT_FILE_NAME);
        return undefined;
    }

    const projectWorkspaceFolderUri = ueHelpers.getProjectWorkspaceFolder()?.uri;
    if (!projectWorkspaceFolderUri) {
        console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
        return undefined;
    }
    const uprojectFilePath = vscode.Uri.joinPath(projectWorkspaceFolderUri, uprojectFileName).fsPath;

    let args: string[] = [];
    
    args = [
        buildTargetName,
        unrealPlatform,
        consts.UPDATE_COMPILE_COMMANDS_ARG_DEVELOPMENT,
        uprojectFilePath,
        consts.UPDATE_COMPILE_COMMANDS_COMPILER_CLANG,
        consts.UPDATE_COMPILE_COMMANDS_ARG_GEN_CLANGDB
    ];
    
    
    if (architecture && getIntellisenseType() !== "Native") {
        args.push(`${consts.UPDATE_COMPILE_COMMANDS_ARG_ARCHITECTURE_EMPTY}${architecture}`);
    }

    return args;
}


async function runUpdateCompileCommandsWithTask(projectWorkspace: vscode.WorkspaceFolder, unrealWorkspace: vscode.WorkspaceFolder, ubtCommand: {command: string, args:string[]}) {
    
    if(getIntellisenseType() !== "Native") {
        console.error("NonNative runUpdateCompileCommandsWithTask needs testing...");
        return;
    }

    const modUbtCommand = getShellQuoting(ubtCommand.command, ubtCommand.args);

    const source = consts.CONFIG_SECTION_UNREAL_CLANGD;

    const updateCCTask: vscode.Task = new vscode.Task({ type: consts.TASK_TYPE }, unrealWorkspace, consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME, source, vscode.ShellExecution);
    
    updateCCTask.group = vscode.TaskGroup.Build;
    updateCCTask.problemMatchers = ["$msCompile"];
    
    const shellExec = process.platform === "win32"? consts.POWERSHELL_FILE_NAME : undefined;

    updateCCTask.execution = new vscode.ShellExecution(
        modUbtCommand.command,
        modUbtCommand.args,
        {cwd: unrealWorkspace.uri.fsPath, executable: shellExec} 
    );

    if (!getIsUpdateCompileCommands()) {
        setIsUpdateCompileCommands(true);
        try {
            console.log(`${tr.CREATING_CC_FILE_IN_path} ${unrealWorkspace.uri.fsPath}\n`);
            backupWorkspaceSettings();
            await vscode.tasks.executeTask(updateCCTask);
        } catch (error) {
            console.error(tr.ERR_WITH_EXEC_TASK);
            if (error instanceof Error) {
                console.error(error.message);
            }
            _codeWorkspaceSettingsBackup = undefined;
            setIsUpdateCompileCommands(false);
            return;
        }
    }
    else {
        console.warning(tr.STILL_UPDATING_CC_TRY_AGAIN_LATER);
    }
}

async function runUpdateCompileCommandsWithDebug(
    projectWorkspace: vscode.WorkspaceFolder,
    unrealWorkspace: vscode.WorkspaceFolder,
    ubtCommand: {command: string, args: string[]}) {
    
    if(getIntellisenseType() !== "Native") {
        console.error("NonNative runUpdateCompileCommandsWithTask needs testing...");
        return;
    }

    const newCommand = ubtCommand.command;
    const newArgs: string[] = [];
    for (const arg of ubtCommand.args) {
        newArgs.push(arg);
    }

    const dbgConfig: vscode.DebugConfiguration | null = getUpdateCompileCommandsDbgCfg(
        unrealWorkspace.uri,
        newCommand,
        newArgs
    );

    if (!dbgConfig) {
        console.error(tr.DBGCFG_IS_NULL);
        return;
    }

    if (!getIsUpdateCompileCommands()) {
        setIsUpdateCompileCommands(true);
        try {
            console.log(`${tr.CREATING_CC_FILE_IN_path} ${unrealWorkspace.uri.fsPath}\n`);
            backupWorkspaceSettings();
            const didStart = await vscode.debug.startDebugging(unrealWorkspace, dbgConfig);
            if(!didStart){
                console.error("Error when `debug` updating compile commands!");
                console.error("Usual happens when you don't have the Microsoft C# extension enabled and are using this extension's Update Compile Commands `debug` setting.");
                setIsUpdateCompileCommands(false);
            }
        } catch (error) {
            console.error(tr.EXCEPT_WHEN_UPDATING_CC);
            if (error instanceof Error) {
                console.error(error.message);
            }

            _codeWorkspaceSettingsBackup = undefined;
            setIsUpdateCompileCommands(false);
            return;
        }
    }
    else {
        console.warning(tr.STILL_UPDATING_CC_TRY_AGAIN_LATER);
    }
}


function getShellQuoting(command: string, args: string[]): {command: vscode.ShellQuotedString | string, args: (vscode.ShellQuotedString | string)[]}{
    
    let modArgs: (string | vscode.ShellQuotedString)[] = [];
    if(process.platform === "win32"){
        for (const arg of args) {
            modArgs.push({value: arg, quoting: vscode.ShellQuoting.Strong});
        }
    }
    else {
        modArgs = args;
    }

    const modCommand = process.platform === "win32" ? { value: command, quoting: vscode.ShellQuoting.Strong } : { value: command, quoting: vscode.ShellQuoting.Weak };
    
    return {command: modCommand, args: modArgs};
}


function backupWorkspaceSettings() {
    
    if(_codeWorkspaceSettingsBackup !== undefined){
        console.error("Backup settings have already been set!");
        return;
    }
    
    const workspace = ueHelpers.getProjectWorkspaceFolder();	
    const globalConfig = vscode.workspace.getConfiguration(undefined, workspace);
    

    let settings: string[] = globalConfig.get<string[]>("unreal-clangd.native.code-workspaceFileBackupSettings", []);

    settings = settings.concat(consts.NATIVE_CODE_WORKSPACE_BACKUP_SETTINGS);

    _codeWorkspaceSettingsBackup = {};
    for (const setting of settings) {

        let value: unknown = undefined;
        try {
            value = globalConfig.inspect(setting)?.workspaceValue;
        } catch  {
            console.warning(`Error trying to backup setting: ${setting} (might not be a bug)`);
            continue;
        }
        
        if(value === undefined){
            console.warning(`Error trying to backup setting: ${setting} (might not be a bug)`);
            continue;
        }

        _codeWorkspaceSettingsBackup[setting] = value;
    }

}


function getUpdateCompileCommandsDbgCfg(
    unrealUri: vscode.Uri | undefined,
    ubtPath: string | null,
    ubtArgs: string[] | null
): vscode.DebugConfiguration | null {

    if (!unrealUri) {
        console.error(tr.COULDNT_FIND_UE_URI);
        return null;
    }

    const updateCCCwd: string = unrealUri.fsPath;

    if ((!ubtPath || ubtPath.length < 2) || !ubtArgs || !updateCCCwd) {

        console.error(tr.COULDNT_CREATE_UPDATE_CC_DEBUG_CFG);
        return null;
    }

    console.log(tr.CREATING_ARGS_FOR_CC_CREATE);
    console.log(
        `type: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_TYPE}\n` +
        `request: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_REQUEST}\n` +
        `program: ${ubtPath}\n` +
        `args: [${ubtArgs.toString()}]\n` +
        `console: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE}\n` +
        `stopAtEntry: ${String(consts.UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY)}\n` +
        `cwd: ${updateCCCwd}\n`
    );

    const dbgConfig: UpdateCompileCommandsDebugConfig = {
        name: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME,
        type: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_TYPE,
        request: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_REQUEST,
        program: ubtPath,
        args: ubtArgs,
        console: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE,
        stopAtEntry: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY,
        cwd: updateCCCwd
        //,
        //logging: {
        //	enableLogging: true
        //}
    };

    return dbgConfig;
}


export async function restoreWorkspaceSettings() {
    if(_codeWorkspaceSettingsBackup === undefined){
        console.error("Trying to restore workspace settings but there are none!");
        return;
    }

    const workspace = ueHelpers.getProjectWorkspaceFolder();	
    const globalConfig = vscode.workspace.getConfiguration(undefined, workspace);

    for (const key in _codeWorkspaceSettingsBackup) {
        if (!Object.prototype.hasOwnProperty.call(_codeWorkspaceSettingsBackup, key)) {
            continue;
        }

        const value = _codeWorkspaceSettingsBackup[key];

        try {
            await globalConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
        } 
        catch  {
            console.warning(`Error trying to backup workspace setting: ${key} (might not be a bug)`);
            continue;
        }
        
    }

}

export function getIsUpdateCompileCommands() {
    return _isUpdateCompileCommands;
}
  
export function setIsUpdateCompileCommands(value: boolean) {
    _isUpdateCompileCommands = value;
}