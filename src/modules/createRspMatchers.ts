import * as vscode from 'vscode';
import * as nodePath from 'path';

import * as ueHelpers from '../libs/ueHelpers';
import * as consts from '../libs/consts';
import { getRspMatchers, setRspMatchers } from '../shared';

import * as console from '../libs/console';
import { getProjectCompileCommandsName, logException } from '../libs/projHelpers';

export async function startCreateRspMatchers() {

    await vscode.window.withProgress({location: vscode.ProgressLocation.Notification, cancellable:false, title: "Creating Rsp matchers for Unreal Source support..."},
            async (progress) => {
                await createRspMatchers(progress);
            }
        );
}

async function createRspMatchers(progress: vscode.Progress<{
    message?: string;
    increment?: number;
}>) {
    console.log("Creating Unreal Source rsp matchers...");
    
    const ueUri = ueHelpers.getUnrealUri();

    if(!ueUri) {
        return;
    }
    
    if(getRspMatchers().length === 0){
        
        const ccName = await getProjectCompileCommandsName({withExtension: false});
        if(!ccName) {return [];}

        const projUri = ueHelpers.getProjectWorkspaceFolder()?.uri;
        if(!projUri) {return;}

        //const ccFolderName = "compileCommands_Default";
        const relPat = new vscode.RelativePattern(vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, ccName), "*.rsp");
        const ueRspFiles = await vscode.workspace.findFiles(relPat);
        const re = /(?<=Source"\s?\r?\n[/-]I\s?").*(?=")/;
        
        const extractions = await extractRegexFromUris(ueRspFiles, re);

        const increment = 100 / extractions.length;

        for (const extraction of extractions) {
            progress.report({increment:increment});

            const rspName = nodePath.parse(extraction.uri.fsPath).name.split('.')[0];
            const rspRelative = nodePath.relative(ueUri.fsPath, extraction.uri.fsPath);

            const ueDirPath = nodePath.dirname(extraction.extracted[0]);
            const ueDirRelPath = nodePath.relative(ueUri.fsPath, ueDirPath);

            if(ueDirRelPath.startsWith(".") || nodePath.isAbsolute(ueDirRelPath)){  // relative outside ue path or absolute path
                continue;
            }
            
            if(!ueDirRelPath.endsWith(rspName)){  // Pattern broke so don't add these
                console.warning(extraction.uri.fsPath);
                continue;
            }

            setRspMatchers({
                rspRelative: rspRelative,
                ueDirRelative: ueDirRelPath
            });
        }
        
        await addManualRspMatchers();

        console.log(`UE Source rsp matchers created: ${getRspMatchers().length.toString()}`);
    }
}


async function extractRegexFromUris(uris: vscode.Uri[], regex: RegExp) {
    const extractions: { uri: vscode.Uri; extracted: RegExpMatchArray }[] = [];

    for (const uri of uris) {
        let fileStr: string;
        try {
            fileStr =  new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        } catch (error) {
            logException(error);
            console.error(`Error reading file ${uri.fsPath}`);
            continue;
        }

        const result = fileStr.match(regex);

        if(!result || result.length === 0){
            console.error(uri.fsPath);
            continue;
        }
                
        extractions.push({uri: uri, extracted: result});
    }
    
    return extractions;
}


async function addManualRspMatchers() {
	//e:\Program Files\Epic Games\UE_5.4\.vscode\compileCommands_Default\UATHelper.547.rsp
	//e:\Program Files\Epic Games\UE_5.4\.vscode\compileCommands_Default\TreeMap.717.rsp

    const ccName = await getProjectCompileCommandsName({withExtension: false});
    if(!ccName) {return [];}

    const ueUri = ueHelpers.getUnrealUri();
    if(!ueUri) {return;}

    const treeMapRelPat = new vscode.RelativePattern(ueUri, `.vscode/${ccName}/TreeMap.*.rsp`);
    const treeMapUri = await vscode.workspace.findFiles(treeMapRelPat, null, 1);
    if(treeMapUri.length === 1) {
        const treeMapFileName = nodePath.parse(treeMapUri[0].fsPath).base;
        const treeMapRspRelative = [ ".vscode", ccName, treeMapFileName].join(nodePath.sep);
	    const treeMapUeDir = ["Engine","Source","Developer","TreeMap"].join(nodePath.sep);
        setRspMatchers({
		    rspRelative: treeMapRspRelative,
		    ueDirRelative: treeMapUeDir
	    });
    }
    else {
        console.error("Couldn't get TreeMap rsp file!");
    }
	
    const uatHelperRelPat = new vscode.RelativePattern(ueUri, `.vscode/${ccName}/UATHelper.*.rsp`);
    const uatHelperUri = await vscode.workspace.findFiles(uatHelperRelPat, null, 1);
    if(uatHelperUri.length === 1) {
        const uatHelperFileName = nodePath.parse(uatHelperUri[0].fsPath).base;
        const uatHelperRspRelative = [ ".vscode", ccName, uatHelperFileName].join(nodePath.sep);
	    const uatHelperUeDir = ["Engine","Source","Editor","UATHelper"].join(nodePath.sep);

        setRspMatchers({
		    rspRelative: uatHelperRspRelative,
		    ueDirRelative: uatHelperUeDir
	    });
    }
    else {
        console.error("Couldn't get UATHelper rsp file!");
    }
	
	return;
}
