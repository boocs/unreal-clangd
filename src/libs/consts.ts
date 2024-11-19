/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as ueHelpers from "./ueHelpers";

import { AllDefaultSettings, AllSettingNames, CCppDefaultSettings, CCppSettingNames, ClangdDefaultSettings, ClangdSettingNames, ClangFormatFileSettings, ClangTidyFileSettings, CreationCmdLineSettings, CreationCmdLineValue, InlayHintsFlags, UeClangdSettingNames, VSCodeDefaultSettings, VSCodeSettingNames} from "./types";
import type { ClangdCfgFileSettings, CompileFlags, ClangArgWithValue, GlobPatterns, BackupGlobDirectories } from "./types";
import type { Overwrite } from './indexTypes';

export const EXTENSION_VERSION = "2.6.0";
export const VALIDATE_UNREAL_VERSIONS: { min: ueHelpers.UnrealVersion, max: ueHelpers.UnrealVersion } =
    { min: { major: 5, minor: 2, patch: 0 }, max: { major: 6, minor: 0, patch: 0 } };  // The unreal versions this extension was created for

export const EXTENSION_NAME = "unreal clangd";
export const UE5_WORKSPACE_NAME = "UE5";
export const UPROJECT_FILE_EXTENSION_WITH_DOT = ".uproject";

export const SOURCE_FILE_EXTENSIONS = [".h", ".hpp", ".cpp"];

export const LINUX_CLANGD_CFG_ADD_USR_INCLUDE = "-isystem/usr/include"; 

export const EXT_CMD_UPDATE_COMPILE_COMMANDS = "unreal-clangd.updateCompileCommands";
export const EXT_CMD_FIX_INTELLISENSE_FILES = "unreal-clangd.fixIntellisenseFiles";
export const EXT_CMD_CREATE_CLANGD_PROJECT = "unreal-clangd.createUnrealClangdProject";
export const VSCODE_CMD_RELOAD_WINDOW = "workbench.action.reloadWindow";
export const VSCODE_INSERT_SNIPPET = "editor.action.insertSnippet";
export const VSCODE_CMD_FOCUS_SUGGESTION = "focusSuggestion";

export const SETTING_UESOURCE_RSPMATCHERS = "ueSource.rspMatchers";
export const TIDY_NO_LINT_CURRENT_LINE = " // NOLINT";
export const TIDY_NO_LINT_NEXT_LINE = "// NOLINTNEXTLINE";
export const TIDY_TEST = "float _foo = 1.337f;  // ****CLANG TIDY TEST**** WILL NOT WORK IF YOU'VE DISABLED WARNINGS IT DETECTS";

export const CLANGD_PATHMATCH_COMPLETION_HELPER_PATH = ".vscode/unreal-clangd/completionHelper.cpp";

export const CONFIG_SECTION_VSCODE = "";
export const CONFIG_SECTION_CLANGD = "clangd";
export const CONFIG_SECTION_CPP = "C_Cpp";
export const CONFIG_SECTION_UNREAL_CLANGD = "unreal-clangd";
export const SETTING_CLANGD_PATH = "path";
export const SETTING_DISABLED = "disabled";
export const CONFIG_SETTING_MAC_FILE_LANGUAGE = "creation.MacFileLanguage";


export const FILE_BACKUP_EXTENSION = ".bkup";
export const FILE_NAME_DEFINITIONS = "Definitions.h";
export const FILE_NAME_GCD_DEFINITIONS = "Definitions.gcd.h";

export const POWERSHELL_FILE_NAME = "PowerShell.exe";
export const NATIVE_COMPILE_COMMANDS_NAME = "compileCommands_Default.json";

export const NATIVE_COMPILE_COMMANDS_TOO_OLD_IN_MINUTES = 5;

export const NATIVE_WIN_CLANGD_ADD_STD_CPP20 = "/std:c++20";
export const NATIVE_WIN_CLANGD_ADD_STD_CPP17 = "/std:c++17";
export const NATIVE_WIN_CLANGD_ADD_STD_CPP14 = "/std:c++14";

export const NATIVE_NON_WIN_CLANGD_ADD_STD_CPP20 = "-std=c++20";
export const NATIVE_NON_WIN_CLANGD_ADD_STD_CPP17 = "-std=c++17";
export const NATIVE_NON_WIN_CLANGD_ADD_STD_CPP14 = "-std=c++14";

export const FULL_MAC_FILE_LANGUAGE_CLANG_FLAG = "-xc++";

