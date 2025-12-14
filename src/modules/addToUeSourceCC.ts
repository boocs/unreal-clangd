
import * as vscode from 'vscode';
import * as nodePath from 'path';

import type { CompileCommand } from "../libs/types";
import * as consts from '../libs/consts';
import * as ueHelpers from '../libs/ueHelpers';
import { convertWindowsDriveLetterToUpper, getCompilerFromCompileCommands, getProjectCompileCommandsName, getValidatedCompileCommandObjectsFromUri, writeCompileCommandsFile } from '../libs/projHelpers';
import { getRspMatchers, restartClangd } from '../shared';

import * as console from '../libs/console';


export async function startAddFilesToUESourceCompileCommands( currentDocUri: vscode.Uri) {

    // Check if Unreal workspace
    const currentDocWorkspace = vscode.workspace.getWorkspaceFolder(currentDocUri);
    if (currentDocWorkspace?.name !== "UE5") {
        return;
    }

    const ueUri = ueHelpers.getUnrealUri();
    if (!ueUri) {
        return;
    }

    const toSave = await addFilesToUESourceCompileCommands(ueUri, currentDocUri);

    if(!toSave){
        return;
    }

    const [ueSelfCompileCommandsUri, ueSelfCompileCommands] = toSave;

    await writeCompileCommandsFile(ueSelfCompileCommandsUri, undefined, ueSelfCompileCommands);
    //await execSetPreParseIncludesInClangdCfg(ueUri);

    await restartClangd();

}


async function addFilesToUESourceCompileCommands(
    ueUri: vscode.Uri,
    currentDocUri: vscode.Uri,
    friendFileInfo: { origCC: CompileCommand[], compiler: string } | undefined = undefined): Promise<[vscode.Uri, CompileCommand[]] | undefined> {

    const parsedCurrentFilePath = nodePath.parse(currentDocUri.fsPath);

    const isSourceFile =  consts.SOURCE_FILE_EXTENSIONS.some((value: string, _index: number, _array: string[]) => {
        return value === parsedCurrentFilePath.ext;
    });

    if(!isSourceFile){
        return;
    }

    let ueSelfCompileCommands: CompileCommand[] | undefined;
    const ueSelfCompileCommandsUri = vscode.Uri.joinPath(ueUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, consts.FILE_NAME_COMPILE_COMMANDS);
    
    if(!friendFileInfo){
        
        ueSelfCompileCommands = await getValidatedCompileCommandObjectsFromUri(ueSelfCompileCommandsUri);

        ueSelfCompileCommands ??= [];
    }
    else {
        ueSelfCompileCommands = friendFileInfo.origCC;
    }
    
    if (isPathInCompileCommands(ueSelfCompileCommands, currentDocUri.fsPath)) {
        // Already there so return
        return;
    }
    

    const projectUri = ueHelpers.getProjectWorkspaceFolder()?.uri;
    if(!projectUri){
        return;
    }

    if(getRspMatchers().length === 0){
        console.error("No Rsp Matchers found!");        
        return;
    }

    
    const rspPathRelative = getSourceFileRspPathMatch(ueUri, currentDocUri);

    if(!rspPathRelative){
        if(isErrorNoRspPathMatch(projectUri)){
            console.error(`No RSP path match found for: ${currentDocUri.fsPath}`);
        }
        else {
            console.warn(`No RSP path match found for: ${currentDocUri.fsPath}`);
        }
        return;
    }

    const ccName = await getProjectCompileCommandsName();
    if(!ccName) { return;}

    const ueCCWithCompiler = ueSelfCompileCommands.length > 0 ? ueSelfCompileCommandsUri : vscode.Uri.joinPath(ueUri, consts.FOLDER_NAME_VSCODE, ccName);
    const ccCompiler = friendFileInfo?.compiler ?? await getCompilerFromCompileCommands(ueCCWithCompiler);

    if(!ccCompiler){
        console.error("Couldn't get compiler from compile commands!");
        return;
    }
    
    const ueCompileCommand = createUESourceCompileCommand(ueUri, projectUri, currentDocUri.fsPath, ccCompiler, rspPathRelative);

    ueSelfCompileCommands.push(ueCompileCommand);

    if (friendFileInfo === undefined) {
        console.log(`Adding file to UE compile commands: ${currentDocUri.fsPath}`);
        console.log(`   Relative rsp path: ${rspPathRelative}`);

        const friendUri: vscode.Uri | undefined = await findFriendUri(currentDocUri);
        if (friendUri) {
            await addFilesToUESourceCompileCommands(ueUri, friendUri, { origCC: ueSelfCompileCommands, compiler: ccCompiler });
        }

        return [ueSelfCompileCommandsUri, ueSelfCompileCommands];
        
    }

    return;
}


