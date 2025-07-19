import * as vscode from "vscode";
import * as consts from "./libs/consts";

import { UnrealPlatform } from "./libs/indexTypes";
import { AllDefaultSettings, ClangdCfgFileSettings, ExtensionYamlFiles, ExtensionIntellisenseType} from "./libs/types";
import { getProjectWorkspaceFolder, UnrealVersion } from "./libs/ueHelpers";
import { FILENAME_MACRO_COMP_HELPER } from "./modules/completionFiles";
import { getFullPreparseIncludeLine } from "./modules/preParseIncludes";
import { convertWindowsDriveLetterToUpper } from "./libs/projHelpers";


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

	const cppVersion = getCppVersion(ueVersion);
	if(!cppVersion){
		return true;
	}

	addToClangdAdd(clangdExtYamlFiles, cppVersion);
	const macroCompletionHelperUri = vscode.Uri.joinPath(compileCommandsDirUri, FILENAME_MACRO_COMP_HELPER);
	addToClangdAdd(clangdExtYamlFiles, getFullPreparseIncludeLine(convertWindowsDriveLetterToUpper(macroCompletionHelperUri.fsPath)));

	setClangdDiagnostic(clangdExtYamlFiles, ueVersion);
	
	return false;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
			
			if(intellisenseType === "Native"){

				const config = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, getProjectWorkspaceFolder());
				const macFileLanguage = config.get<string>(consts.CONFIG_SETTING_MAC_FILE_LANGUAGE);
				if(!macFileLanguage) { 
					console.error("Mac file language setting was undefined!");
					return;
				}
				const clangFileLanguageFlag = `-x${macFileLanguage}`;

				for (const warning of ([clangFileLanguageFlag].concat(consts.MAC_COMPILER_FLAGS_TO_ADD))) {
					addToClangdAdd(clangdExtYamlFiles, warning);
				}
			}
            break;
        case 'Linux':
			if(intellisenseType === "Native"){
				addToClangdAdd(clangdExtYamlFiles, consts.LINUX_STDLIB_SYS_INCLUDE_CPP_V1);
			
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
		const clangdCfg: ClangdCfgFileSettings | undefined  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings | undefined;
		if(clangdCfg){
			if(!clangdCfg.CompileFlags){
				clangdCfg.CompileFlags = {
					Add: [addition]
				};
			}
			else if(!clangdCfg.CompileFlags.Add){
				clangdCfg.CompileFlags.Add = [ addition ];
			}
			else {
				clangdCfg.CompileFlags.Add.push(addition);
			}	
		}
	}
}

// This function is for UE 5.5+ and clang 18 support
function setClangdDiagnostic(clangdExtYamlFiles: ExtensionYamlFiles, ueVersion: UnrealVersion){
	
	if(ueVersion.major < 5 || (ueVersion.major === 5 && ueVersion.minor < 5)){
		return;
	}

	if(clangdExtYamlFiles.clangd[0]){
		const clangdCfg: ClangdCfgFileSettings | undefined  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings | undefined;
		if(clangdCfg){
			if(!clangdCfg.Diagnostics){
				clangdCfg.Diagnostics = {UnusedIncludes: "None"};
			}
			else {
				clangdCfg.Diagnostics.UnusedIncludes = "None";
			}	
		}
	}
}

/* function addToClangdRemove(clangdExtYamlFiles: ExtensionYamlFiles, flagToRemove: string) {
	if(clangdExtYamlFiles.clangd[0]){
		const clangdCfg: ClangdCfgFileSettings  = clangdExtYamlFiles.clangd[0].docObjects[0] as ClangdCfgFileSettings;
		if(clangdCfg){
			if(!clangdCfg.CompileFlags) {
				clangdCfg.CompileFlags = {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					Remove: [flagToRemove]
				};
			}
			else if(!clangdCfg.CompileFlags.Remove){
				clangdCfg.CompileFlags.Remove = [ flagToRemove ];
			}
			else {
				clangdCfg.CompileFlags.Remove.push(flagToRemove);
			}	
		}
	}
} */

export function addSettingsToClangdCfg(mainWorkspace: vscode.WorkspaceFolder, defaultClangdCfgSettings: ClangdCfgFileSettings) {
	
	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	const compilerPath = unrealClangdCfg.get<string>(consts.settingNames.unrealClangd.settings["creation.compilerPath"]);

	if(compilerPath){
		defaultClangdCfgSettings.CompileFlags ??= {};
		defaultClangdCfgSettings.CompileFlags.Compiler = compilerPath.replaceAll("\\", '/');  // Only foward slashes allowed
	}
	
}

export function getCppVersion(ueVersion: UnrealVersion | undefined) {
	if(!ueVersion){
		return undefined;
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

	return cppVersion;
}