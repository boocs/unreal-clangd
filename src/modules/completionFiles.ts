
import * as vscode from 'vscode';
import { getMainSourceFolderUri, getProjectWorkspaceFolder, getUnrealUri } from '../libs/ueHelpers';
import { FOLDER_NAME_UNREAL_CLANGD, FOLDER_NAME_VSCODE } from '../libs/consts';
import { convertWindowsDriveLetterToUpper, getNonEmptyCompileCommandFile, getUnrealClangdCompileCommandsUri, getValidatedCompileCommandObjectsFromUri, isFile, saveFile, writeCompileCommandsFile } from '../libs/projHelpers';
import { EOL } from 'node:os';
import { getUniqueResponseFilePathsFromCompileCommandsWithFilter } from '../shared';
import * as tr from '../tr/text';
import * as consts from '../libs/consts';
import { CompileCommand } from '../libs/types';

import * as console from '../libs/console';


export const FILENAME_ADD_COMPLETIONS = "addCompletions.h";
export const FILENAME_ADD_MACRO_COMPLETIONS = "addMacroCompletions.h";
export const FILENAME_MACRO_COMP_HELPER = "macroCompletionHelper.h";
//export const FILENAME_DEFAULT_MACRO_COMP = "defaultMacroCompletions.h";
export const FILENAME_DEFAULT_COMP = "defaultCompletions.h";

const NO_WORK_TILL = `* *** NOTE: Edits/Editions won't work until you reload the file or press the bottom left 'UC' button twice (Do it twice to get back to same setting it was on).`;
const DO_NOT_MODIFY = `/*${EOL}* ***** DO NOT MODIFY *****${EOL}*`;
const YOU_CAN_MODIFY_NON_MACRO = "* You can modify 'non-macro' completion includes using the file ";
const YOU_CAN_MODIFY_MACRO = "* You can modify 'macro' and 'non-macro' completion includes using the file ";
const WILL_HAVE_ERRORS = "* *** NOTE: This file will have Intellisense errors/warnings when opened directly. *****";
const END_HEADER = `*${EOL}*/${EOL}${EOL}`;


export async function createCompletionFiles() {

    const projWorkspace = getProjectWorkspaceFolder();
    if (!projWorkspace) { return; }

    const fileInfos: { name: string, content: string }[] = [
        {name: "completionHelper.cpp", content: getCompletionHelperContent()},
        {name: FILENAME_DEFAULT_COMP, content: getDefaultCompletionsContent()},
        {name: FILENAME_ADD_COMPLETIONS, content: getAddCompletionsContent()},
        {name: FILENAME_MACRO_COMP_HELPER, content: getMacroCompletionsHelperContent()},
        //{name: FILENAME_DEFAULT_MACRO_COMP, content: getDefaultMacroCompletionsContent()},
        {name: FILENAME_ADD_MACRO_COMPLETIONS, content: getAddMacroCompletionsContent()}
    ];

    for (const fileInfo of fileInfos) {
        await easyCreateVSCodeUnrealClangdFolderFile(projWorkspace, fileInfo.content, fileInfo.name);
    }

}

/**
 *  Get macroCompletionHelper.h path wtih uppercase drive letter if on Windows
 **/ 
export function getMacroCompletionHelperPath() {
    const projUri = getProjectWorkspaceFolder()?.uri;
    if(!projUri) {return;}

    const uri = vscode.Uri.joinPath(projUri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, FILENAME_MACRO_COMP_HELPER);

    return convertWindowsDriveLetterToUpper(uri.fsPath);
    
}


/**
 * - `Will not overwrite any existing files`
 * 
 * @param workspace the parent workspace of .vscode/unreal-clangd
 * @param content the file content to save
 * @param fileName fileName of file to save
 * 
 */
async function easyCreateVSCodeUnrealClangdFolderFile(workspace: vscode.WorkspaceFolder, content: string, fileName: string) {

    const fileUri = vscode.Uri.joinPath(workspace.uri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, fileName);

    if ((await isFile(fileUri))) { return; }  // Don't overwrite

    await saveFile(content, fileUri);

}


function getCompletionHelperContent() {
    const header = `${DO_NOT_MODIFY}${EOL}${YOU_CAN_MODIFY_NON_MACRO}${FILENAME_ADD_COMPLETIONS}${EOL}*${EOL}${END_HEADER}`;
    const includes = `#include \"defaultCompletions.h\"${EOL}#include \"addCompletions.h\"${EOL}`;
    return `${header}${includes}`;
}


