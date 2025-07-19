// We don't really use this any more since we use "Native" intellisense now.

import * as vscode from 'vscode';

import * as ueHelpers from "../libs/ueHelpers";
import { getIntellisenseType } from '../shared';
import * as consts from '../libs/consts';
import * as tr from '../tr/text';

import type {File} from '../libs/types';

export function startFixResponseFiles() {
    console.log("Fixing intellisense files...");
        
        const mainWorkspace: vscode.WorkspaceFolder | undefined = ueHelpers.getProjectWorkspaceFolder();
        if(!mainWorkspace){
            return;
        }

        if(getIntellisenseType() === "Native"){
            console.log("Running Native update Fix Intellisense files...");
            return;
        }

       /*  const gcdRelativePattern = new vscode.RelativePattern(mainWorkspace, consts.GLOB_GCD_FILES);

        const responseFiles = await getResponseFileUris(gcdRelativePattern);
        if (!responseFiles) {
            console.error(tr.COULDNT_CREATE_RSP_FILES);
            return;
        }

        await fixResponseFiles(responseFiles); */

        console.log(tr.END_FIXING_RSP_FILES_QUOTED_PATHS);
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getResponseFileUris(relativePattern: vscode.RelativePattern): Promise<File[] | null> {

    const gcdFileUris = await vscode.workspace.findFiles(relativePattern);

    if (gcdFileUris.length < 1) {
        console.error("No GCD files found!");
        return null;
    }

    const responseFiles: File[] = [];
    for (const gcdUri of gcdFileUris) {
        
        responseFiles.push({
            uri: gcdUri,
            fileString: ""
        });
    }

    return responseFiles;
}



// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fixResponseFiles(responseFiles: File[]) {
    await createResponseFileStrings(responseFiles);

    fixResponseStrings(responseFiles);

    await saveFixedResponseStrings(responseFiles);
}


async function createResponseFileStrings(responseFiles: File[]) {
    for (const responseFile of responseFiles) {

        let file;
        try {
            file = await vscode.workspace.fs.readFile(responseFile.uri);
        } catch (error) {
            console.error(`${tr.ERR_READING_RSP_FILE_path} ${responseFile.uri.fsPath}`);
            if (error instanceof Error) {
                console.error(error.message);
            }
            continue;
        }

        const fileString = new TextDecoder().decode(file);
        if (!fileString) {
            continue;
        }
        responseFile.fileString = fileString;
    }

    return;
}


function fixResponseStrings(responseFiles: File[]) {

    const re = /(?<=(?:\/I|\/imsvc|-I|-isystem)\s*)(?:(?:\w|\/)(?:[\w:/\s\-.]+?))(?=[\r\n|\r|\n])/gm;
    for (const responseFile of responseFiles) {
        let replacementString = responseFile.fileString?.replace(/""/gm, `"`); // Fix double quote (UE 5.4) // TODO Check not escaping ""

        replacementString = replacementString?.replace(re, substring => {  // Fix no quotes around paths
            return `"${substring}"`;  // Adding quotes
        });

        replacementString = replacementString?.replace(/Shared.rsp"/gm, "Shared.rsp.gcd\""); // Fix wrong shared file in gcd files

        replacementString = replacementString?.replace(/Definitions.h"/gm, `${consts.FILE_NAME_GCD_DEFINITIONS}"`);  // Fix wrong shared file in gcd files

        if (replacementString && responseFile.fileString !== replacementString) {
            responseFile.fileString = replacementString;
        }
        else {
            if (!replacementString) {
                console.error(`${tr.REPLACEMENT_STR_FOR_RSP_FILE_PATH_WAS_NULL_path} ${responseFile.uri.fsPath}`);
            }
            responseFile.fileString = undefined;
            continue;
        }
    }

}


async function saveFixedResponseStrings(responseFiles: File[]) {
    for (const responseFile of responseFiles) {
        if (!responseFile.fileString) {
            // console.log(`Skipping fix for ${responseFile.uri.fsPath}, file is most likely already fixed.`); // Disabled because too much noise in logs
            continue;
        }

        let file;
        try {
            file = new TextEncoder().encode(responseFile.fileString);
        } catch (error) {
            console.error(`${tr.COULDNT_ENCODE_FILE_STRING_FROM_path} ${responseFile.uri.fsPath}`);
            if (error instanceof Error) {
                console.error(error.message);
            }
            continue;
        }

        //if (!file) {
        //	console.error(` ${responseFile.uri.fsPath}`);
        //	return;
        //}

        console.log(`${tr.QUOTE_FIX_WRITING_FILE_path} ${responseFile.uri.fsPath}`);
        try {
            await vscode.workspace.fs.writeFile(responseFile.uri, file);
        } catch (error) {
            console.error(`${tr.ERR_WRITING_FILE_path} ${responseFile.uri.fsPath}`);
            if (error instanceof Error) {
                console.error(error.message);
            }
            continue;
        }

    }
}
