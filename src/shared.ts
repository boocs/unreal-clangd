import * as vscode from 'vscode';
import * as path from 'path';

import type { ExtensionIntellisenseType, CompileCommand, RspMatcher, CompileCommandFile, File } from "./libs/types";
import * as tr from './tr/text';
import * as consts from './libs/consts';
import {  getFileString, logException, saveFile } from './libs/projHelpers';
import { getProjectWorkspaceFolder, getUnrealUri, getUnrealVersion, UnrealVersion } from './libs/ueHelpers';


import * as console from './libs/console';


let _intellisenseType: ExtensionIntellisenseType = "Native";  // In future this could be change via setting
let _isWantingToCreate = false;
let _isFinishingCreation = false;
let _isUninstallingUeClangdProject = false;
let _unrealSemanticVersion: Promise<UnrealVersion | undefined> | undefined = undefined;
const _rspMatchers: RspMatcher[] = [];


// intellisenseType
export function getIntellisenseType(): ExtensionIntellisenseType {
    return _intellisenseType;
}
export function setIntellisenseType(value: ExtensionIntellisenseType) {
    _intellisenseType = value;
}

// isWantingToCreate
export function getIsWantingToCreate(): boolean {
    return _isWantingToCreate;
}
export function setIsWantingToCreate(value: boolean) {
    _isWantingToCreate = value;
}

// isUinstallingUeClangdProject
export function getIsUninstalling(): boolean {
    return _isUninstallingUeClangdProject;
}
export function setIsUninstalling(value: boolean) {
    _isUninstallingUeClangdProject = value;
}

// rsp matchers
export function getRspMatchers(): RspMatcher[] {
    return _rspMatchers;
}
export function setRspMatchers(value: RspMatcher) {
    _rspMatchers.push(value);
}

// isFinishingCreation
export function getIsFinishingCreation(): boolean {
    return _isFinishingCreation;
}
export function setIsFinishingCreation(value: boolean) {
    _isFinishingCreation = value;
}


export function getSourceFilesFirstChildFolderUris(baseUri: vscode.Uri | undefined, compileCommands: CompileCommand[] | undefined) {

    if (!baseUri) {
        console.error(`${tr.BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_URIS_vars} ${compileCommands?.length.toString() ?? ''}`);
        return;
    }

    const matchedFolderNames: Set<string> | undefined = getSourceFilesFirstChildFolderNames(baseUri, compileCommands);

    if (!matchedFolderNames || matchedFolderNames.size === 0) {
        console.error(tr.DIDNT_FIND_ANY_SOURCE_FILD_FIRST_CHILD_FOLDER_NAMES);
        return undefined;
    }

    const pathUris = [];  // TODO why isn't this a Set?
    for (const folderName of matchedFolderNames) {
        try {
            pathUris.push(vscode.Uri.joinPath(baseUri, folderName));
        } catch (error) {
            console.error(`${tr.COULDNT_CREATE_URI_FROM_URI_AND_FOLDER_NAME} ${baseUri.fsPath}, ${folderName}`);
            if (error instanceof Error) {
                console.error(error.message);
            }

            continue;
        }
    }

    if (pathUris.length === 0) {
        return undefined;
    }

    return pathUris;
}


export function getSourceFilesFirstChildFolderNames(baseUri: vscode.Uri | undefined, compileCommands: CompileCommand[] | undefined) {
    if (!compileCommands || !baseUri) {
        console.error(`${tr.BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_vars} ${compileCommands?.length.toString() ?? ""}, ${baseUri?.fsPath ?? ""}`);
        return;
    }

    const restringSourceFolders = `(?<=${baseUri.fsPath.split(path.sep).join(path.posix.sep)}[/])${consts.RE_STRING_FOLDER_NAME}`;
    const reSourceFolders = new RegExp(restringSourceFolders, "gmi");

    const matchedPathStrings = new Set<string>();
    for (const compileCommand of compileCommands) {
        const posixFile = compileCommand.file.split(path.sep).join(path.posix.sep);
        const match = posixFile.match(reSourceFolders);

        if (!match || match.length === 0) {
            //console.error(`re: ${reSourceFolders.source} didn't work on path: ${compileCommand.file}`);
            continue;
        }

        matchedPathStrings.add(match[0]);
    }

    return matchedPathStrings;
}