function getDefaultCompletionsContent() {
    //const modifyMacroOrNonMacro = nonMacro ? YOU_CAN_MODIFY_NON_MACRO : YOU_CAN_MODIFY_MACRO;
    const header = `${DO_NOT_MODIFY}${EOL}${YOU_CAN_MODIFY_NON_MACRO}${FILENAME_ADD_COMPLETIONS}(fast)${EOL}${YOU_CAN_MODIFY_MACRO}${FILENAME_ADD_MACRO_COMPLETIONS}${EOL}*${EOL}${WILL_HAVE_ERRORS}${EOL}${END_HEADER}`;
    const includes = [
        "#include \"Runtime/Core/Public/CoreSharedPCH.h\"",
        "#include \"Editor/UnrealEd/Public/UnrealEdSharedPCH.h\"",
        "#include \"Runtime/Slate/Public/SlateSharedPCH.h\"",
        "#include \"Runtime/CoreUObject/Public/CoreUObjectSharedPCH.h\"",
        "#include \"Runtime/Engine/Public/EngineSharedPCH.h\""
    ];

    const includesString = includes.join(EOL);

    return `${header}${EOL}${includesString}`;
}

function getAddCompletionsContent() {
    const addCompletionsDescription = "* addCompletions.h - Adds any 'non-macro' completion. Does NOT cause code completion file loading slowness.";
    const header = `/*${EOL}${addCompletionsDescription}${EOL}*${EOL}${WILL_HAVE_ERRORS}${EOL}*${EOL}${NO_WORK_TILL}${EOL}*/${EOL}`;
    const includes = [
        "// This is only an example. The file below isn't included by default for code completion and is commented out here.",
        "// Usually you'll use 'FMath::' for your math library. This example is here to show that you can add custom completions if needed.",
        "// #include \"Kismet/KismetMathLibrary.h\""
    ];

    const includesString = includes.join(EOL);

    return `${header}${EOL}${includesString}`;
}


function getMacroCompletionsHelperContent() {
    const header = `${DO_NOT_MODIFY}${EOL}${YOU_CAN_MODIFY_MACRO}${FILENAME_ADD_MACRO_COMPLETIONS}(slow)${EOL}*${EOL}${WILL_HAVE_ERRORS}${EOL}${END_HEADER}`;
    const includes = `// #include \"defaultCompletions.h\"${EOL}#include \"addMacroCompletions.h\"${EOL}`;

    return `${header}${includes}`;
}


//function getDefaultMacroCompletionsContent() {
//    return getDefaultCompletionsContent(false);
//}


