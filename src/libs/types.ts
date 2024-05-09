/* eslint-disable @typescript-eslint/no-empty-interface */ // TODO...
/* eslint-disable @typescript-eslint/naming-convention */

import { ConfigurationTarget, Uri, WorkspaceFolder } from 'vscode';
import type { DebugConfiguration } from 'vscode';
import type {DocumentOptions, SchemaOptions, CreateNodeOptions, ParseOptions, ToStringOptions} from 'yaml';


export type CreationCmdLineSettings = "platform" | "overwrite" | "tidy";
export type CreationCmdLineValue = string | boolean | undefined;
export type CreationCmdLineValueTypeCompare = "string" | "boolean" | "null";

export type CreationCmdLineArgs = Map<CreationCmdLineSettings, CreationCmdLineValue>;

export interface CompileCommand {
	"file": string,
	"command"?: string,
	"directory": string,
	"arguments"?: string[]
}

export type CompileCommandFile = CompileCommand[];

export type UeClangdSettingNamesKeys = 
	"fixes.intellisenseFiles" |
	"fixes.delegateFuncCompletions" |
	"fixes.autoIncludeSourceOnly" |
	"utility.checkForIntellisenseFilesOnStartup" |
	"compileCommands.execType" |
	"compileCommands.platform" |
	"compileCommands.architecture" |
	"creation.compilerPath" |
	"creation.overwrite" |
	"creation.tidy" |
	"creation.bypassUnrealVersionCheck" |
	"editor.parameterHints" |
	"creation.completionHelper" |
	"creation.completionHelperMP" |
	"completion.openCompletionHelperOnStartup" |
	"completion.completionHelperInfoOnStartup" |
	"utility.createProjectOnStartup";
	
export type VSCodeSettingNamesKeys = 
	"files.associations" | "editor.suggest.snippetsPreventQuickSuggestions" |
	"workbench.colorCustomizations" | "editor.suggestFontSize";
export type ClangdSettingNamesKeys = "arguments" | "path" | "detectExtensionConflicts";
export type CCppSettingNamesKeys = "intelliSenseEngine" | "autocomplete" | "formatting" | "errorSquiggles";

export type AllSettingNamesKeys = UeClangdSettingNamesKeys | VSCodeSettingNamesKeys | ClangdSettingNamesKeys | CCppSettingNamesKeys;
/**
 * Actual name of extension (first section setting name)
 */
type ExtensionSectionName = "C_Cpp" | "unreal-clangd" | "clangd";

interface CfgSetting <T extends ExtensionSectionName | "", Settings> {
	extensionSection: T,
	settings: Settings
}

/**
 * @param V Use undefined for key to also be the value
 */
export type CfgSettings<Names extends string, V> = {
	[K in Names]: V extends undefined? K : V
};

export interface VSCodeSettingNames extends CfgSetting<"", CfgSettings<VSCodeSettingNamesKeys, undefined>> {}
export interface UeClangdSettingNames extends CfgSetting<"unreal-clangd", CfgSettings<UeClangdSettingNamesKeys, undefined>> {}
export interface ClangdSettingNames extends CfgSetting<"clangd", CfgSettings<ClangdSettingNamesKeys, undefined>> {}
export interface CCppSettingNames extends CfgSetting<"C_Cpp", CfgSettings<CCppSettingNamesKeys, undefined>> {}

export interface CfgSettingValue  {
	configTarget: ConfigurationTarget,
	value: VSCodeSettingValues
}
type VSCodeDefaultSettingValues = Partial<CfgSettings<VSCodeSettingNamesKeys, CfgSettingValue>>;
type UeClangdDefaultSettingValues = Partial<CfgSettings<UeClangdSettingNamesKeys, CfgSettingValue>>;
type ClangdDefaultSettingValues = Partial<CfgSettings<ClangdSettingNamesKeys, CfgSettingValue>>;
export type CCppDefaultSettingValues = Partial<CfgSettings<CCppSettingNamesKeys, CfgSettingValue>>;

export interface VSCodeDefaultSettings extends CfgSetting<"", VSCodeDefaultSettingValues> {}
export interface UeClangdDefaultSettings extends CfgSetting<"unreal-clangd", UeClangdDefaultSettingValues> {}
export interface ClangdDefaultSettings extends CfgSetting<"clangd", ClangdDefaultSettingValues> {}
export interface CCppDefaultSettings extends CfgSetting<"C_Cpp", CCppDefaultSettingValues> {}


export interface AllSettingNames  {
	"unrealClangd": UeClangdSettingNames,
	"clangd": ClangdSettingNames,
	"cCpp": CCppSettingNames,
	"vscode": VSCodeSettingNames
}

