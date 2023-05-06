import * as vscode from "vscode";
import * as consts from "./libs/consts";

import { UnrealPlatform } from "./libs/indexTypes";
import { AllDefaultSettings, ClangdCfgFileSettings, ExtensionYamlFiles } from "./libs/types";


export function addDynamicDefaultSettingsToConfig(mainWorkspace: vscode.WorkspaceFolder, configSettings: AllDefaultSettings, clangdPath: string, compileCommandsDirUri: vscode.Uri | undefined): boolean {

	if (!clangdPath) {
		console.error("No clangd paths found!");
		return true;
	}
	
	if (!compileCommandsDirUri) {
		console.error("No mainProjectVSCode uri found!");
		return true;
	}

	const vscodeFolderPath = compileCommandsDirUri.fsPath;

	if(configSettings.clangd?.settings.path?.value !== undefined){
		configSettings.clangd.settings.path.value = clangdPath;
	}
	else{
		console.error("Couldn't get clangd settings path.");
		return true;
	}
	
	const args = configSettings.clangd?.settings.arguments?.value;
	if (args instanceof Array) {
		args.push(`-compile-commands-dir=${vscodeFolderPath}`);
	}
	else{
		console.error("Couldn't get clangd settings args!");
		return true;
	}

	addSettingsToClangdCfg(mainWorkspace);

	return false;
}


export function addPlatformSpecificChanges(uePlatform: UnrealPlatform, clangdExtYamlFiles: ExtensionYamlFiles) {

    switch (uePlatform) {
        case "Win64":

            break;
        case 'Mac':

            break;
        case 'Linux':
            addToClangdAdd(clangdExtYamlFiles, consts.LINUX_CLANGD_CFG_ADD_USR_INCLUDE);
            break;
        default:
            break;
    }

}


function addToClangdAdd(clangdExtYamlFiles: ExtensionYamlFiles, addition: string) {
	if(clangdExtYamlFiles.clangd[0]){
		const clangdCfg: ClangdCfgFileSettings  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings;
		if(clangdCfg){
			clangdCfg.CompileFlags.Add.push(addition);
		}
	}
}

function addSettingsToClangdCfg(mainWorkspace: vscode.WorkspaceFolder) {
	
	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	const compilerPath = unrealClangdCfg.get<string>(consts.settingNames.unrealClangd.settings["creation.compilerPath"]);

	if(!compilerPath){
		return;
	}

	consts.defaultGeneralClangdCfgSettings.CompileFlags.Compiler = compilerPath;
}