export const FOLDER_NATIVE_COMPILE_COMMANDS_DEFAULT_FOLDER_NAME = "compileCommands_Default";
export const FOLDER_COMPILE_COMMANDS_DEFAULT = "compileCommands_Default";

export const CLANGD_COMMAND_RESTART = "clangd.restart";

export const REGEX_RESPONSE_COMPILER_FLAG = "(?<=[\"']@).*?\\.rsp(?=\"|')";

export const NATIVE_CODE_WORKSPACE_BACKUP_SETTINGS = [
    "clangd.arguments", "clangd.path", "clangd.detectExtensionConflicts", "files.associations", "workbench.colorCustomizations", "editor.suggestFontSize", "dotnet.defaultSolution"
];

export const NON_FULL_SOURCE_CLANGD_CFG_PAGE: ClangdCfgFileSettings = {
    If: {
        PathMatch: ".*\.cpp"
    },
    Diagnostics: {
        Suppress: "*"
    }

};

export const WIN_COMPILER_FLAGS_TO_ADD = [
    "/TP",
    "-mwaitpkg",
	"/we4668",
    "/wd4244",
    "/wd4838",
    "/W4",
    "/wd5054",
    "-Werror",
    "-Wdelete-non-virtual-dtor",
    "-Wenum-conversion",
    "-Wbitfield-enum-conversion",
    "-Wno-enum-enum-conversion",
    "-Wno-enum-float-conversion",
    "-Wno-ambiguous-reversed-operator",
    "-Wno-deprecated-anon-enum-enum-conversion",
    "-Wno-deprecated-volatile",
    "-Wno-unused-but-set-variable",
    "-Wno-unused-but-set-parameter",
    "-Wno-ordered-compare-function-pointers",
    "-Wno-bitwise-instead-of-logical",
    "-Wno-gnu-string-literal-operator-template",
    "-Wno-inconsistent-missing-override",
    "-Wno-invalid-offsetof",
    "-Wno-switch",
    "-Wno-tautological-compare",
    "-Wno-unknown-pragmas",
    "-Wno-unused-function",
    "-Wno-unused-lambda-capture",
    "-Wno-unused-local-typedef",
    "-Wno-unused-private-field",
    "-Wno-unused-variable",
    "-Wno-undefined-var-template",
    "-Wshadow",
    "-Wundef",
    "-Wno-float-conversion",
    "-Wno-implicit-float-conversion",
    "-Wno-implicit-int-conversion",
    "-Wno-c++11-narrowing",
    "-Wno-microsoft",
    "-Wno-msvc-include",
    "-Wno-pragma-pack",
    "-Wno-inline-new-delete",
    "-Wno-implicit-exception-spec-mismatch",
    "-Wno-undefined-bool-conversion",
    "-Wno-deprecated-writable-strings",
    "-Wno-deprecated-register",
    "-Wno-switch-enum",
    "-Wno-logical-op-parentheses",
    "-Wno-null-arithmetic",
    "-Wno-deprecated-declarations",
    "-Wno-return-type-c-linkage",
    "-Wno-ignored-attributes",
    "-Wno-uninitialized",
    "-Wno-return-type",
    "-Wno-unused-parameter",
    "-Wno-ignored-qualifiers",
    "-Wno-expansion-to-defined",
    "-Wno-sign-compare",
    "-Wno-missing-field-initializers",
    "-Wno-nonportable-include-path",
    "-Wno-invalid-token-paste",
    "-Wno-null-pointer-arithmetic",
    "-Wno-constant-logical-operand",
    "-Wno-unused-value",
    "-Wno-bitfield-enum-conversion"
];