export interface AllDefaultSettings {
	"unrealClangd"?: UeClangdDefaultSettings,
	"clangd"?: ClangdDefaultSettings,
	"cCpp"?: CCppDefaultSettings,
	"vscode"?: VSCodeDefaultSettings
}


/**
 * Keys inside AllSettingNames interface
 */
export type KeysOfAllSettingExtensionNames = keyof AllSettingNames;

/**
 * Values inside AllSettingNames interface
 */
export type ValuesOfAllSettingNames = AllSettingNames[KeysOfAllSettingExtensionNames];


export type KeysOfAllDefaultSettings = keyof AllDefaultSettings;
export type ValuesOfAllDefaultSettings = AllDefaultSettings[KeysOfAllDefaultSettings];


export interface UpdateCompileCommandsDebugConfig extends DebugConfiguration {
	"program": string,
	"args": string[],
	"console"?: string,
	"stopAtEntry": boolean,
	"cwd": string,
	"logging"?: {
		enableLogging: boolean
	}
}

export interface ClangdExtensionFile {
	file: Uint8Array,
	uris: Uri[],
	fileName: string
}

export interface ClangdCfgFileSettings {
	"If": IfVars
	"CompileFlags": CompileFlags
	"InlayHints": InlayHintsFlags
}

export interface CompileFlags {
	"Remove"?: string[],
	"Add"?: string[],
	"CompilationDatabase"?: string,
	"Compiler"?: string
}

export interface IfVars {
	"PathMatch"?: string | string[],
	"PathExclude"?: string | string[]
}

export interface InlayHintsFlags {
	"Designators": "Yes",
	"Enabled": "Yes"
	"ParameterNames": "Yes",
	"DeducedTypes": "Yes"
}

export interface ClangTidyFileSettings {
	"Checks": string,
	"CheckOptions"?: {key: string, value: string | number}[],
	"FormatStyle"?: 'file'
}

export interface ClangFormatFileSettings {
	"BasedOnStyle": "LLVM",
    "UseTab": "Never",
    "IndentWidth": 2 | 4,
    "ColumnLimit": 80 | 100 | 120,
    "SortIncludes": "false" | "true", 
    "BreakBeforeBraces": "Allman",
	"AccessModifierOffset": -4,
	"NamespaceIndentation": "All"

}



export enum ValidateUnrealResults {
	failed,
	passed,
	passWithWarning
}


export interface ProjectInfoVars {
	mainWorkspaceFolder: WorkspaceFolder,
	compileCommands: CompileCommand[],
	firstChildUrisWithSource: Uri[]
}


export interface File {
	uri: Uri,
	fileString: string | undefined
}

export type CppWorkspaceFolderSettingsKeys = "intelliSenseEngine" | "autocomplete" | "formatting" | "errorSquiggles";
export type ClangdGlobalSettingKeys = "arguments" | "path" | "detectExtensionConflicts";

export type VSCodeSettingValues = string | string[] | ClangArgWithValue[] | boolean | Record<string, unknown> | number;

// export type VSCodeSettings = {
// 	[sectionName: string]: VSCodeSectionSettings;
// };

// export type VSCodeSectionSettings = {
// 	[settingName: string]: { value: VSCodeSettingValues, configTarget: ConfigurationTarget | undefined }
// };

export type ClangArgs = "-header-insertion" | "-all-scopes-completion" | "-limit-results"
	| "-header-insertion-decorators" | "-completion-style" | "-background-index" | "-limit-references"
	| "-function-arg-placeholders" | "-log";
export type ClangArgWithValue = `${ClangArgs}=${string}`;

export type SectionSettings = "C_Cpp" | "clangd";

export interface YamlFile {
	stringifyOptions?: (DocumentOptions & SchemaOptions & ParseOptions & CreateNodeOptions & ToStringOptions) | undefined,
	docObjects: ClangdCfgFileSettings[] | ClangTidyFileSettings[] | ClangFormatFileSettings[],
	topComment: string | null,
	installFolders: Uri[],
	name: ".clangd" | ".clang-format" | ".clang-tidy"
}

export interface ExtensionYamlFiles {
	clangd: YamlFile[],
	format: YamlFile[],
	tidy?: YamlFile[]
}

export interface ProjectFiles {
	clangdCfgFiles: Uri[],
	intellisenseFiles: Uri[],
	compileCommandsDirFiles: Uri[]
}

export interface GlobParams {
	"Exclude"?: string[] | undefined | null,
	"MaxResults": number | undefined
}
export type GlobPatterns = Record<string, GlobParams>;

export type UriBackup = {original: Uri, backup: Uri};

export interface BackupGlobDirectories {
	"ModuleRules": string,
    "SourceFileCache": string,
    //"DefaultEngineGame": string,
    "LiveCodingInfo": string,
    "RspH": string
}

export type ExtensionIntellisenseType = "Native" | "GenerateClangDataBase";


