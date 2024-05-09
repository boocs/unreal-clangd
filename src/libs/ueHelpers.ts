// Unreal project helpers for VScode extensions



import * as vscode from 'vscode';
import * as console from './console';
import { FOLDER_NAME_SOURCE, UNREAL_BUILD_TARGET_FILE_EXTENSION } from './consts';
import { TextDecoder } from 'util';
import * as pPath from 'path';


const WORKSPACE_FOLDER_NAME_UE4 = "UE4";
const WORKSPACE_FOLDER_NAME_UE5 = "UE5";
export const PROJECT_UPROJECT_FILE_EXT = ".uproject";
const ENDING_VERSION_HEADER_PATH = "Engine/Source/Runtime/Launch/Resources/Version.h";
const RE_UE_VERSION = /(?<=#define\s+ENGINE_(?:MAJOR|MINOR|PATCH)_VERSION\s+)\d+/gm;

const MAX_VERSION_NUMS = 3;
export interface UnrealVersion {
    major: number,
    minor: number,
    patch: number
}

interface Module {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Name": string
}

interface UprojectFile {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Modules": Module[]
}


export function getUnrealUri(): vscode.Uri | undefined  {
    return getUnrealWorkspaceFolder()?.uri;
}

// TODO This may need to be changed if version's path is different in different unreal versions
export function getUnrealVersionUri(pathSuffix: string = ENDING_VERSION_HEADER_PATH) {
    const unrealUri = getUnrealUri();

    if(!unrealUri){
        console.error("Couldn't get Unreal uri!");
        return null;
    }

    return vscode.Uri.joinPath(unrealUri, pathSuffix);
}

/**
 * 
 * @param unrealUri Holds path to Unreal Engine directory
 * @returns 
 */
export function getUnrealVersion(file: string | undefined, reVersion: RegExp = RE_UE_VERSION): UnrealVersion | undefined {

    if(!file) {
        console.error(`Version file was empty!`);
        return undefined;
    }
    
    const foundVersion = file.match(reVersion);

    if(!foundVersion || foundVersion.length < MAX_VERSION_NUMS){
        console.error(`Error finding version using regex: ${reVersion.source.toString()}`);
        return undefined;
    }


    return { major: +foundVersion[0], minor: +foundVersion[1], patch: +foundVersion[2] };
}

/**
 * 
 * @param version 
 * @returns "#.#.#" (major.minor.patch)
 */
export function versionToString(version: UnrealVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
}

export function getUnrealWorkspaceFolder(): vscode.WorkspaceFolder | undefined {

    if (!vscode.workspace.workspaceFolders) {
        console.error("No workspace folders found!");
        return undefined;
    }

    return vscode.workspace.workspaceFolders.find(
        (workspaceFolder) => {
            return workspaceFolder.name === WORKSPACE_FOLDER_NAME_UE5 || workspaceFolder.name === WORKSPACE_FOLDER_NAME_UE4;
        });

}


export function getProjectWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const workspaceFileUri = vscode.workspace.workspaceFile;
    
    if (!workspaceFileUri || !vscode.workspace.workspaceFolders) {
        console.error("No workspace folders found!");
        return undefined;
    }

    const workspaceFileFolderPath = pPath.parse(workspaceFileUri.fsPath).dir;

    for (const folder of vscode.workspace.workspaceFolders) {
                
        if(workspaceFileFolderPath === folder.uri.fsPath){
            return folder;
        }
        
    }

    return undefined;
}


export async function isUnrealProject(): Promise<boolean> {
    const workspaceUri = vscode.workspace.workspaceFile;
    

    if (!workspaceUri || !vscode.workspace.workspaceFolders) {
        console.error("No workspace folders found!");
        return false;
    }

    for (const folder of vscode.workspace.workspaceFolders) {
        
        
        if (folder.name === WORKSPACE_FOLDER_NAME_UE5 || folder.name === WORKSPACE_FOLDER_NAME_UE4) { // Skip the Unreal Engine folder
            continue;
        }

        const folderFiles = await vscode.workspace.fs.readDirectory(folder.uri);

        for (const file of folderFiles) {
            if (file[0].includes(PROJECT_UPROJECT_FILE_EXT)) {
                return true;
            }
        }
    }

    return false;
}


export async function getUProjectFileName(projectWorkspaceFolder:vscode.WorkspaceFolder | undefined) {

    if(!projectWorkspaceFolder){
        console.error("getUnrealProjectName received empty projectWorkspaceFolder!");
        return;
    }
    
    const projectDirContents = await vscode.workspace.fs.readDirectory(projectWorkspaceFolder.uri);

    const uprojectFileName = projectDirContents.find(value => {

        return value[0].endsWith(PROJECT_UPROJECT_FILE_EXT);
    });

    if(!uprojectFileName){
        console.error("Couldn't find uproject file for getUnrealProjectName");
        return null;
    }

    return uprojectFileName[0];

}

export async function getMainSourceFolderUri(folderName: string = FOLDER_NAME_SOURCE) {
    const mainWorkspaceFolderUri = getProjectWorkspaceFolder()?.uri;

    if(!mainWorkspaceFolderUri){
        console.error("Couldn't get mainProjectWorkspace!");
        return;
    }

    return vscode.Uri.joinPath(mainWorkspaceFolderUri, folderName);
}

export async function getUprojectUri(): Promise<vscode.Uri | undefined> {
    const projectWorkspaceFolder = getProjectWorkspaceFolder();
    const uprojectFilename = await getUProjectFileName(projectWorkspaceFolder);

    if(!projectWorkspaceFolder || !uprojectFilename){
        console.error(`Couldn't get uproject vars!`);
        return;
    }

    try {
        return vscode.Uri.joinPath(projectWorkspaceFolder.uri, uprojectFilename);
    } catch (error) {
        console.error("Couldn't join project workspace folder Uri and uproject file name!");
        if(error instanceof Error){
            console.error(`${error.message}`);
        }
        return;
    }
}


export async function getModuleNames(uprojectUri: vscode.Uri | undefined): Promise<string[] | undefined> {
    if(!uprojectUri){
        console.error("Uproject uri is undefined in getModuleNames!");
        return;
    }

    let uprojectFile: UprojectFile;
    try {
        uprojectFile = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(uprojectUri)));
    } catch (error) {
        console.error("Error reading uproject file!");
        if(error instanceof Error){
            console.error(`${error.message}`);
        }
        return;
    }

    if(!uprojectFile){
        console.error("Nothing found in uproject file string!");
        return;
    }

    const moduleNames = [];

    for (const module of uprojectFile.Modules) {
        moduleNames.push(module.Name);
    }

    return moduleNames;
    
}

export async function getBuildTargetNames(topItemContains: string | undefined = undefined): Promise<string[] | undefined> {
    const mainSourceFolderUri = await getMainSourceFolderUri();

    if(!mainSourceFolderUri){
        console.error("Couldn't get main source folder uri!");
        return;
    }

    const soureFileType =  await vscode.workspace.fs.readDirectory(mainSourceFolderUri);

    const targetNames = [];
    for (const ft of soureFileType) {
        if(ft[1] !== vscode.FileType.File){
            continue;
        }
        
        if(!ft[0].endsWith(UNREAL_BUILD_TARGET_FILE_EXTENSION)){
            continue;
        }

        targetNames.push(ft[0].split('.')[0]);
    }

    if(topItemContains){
        const index = targetNames.findIndex((value: string) => {
            return value.includes(topItemContains);
        });

        if(index === -1){
            return targetNames;
        }

        return targetNames.splice(index, 1).concat(targetNames);

    }else{
        return targetNames;
    }
    
}