export const LINUX_COMPILER_FLAGS_TO_ADD = [
    //"#- -isystem/usr/include",
    "-xc++",
    //"#- -nostdinc++",
    //"#- -isystemThirdParty/Unix/LibCxx/include",
    //"- -isystemThirdParty/Unix/LibCxx/include/c++/v1",
    "-Wall",
    "-Werror",
    "-Wdelete-non-virtual-dtor",
    "-Wenum-conversion",
    "-Wbitfield-enum-conversion",
    "-Wno-enum-enum-conversion",
    "-Wno-enum-float-conversion",
    "-Wno-ambiguous-reversed-operator",
    "-Wno-deprecated-anon-enum-enum-conversion",
    "-Wno-deprecated-volatile",
    "-Wno-unused-but-set-variable",
    "-Wno-unused-but-set-parameter",
    "-Wno-ordered-compare-function-pointers",
    "-Wno-bitwise-instead-of-logical",
    "-Wno-deprecated-copy",
    "-Wno-deprecated-copy-with-user-provided-copy",
    "-Wno-gnu-string-literal-operator-template",
    "-Wno-inconsistent-missing-override",
    "-Wno-invalid-offsetof",
    "-Wno-switch",
    "-Wno-tautological-compare",
    "-Wno-unknown-pragmas",
    "-Wno-unused-function",
    "-Wno-unused-lambda-capture",
    "-Wno-unused-local-typedef",
    "-Wno-unused-private-field",
    "-Wno-unused-variable",
    "-Wno-undefined-var-template",
    "-Wshadow",
    "-Wundef",
    "-Wno-float-conversion",
    "-Wno-implicit-float-conversion",
    "-Wno-implicit-int-conversion",
    "-Wno-c++11-narrowing",
    "-fdiagnostics-absolute-paths",
    "-fdiagnostics-color",
    "-Wno-undefined-bool-conversion"

];

export const MAC_COMPILER_FLAGS_TO_ADD = [
    "-Wall",
    "-Werror",
    "-Wdelete-non-virtual-dtor",
    "-Wenum-conversion",
    "-Wbitfield-enum-conversion",
    "-Wno-enum-enum-conversion",
    "-Wno-enum-float-conversion",
    "-Wno-ambiguous-reversed-operator",
    "-Wno-deprecated-anon-enum-enum-conversion",
    "-Wno-deprecated-volatile",
    "-Wno-unused-but-set-variable",
    "-Wno-unused-but-set-parameter",
    "-Wno-ordered-compare-function-pointers",
    "-Wno-bitwise-instead-of-logical",
    "-Wno-deprecated-copy",
    "-Wno-deprecated-copy-with-user-provided-copy",
    "-Wno-gnu-string-literal-operator-template",
    "-Wno-inconsistent-missing-override",
    "-Wno-invalid-offsetof",
    "-Wno-switch",
    "-Wno-tautological-compare",
    "-Wno-unknown-pragmas",
    "-Wno-unused-function",
    "-Wno-unused-lambda-capture",
    "-Wno-unused-local-typedef",
    "-Wno-unused-private-field",
    "-Wno-unused-variable",
    "-Wno-undefined-var-template",
    "-Wshadow",
    "-Wundef",
    "-Wno-float-conversion",
    "-Wno-implicit-float-conversion",
    "-Wno-implicit-int-conversion",
    "-Wno-c++11-narrowing",
    "-fdiagnostics-absolute-paths",
    "-fdiagnostics-color",
    "-Wno-undefined-bool-conversion"

];

export const CLANG_CL_FILE_NAME = "clang-cl.exe";

const ueClangdSettingNames: UeClangdSettingNames = {
    extensionSection: "unreal-clangd",
    settings: {
        "compileCommands.execType": "compileCommands.execType",
        "compileCommands.platform": "compileCommands.platform",
        "compileCommands.architecture": "compileCommands.architecture",
        "creation.overwrite": "creation.overwrite",
        "creation.tidy": "creation.tidy",
        "creation.bypassUnrealVersionCheck": "creation.bypassUnrealVersionCheck",
        "fixes.intellisenseFiles": "fixes.intellisenseFiles",
        "fixes.delegateFuncCompletions": "fixes.delegateFuncCompletions",
        "fixes.autoIncludeSourceOnly": "fixes.autoIncludeSourceOnly",
        "utility.checkForIntellisenseFilesOnStartup": "utility.checkForIntellisenseFilesOnStartup",
        "editor.parameterHints": "editor.parameterHints",
        "creation.compilerPath": "creation.compilerPath",
        "creation.completionHelper": "creation.completionHelper",
        "creation.completionHelperMP": "creation.completionHelperMP",
        "completion.openCompletionHelperOnStartup": "completion.openCompletionHelperOnStartup",
        "completion.completionHelperInfoOnStartup": "completion.completionHelperInfoOnStartup",
        "utility.createProjectOnStartup": "utility.createProjectOnStartup"
    }
};

const vscodeSettingNames: VSCodeSettingNames = {
    extensionSection: "",
    settings: {
        "files.associations": "files.associations",
        "editor.suggest.snippetsPreventQuickSuggestions": "editor.suggest.snippetsPreventQuickSuggestions",
        "workbench.colorCustomizations": "workbench.colorCustomizations",
        "editor.suggestFontSize": "editor.suggestFontSize"
    }
};

