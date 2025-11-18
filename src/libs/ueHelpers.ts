// Unreal project helpers for VScode extensions



import * as vscode from 'vscode';
import * as console from './console';
import * as consts from './consts';
import type { UnrealPlatform } from './indexTypes';
import { doesUriExist, getFileString, getProjectCompileCommandsName, getWorkspaceFileUri, logException } from './projHelpers';
import * as tr from '../tr/text';
import type {File} from '../libs/types';


const WORKSPACE_FOLDER_NAME_UE4 = "UE4";
const WORKSPACE_FOLDER_NAME_UE5 = "UE5";
export const PROJECT_UPROJECT_FILE_EXT = ".uproject";
const ENDING_VERSION_HEADER_PATH = "Engine/Source/Runtime/Launch/Resources/Version.h";
const RE_UE_VERSION = /(?<=#define\s+ENGINE_(?:MAJOR|MINOR|PATCH)_VERSION\s+)\d+/gm;

const FULL_SOURCE_FILE_TESTERS = [
    "GenerateProjectFiles.bat",
    "GenerateProjectFiles.sh",
    "GenerateProjectFiles.command"
];

const MAX_VERSION_NUMS = 3;
export interface UnrealVersion {
    major: number,
    minor: number,
    patch: number
}

/* interface Module {
    "Name": string
} */

/* interface UprojectFile {
    "Modules": Module[]
} */


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
export function getUnrealVersionFrom(file: string | undefined, reVersion: RegExp = RE_UE_VERSION): UnrealVersion | undefined {

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

export async function getUnrealVersion() {
	const ueUri = getUnrealVersionUri();
	if (!ueUri) {
		console.error(tr.COULDNT_GET_UE_VERSION_HEADER_URI);
		return undefined;
	}

	const unrealVersionFile = await getFileString(ueUri);

	return getUnrealVersionFrom(unrealVersionFile);
}


/**
 * 
 * @param version 
 * @returns "#.#.#" (major.minor.patch)
 */
export function versionToString(version: UnrealVersion): string {
    return `${version.major.toString()}.${version.minor.toString()}.${version.patch.toString()}`;
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
    const workspaceFileUri = getWorkspaceFileUri();
    
    if (!workspaceFileUri || !vscode.workspace.workspaceFolders) {
        console.error("No workspace folders found!");
        return undefined;
    }

    return vscode.workspace.getWorkspaceFolder(workspaceFileUri);
}


export async function isUnrealProject(): Promise<boolean> {
    const workspaceUri = vscode.workspace.workspaceFile;
    

    if (!workspaceUri || !workspaceUri.fsPath.endsWith(".code-workspace") || !vscode.workspace.workspaceFolders) {
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

export function getMainSourceFolderUri(folderName: string = consts.FOLDER_NAME_SOURCE) {
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
            console.error(error.message);
        }
        return;
    }
}


/* export async function getModuleNames(uprojectUri: vscode.Uri | undefined): Promise<string[] | undefined> {
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
    
} */

export async function getBuildTargetNames(topItemContains: string | undefined = undefined): Promise<string[] | undefined> {
    const mainSourceFolderUri = getMainSourceFolderUri();

    if(!mainSourceFolderUri){
        console.error("Couldn't get main source folder uri!");
        return;
    }

    let soureFileType;
    try {
        soureFileType = await vscode.workspace.fs.readDirectory(mainSourceFolderUri);
    } catch (error) {
        logException(error);
        console.error(`Couldn't read directory: ${mainSourceFolderUri.fsPath}`);
        return;
    }
    

    const targetNames = [];
    for (const ft of soureFileType) {
        if(ft[1] !== vscode.FileType.File){
            continue;
        }
        
        if(!ft[0].endsWith(consts.UNREAL_BUILD_TARGET_FILE_EXTENSION)){
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

/**
 * @param workspace 
 * @param relativePathsToCheck If any of these are found this function will return true
 * @returns true/false or undefined if workspace is undefined
 */
export async function isFullSourceUnrealEngine(workspace: vscode.WorkspaceFolder, relativeFilePathsToCheck = FULL_SOURCE_FILE_TESTERS): Promise<boolean> {
    
    for (const fileNames of relativeFilePathsToCheck) {
        
        const fullPath = vscode.Uri.joinPath(workspace.uri, fileNames);
         
        try {
            // Check if the file exists asynchronously
            const fileStats = await vscode.workspace.fs.stat(fullPath);
            if (fileStats.type === vscode.FileType.File) {
                return true;  // File found, it's likely a full source Unreal Engine
            }
        } catch  {
            continue; // We continue because just because one of these files doesn't exist doesn't mean it's not full source
        }
    }

    return false;  // No files found, not a full source Unreal Engine
}


export async function getUbtPath(ueUri: vscode.Uri | undefined) {

    if (!ueUri) {
        console.error("Uri send to getUbtPath was undefined");
        return null;
    }

    const unixUBTWrapperScripUri = vscode.Uri.joinPath(ueUri, ...consts.END_UBT_SCRIPT_FILE_NAMES_UNIX);
    if(process.platform.toLocaleLowerCase() !== "win32" && await doesUriExist(unixUBTWrapperScripUri)) {
        // We are in Unix, so call wrapper script of UBT to use dotnet from Unreal Engine.
        // That's 'RunUBT.sh'.
        return unixUBTWrapperScripUri.fsPath;
    }

    const winUBTWrapperScripUri = vscode.Uri.joinPath(ueUri, ...consts.END_UBT_SCRIPT_FILE_NAMES_WIN);
    if(process.platform === "win32" && await doesUriExist(winUBTWrapperScripUri)) {
        // We are in Windows, so call wrapper script of UBT to use dotnet from Unreal Engine.
        // That's 'RunUBT.bat'.
        return winUBTWrapperScripUri.fsPath;
    }

    const ubtDirUri = vscode.Uri.joinPath(ueUri, ...consts.END_DIRECTORY_NAMES_TO_UNREAL_BUILD_TOOL);

    if (!(await doesUriExist(ubtDirUri))) {
        console.error(`${tr.UBT_PATH_DOESNT_EXIST} (${ubtDirUri.fsPath})`);
        return null;
    }

    const ubtAppUri = vscode.Uri.joinPath(ubtDirUri, consts.UNREAL_BUILD_TOOL_APP_NAME);

    return ubtAppUri.fsPath;

}


export function getUnrealPlatform(platform: NodeJS.Platform): UnrealPlatform | undefined {
    switch (platform) {
        case "win32":
            return "Win64";
            break;
        case "linux":
            return "Linux";
            break;
        case "darwin":
            return "Mac";
            break;
        default:
            return undefined;
            break;
    }
}


export async function getUEResponseFiles(): Promise<File[]> {
	
	const ueUri = getUnrealUri();
	if(!ueUri){
		return [];
	}


    const ccName = await getProjectCompileCommandsName({withExtension: false});
    if(!ccName) {return [];}
	const relPat = new vscode.RelativePattern(vscode.Uri.joinPath(ueUri, consts.FOLDER_NAME_VSCODE, ccName), "*.rsp");
	const ueRspUris = await vscode.workspace.findFiles(relPat);

	if(ueRspUris.length === 0){
		console.error("Couldn't find any UE response files!");
		return [];
	}

	const responseFiles: File[] = [];

	for (const uri of ueRspUris) {
		const fileString = await getFileString(uri);

		if(!fileString){
			continue;
		}

		responseFiles.push({
			fileString: fileString,
			uri: uri
		});
	}

	return responseFiles;
}
