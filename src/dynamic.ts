import * as vscode from "vscode";
import * as consts from "./libs/consts";

import { UnrealPlatform } from "./libs/indexTypes";
import { AllDefaultSettings, ClangdCfgFileSettings, ExtensionYamlFiles, ExtensionIntellisenseType} from "./libs/types";
import { UnrealVersion } from "./libs/ueHelpers";


export function addDynamicDefaultSettingsToConfig(ueVersion: UnrealVersion | undefined, clangdExtYamlFiles: ExtensionYamlFiles, configSettings: AllDefaultSettings, clangdPath: string, compileCommandsDirUri: vscode.Uri | undefined): boolean {

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

	if(!ueVersion){
		console.error("Couldn't get UE version!");
		return true;
	}

	let cppVersion = "";

	if(process.platform === "win32") {
		cppVersion = consts.NATIVE_WIN_CLANGD_ADD_STD_CPP20;
	}
	else {
		cppVersion = consts.NATIVE_NON_WIN_CLANGD_ADD_STD_CPP20;
	}

	
	if(ueVersion.major === 5 && ueVersion.minor < 2){
		if(process.platform === "win32") {
			cppVersion = consts.NATIVE_WIN_CLANGD_ADD_STD_CPP17;
		}
		else {
			cppVersion = consts.NATIVE_NON_WIN_CLANGD_ADD_STD_CPP17;
		}
	}

	if(ueVersion.major === 4){
		if(process.platform === "win32") {
			cppVersion = consts.NATIVE_WIN_CLANGD_ADD_STD_CPP14;
		}
		else {
			cppVersion = consts.NATIVE_NON_WIN_CLANGD_ADD_STD_CPP14;
		}
	}

	addToClangdAdd(clangdExtYamlFiles, cppVersion);
	
	return false;
}


export function addPlatformSpecificChanges( intellisenseType: ExtensionIntellisenseType, uePlatform: UnrealPlatform, clangdExtYamlFiles: ExtensionYamlFiles, clangUri?: vscode.Uri) {

    switch (uePlatform) {
        case "Win64":
			if(intellisenseType === "Native"){
				for (const warning of consts.WIN_COMPILER_FLAGS_TO_ADD) {
					addToClangdAdd(clangdExtYamlFiles, warning);
				}
			}			
			break;
        case 'Mac':
			// TODO We use linux flags until we can get more info...
			if(intellisenseType === "Native"){
				for (const warning of consts.LINUX_COMPILER_FLAGS_TO_ADD) {
					addToClangdAdd(clangdExtYamlFiles, warning);
				}
			}
            break;
        case 'Linux':
			if(intellisenseType === "Native"){
				addToClangdAdd(clangdExtYamlFiles, consts.LINUX_SYS_INCLUDE_CPP_V1);
			
				for (const warning of consts.LINUX_COMPILER_FLAGS_TO_ADD) {
					addToClangdAdd(clangdExtYamlFiles, warning);
				}
			}
			else {
				addToClangdAdd(clangdExtYamlFiles, consts.LINUX_CLANGD_CFG_ADD_USR_INCLUDE);
			}
            
            break;
        default:
            break;
    }

}


function addToClangdAdd(clangdExtYamlFiles: ExtensionYamlFiles, addition: string) {
	if(clangdExtYamlFiles.clangd[0]){
		const clangdCfg: ClangdCfgFileSettings  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings;
		if(clangdCfg){
			if(!clangdCfg.CompileFlags.Add){
				clangdCfg.CompileFlags.Add = [ addition ];
			}
			else {
				clangdCfg.CompileFlags.Add.push(addition);
			}	
		}
	}
}

function addToClangdRemove(clangdExtYamlFiles: ExtensionYamlFiles, flagToRemove: string) {
	if(clangdExtYamlFiles.clangd[0]){
		const clangdCfg: ClangdCfgFileSettings  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings;
		if(clangdCfg){
			if(!clangdCfg.CompileFlags.Remove){
				clangdCfg.CompileFlags.Remove = [ flagToRemove ];
			}
			else {
				clangdCfg.CompileFlags.Remove.push(flagToRemove);
			}	
		}
	}
}

export function addSettingsToClangdCfg(mainWorkspace: vscode.WorkspaceFolder, defaultClangdCfgSettings: ClangdCfgFileSettings) {
	
	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	const compilerPath = unrealClangdCfg.get<string>(consts.settingNames.unrealClangd.settings["creation.compilerPath"]);

	if(compilerPath){
		defaultClangdCfgSettings.CompileFlags.Compiler = compilerPath.replaceAll("\\", '/');  // Only foward slashes allowed
	}
	
}