const clangdSettingNames: ClangdSettingNames  = {
    extensionSection: "clangd",
    settings: {
        arguments: "arguments",
        path: "path",
        detectExtensionConflicts: "detectExtensionConflicts"
    }
};

const cppSettingNames: CCppSettingNames = {
    extensionSection: "C_Cpp",
    settings: {
        intelliSenseEngine: "intelliSenseEngine",
        autocomplete: "autocomplete",
        formatting: "formatting",
        errorSquiggles: "errorSquiggles"
    }
};

export const settingNames: AllSettingNames = {
    unrealClangd: ueClangdSettingNames,
    clangd: clangdSettingNames,
    cCpp: cppSettingNames,
    vscode: vscodeSettingNames
};

export enum ParamHints {
   disabled = "disabled",
   needed = "needed",
   all = "all"
}


export const OVERWRITE_PARTIAL: Overwrite = 'partial';
export const OVERWRITE_FULL: Overwrite = 'full';

export const COMPILE_COMMANDS_EXEC_TYPE_TASK = "Task";
export const COMPILE_COMMANDS_EXEC_TYPE_DEBUG = "Debug";

export const FILE_NAME_COMPILE_COMMANDS = "compile_commands.json";
export const FILE_NAME_COMPLETION_HELPER = "completionHelper.cpp";

export const BUILD_TARGET_EDITOR_SUFFIX = "Editor";

export const FOLDER_NAME_VSCODE = ".vscode";
export const FOLDER_NAME_UNREAL_CLANGD = "unreal-clangd";
export const FOLDER_NAME_SOURCE = "Source";
export const FOLDER_NAME_ENGINE = "Engine";

export const UECPP_SOURCE_FILE_EXTENSIONS = ["cpp", "h"];
export const UECPP_SOURCE_FILE_EXTENSIONS_REGEX = `(${UECPP_SOURCE_FILE_EXTENSIONS.join('|')})`;

export const FILE_NAME_CLANG_FORMAT = ".clang-format";
export const FILE_NAME_CLANGD_CFG = ".clangd";
export const FILE_NAME_CLANG_TIDY = ".clang-tidy";

export const GLOB_ALL_CLANGD_CFG_FILES = "**/{.clang-format,.clangd,.clang-tidy}";
export const GLOB_ALL_GCD_AND_GCD_OLD_FILES = "**/*.{gcd,gcd.old}";
export const GLOB_ALL_COMPILE_COMMANDS_DIR_FILES = `${FOLDER_NAME_VSCODE}/${FOLDER_NAME_UNREAL_CLANGD}/**/*.*`;
export const GLOB_ALL_HEADERS = "**/*.h";

export const UPDATE_COMPILE_COMMANDS_DBGCFG_NAME = "unreal-clangd: Update Compile Commands";
export const UPDATE_COMPILE_COMMANDS_DBGCFG_TYPE = "coreclr";
export const UPDATE_COMPILE_COMMANDS_DBGCFG_REQUEST = "launch";
export const UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE = "integratedTerminal";
export const UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY = false;
export const UPDATE_COMPILE_COMMANDS_COMPILER_CLANG = "-Compiler=Clang";
export const UPDATE_COMPILE_COMMANDS_PROJECT_NAME_EDITOR_SUFFIX = "Editor";
export const END_DIRECTORY_NAMES_TO_UNREAL_BUILD_TOOL = [
    "Engine", "Binaries", "DotNET", "UnrealBuildTool"
];
export const END_UBT_SCRIPT_FILE_NAMES_UNIX = [
    "Engine", "Build", "BatchFiles", "RunUBT.sh"
];

export const END_UBT_SCRIPT_FILE_NAMES_WIN = [
    "Engine", "Build", "BatchFiles", "RunUBT.bat"
];


export const CREATION_ARG_SETTING_UNREAL_PLATFORM = "platform";
export const CREATION_ARG_SETTING_OVERWRITE = "overwrite";
export const CREATION_ARG_SETTING_TIDY = "tidy";

//export const CREATION_ARG_SETTING_FORMAT = "format";

export const CLANGD_STRINGIFY_OPTIONS = {directives: true};
export const CLANG_FORMAT_STRINGIFY_OPTIONS = {directives: true};
export const CLANG_TIDY_STRINGIFY_OPTIONS = {directives: true};

