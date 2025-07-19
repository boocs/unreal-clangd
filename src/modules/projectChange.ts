
import * as vscode from 'vscode';

import { getProjectWorkspaceFolder, getUnrealUri } from "../libs/ueHelpers";
import { getUnrealClangdCfgUri, hasClangdProjectFiles } from "../shared";
import * as yaml from 'yaml';

import * as console from '../libs/console';
import { getFileString, getProjectCompileCommandsName, getUnrealClangdCompileCommandsUri, getValidatedCompileCommandObjectsFromFileString, saveFile } from "../libs/projHelpers";
import { YAML_OPTIONS_DEFAULT } from '../libs/consts';
import { createUnrealCompileCommands, FILENAME_MACRO_COMP_HELPER, getMacroCompletionHelperPath } from './completionFiles';
import { getFullPreparseIncludeLine } from './preParseIncludes';



/**
 * Check if switched to new project by checking if all rsp file paths, in Unreal compile_commands.json, are in any current workspace.
 */
export async function isProjectChange() {  
    const projectWorkspace = getProjectWorkspaceFolder();
        if(!projectWorkspace) { return;}
    
        // Only run convert if current project is a unreal clangd project
        if(! (await hasClangdProjectFiles(projectWorkspace ))) { 
            console.warning("Current project isn't a unreal clangd project. Will not run Unreal compile commands converter.");
            return;
        }
    
        const ueUri = getUnrealUri();
    
        if(!ueUri) { return; }
    
        const ccUri = getUnrealClangdCompileCommandsUri(ueUri, {withFileName: true});
    
        const fileString = await getFileString(ccUri);
        if(!fileString) {
            console.warning("This is probably not an error. Unreal compile commands is dynamic and might not be created yet.");
            return;
        }
    
        const ccJson = getValidatedCompileCommandObjectsFromFileString(fileString);
    
        if(!ccJson || ccJson.length === 0) {return;}
    
        const ccRspFolderName = await getProjectCompileCommandsName({withExtension: false});
        if(!ccRspFolderName) {return;}
    
        //const rspFolderUri = vscode.Uri.joinPath(ueUri, FOLDER_NAME_VSCODE, ccRspFolderName);
    
        //let hasCompletionHelperEntry = false;
        //const newCC: CompileCommand[] = [];
        for (const cc of ccJson) {
            if(!cc.arguments) {
                console.error("Detected unsupported compile command entry! Returning 'true' for isProjectChange()");
                return true;                
            }

            for (const arg of cc.arguments) {
                if(!arg.startsWith('@')) {continue;}

                const rspPath = arg.slice(1);

                let rspUri: vscode.Uri;
                try {
                    rspUri = vscode.Uri.file(rspPath);
                } catch {
                    console.error(`Returning 'true' for isProjectChange(). Couldn't convert string path to file Uri! ${rspPath}`);
                    return true;
                }

                if(vscode.workspace.getWorkspaceFolder(rspUri) === undefined) {
                    console.log("***** New project detected *****");
                    return true;
                }
            }
        }

        return false;
}

export async function onProjectChange() {
    await createUnrealCompileCommands();
    await updateUnrealClangdCfgForProjectChange();  // MARK: NO LONGER DO THIS
}


/**
 * We update macroCompletionHelper.h path to current project
 */
async function updateUnrealClangdCfgForProjectChange() {
    const clangdCfgUri = getUnrealClangdCfgUri();
    if(!clangdCfgUri) {return;}

    const fileStr = await getFileString(clangdCfgUri);
    if(!fileStr) {return;}

    const allDocs = yaml.parseAllDocuments(fileStr);
    if('empty' in allDocs){
        console.error("Unreal clangd cfg was empty!");
        return;
    }

    const newDocStrings: string[] = [];
    const searchValue = ["CompileFlags", "Add"];
    for (const doc of allDocs) {
        if(!doc.hasIn(searchValue)) {
            newDocStrings.push(yaml.stringify(doc, YAML_OPTIONS_DEFAULT));
            continue;
        }
        
        const compFlagsAdd = doc.getIn(searchValue);
            
        if(!yaml.isSeq(compFlagsAdd) || !yaml.isSeq<yaml.Scalar<string>>(compFlagsAdd)){ 
            newDocStrings.push(yaml.stringify(doc, YAML_OPTIONS_DEFAULT));
            continue; 
        }

        const newAdds: yaml.Scalar<string>[] = [];
       
        for (const addValue of compFlagsAdd.items) {
            if(!addValue.value.includes(FILENAME_MACRO_COMP_HELPER)) {
                newAdds.push(addValue);
                continue;
            }

            const macroHelperPath = getMacroCompletionHelperPath();
            if(!macroHelperPath) {return;}
        
            newAdds.push(new yaml.Scalar(getFullPreparseIncludeLine(macroHelperPath)));

        }

        doc.setIn(searchValue, newAdds);

        newDocStrings.push(yaml.stringify(doc, YAML_OPTIONS_DEFAULT));
    }

    const newFileString = newDocStrings.join("");

    await saveFile(newFileString, clangdCfgUri);

}
