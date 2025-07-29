/**
 * This removes the preparse include PCH entry in response files by modifying the response files
 *     This only affects Code Completion response files
 *     It doe not affect Build response files
 * This only runs occaisionally so isn't so bad as using the .clangd file to do it
 * 
 * This can be done with the .clangd file but the cure would be worse than the disease
 *      .clangd remove feature has limitations
 *      .clangd remove flag feature doesn't work with flags with spaces
 *      Using the .clangd file, you'd have to set it up to remove all 'preparse include' flags
 *      and then set it up to add back what you didn't want removed (e.g. different 'definitions' preparse include files)
 *      This can cause .clangd bloat and other problems
 * */ 

import * as vscode from 'vscode';
import * as nodePath from 'path';

import { getUnrealClangdCompileCommandsUri, getFileString, getResponsePathFromCompileCommand, getValidatedCompileCommandObjectsFromUri, isFolder, getProjectCompileCommandsName, saveFile } from "../libs/projHelpers";
import { getProjectWorkspaceFolder } from "../libs/ueHelpers";
import * as ueHelpers from '../libs/ueHelpers';
import type {File} from '../libs/types';
import { EOL } from 'os';

import * as console from '../libs/console';
import { FOLDER_NAME_VSCODE } from '../libs/consts';


export async function startModifyResponseFiles() {

    await vscode.window.withProgress({location: vscode.ProgressLocation.Notification, cancellable:false, title: "Modifying Intellisense files for faster code completion..."},
        async (progress) => {
            await modifyResponseFiles(progress);
        }
    );
}

