
import * as vscode from 'vscode';

import { EOL, platform } from "node:os";
import { getProjectWorkspaceFolder, getUnrealUri, getUnrealVersion } from "../libs/ueHelpers";
import { getClangDPathFromConfig, getCompilerFromCompileCommands, getFileString, getRegex, getUnrealClangdCompileCommandsUri, runTerminalCommand } from "../libs/projHelpers";
import { parse } from "node:path";
import { FILE_NAME_CLANGD_CFG } from '../libs/consts';
import yaml from 'yaml';

import * as console from '../libs/console';

export async function showProjectInfo() {
	const unrealUri = getUnrealUri();
	const ueVersion = await getUnrealVersion();
	
	const ueVersionString = ueVersion ? Object.values(ueVersion).join('.') : "error";
	const ueStatsDisplay = `Unreal Version: ${ueVersionString}${EOL}` +
		` Path: ${unrealUri?.fsPath ?? ""}`;

	const projectFolder = getProjectWorkspaceFolder();
	if(!projectFolder) {return;}

	const clangdPath = getClangDPathFromConfig(projectFolder);
	if(!clangdPath) {return;}

	const clangdVersionCommand = `"${clangdPath}" --version`;
	// Found in stdout
	const clangdResult = await runTerminalCommand(clangdVersionCommand);
	const clangdStatsDisplay = `Clangd: ${clangdResult?.stdout.split('\n')[0] ?? ""}${EOL} ` +
		`Clangd Path: ${clangdPath}`;

	
    const buildCompilerDisplay = await getBuildCompilerDisplay(projectFolder);
	const customClangdCompilerDisplay = await getCustomClangdCompilerDisplay(projectFolder.uri);

	const customSystemIncludesDisplay : string | undefined = await getSystemIncludesDisplay(projectFolder.uri);

	const statStrings: string[] = [ueStatsDisplay, clangdStatsDisplay, buildCompilerDisplay, customClangdCompilerDisplay];
	if(customSystemIncludesDisplay !== undefined){
		statStrings.push(customSystemIncludesDisplay);
	}

	console.outputChannel?.show(true);
	console.log(`${EOL}unreal-clangd: Project Info ************************************************${EOL}`);
	
	for (const stat of statStrings) {	
		console.log(stat);
		console.log("*****");
	}
	
	return;
}


async function getBuildCompilerDisplay(projectFolder: vscode.WorkspaceFolder) {

    const ccUri = getUnrealClangdCompileCommandsUri(projectFolder.uri, {withFileName:true});
	const buildCompilerPath = await getCompilerFromCompileCommands(ccUri);
	if(!buildCompilerPath) {
        console.error(`Couldn't get compiler from compile commands! ${ccUri.fsPath}`);
        return "";
    }

	const buildCompilerDisplayString = await getCompilerVersionString(buildCompilerPath);
	const endOfLine  = buildCompilerDisplayString.endsWith('\r') ? "" : EOL;
	return `Build Compiler: ${buildCompilerDisplayString}${endOfLine}` +
		` Build Compiler path: ${buildCompilerPath}`;

}


 async function getCustomClangdCompilerDisplay(projectUri: vscode.Uri) {

	const projectClangdCfgUri = vscode.Uri.joinPath(projectUri, FILE_NAME_CLANGD_CFG);
	const clangdCfgFileString = await getFileString(projectClangdCfgUri);
	if(!clangdCfgFileString) {return "";}

	const docs = yaml.parseAllDocuments(clangdCfgFileString);

	if('empty' in docs) { return "";}

	let compilerPath = "";
	for (const doc of docs) {
		const compileFlags = doc.get("CompileFlags");
		if(!compileFlags || !yaml.isCollection(compileFlags)) {continue;}

		const potCompilerPath = compileFlags.get("Compiler");
		if(!potCompilerPath || typeof potCompilerPath !== 'string') { continue;}

		compilerPath = potCompilerPath;
		break;
	}

	if(!compilerPath) { return "Clangd Compiler: Same as Build Compiler";}

	const compilerVersionString = await getCompilerVersionString(compilerPath);
	
    return `Clangd Compiler: ${compilerVersionString}${EOL}` +
		` Clangd Compiler Path: ${compilerPath}`;
}


async function getCompilerVersionString(compilerPath: string) {
	const buildCompilerName = parse(compilerPath).name;


	let buildCompilerVersionCommand = "";
	
	if(buildCompilerName === 'cl'){
		buildCompilerVersionCommand = `"${compilerPath}"`;
	}
	else if (buildCompilerName.includes("clang")){
		buildCompilerVersionCommand = `"${compilerPath}" --version`;
	}
	
	
	// Found in stderr
	const buildCompilerResult = buildCompilerVersionCommand ? await runTerminalCommand(buildCompilerVersionCommand) : undefined;

	let buildCompilerVersion: string | undefined = undefined;

	if(buildCompilerResult && buildCompilerName === 'cl'){
		buildCompilerVersion = buildCompilerResult.stderr.split("\n")[0];
	}
	else if (buildCompilerResult && buildCompilerName.includes("clang")){
		buildCompilerVersion = buildCompilerResult.stdout.split("\n")[0];
	}
	else {
		buildCompilerVersion = "Compiler not supported yet! Not cl or clang based.";
	}

	return  buildCompilerVersion;
}

async function getSystemIncludesDisplay(projectUri: vscode.Uri): Promise<string | undefined> {

	if(platform() !== 'win32') {return;}
	
	const clangdCfgUri = vscode.Uri.joinPath(projectUri, FILE_NAME_CLANGD_CFG);

	const clangdCfgFileString = await getFileString(clangdCfgUri);
	if(!clangdCfgFileString) { return;}

	const re = getRegex("/imsvc.*", 'g');
	if(!re) {return;}

	const reResult = [...clangdCfgFileString.matchAll(re)];

	let resultsDisplayString = " No includes found!";
	if(reResult.length !== 0) {
		resultsDisplayString = reResult.join(EOL);
	}

	return `(Windows) Custom System Includes:${EOL}${resultsDisplayString}`;
}