function getAddMacroCompletionsContent() {
    const fileArray = [
        "/*",
        "* addMacroCompletions.h - Adds both macro and non-macro completions but will cause slower code completion file loading with each addition",
        "*",
        "* Only add files for 'macro completions' you use a lot or 'macro completions' that aren't included by default.",
        "* Remember: All completions, including macro completions, work when you `#include \"path/to/header.h\"` the header directly in your source file...",
        "* Feel free to experiment!",
        "*",
        NO_WORK_TILL,
        "*",
        WILL_HAVE_ERRORS,
        "*",
        `*/${EOL}`,
        "// **** These first two are examples of Modules that aren't enabled by default.",
        "// **** If you do use them or any other module you can add them here.",
        "// ***** module CQTest or (CQTestEnhancedInput?) *****",
        "// #include \"CQTest.h\"  //  AFTER_EACH(ALL), BEFORE_EACH(ALL), TEST_CLASS_WITH_BASE_AND_FLAGS, and more",
        "// ***** plugin/module GameplayAbilities *****",
        `// #include \"AttributeSet.h\"  // GAMEPLAYATTRIBUTE_PROPERTY_GETTER, GAMEPLAYATTRIBUTE_VALUE_GETTER, GAMEPLAYATTRIBUTE_VALUE_INITTER, and others${EOL}`,
        "// The example macros specified, in the comments, after these #includes aren't all the macros specified in the file",
        "#include \"Net/UnrealNetwork.h\"  // DOREP* macros",
        "#include \"Online/CoreOnline.h\"  // MAX_LOCAL_PLAYERS",
        "#include \"Stats/Stats.h\"    // QUICK_*, SCOPE_*, DECLARE_*, CONDITIONAL_*, RETURN_*, GET_*, DEC_*, SET_*, STAT_* macros",
        // "#include \"Stats/Stats2.h\"  // DECLARE_* , SET_*, INC_*, STAT_*, DEC_*",  // MARK: DEPRECATED Needed for older UE versions?
        "#include \"Delegates/DelegateCombinations.h\"  // DECLARE_* (delegate macros)",
        "#include \"DrawDebugHelpers.h\"  // ENABLE_DRAW_DEBUG",
        "#include \"GenericPlatform/GenericPlatformCompilerPreSetup.h\" // PRAGMA_DISABLE_DEPRECATION_WARNINGS and others",
        "#include \"HAL/Platform.h\"  // TEXT(), a lot of different ones",
        "#include \"Internationalization/Internationalization.h\"  // NSLOCTEXT, LOCTEXT, (others)",
        "#include \"Logging/LogMacros.h\"  // UE_LOG and others",
        "#include \"Math/UnrealMathUtility.h\"  // Lots of Math Macros",
        "#include \"Misc/AssertionMacros.h\"  // check(), ensure(), and a lot of others",
        "#include \"Misc/Build.h\"  // UE_BUILD_SHIPPING and a lot of others",
        "#include \"Misc/CoreMiscDefines.h\"  // UE_DEPRECATED, CA_* (code analysis), PURE_VIRTUAL, and more",
        "#include \"Misc/EnumClassFlags.h\"  // ENUM_CLASS_FLAGS",
        "#include \"Modules/ModuleManager.h\"  // IMPLEMENT_MODULE, IMPLEMENT_PRIMARY_GAME_MODULE",
        "#include \"ProfilingDebugging/CpuProfilerTrace.h\"  // TRACE_* macros (cpu profiler)",
        "#include \"ProfilingDebugging/CsvProfiler.h\"  // CSV_ macros (csv profiler)",
        "#include \"Trace/Trace.h\"  // UE_TRACE_*",
        "#include \"UObject/ObjectMacros.h\"  // UPROPERTY, UFUNCTION, USTRUCT, UMETA, UPARAM, UENUM, UDELEGATE, RIGVM_METHOD, a lot of others",
        "#include \"UObject/Script.h\"  // RESULT_PARAM, RESULT_DECL, FUNC_*",
        "#include \"UObject/ScriptMacros.h\"  // PARAM_* , P_GET_*, other P_* macros",
        "#include \"HAL/MemoryMisc.h\"  // ENABLE_SHARED_MEMORY_TRACKER",
        "#include \"CollisionQueryParams.h\"  // SCENE_QUERY_STAT, ",
        "#include \"Stats/StatsMisc.h\"  // SCOPE_* and CONDITIONAL_SCOPE_* macros",
        "#include \"NativeGameplayTags.h\" // UE_DEFINE_GAMEPLAY_TAG, UE_DEFINE_GAMEPLAY_TAG_STATIC, UE_DEFINE_GAMEPLAY_TAG_COMMENT, UE_DECLARE_GAMEPLAY_TAG_EXTERN, and others",
        "#include \"Iris/ReplicationState/PropertyNetSerializerInfoRegistry.h\"   // UE_NET_IMPLEMENT_FORWARDING_NETSERIALIZER_AND_REGISTRY_DELEGATES and others"
    ];

    return fileArray.join(EOL);

}