function isPathInCompileCommands(compileCommands: CompileCommand[], pathToCheck: string) {
    
    return compileCommands.some((value: CompileCommand, _index: number, _array: CompileCommand[]) => {
        
        if(nodePath.relative(value.file, pathToCheck) === ""){
            return true;
        }

        return false;
    });

    
}



function getSourceFileRspPathMatch( parentUri: vscode.Uri, fileUri: vscode.Uri){

    const rspMatcherPaths: {rspPath: string, closeness: number}[] = [];

    const rspMatchers = getRspMatchers();

    for (const matcher of rspMatchers) {
        const dirPath = vscode.Uri.joinPath(parentUri, matcher.ueDirRelative);
        const pathTest = nodePath.relative(dirPath.fsPath, fileUri.fsPath);
        
        if(pathTest === ""){
            rspMatcherPaths.push({rspPath:matcher.rspRelative, closeness:0});
            break;
        }

        if(pathTest.startsWith("..")){
            continue;
        }

        const closeness = pathTest.split(/[/\\]/).length;
        rspMatcherPaths.push({rspPath:matcher.rspRelative, closeness:closeness});
    }

    if(rspMatcherPaths.length === 1){
        return rspMatcherPaths[0].rspPath;
    }
    else if(rspMatcherPaths.length === 0){
        return undefined;
    }

    // TODO TEST THIS------------------------------------------------------------------------
    rspMatcherPaths.sort((a,b) => {
        if(a.closeness < b.closeness){
            return -1;
        }
        else if(a.closeness === b.closeness){
            return 0;
        }
        else{
            return 1;
        }

    });

    return rspMatcherPaths[0].rspPath;
}


function createUESourceCompileCommand(ueUri: vscode.Uri, projectUri: vscode.Uri, file: string, compilerPath: string, rspRelative: string): CompileCommand {
    const ccDirectory = vscode.Uri.joinPath(ueUri, consts.FOLDER_NAME_ENGINE, consts.FOLDER_NAME_SOURCE);
    const rspPath = vscode.Uri.joinPath(projectUri, rspRelative);

    return {
        file: convertWindowsDriveLetterToUpper(file),
        arguments: [
            compilerPath,
            `@${convertWindowsDriveLetterToUpper(rspPath.fsPath)}`
        ],
        directory: convertWindowsDriveLetterToUpper(ccDirectory.fsPath),
    };
}



async function findFriendUri(uri: vscode.Uri) {
	
	const workspace = vscode.workspace.getWorkspaceFolder(uri);
	if(!workspace){
		return;
	}

	const parsedPath = nodePath.parse(uri.fsPath);
	const relPat = new vscode.RelativePattern(workspace, `**/${parsedPath.name}.{h,cpp}`);
	const foundUris = await vscode.workspace.findFiles(relPat);

	const friendFiles: vscode.Uri[] = [];
	for (const foundUri of foundUris) {
		const parsedFound = nodePath.parse(foundUri.fsPath);
		if(parsedPath.ext === parsedFound.ext){
			continue;
		}

		friendFiles.push(foundUri);
	}

	if(friendFiles.length === 1){
		return friendFiles[0];
	}
	else if(friendFiles.length === 0){
		return undefined;
	}

	return findClosestUri(friendFiles, uri);
}


function findClosestUri(uris: vscode.Uri[], targetUri: vscode.Uri) {
    let minDistance = Infinity;
    let closestUri = vscode.Uri.file("");

    for (const uri of uris) {
        
        const uriParts = uri.fsPath.split(/[\\/]/);
        const targetUriParts = targetUri.fsPath.split(/[\\/]/);
        
        let distance = 0;
        
        // Add the difference in length to the distance.
        distance += Math.abs(uriParts.length - targetUriParts.length);

        if (distance < minDistance) {
            minDistance = distance;
            closestUri = uri;
        }
    }

    return closestUri;
}


function isErrorNoRspPathMatch(configScopeUri: vscode.Uri) {

    const config = vscode.workspace.getConfiguration("unreal-clangd.gui", configScopeUri);

    const value = config.get<string[]>("errorToWarning", []);

    if(value.includes("no-rsp-path-match")){
        return false;
    }
    
    return true;
}

