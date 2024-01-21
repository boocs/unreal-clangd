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

	if(configSettings.clangd?.settings.path?.value !== undefined){
		configSettings.clangd.settings.path.value = clangdPath;
	}
	else{
		console.error("Couldn't get clangd settings path.");
		return true;
	}
	
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

export function addSettingsToClangdCfg(mainWorkspace: vscode.WorkspaceFolder, defaultClangdCfgSettings: ClangdCfgFileSettings, ccPath: string) {
	
	defaultClangdCfgSettings.CompileFlags.CompilationDatabase = ccPath.replaceAll("\\", '/');  // Only foward slashes allowed

	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	const compilerPath = unrealClangdCfg.get<string>(consts.settingNames.unrealClangd.settings["creation.compilerPath"]);

	if(compilerPath){
		defaultClangdCfgSettings.CompileFlags.Compiler = compilerPath.replaceAll("\\", '/');  // Only foward slashes allowed
	}
	
}