export async function addCompletionHelperToCompileCommands() {
    
    const projectWorkspace = getProjectWorkspaceFolder();
    if(!projectWorkspace){
        return;
    }

    const compileCommandsUri = getUnrealClangdCompileCommandsUri(projectWorkspace.uri, {withFileName:true});
    
    const completionHelperPathUri = getCompletionHelperPath(projectWorkspace.uri,{withFileName: true} );
    
    const ccFile = await getNonEmptyCompileCommandFile(compileCommandsUri);

    if(!ccFile){
        console.error(tr.COULDNT_GET_CC_FILE);
        return;
    }
    
    const mainSourceFolderPathLower = getMainSourceFolderUri()?.fsPath.toLowerCase();
    if(!mainSourceFolderPathLower){
        console.error(tr.COULDNT_GET_PROJ_SRC_PATH);
        return;
    }

    // Since we only intrested in the main source folder later, we should filter only the main source file.
    const responsePaths = getUniqueResponseFilePathsFromCompileCommandsWithFilter(ccFile, mainSourceFolderPathLower);
    if(!responsePaths){
        return;
    }

    const responsePathMostEntries = Object.keys(responsePaths).reduce((previous, current, _i, _pathsArray) => {	
        return responsePaths[current] > responsePaths[previous] ? current : previous; 
    });

    if(!responsePathMostEntries){
        return;
    }
        
    const winResponsePathMostEntries = responsePathMostEntries.replaceAll(`\\\\`, `\\`);
    
    const sourceFolderCC = ccFile.find((value: CompileCommand, _index: number, _obj: CompileCommand[]) => {
        let hasResponsePathMostEntries = !!value.command?.includes(responsePathMostEntries) || !!value.arguments?.some((v) => {
            return v.includes(responsePathMostEntries);
        });

        if(!hasResponsePathMostEntries && process.platform === "win32"){
            hasResponsePathMostEntries = !!value.command?.includes(winResponsePathMostEntries) || !!value.arguments?.some((v) => {
                return v.includes(winResponsePathMostEntries);
            });
        }

        return value.file.toLowerCase().startsWith(mainSourceFolderPathLower) && hasResponsePathMostEntries;
    });

    if(!sourceFolderCC){
        console.error(tr.COULDNT_FIND_SRC_CC_ENTRY_FOR_COMPLETION_HELPER);
        console.log(tr.ADD_FILES_TO_PROJ_SRC_TO_CORRECT_ERR);
        return;
    }

    const completionHelperCC = getCompletionHelperCC(sourceFolderCC, completionHelperPathUri);

    
    ccFile.push(completionHelperCC);
    await writeCompileCommandsFile(compileCommandsUri, undefined, ccFile);
       
    await addCompletionHelperToUnrealCC(completionHelperCC);

    return;

}

function getCompletionHelperPath(baseUri: vscode.Uri, options: {withFileName: boolean}) {
	const fileName = options.withFileName? consts.FILE_NAME_COMPLETION_HELPER : "";
	const ccUri = getUnrealClangdCompileCommandsUri(baseUri, {withFileName: false});
	return vscode.Uri.joinPath(ccUri, fileName);
}


function getCompletionHelperCC(compileCommand: CompileCommand, completionHelperUri: vscode.Uri): CompileCommand{
    
    return  {
        command: compileCommand.command,
        directory: compileCommand.directory,
        file: convertWindowsDriveLetterToUpper(completionHelperUri.fsPath),
        arguments: compileCommand.arguments
    };
}


async function addCompletionHelperToUnrealCC(completionHelperCC: CompileCommand) {
    const ueUri = getUnrealUri();
    if(!ueUri){
        return;
    }

    const unrealCCUri = getUnrealClangdCompileCommandsUri(ueUri, {withFileName: true});

    // If compile commands doesn't exist
    if(!(await isFile(unrealCCUri))){
       await writeCompileCommandsFile(unrealCCUri, undefined, [completionHelperCC]);
       return;
    }

    const ccs = await getValidatedCompileCommandObjectsFromUri(unrealCCUri);

    if(!ccs) {
        return;
    }

    const hasCompletionHelper = ccs.some((value) => {
        return value.file.includes(consts.FILE_NAME_COMPLETION_HELPER);
    });

    // It does exist but already has a cc entry
    if(hasCompletionHelper){
        return;
    }

    ccs.push(completionHelperCC);
    await writeCompileCommandsFile(unrealCCUri, undefined, ccs);
}


/**
 * Stand alone version for creating Unreal compile commands file with
 * single entry of completionHelper.cpp
 * @returns 
 */
export async function createUnrealCompileCommands() {
    
    const completionHelperCcEntry = await getProjectCompletionHelperCompileCommandsEntry();

    if(!completionHelperCcEntry) { return;}

    const ueUri = getUnrealUri();
    if(!ueUri) {return;}
    
    const ueCcUri = getUnrealClangdCompileCommandsUri(ueUri, {withFileName: true});

    await writeCompileCommandsFile(ueCcUri, undefined, [completionHelperCcEntry]);
}


async function getProjectCompletionHelperCompileCommandsEntry() {
    const projectUri = getProjectWorkspaceFolder()?.uri;
    if(!projectUri) { return; }

    const projectCCUri = vscode.Uri.joinPath(projectUri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, consts.FILE_NAME_COMPILE_COMMANDS);

    const ccs = await getValidatedCompileCommandObjectsFromUri(projectCCUri);

    if(!ccs) {return;}

    for (const cc of ccs) {
        if(cc.file.includes(consts.FILE_NAME_COMPLETION_HELPER)){
            console.log("Project Change: Found project completion helper entry in compile_commands.json.");
            return cc;
        }
    }

    console.warn("Project Change: Didn't find project completion helper entry in compile_commands.json");
}