export const UPDATE_COMPILE_COMMANDS_ARG_DEVELOPMENT = "Development";
export const UPDATE_COMPILE_COMMANDS_ARG_GEN_CLANGDB = "-mode=GenerateClangDataBase";
export const UPDATE_COMPILE_COMMANDS_ARG_ARCHITECTURE_EMPTY = "-architecture=";
//export const UPDATE_COMPILE_COMMANDS_DBGCFG_ARG

export const END_OF_UNINSTALL_DELAY = 2000; // ms Prevents uninstall var updating before file deletion lag (triggers gcd delete detect without)
export const END_OF_CLEAN_TASK_DELAY = 1500; // Delay to check if Reinstall task is being run so Update CC Ask doesn't trigger twice.

export const CLANGD_DEFAULT_CLANGD_PATH = "clangd";
export const ASK_CLANGD_PATH_PLACEHOLDER_WINDOWS = "Example: C:\\Program Files\\LLVM\\bin\\clangd.exe";
export const ASK_CLANGD_PATH_PLACEHOLDER_OTHERS = "Example: /usr/lib/llvm-13/bin/clangd";

export const MACRO_EXP_FIX_ADD_DYNAMIC_CHECKER = "__Internal_AddDynamic(UserClass *InUserObject, typename FDelegate::TMethodPtrResolver<UserClass>::FMethodPtr InMethodPtr, FName InFunctionName)";
export const MACRO_EXP_FIX_MIN_CODE_COMPLETION_LENGTH = 7;  // Code completion could probably be less than this but not in our use case

export const UNREAL_BUILD_TOOL_APP_NAME = "UnrealBuildTool";

export const UNREAL_BUILD_TARGET_FILE_EXTENSION = "Target.cs";

export const TASK_TYPE = "shell";

export const RE_CREATE_ARGS = /(?<=[-=])\w+/gm;
export const RE_STRING_SOURCE_FOLDERS_SUFFIX = `[\\\\\\/]+[\\w\\s-]+`;
export const RE_STRING_FOLDER_NAME = `[\\w\\s-]+`;

export const GLOB_GCD_FILES = `Intermediate/Build/**/UnrealEditor/**/${UPDATE_COMPILE_COMMANDS_ARG_DEVELOPMENT}/**/*.gcd`;
export const GLOB_SOURCE_FILES_SUFFIX = "/**/*.{cpp,h}";
export const GLOB_SIMPLE_CHECK_CLANGD_PROJECT_FILES = `**/*.{clangd,clang-format}`;

export const LINUX_SYS_INCLUDE_CPP_V1 = "-isystemThirdParty/Unix/LibCxx/include/c++/v1";
export const LINUX_STDLIB_SYS_INCLUDE_CPP_V1 = "-stdlib++-isystemThirdParty/Unix/LibCxx/include/c++/v1";


export const defaultCreationCmdLine: [CreationCmdLineSettings, CreationCmdLineValue][] = [
    [CREATION_ARG_SETTING_UNREAL_PLATFORM, ""],
    [CREATION_ARG_SETTING_OVERWRITE, OVERWRITE_PARTIAL],
    [CREATION_ARG_SETTING_TIDY, false]
];

export const backupGlobDirs: BackupGlobDirectories = {
    ModuleRules: "Intermediate/Build/BuildRules/**",
    SourceFileCache: "Intermediate/Build",
    //DefaultEngineGame: "Config",
    LiveCodingInfo: "Intermediate/Build/**",
    RspH: "Intermediate/Build/**/UnrealEditor/**"
};

export const backupGlobPatterns: GlobPatterns = {
    [`${backupGlobDirs.ModuleRules}/*{ModuleRulesManifest.json,ModuleRules.dll,ModuleRules.pdb}`]: {MaxResults: 3},
    [`${backupGlobDirs.SourceFileCache}/SourceFileCache.bin`]: {MaxResults: 1},
    //[`${backupGlobDirs.DefaultEngineGame}/Default{Engine,Game}.ini`]: {MaxResults: 2},
    [`${backupGlobDirs.LiveCodingInfo}/LiveCodingInfo.json`]: {MaxResults: undefined},
    [`${backupGlobDirs.RspH}/*.{rsp,h}`]: {MaxResults: undefined}
};

