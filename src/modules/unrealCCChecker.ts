import * as vscode from 'vscode';

import { getUnrealClangdCompileCommandsUri, getValidatedCompileCommandObjectsFromUri, isFile, writeCompileCommandsFile } from "../libs/projHelpers";
import { getUnrealUri } from "../libs/ueHelpers";
import * as console from '../libs/console';
import type { CompileCommand } from "../libs/types";
import { restartClangd } from '../shared';

export async function checkUnrealCompileCommands() {
    console.log("Checking Unreal compile commands...");

    const ueUri = getUnrealUri();
    if (!ueUri) {
        return;
    }

    const ueClangdCCUri = getUnrealClangdCompileCommandsUri(ueUri, { withFileName: true });

    // Get ccs from file
    const ccs = await getValidatedCompileCommandObjectsFromUri(ueClangdCCUri);
    if (!ccs) {
        console.error("Couldn't get Unreal compile commands object");
        return;
    }

    // Get ccs with invalid removed or ignored
    const newCcs = await getCCWithValidResponseFiles(ccs);

    // Don't do anything
    if (!newCcs) {
        console.log("No invalid Unreal compile commands found or were ignored.");
        return;
    }

    console.log(`Writing fixed Unreal compile commands: ${ueClangdCCUri.fsPath}`);
    await writeCompileCommandsFile(ueClangdCCUri, undefined, newCcs);

    await restartClangd();
}


async function getCCWithValidResponseFiles(ccs: CompileCommand[]) {

    const returnCompileCommands: CompileCommand[] = [];

    let fileIsDirty = false;
    let choice: "Remove" | "Remove All" | "Keep" | undefined = undefined;

    for (const cc of ccs) {
        const rspPath = cc.arguments?.[1].slice(1);
        if (!rspPath) {
            continue;
        }

        if (await isFile(vscode.Uri.file(rspPath))) {
            returnCompileCommands.push(cc);
            continue;
        }

        // Not a file so ask to delete or keep or delete all invalid
        if (choice !== "Remove All") {
            console.error(`Unreal CC invalid rsp path found! ${rspPath}`);
            choice = await vscode.window.showErrorMessage(
                `Invalid path found in Unreal's compile_commands.json!\n\nRSP Path:\n${rspPath}`,
                { detail: "What would you like to do with this invalid path?", modal: true },
                "Remove", "Remove All", "Keep"
            );
        }

        if (!choice) {
            break;
        }

        if (choice === "Keep") {
            returnCompileCommands.push(cc);
            continue;
        }

        fileIsDirty = true;
    }

    if (!choice || !fileIsDirty) {
        return;
    }

    return returnCompileCommands;

}