async function modifyResponseFiles(progress: vscode.Progress<{
    message?: string;
    increment?: number;
}>) {

    const projectUri = getProjectWorkspaceFolder()?.uri;
    if(!projectUri){
        return;
    }

    const rspFolderName = await getProjectCompileCommandsName({withExtension: false});
    if(!rspFolderName) {return;}

    
    const relPat = new vscode.RelativePattern(projectUri, `${FOLDER_NAME_VSCODE}/${rspFolderName}/*.rsp`);
    const rspUris = await vscode.workspace.findFiles(relPat);

    const increment = 100 / rspUris.length;
    const reSharedPCH = new RegExp("^(?:(\/FI|-include).*PCH.*(\r\n|\n))", "m");
    let didntReplace = 0;
    let replaced = 0;
    for (const uri of rspUris) {
        progress.report({increment:increment});

        const rspFileString = await getFileString(uri);
        if(!rspFileString) {continue;}
        
        const newFileString = rspFileString.replace(reSharedPCH, "");

        if(rspFileString === newFileString){
            didntReplace++;
            continue;
        }

        replaced++;
        await saveFile(newFileString, uri);
        
    }

    console.log(`Modified response files: ${replaced.toString()}, unchanged: ${didntReplace.toString()}`);

    //const ueResponseFiles = await getUEResponseFiles();

    //const rspReplacedCount = removePchHeadersFromResponseFiles(responseFiles);
    //const ueRspReplacedCount = removePchHeadersFromResponseFiles(ueResponseFiles);
    //await addMissingSharedResponseFlagsToResponse(responseFiles);  // MARK: TODO TODO TODO Why did we have this?
    

    //if(rspReplacedCount > 0) {await saveFiles(responseFiles);}
    //if(ueRspReplacedCount > 0) {await saveFiles(ueResponseFiles); }

    return;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removePchHeadersFromResponseFiles(rspFiles: File[]){
    console.log("Removing PCH header files from Intellisense...");

    let didntReplace = 0;
    let replaced = 0;
        
    for (const rspFile of rspFiles) {
        const fileString = rspFile.fileString;
        if(!fileString){
            continue;
        }

        const reSharedPCH = new RegExp("^(?:(\/FI|-include).*PCH.*(\r\n|\n))", "m");
        const newFileString = fileString.replace(reSharedPCH, "");

        if(fileString === newFileString){
            didntReplace++;
            continue;
        }

        rspFile.fileString = newFileString;
        replaced++;
    }
    
    console.log(`Replaced: ${replaced.toString()} , Didn't replace/Already replaced: ${didntReplace.toString()}`);
    return replaced;
}

// MARK: TESTING
// eslint-disable-next-line @typescript-eslint/no-unused-vars  
async function addMissingSharedResponseFlagsToResponse(intellisenseRspFiles: File[]) {
    console.log("addMissingSharedResponseFlagsToResponse...");

    const projectUri = getProjectWorkspaceFolder()?.uri;
    if(!projectUri){
        return;
    }
    const compileCommands = await getValidatedCompileCommandObjectsFromUri(getUnrealClangdCompileCommandsUri(projectUri,{withFileName:true}));
    if(!compileCommands){
        return;
    }

    const moduleFolderNameAndUris = await getFolderNameAndUris(vscode.Uri.joinPath(projectUri, "Source"));
    
    const moduleNameAndResponse: {moduleName: string, path: string}[] = [];

    for (const compileCommand of compileCommands) {
        
        const found = moduleFolderNameAndUris.find((value: { name: string; uri: vscode.Uri; }, _index: number, _obj: { name: string; uri: vscode.Uri; }[]) => {
            const modulePath = value.uri.fsPath;
            const ccModulePath = compileCommand.file.slice(undefined, modulePath.length);  // TODO length can be problem?
                        return nodePath.relative(modulePath, ccModulePath) === "";  // arePathsEqual
        });

        if(!found){
            continue;
        }

        const responsePath = getResponsePathFromCompileCommand(compileCommand);
        if(!responsePath){
            continue;
        }

        const alreadyHasModuleName = moduleNameAndResponse.some((value: { moduleName: string; path: string; }, _index: number, _array: { moduleName: string; path: string; }[]) => {
            return value.moduleName === found.name;
        });

        if(alreadyHasModuleName){
            continue;
        }

        moduleNameAndResponse.push({moduleName:found.name, path:responsePath});
        
    }

    
    for (const modAndRsp of moduleNameAndResponse) {
        const relPat = new vscode.RelativePattern(projectUri, `Intermediate/Build/**/UnrealEditor/**/Development/**/${modAndRsp.moduleName}/*.Shared.rsp`);
        const sharedUri = await vscode.workspace.findFiles(relPat, undefined, 1);

        if(sharedUri.length === 0){
            console.error(`Couldn't find Shared rsp for module: ${modAndRsp.moduleName}`);
            continue;
        }

        for (const rspFile of intellisenseRspFiles) {
            if(nodePath.relative(rspFile.uri.fsPath, modAndRsp.path) !== ""){
                continue;
            }

            const sharedFileStr = await getFileString(sharedUri[0]);
            if(!sharedFileStr || !rspFile.fileString){
                console.error(`Couldn't get file string!\n${sharedUri[0].fsPath}\n${rspFile.fileString ?? "undefined"}`);
                break;
            }

            const missingPaths = await findMissingResponseFlags(rspFile.fileString, sharedFileStr);
            if(!missingPaths || missingPaths.length < 1){
                break;
            }
            
            const missingIncludes = createIncludeFlagsFromPaths(missingPaths);
            
            const newLine = rspFile.fileString.endsWith(`\n`) ? "" : EOL;
            rspFile.fileString += `${newLine}${missingIncludes}`;

            break;
        }
    }

}


async function getFolderNameAndUris(folder: vscode.Uri) {
    let directory: [string, vscode.FileType][];
    try {
        directory = await vscode.workspace.fs.readDirectory(folder);
    } catch  {
        console.error(`Couldn't read directory! ${folder.fsPath}`);
        return [];
    }

    const nameAndUris: {name: string, uri: vscode.Uri}[] = [];
    for (const [name, fileType] of directory) {
        if(fileType === vscode.FileType.Directory){
            nameAndUris.push({name:name, uri:vscode.Uri.joinPath(folder, name)});
        }
    }

    return nameAndUris;
}


async function findMissingResponseFlags(rspFileStr: string, sharedFileStr: string) {
    
    // Only include dirs for now
    const reInclude = new RegExp(`(?<=[/-]I\\s?").*(?="\s?)`, "gm");
    const rspIncludes = rspFileStr.matchAll(reInclude);
    const sharedIncludes = sharedFileStr.matchAll(reInclude);

    const ueUri = ueHelpers.getUnrealUri();
    if(!ueUri){
        return;
    }

    const ueWorkingUri = vscode.Uri.joinPath(ueUri, "Engine", "Source");
    // Rsp incude should only be absolute paths. Shared can be either.
    
    let sharedCount = 0;
    const missingIncludePaths: string[] = [];
    for (const sharedInclude of sharedIncludes) {
        sharedCount += 1;

        const sharedIncludePath = sharedInclude[0];
        let sharedAbsPath = "";
        if (nodePath.isAbsolute(sharedIncludePath)) {
            sharedAbsPath = sharedIncludePath;

        }
        else {
            
            const absIncPath = nodePath.resolve(ueWorkingUri.fsPath, sharedIncludePath);
            if(!(await isFolder(vscode.Uri.file(absIncPath)))) {
                console.error(`Path not a real folder in response: ${absIncPath}`);
                continue;
            }
            sharedAbsPath = absIncPath;
        }

        let found = false;
        
        for (const rspInclude of rspIncludes) {
            
            if(nodePath.relative(sharedAbsPath, rspInclude[0]) === ""){
                found = true;
                break;
            }
        }
        
        if(found){
            continue;
        }
        
        console.warning(`Found shared include not in Intellisense Response: ${sharedAbsPath}`);
        missingIncludePaths.push(sharedAbsPath);

    }
    console.log(`Number of shared includes: ${String(sharedCount)}`);
        
    return missingIncludePaths;
}


function createIncludeFlagsFromPaths(missingPaths: string[]) {
    const includeFlagOnlyWithSpace = process.platform === "win32" ? "/I " : "-I";

    let i = 0;
    let includeFlags = "";
    for (const path of missingPaths) {
        i += 1;
        
        const missingPath = process.platform !== "win32" ? path : `${path[0].toUpperCase()}${path.slice(1)}`;
        const endOfLine = i !== missingPaths.length ? EOL : "";
        includeFlags += `${includeFlagOnlyWithSpace}"${missingPath}" ${endOfLine}`;
    }

    return includeFlags;

}