// Todo: This doesn't seem right? What doesn't seem right? Bad comment...
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function getCfgValue<T>(config: vscode.WorkspaceConfiguration, setting: string): T | undefined {
    const value = config.get<T>(setting);

    if (value === undefined) {
        console.error(`${tr.ERR_FINDING_CFG_SETTING} ${setting}`);
        return value;
    }

    return value;
}


export async function askAndRunUpdateCompileCommands(buttons: string[], positiveConfirms: string[], message: string, detailMessage: string) {
    const result = await vscode.window.showInformationMessage(
        message,
        { modal: true, detail: detailMessage },
        ...buttons);

    if (result !== undefined && positiveConfirms.includes(result)) {
        await vscode.commands.executeCommand(consts.EXT_CMD_UPDATE_COMPILE_COMMANDS);
    }

    return result;
}


export async function setCompilerSetting(mainWorkspace: vscode.WorkspaceFolder, forcedCompiler: vscode.Uri) {
	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	await unrealClangdCfg.update(consts.settingNames.unrealClangd.settings["creation.compilerPath"], forcedCompiler.fsPath);
}


export function doesWorkspaceFileContainClangdSettings(workspaceFolder: vscode.WorkspaceFolder) {
    
    const config = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_CLANGD, workspaceFolder);

    // We only check one setting for now 
    const pathValueInWorkspaceFile = config.inspect(consts.SETTING_CLANGD_PATH)?.workspaceValue;

    if(pathValueInWorkspaceFile) { return true; }

    return false;
}


export function getUniqueResponseFilePathsFromCompileCommands(ccFileString: string): Record<string, number> {
    const reResponseFlag = new RegExp(consts.REGEX_RESPONSE_COMPILER_FLAG, "gm");
    const rspPathStrings = ccFileString.matchAll(reResponseFlag);

    const rspPaths: Record<string, number> = {};
    for (const pathString of rspPathStrings) {


        if (pathString[0] in rspPaths) {
            rspPaths[pathString[0]] += 1;
        }
        else {
            rspPaths[pathString[0]] = 1;
        }

    }

    return rspPaths;  // Check modified function
}


export function getUniqueResponseFilePathsFromCompileCommandsWithFilter(ccFile: CompileCommandFile, filterFilePathPrefix?: string): Record<string, number> | undefined {
    return getUniqueResponseFilePathsFromCompileCommands(JSON.stringify(filterFilePathPrefix ?
        ccFile.filter(ccFile => ccFile.file.toLowerCase().startsWith(filterFilePathPrefix))
        : ccFile
    ));
}



export async function saveFiles(files: File[]) {

    for (const file of files) {
        const encFile = new TextEncoder().encode(file.fileString);
        if(encFile.length === 0){
            console.error(`Encoded file was empty. Will not save. ${file.uri.fsPath}`); // TODO what if someone wants to overwrite file as empty?
            continue;
        }

        try {
            await vscode.workspace.fs.writeFile(file.uri, encFile);
        } catch (error) {
            console.error(`Couldn't write file! ${file.uri.fsPath}`);
            if(error instanceof Error){
                console.error(error.message);
            }
            continue;
        }
    }
    
}

/**
 * Checks for a .clangd and .clang-format file by default
 * @param workspace vscode.WorkspaceFolder
 * @param globFileNames ['.clangd', '.clang-format']
 * @returns 
 */
export async function hasClangdProjectFiles(workspace: vscode.WorkspaceFolder, globFileNames: string[] = ['.clangd', '.clang-format']) {

    let hasError = false;
    for (const globFileName of globFileNames) {
        const globPattern = new vscode.RelativePattern(workspace, globFileName);
        const clangdFiles = await vscode.workspace.findFiles(globPattern, undefined, 1);

        if (clangdFiles.length === 0) {
            hasError = true;
            console.error(`Function hasClangdProjectFiles() couldn't find: ${globFileName}`);
        }
    }

    if(hasError) {return false;}

    return true;
}


