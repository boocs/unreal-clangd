import * as vscode from 'vscode';
import * as nodePath from 'path';

import * as ueHelpers from '../libs/ueHelpers';
import * as consts from '../libs/consts';
import { getRspMatchers, setRspMatchers } from '../shared';

import * as console from '../libs/console';
import { getProjectCompileCommandsName } from '../libs/projHelpers';


export async function startCreateRspMatchers() {
    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, cancellable: true, title: "Creating Rsp matchers for Unreal Source support..." },
        async (progress, token) => {
            await createRspMatchers(progress, token);
        }
    );
}

async function createRspMatchers(progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>, 
            token: vscode.CancellationToken
    ){
    console.log("[createRspMatchers] Creating Unreal Source rsp matchers...");

    const ueUri = ueHelpers.getUnrealUri();
    if (!ueUri) { return; }

    if (getRspMatchers().length !== 0) {
        return;
    }

    const ccName = await getProjectCompileCommandsName({ withExtension: false });
    if (!ccName) { return; }

    const projUri = ueHelpers.getProjectWorkspaceFolder()?.uri;
    if (!projUri) { return; }

    const relPat = new vscode.RelativePattern(
        vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, ccName), "*.rsp"
    );
    const ueRspFiles = await vscode.workspace.findFiles(relPat);

    const results = await findRspMatchers(ueRspFiles, ueUri, progress, token);

    for (const result of results) {
        if (!result.passed || !result.ueDirRelative) { continue; }

        const rspRelative = nodePath.relative(projUri.fsPath, result.uri.fsPath);
        setRspMatchers({ rspRelative, ueDirRelative: result.ueDirRelative });
    }

}


interface RspMatcherTestResult {
    uri: vscode.Uri;
    moduleName: string;
    passed: boolean;
    ueDirRelative?: string;
    error?: string;
}


function matchRspIncludes(
    uri: vscode.Uri,
    fileStr: string,
    candidates: { name: string; source: string }[],
    ueUri: vscode.Uri
): RspMatcherTestResult {

    const allIncludesRe = /(?<=[/-]I\s?").*(?=")/g;
    const excludeRe = /[/\\]Intermediate(?:[/\\]|$)/;

    const allMatches = fileStr.match(allIncludesRe) ?? [];
    const filtered = allMatches.filter(m => !excludeRe.test(m));

    for (const candidate of candidates) {

        for (const match of filtered) {

            // Removes ending folders like /Private , /Public , or Internal from path
            // MARK: Any cases where this could fail? Yes Engine rsp files do so we added a different pattern to algo
            const ueDirPath = nodePath.dirname(match);

            const ueDirRelPath = nodePath.relative(ueUri.fsPath, ueDirPath);
            
            if (!ueDirRelPath.startsWith('.') && !nodePath.isAbsolute(ueDirRelPath) && ueDirRelPath.endsWith(candidate.name)) {   
                return { uri, moduleName: candidate.name, passed: true, ueDirRelative: ueDirRelPath };
            }
        }
    }

    return { uri, moduleName: "", passed: false, ueDirRelative: "" };
}


export async function findRspMatchers(
    rspUris: vscode.Uri[],
    ueUri: vscode.Uri,
    progress: vscode.Progress<{
            message?: string;
            increment?: number;
        }>, 
            token: vscode.CancellationToken
): Promise<RspMatcherTestResult[]> {

    const definitionsRe = /^(?:\/FI|-include)\s?"([^"]*Definitions[^"]*\.h)"/gm;
    const results: RspMatcherTestResult[] = [];

    const increment = rspUris.length > 0 ? 100 / rspUris.length : 100;
    for (const uri of rspUris) {
        if(token.isCancellationRequested){
            console.warn("Cancelled Unreal Source support setup!");
            return [];
        }

        progress.report({ increment });
        const rspName = nodePath.parse(uri.fsPath).name;

        let fileStr: string;
        try {
            fileStr = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        } catch (_error) {
            console.log(`[findRspMatchers] Failed to read: ${uri.fsPath}`);
            results.push({ uri, moduleName: rspName.split('.')[0], passed: false, error: 'Failed to read file' });
            continue;
        }

        // --- Resolve module name (4-source priorities) ---
        definitionsRe.lastIndex = 0;
        const defMatch = definitionsRe.exec(fileStr);

        let fromDir = '';
        let fromDef = '';
        if (defMatch) {
            const defPath = defMatch[1];
            fromDir = nodePath.basename(nodePath.dirname(defPath));
            // e.g. "Definitions.XmlParser.123456" -> "XmlParser"
            const defStem = nodePath.parse(defPath).name;
            fromDef = defStem
                .split('.')
                .slice(1)                        // remove "Definitions"
                .filter(p => !/^\d+$/.test(p))  // remove numeric-only segments
                .join('.');
        } else {
            console.log(`[findRspMatchers] No Definitions include found in: ${rspName}`);
        }
        const fromRsp = rspName.split('.')[0];  // fallback 1 — always available

        const multiDir = fromDir.split(/(?=[A-Z])/).join(nodePath.sep);

        const candidates = [
            { name: fromDir, source: 'dir' },
            { name: multiDir, source: 'multiDir'},
            { name: fromRsp === fromDir ? '' : fromRsp, source: 'rsp' },
            { name: fromDef === fromDir ? '' : fromDef, source: 'def' },
        ].filter(c => c.name);

        const found = matchRspIncludes(uri, fileStr, candidates, ueUri);
        if (found.passed) {
            results.push(found);
            continue;
        }
        else {
            console.warn(`Didn't find rsp matcher for: ${found.uri.fsPath}`);
        }
        
    }

    const passed = results.filter(r => r.passed).length;
    console.log(`[findRspMatchers] ${String(passed)} / ${String(rspUris.length)} RSP files passed  (non-equal numbers probably not error)`);

    return results;
}
