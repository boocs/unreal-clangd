import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

import * as consts from './consts';
import * as tr from '../tr/text';
import { TextDecoder, TextEncoder } from 'util';
import type {CompileCommand, CompileCommandFile} from './types';
import { isCompileCommandsJson } from './typeHelpers';

import * as console from './console';
import { getProjectWorkspaceFolder } from './ueHelpers';

/**
 * CC in .vscode/unreal-clangd
 */
export function getUnrealClangdCompileCommandsUri(baseUri: vscode.Uri, options: {withFileName: boolean}) {
    const fileName = options.withFileName? consts.FILE_NAME_COMPILE_COMMANDS : "";
    return vscode.Uri.joinPath(baseUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, fileName);
}


export function getClangDPathFromConfig(workspaceFolder: vscode.WorkspaceFolder,section: string = consts.CONFIG_SECTION_CLANGD, setting: string = consts.SETTING_CLANGD_PATH): string | undefined {
    const clangdConfig = vscode.workspace.getConfiguration(section, workspaceFolder);

    return clangdConfig.get(setting);
}


export async function getCompilerFromCompileCommands(compileCommandUri: vscode.Uri): Promise<string | undefined> {
    const compileCommands = await getValidatedCompileCommandObjectsFromUri(compileCommandUri);

    if(!compileCommands || compileCommands.length === 0){
        console.error(`Couldn't find compile commands with uri ${compileCommandUri.fsPath}!`);
        return;
    }

    if(compileCommands[0].arguments && compileCommands[0].arguments.length > 0){
        return compileCommands[0].arguments[0];
    }
    else if(compileCommands[0].command){
        const compilerMatch = /.*(?=\s@)/.exec(compileCommands[0].command);
        if(!compilerMatch || compilerMatch.length === 0){
            return undefined;
        }
        return compilerMatch[0];

    }
    else{
        return undefined;
    }
}

export function getValidatedCompileCommandObjectsFromFileString(file: string): CompileCommand[] | undefined {
    const parsedJson: unknown = parseJson(file);

    if(!isCompileCommandsJson(parsedJson)){
        return;
    }
    return parsedJson;
}


export async function getValidatedCompileCommandObjectsFromUri(compileCommandUri: vscode.Uri | undefined): Promise<CompileCommand[] | undefined> {
    if (!compileCommandUri) {
        console.error(tr.CC_URI_UNDEFINED_IN_GET_CC_OBJ_FROM_JSON);
        return undefined;
    }

    const fileString = await getFileString(compileCommandUri);

    if (!fileString) {
        return undefined;
    }

    return getValidatedCompileCommandObjectsFromFileString(fileString);
}


export async function getFileString(uri: vscode.Uri): Promise<string | undefined> {
    let fileString;
    try {
        fileString = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
    } catch (error) {
        console.error(`${tr.ERR_READING_FILE_path} ${uri.fsPath}`);
        if (error instanceof Error) {
            console.error(error.message);
        }
        return;
    }

    return fileString;
}


function parseJson(jsonString: string) {
    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonString) as unknown;
    } catch (error) {
        console.error(tr.COULDNT_PARSE_JSON_STR);
        if (error instanceof Error) {
            console.error(error.message);
        }
        return undefined;
    }

    return parsedJson;
}


export async function isFile(uri: vscode.Uri) {
    let uriStat;
    try {
        uriStat = await vscode.workspace.fs.stat(uri);
    } catch  {
        return false;
    }

    if(uriStat.type & vscode.FileType.File){
        return true;
    }

    return false;
}


export async function saveFile(content: string, uri: vscode.Uri): Promise<"success" | "error"> {

    const file = new TextEncoder().encode(content);

    try {
        await vscode.workspace.fs.writeFile(uri, file);
    } catch (error) {
        console.error(`Couldn't write file! ${uri.fsPath}`);
        if(error instanceof Error){
            console.error(error.message);
        }
        return "error";
    }

    return "success";
}

export function getUnrealClangdConfig(workspaceFolder: vscode.WorkspaceFolder){
	return vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, workspaceFolder);
}

export async function permDeleteUri(uri: vscode.Uri){
    try {
        await vscode.workspace.fs.stat(uri);
    } catch  {
        console.log(`${tr.NO_NEED_TO_DEL_URI_DOESNT_EXIST_path} ${uri.fsPath}`);
        return true;  // Uri not valid so no need to delete
    }

    try {
        await vscode.workspace.fs.delete(uri, {useTrash:false});
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message);
        }
        return false;
    }

    console.log(`${tr.SUCCESS_DEL_path} ${uri.fsPath}`);
    return true;
}

/**
 * Creates uri by joining compile_commands.json and a uri (bad name and used in old unused code)
 * @param uri 
 * @returns 
 */
export function getUnrealCompileCommandsUriForProject(uri: vscode.Uri){
	return vscode.Uri.joinPath(uri, consts.FILE_NAME_COMPILE_COMMANDS);
}

export async function doesUriExist(uri: vscode.Uri | undefined): Promise<boolean> {
    if (!uri) {
        return false;
    }

    try {
        await vscode.workspace.fs.stat(uri);
    } catch  {
        return false;
    }

    return true;
}