export async function appendToFile(uri: vscode.Uri, text: string) {
    
    const fileString = await getFileString(uri);
    if(!fileString) { return;}
    const newFileString = fileString + text;
    return await saveFile(newFileString, uri);

}

/**
 * Iterates over the project workspace folder and the Unreal Engine folder, processing each with a provided function.
 * Stops and returns if any folder result action returns 'return' or 'required URIs are missing(logged)'.
 *
 * @template T The return type of the processFolder function.
 * @param processFolder A function that processes a folder URI and returns a result of type T (sync or async).
 * @param resultAction A function that takes the processed result and returns true to continue or false to stop,
 *                     either directly or as a promise.
 */

export async function iterateOverProjectFolders<T, Args extends unknown[]>(
    processFolder: (uri: vscode.Uri, ...args: Args) => T,
    resultAction: (result: Awaited<T>, uri: vscode.Uri) => ("return" | "continue") | Promise<"return" | "continue">,
    ...processFolderArgs: Args): Promise<void> {
        
    const projectUri = getProjectWorkspaceFolder()?.uri;
    const unrealUri = getUnrealUri();

    if (!projectUri || !unrealUri) {
        console.error(`A uri was undefined! proj: ${projectUri?.fsPath ?? "''"} unreal: ${unrealUri?.fsPath ?? "''"}`);
        return;
    }

    for (const uri of [projectUri, unrealUri]) {
        const result = await processFolder(uri, ...processFolderArgs);
        const actionResult = await resultAction(result, uri);

        if (actionResult === "return") {
            return;
        }
    }

    return;
}

/**
 * Restarts the clangd language server
 */
export async function restartClangd() {
    try {
		// MARK: Error Ubuntu
		// clangd.install is already a command
		// Maybe because clangd Ubuntu doesn't like that we don't have a clangd path when restarting?
		// We just ignore since this should only happen when extension isn't set up
		await vscode.commands.executeCommand(consts.CLANGD_COMMAND_RESTART);
	} catch (error) {
		logException(error);
        console.log("This probably isn't an error unless you get this when this extension is all set up correctly.");
	}
}


export function getUnrealClangdCfgUri() {
    const ueUri = getUnrealUri();
    if(!ueUri) {return;}

    return vscode.Uri.joinPath(ueUri, consts.FILE_NAME_CLANGD_CFG);
}


/**
 * Gets/Stores Unreal's semantic versioning
 * 
 * @returns a Promise that must be awaited
 */
export async function getUnrealSemanticVersion(): Promise<{ major: number; minor: number; patch: number; } | undefined> {
   
    return _unrealSemanticVersion ??= getUnrealVersion();
}


/**
 * Gets Unreal's semantic version string/Stores Unreal's semantic version
 * 
 */
export async function getUnrealSemanticVersionString(): Promise<string | undefined> {
   
    const unrealVersion = await getUnrealSemanticVersion();
    return unrealVersion ?  `${String(unrealVersion.major)}.${String(unrealVersion.minor)}.${String(unrealVersion.patch)}` : undefined;
}


/**
 * MARK: WARNING this may need to be fixed for arch linux and earlier non arch linux (5.1 or 5.2 uses V1?)
 * @returns 
 */
export async function getLinuxStdLibSystemInclude(): Promise<string> {
    const unrealVersion = await getUnrealSemanticVersion();
    if (!unrealVersion) {
        return consts.LINUX_STDLIB_SYS_INCLUDE_V3;
    }
    else if (unrealVersion.major === 4 || (unrealVersion.major === 5 && unrealVersion.minor < 7)) {
        return consts.LINUX_STDLIB_SYS_INCLUDE_V2;
    }
    
    return consts.LINUX_STDLIB_SYS_INCLUDE_V3;
    
}
