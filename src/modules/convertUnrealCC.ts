/**
 * When switching projects convert the Unreal compile commands to the new project
 */

// import * as vscode from 'vscode';


// import { convertWindowsDriveLetterToUpper, getFileString, getProjectCompileCommandsName, getUnrealClangdCompileCommandsUri, getValidatedCompileCommandObjectsFromFileString, getValidatedCompileCommandObjectsFromUri, isFile, writeCompileCommandsFile } from "../libs/projHelpers";
// import { CompileCommand } from "../libs/types";
// import { getProjectWorkspaceFolder, getUnrealUri } from "../libs/ueHelpers";

// import * as nodePath from 'node:path';
// import { FILE_NAME_COMPILE_COMMANDS, FILE_NAME_COMPLETION_HELPER, FOLDER_NAME_UNREAL_CLANGD, FOLDER_NAME_VSCODE } from '../libs/consts';

// import * as console from '../libs/console';
// import { hasClangdProjectFiles } from '../shared';


// async function startConvertUnrealCompileCommands() {

//     const projectWorkspace = getProjectWorkspaceFolder();
//     if(!projectWorkspace) { return;}

//     // Only run convert if current project is a unreal clangd project
//     if(! (await hasClangdProjectFiles(projectWorkspace ))) { 
//         console.warning("Current project isn't a unreal clangd project. Will not run Unreal compile commands converter.");
//         return;
//     }

//     const ueUri = getUnrealUri();

//     if(!ueUri) { return; }

//     const ccUri = getUnrealClangdCompileCommandsUri(ueUri, {withFileName: true});

//     const fileString = await getFileString(ccUri);
//     if(!fileString) {
//         console.warning("This is probably not an error. Unreal compile commands is dynamic and might not be created yet.");
//         return;
//     }

//     const ccJson = getValidatedCompileCommandObjectsFromFileString(fileString);

//     if(!ccJson || ccJson.length === 0) {return;}

//     const ccRspFolderName = await getProjectCompileCommandsName({withExtension: false});
//     if(!ccRspFolderName) {return;}

//     const rspFolderUri = vscode.Uri.joinPath(ueUri, FOLDER_NAME_VSCODE, ccRspFolderName);

//     let hasCompletionHelperEntry = false;
//     const newCC: CompileCommand[] = [];
//     for (const cc of ccJson) {
        
//         if(!cc.arguments || !(cc.arguments.length >= 2) || !cc.arguments[1].startsWith("@")) {
//             console.warning(`Unreal compile command entry seems improper: ${cc.file}`);
//             continue;
//         }

//         if(cc.file.includes(FILE_NAME_COMPLETION_HELPER)) {  // Handle completion helper entry
//             hasCompletionHelperEntry = true;

//             const completionHelperUri = vscode.Uri.joinPath(projectWorkspace.uri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, FILE_NAME_COMPLETION_HELPER);

//             if(!(await isFile(completionHelperUri))) { // If current project doesn't have a completion helper file
//                 console.error("Current project is a unreal clangd project but doesn't have a completion helper file!");
//                 newCC.push(cc); // We keep the old completion helper entry for now
//                 continue;
//             }

//             const completionHelperCCEntry = await getProjectCompletionHelperCompileCommandsEntry();
//             if(!completionHelperCCEntry) { continue; }

//             newCC.push(completionHelperCCEntry);
            
//             continue;
//         }
        
//         const rspFileName = nodePath.parse(cc.arguments[1].slice(1)).base;

//         const projectRspFilePath = await convertFileToCurrentProjectsPath(rspFolderUri, rspFileName);
//         if(!projectRspFilePath) {continue;}
              
//         newCC.push({
//             file: cc.file,
//             arguments: [
//                 cc.arguments[0],
//                 `@${projectRspFilePath}`
//             ],
//             directory: cc.directory,
            
//         });
//     }

//     await writeCompileCommandsFile(ccUri, fileString, newCC);

//     if(!hasCompletionHelperEntry){
//         console.error("Completion helper not found in Unreal compile_commands.json!");
//         console.error("Run command `Update compile commands file (refresh project)` to fix this.");
//     }
//     console.log("Checked if needed to convert Unreal compile commands to current project.");
// }


// async function convertFileToCurrentProjectsPath(rspFolderUri: vscode.Uri, rspFileName: string) {
    
//     const globFileName = rspFileName.replace(/(?<=\.)\d+(?=\.)/, "*");
//     const relPat = new vscode.RelativePattern(rspFolderUri, globFileName);

//     const foundFile = await vscode.workspace.findFiles(relPat,  undefined, 1);

//     if(foundFile.length === 0){
//         console.warning(`Couldn't convert rsp file name: ${rspFileName}`);
//         return;
//     }

//     return convertWindowsDriveLetterToUpper(foundFile[0].fsPath);
// }


// async function getProjectCompletionHelperCompileCommandsEntry() {
//     const projectUri = getProjectWorkspaceFolder()?.uri;
//     if(!projectUri) { return; }

//     const projectCCUri = vscode.Uri.joinPath(projectUri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, FILE_NAME_COMPILE_COMMANDS);

//     const ccs = await getValidatedCompileCommandObjectsFromUri(projectCCUri);

//     if(!ccs) {return;}

//     for (const cc of ccs) {
//         if(cc.file.includes(FILE_NAME_COMPLETION_HELPER)){
//             console.log("Unreal CC converter: Found project completion helper entry in compile_commands.json.");
//             return cc;
//         }
//     }

//     console.warning("Unreal CC converter: Didn't find project completion helper entry in compile_commands.json");
// }