export function getUnrealVersionBypass(workspace: vscode.WorkspaceFolder){
	return vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, workspace).
		get<boolean>(consts.settingNames.unrealClangd.settings['creation.bypassUnrealVersionCheck']);
}


export function getResponsePathFromCompileCommand(compileCommand: CompileCommand, regexStr=consts.REGEX_RESPONSE_COMPILER_FLAG){
    
    if(compileCommand.command){
        return compileCommand.command.match(regexStr)?.[0];
    }
    else if(compileCommand.arguments){
        for (const arg of compileCommand.arguments) {
            if(arg.startsWith('@')){
                return convertWindowsDriveLetterToUpper(arg.slice(1));  // Slice to remove the '@' from the path
            }
        }
    }

    return undefined;
}

export function getRegex(pattern: string, flags?: string) {
    try {
        return new RegExp(pattern, flags);
    } catch (error) {
        logException(error);
        return undefined;
    }
}

export function logException(error: unknown) {
    if(error instanceof Error){
        console.error(error.message);
        return;
    }
    console.error("Exception occurred but it wasn't an instance of Error!");
}


export async function isFolder(uri: vscode.Uri){

    try {
        return !!((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.Directory);
    } catch  {
        return false;
    }
}


export async function getNonEmptyCompileCommandFile(uri: vscode.Uri): Promise<CompileCommandFile | undefined> {
    let ccFile;
    try {
        ccFile = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))) as unknown;
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message);
        }
        console.error(tr.CLDNT_DECODE_CC_FOR_CREATION_HELPER);
        return;
    }

    if(!isCompileCommandsJson(ccFile)){
        return undefined;
    }

    if(ccFile.length < 1){
        console.error(tr.CC_IS_EMPTY);
        return;
    }

    return ccFile;
}


export async function openTextDocument(uri: vscode.Uri, errorMsg: string){
    let textDoc = undefined;

    try {
        textDoc = await vscode.workspace.openTextDocument(uri);
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message);
        }
        console.error(errorMsg);
        return undefined;
    }

    return textDoc;
}


/**
 * @param filePath Any file path string
 * @returns filePath unchanged if not Windows (checks for ':' at index 1)
 */
export function convertWindowsDriveLetterToUpper(filePath: string): string {
    if(filePath.length > 2 && filePath.charAt(1) === ':') {
        return `${filePath.slice(0, 1).toUpperCase()}${filePath.slice(1)}`;
    }

    return filePath;
}


export async function runTerminalCommand(command: string, errorMsg = ""): Promise<{ stdout: string; stderr: string;
} | undefined> {

    const execAsync = promisify(exec);
    try {
        return await execAsync(command);
    } catch(error)  {
        logException(error);
        console.error(`Error when running: ${command}`);
        console.error(errorMsg);
        return undefined;
    }
}

/**
 * 
 * @param parentUri Workspace Uri of VSCode project
 * @param options withExtension default = true
 */
export async function getProjectCompileCommandsName(options: {withExtension: boolean} = {withExtension: true}) {
    const parentUri = getProjectWorkspaceFolder()?.uri;
    if(!parentUri) { return;}
    const vscodeFolderUri = vscode.Uri.joinPath(parentUri, consts.FOLDER_NAME_VSCODE);

    let stat: [string, vscode.FileType][];
    try {
        stat = await vscode.workspace.fs.readDirectory(vscodeFolderUri);
    } catch (error) {
        logException(error);
        return;
    }

    const correctDirName = stat.filter( (value) => {
        const isDirectory = !!(value[1] & vscode.FileType.Directory);
        const correctStartsWith = value[0].startsWith("compileCommands_");
        const correctEndsWith = !value[0].endsWith("Default");
        return isDirectory && correctStartsWith && correctEndsWith;
    });

    if(correctDirName.length !== 1) {
        console.error(`Too many compile command names! ${parentUri.fsPath}`);
        return;
    }

    

    if(options.withExtension){
        return `${correctDirName[0][0]}.json`;
    }
    else{
        return correctDirName[0][0];
    }
}

/**
 * 
 * @param compileCommandsUri uri to compile commands file
 * @param oldFileString if set will compare strings and won't save if equal
 * @param modifiedCcContent the compile commands to save
 * @returns 
 */
export async function writeCompileCommandsFile(compileCommandsUri: vscode.Uri, oldFileString: string | undefined, modifiedCcContent: CompileCommandFile) {
    const newFileString = JSON.stringify(modifiedCcContent, undefined, 4);

    if((oldFileString !== undefined) && (oldFileString === newFileString)){
        console.log(`No changes detected. Will not write file: ${compileCommandsUri.fsPath}`);
        return;
    }

    try {
        await vscode.workspace.fs.writeFile(compileCommandsUri, new TextEncoder().encode(newFileString));
    } catch (error) {
        console.error(tr.CLDNT_WRITE_CC_FILE);
        if(error instanceof Error){
            console.error(error.message);
        }
        return;
    }

    console.log(`Saved file: ${compileCommandsUri.fsPath}`);
}