const defaultVSCodeSettings: VSCodeDefaultSettings = {
    extensionSection: "",
    settings: {
        "files.associations": {
            configTarget: vscode.ConfigurationTarget.Workspace,
            value: {
                "*.clangd": "yaml",
                "*.clang-format": "yaml",
                "*.clang-tidy": "yaml"
            }
        },
        "editor.suggest.snippetsPreventQuickSuggestions": {
            configTarget: vscode.ConfigurationTarget.WorkspaceFolder,
            value: false
        },
        "workbench.colorCustomizations": {
            configTarget: vscode.ConfigurationTarget.Workspace,
            value:  {
                "editorInlayHint.foreground": "#a2a2a2c0",
                "editorInlayHint.background": "#00000000",
            },
        },
        "editor.suggestFontSize": {
            configTarget: vscode.ConfigurationTarget.Workspace,
            value: 0
        }
    }
};


export const defaultCppToolsSettings: CCppDefaultSettings = {
    extensionSection: "C_Cpp",
    settings: {
        "intelliSenseEngine": { value: "disabled", configTarget: vscode.ConfigurationTarget.WorkspaceFolder },
        "autocomplete": { value: "disabled", configTarget: vscode.ConfigurationTarget.WorkspaceFolder },
        "formatting": { value: "disabled", configTarget: vscode.ConfigurationTarget.WorkspaceFolder },
        "errorSquiggles": { value: "disabled", configTarget: vscode.ConfigurationTarget.WorkspaceFolder }
    }
};

const defaultClangdArguments: ClangArgWithValue[] = [
    "-header-insertion=iwyu",
    "-header-insertion-decorators=true",
    "-all-scopes-completion=true",
    "-limit-results=100",  // default is 100
    "-background-index=true",
    "-limit-references=2000",
    "-completion-style=detailed",
    "-function-arg-placeholders=true",
    "-log=info"
];

const defaultClangDSettings: ClangdDefaultSettings = {
    extensionSection: "clangd",
    settings: {
        "arguments": { value: defaultClangdArguments, configTarget: vscode.ConfigurationTarget.Workspace },
        "path": { value: "", configTarget: vscode.ConfigurationTarget.Workspace },
        "detectExtensionConflicts": { value: false, configTarget: vscode.ConfigurationTarget.Workspace }
    }
};


export const defaultConfigSettings: AllDefaultSettings = {
    cCpp: defaultCppToolsSettings,
    clangd: defaultClangDSettings,
    vscode: defaultVSCodeSettings
};

export const defaultCompilerFlags: CompileFlags = {
    "CompilationDatabase" : `${FOLDER_NAME_VSCODE}/${FOLDER_NAME_UNREAL_CLANGD}`
};

export const defaultInlayHints: InlayHintsFlags = {
    Enabled: "Yes",
    DeducedTypes: "Yes",
    ParameterNames: "Yes",
    Designators: "Yes"
};

export const defaultGeneralClangdCfgSettings: ClangdCfgFileSettings = {
    "If": {PathMatch: []},
    "CompileFlags": defaultCompilerFlags,
    "InlayHints": defaultInlayHints
};

export const defaultGeneralClangTidySettings: ClangTidyFileSettings = {
    Checks: "-*,\nreadability-*,\ncppcoreguidelines-*,\nbugprone-*,\nmodernize-*,\nperformance-*,\nmisc-*",
    CheckOptions: [{key: "readability-function-cognitive-complexity.Threshold", value: 25}],
    FormatStyle: "file"
};

export const defaultGeneralClangFormatFile: ClangFormatFileSettings = {
    BasedOnStyle: "LLVM",
    UseTab: "Never",
    BreakBeforeBraces: "Allman",
    ColumnLimit: 120,
    IndentWidth: 4,
    SortIncludes: "false",
    AccessModifierOffset: -4,
    NamespaceIndentation: "All"

};

export const completionHelperCppContent = "/*\n" +
    "*  Completion helper to help load Unreal Engine symbols into clangd auto completion\n" +
    "*  If we didn't do it this way, we would need to polute the project's compile_commands.json\n" +
    "*\n" +
    "*  You need to edit this to include any plugin headers or other important headers missing\n" +
    "*\n" +
    "*  I'll update this based on user recommendations\n" +
    "*/\n" +
    "\n" +
    "// Warning: Intellisense use only. Do not include these next two includes in your own code!\n" +
    "#include \"Engine.h\"\n" +
    "#include \"Runtime/Engine/Public/EngineSharedPCH.h\"\n" +
    "\n// Kismet Math\n#include \"Kismet/KismetMathLibrary.h\"\n";

export const completionHelperCppMPcontent = "\n// For Unreal Multiplayer\n#include \"Net/UnrealNetwork.h\"\n";

export const UNREAL_CLANGD_COMPILE_COMMANDS_RELATIVE_FOLDERS = [FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD];
