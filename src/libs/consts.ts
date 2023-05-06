/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as ueHelpers from "./ueHelpers";

import { AllDefaultSettings, AllSettingNames, CCppDefaultSettings, CCppSettingNames, ClangdDefaultSettings, ClangdSettingNames, ClangFormatFileSettings, ClangTidyFileSettings, CreationCmdLineSettings, CreationCmdLineValue, UeClangdSettingNames, VSCodeDefaultSettings, VSCodeSettingNames} from "./types";
import type { ClangdCfgFileSettings, CompileFlags, ClangArgWithValue } from "./types";
import type { Overwrite } from './indexTypes';

export const EXTENSION_VERSION = "1.0.4";
export const VALIDATE_UNREAL_VERSIONS: { min: ueHelpers.UnrealVersion, max: ueHelpers.UnrealVersion } =
    { min: { major: 5, minor: 1, patch: 0 }, max: { major: 5, minor: 1, patch: 1 } };  // The unreal versions this extension was created for

export const EXTENSION_NAME = "unreal clangd";
export const UE5_WORKSPACE_NAME = "UE5";
export const UPROJECT_FILE_EXTENSION_WITH_DOT = ".uproject";

export const LINUX_CLANGD_CFG_ADD_USR_INCLUDE = "-I/usr/include"; 

export const EXT_CMD_UPDATE_COMPILE_COMMANDS = "unreal-clangd.updateCompileCommands";
export const EXT_CMD_FIX_RESPONSE_QUOTED_PATHS = "unreal-clangd.fixQuotesResponseFiles";
export const EXT_CMD_CREATE_CLANGD_PROJECT = "unreal-clangd.createUnrealClangdProject";
export const VSCODE_CMD_RELOAD_WINDOW = "workbench.action.reloadWindow";
export const VSCODE_INSERT_SNIPPET = "editor.action.insertSnippet";
export const VSCODE_CMD_FOCUS_SUGGESTION = "focusSuggestion";

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

const ueClangdSettingNames: UeClangdSettingNames = {
    extensionSection: "unreal-clangd",
    settings: {
        "compileCommands.execType": "compileCommands.execType",
        "compileCommands.platform": "compileCommands.platform",
        "compileCommands.architecture": "compileCommands.architecture",
        "creation.overwrite": "creation.overwrite",
        "creation.tidy": "creation.tidy",
        "creation.bypassUnrealVersionCheck": "creation.bypassUnrealVersionCheck",
        "fixes.responseFilesQuotedPaths": "fixes.responseFilesQuotedPaths",
        "fixes.delegateFuncCompletions": "fixes.delegateFuncCompletions",
        "fixes.autoIncludeSourceOnly": "fixes.autoIncludeSourceOnly",
        "utility.checkForIntellisenseFilesOnStartup": "utility.checkForIntellisenseFilesOnStartup",
        "editor.parameterHints": "editor.parameterHints",
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

export const OVERWRITE_STRICT: Overwrite = 'strict';
export const OVERWRITE_LAZY: Overwrite = 'lazy';
export const OVERWRITE_FULL: Overwrite = 'full';

export const COMPILE_COMMANDS_EXEC_TYPE_TASK = "Task";
export const COMPILE_COMMANDS_EXEC_TYPE_DEBUG = "Debug";

export const FILE_NAME_COMPILE_COMMANDS = "compile_commands.json";
export const FILE_NAME_COMPLETION_HELPER = "completionHelper.cpp";

export const BUILD_TARGET_EDITOR_SUFFIX = "Editor";

export const FOLDER_NAME_VSCODE = ".vscode";
export const FOLDER_NAME_UNREAL_CLANGD = "unreal-clangd";
export const FOLDER_NAME_SOURCE = "Source";

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
export const UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE = "externalTerminal";
export const UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY = false;
export const UPDATE_COMPILE_COMMANDS_COMPILER_CLANG = "-Compiler=Clang";
export const UPDATE_COMPILE_COMMANDS_PROJECT_NAME_EDITOR_SUFFIX = "Editor";
export const END_DIRECTORY_NAMES_TO_UNREAL_BUILD_TOOL = [
    "Engine", "Binaries", "DotNET", "UnrealBuildTool"
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

export const GLOB_GCD_FILES = `Intermediate/Build/**/${UPDATE_COMPILE_COMMANDS_ARG_DEVELOPMENT}/**/*.gcd`;
export const GLOB_SOURCE_FILES_SUFFIX = "/**/*.{cpp,h}";
export const GLOB_SIMPLE_CHECK_CLANGD_PROJECT_FILES = `**/*.{clangd,clang-format}`;

export const defaultCreationCmdLine: [CreationCmdLineSettings, CreationCmdLineValue][] = [
    [CREATION_ARG_SETTING_UNREAL_PLATFORM, ""],
    [CREATION_ARG_SETTING_OVERWRITE, OVERWRITE_STRICT],
    [CREATION_ARG_SETTING_TIDY, false]
];


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
        "editor.suggestFontSize": {
            configTarget: vscode.ConfigurationTarget.Workspace,
            value: 0
        }
    }
};


const defaultCppToolsSettings: CCppDefaultSettings = {
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
    "-completion-style=detailed"
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
    "Add": [
        "-D__INTELLISENSE__"
    ]
};

export const defaultGeneralClangdCfgSettings: ClangdCfgFileSettings = {
    "If": {PathMatch: []},
    "CompileFlags": defaultCompilerFlags
};

export const defaultGeneralClangTidySettings: ClangTidyFileSettings = {
    Checks: "-*,\nreadability-*,\n-readability-static-accessed-through-instance,\ncppcoreguidelines-*,\nbugprone-*,\nmodernize-*,\nperformance-*,\nmisc-*",
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
    AccessModifierOffset: -4
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
    "#include \"Runtime/Engine/Public/EngineSharedPCH.h\"\n";

export const completionHelperCppMPcontent = "\n// For Unreal Multiplayer\n#include \"Net/UnrealNetwork.h\"\n";
