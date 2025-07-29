/**
 * For Windows users to set custom system includes libraries in their .clangd files
 */

import * as vscode from 'vscode';
import * as path from 'path';

import { EOL } from 'os';
import { convertWindowsDriveLetterToUpper, getClangDPathFromConfig, getCompilerFromCompileCommands, getFileString, getProjectCompileCommandsName, getUnrealClangdConfig, isFile, logException, runTerminalCommand, saveFile } from '../libs/projHelpers';
import { getProjectWorkspaceFolder} from '../libs/ueHelpers';
import * as consts from '../libs/consts';
import * as yaml from 'yaml';
import { iterateOverProjectFolders, restartClangd } from '../shared';
import * as nodeOS from 'node:os';

import * as console from '../libs/console';


const CUSTOM_CHOICE = 'Custom...';
const SAME_AS_BUILD_CHOICE = 'Same as Build';
const SYS_INC_FILTER_PREFIXES = ["/X", "-fms-compatibility-version=", "/imsvc"];

const WEB_VISUAL_STUDIO_INSTALLER_DOCS = "https://github.com/boocs/unreal-clangd?tab=readme-ov-file#installing-correct-library-versions-windows";

/**
 * Check if Windows users have custom system includes set 
 */
export async function startCheckCustomSystemIncludes(): Promise<void> {
    
	if(nodeOS.platform() !== "win32") { return; }

	const projWorkspaceFolder = getProjectWorkspaceFolder();
	if (!projWorkspaceFolder) {
		return;
	}
	const unrealClangdConfig = getUnrealClangdConfig(projWorkspaceFolder);
	const isShowWarning = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['systemIncludes.showMissingWarning']);

	if (!isShowWarning) {
		return;
	}

	await iterateOverProjectFolders( checkCustomSystemIncludesInClangdCfg, async (result, uri) => {
		if(result === 'okFail'){
			
			const askRunCCResult = await vscode.window.showWarningMessage(
				`Custom System Includes not found!${EOL}${EOL}Run 'Set Custom System Includes' now?`,
				{detail: "note: 'Cancel and never show again' = 'unreal-clangd.systemIncludes.showMissingWarning' and will be set in folder config: .vscode/settings.json",modal: true},
				"Run", "Cancel and never show again"
			);

			if(askRunCCResult !== 'Run') { 
                if(askRunCCResult === "Cancel and never show again"){
                    
                    unrealClangdConfig.update(
                        consts.settingNames.unrealClangd.settings['systemIncludes.showMissingWarning'],
                        false,
                        vscode.ConfigurationTarget.WorkspaceFolder
                    );
                    return "return";
                }
				return 'continue';
			}

			await onSetCustomSystemIncludes();
			await restartClangd();

			return 'return';
		}
		else if(result === 'fail') {
			console.error(`Error with startCheckCustomSystemIncludes! ${uri.fsPath}`);
			return 'continue';  // The other folder might succeed
		}

		return 'continue';
	});

}

/**
 * Check if system includes are in .clangd file
 * Simple check where we search file string for "cppwinrt or ucrt" and "-fms-compatibility-version"
 */
async function checkCustomSystemIncludesInClangdCfg(clangdCfgFolder: vscode.Uri): Promise<"fail" | "succeed" | "okFail"> {
	
	const cfgUri = vscode.Uri.joinPath(clangdCfgFolder, consts.FILE_NAME_CLANGD_CFG);
	const cfgFileString = await getFileString(cfgUri);

	if(!cfgFileString) {return "fail";} 

    console.log(`Checking if custom system includes set: ${cfgUri.fsPath}`);
	const hasAtLeastOneFolderInclude = cfgFileString.includes('cppwinrt') || cfgFileString.includes('ucrt');
	if(hasAtLeastOneFolderInclude && cfgFileString.includes("-fms-compatibility-version")){
        console.log("Found!");
		return "succeed";
	}

	return "okFail";
}


/** Main function to set custom system includes based on user selection. */
export async function onSetCustomSystemIncludes() {
    // Check if running on Windows
    if (!isWindows()) {
        console.log("Not running Set Custom System Includes because the OS isn't Windows.");
        return;
    }

    const libUris = await getLibraryUris();
    if(!libUris) { return;}
    
    if(!libUris.cppLibUri || !libUris.sdkLibUri){
        console.error(`Something went wrong getting library Uris! cpp: ${libUris.cppLibUri?.fsPath ?? "''"} sdk: ${libUris.sdkLibUri?.fsPath ?? "''"}`);
        return;
    }

    const newFlags: string[] | undefined = await createNewFlags(libUris.cppLibUri, libUris.sdkLibUri);
    if(!newFlags) {return;}
    
    await iterateOverProjectFolders(saveCustomLibraryFlagsToClangdConfigs, () => {
        return "continue";
    }, newFlags);
}


/** Checks if the current platform is Windows. */
function isWindows(): boolean {
    return process.platform === 'win32';
}

async function getLibraryUris(): Promise<{ cppLibUri: vscode.Uri | undefined; sdkLibUri: vscode.Uri | undefined; } | undefined> {
    const clangPath: string | undefined = await getClangPath();
    if(!clangPath) { return; }

    
    const GET_SYS_INC_COMMAND = `powershell -Command $null | "${clangPath}" -v -E -xc++ -`;
    // Run Clang command and store result
    const output = await runTerminalCommand(
        GET_SYS_INC_COMMAND,
        `Failed to run Clang command! ${GET_SYS_INC_COMMAND}`
    );

    if(!output) {return;}

    // Extract include paths
    const includePaths = extractIncludePaths(output.stderr);  // stderr has the clang output

    if(includePaths.length <= 2) {
        console.error(`Not enough include paths extracted from clang output! ${includePaths.length.toString()}`);
        return;
    }

    // Prompt user to proceed
    if (!(await confirmProceed(includePaths))) {
        return;
    }
    
    // Get base paths by removing last two directories and duplicates
    const basePaths = getBasePaths(includePaths);
    if (basePaths.length !== 2) {
        console.error('Expected exactly two base paths for C++ library and SDK.');
        return;
    }

    // Identify C++ library and SDK paths
    const paths = identifyPaths(basePaths);
    if(!paths) {return;}

    const { cppLibraryPath, sdkPath } = paths;

    // Search for version folders
    const cppVersions = await getSubDirectories(cppLibraryPath);
    const sdkVersions = await getSubDirectories(sdkPath);
    if (!cppVersions || cppVersions.length === 0 || !sdkVersions || sdkVersions.length === 0) {
        console.error('No versions found for C++ library or SDK.');
        return;
    }
    
    cppVersions.push(CUSTOM_CHOICE);
    const customCppChoices = [SAME_AS_BUILD_CHOICE].concat(cppVersions);
    // Ask user to choose versions
    const selectedCppVersion = await selectVersion(customCppChoices, 'Select C++ library version');
    if (!selectedCppVersion) {return;}

    const cppLibUri = await getLibraryUri(cppLibraryPath, selectedCppVersion, 'Select C++ Library Version Folder');


    sdkVersions.push(CUSTOM_CHOICE);
    const customSdkChoices = sdkVersions;
    const selectedSdkVersion = await selectVersion(customSdkChoices, 'Select Windows SDK version');
    if (!selectedSdkVersion) {return;}

    const sdkLibUri = await getLibraryUri(sdkPath, selectedSdkVersion, 'Select Windows SDK Version Folder');

    return {cppLibUri, sdkLibUri};
}


/** Prompts the user to confirm proceeding with selecting library versions. */
async function confirmProceed(defaultLibraryPaths: string[]): Promise<boolean> {
    const libPaths = defaultLibraryPaths.join(EOL);

    let choice: "See Documentation" | "Continue" | undefined = "See Documentation";

    while (choice === 'See Documentation') {
        choice = await vscode.window.showInformationMessage(
            `Would you like to change the library versions for this project?${EOL}${EOL}If you don't, clang ` +
            "will auto choose the libraries below which might be incorrect for your Unreal version. " +
            "These new settings will be set in your .clangd config files in the 'Add' section." +
            `${EOL}${EOL}You can install different library versions using the Visual Studio Installer. See documentation.`,
            {
                detail: libPaths,
                modal: true
            },
            'See Documentation', 'Continue'
        );

        if(choice === "See Documentation") {
            const url = vscode.Uri.parse(WEB_VISUAL_STUDIO_INSTALLER_DOCS, true);
            vscode.env.openExternal(url);
        }
    }

    return choice === 'Continue';
}



/** Extracts include paths from Clang output between specified markers. */
function extractIncludePaths(output: string): string[] {
    const lines = output.split('\n');
    const startIndex = lines.findIndex(line => line.includes('#include <...> search starts here:'));
    const endIndex = lines.findIndex(line => line.includes('End of search list.'));
    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find include search paths in Clang output.');
        return [];
    }
    const includeLines = lines.slice(startIndex + 1, endIndex).map(line => line.trim());
    return includeLines.filter(line => !line.toLowerCase().includes('clang'));
}

/** 
 * Return unique system include base paths
 */
function getBasePaths(includePaths: string[]): string[] {
    const basePaths = includePaths.map(includePath => {
        const parts = includePath.split(path.sep);

        return getArrayBeforeLastNumberString(parts).join(path.sep);
    });
    return Array.from(new Set(basePaths));
}


/** 
 * Reduces include paths to base paths by finding first ending number-including directory
 * Then return everything before this 
 */
function getArrayBeforeLastNumberString(strArr: string[]): string[] {
    // Create a copy of the array to avoid modifying the original
    const result = [...strArr];
    
    // Regular expression to match any string containing at least one digit
    const numberRegex = /\d/;
    
    // Iterate from the end of the array
    while (result.length > 0) {
        const lastElement = result[result.length - 1];
        
        // If we find a string with a number, remove it and return
        if (numberRegex.test(lastElement)) {
            result.pop();
            return result;
        }
        
        // Remove non-number string
        result.pop();
    }
    
    // Return empty array if no number is found
    return result;
}


/** Identifies the C++ library and SDK paths from the base paths. */
function identifyPaths(basePaths: string[]): { cppLibraryPath: string, sdkPath: string } | undefined {
    const cppLibraryPath = basePaths.find(p => path.basename(p).toLowerCase() === 'msvc');
    const sdkPath = basePaths.find(p => p !== cppLibraryPath);
    if (!cppLibraryPath || !sdkPath) {
        console.error('Could not identify C++ library and SDK paths.');
        return;
    }
    return { cppLibraryPath, sdkPath };
}

/** Retrieves subdirectories (versions) from a given directory path. */
async function getSubDirectories(dirPath: string): Promise<string[] | undefined> {
    
    const uri = vscode.Uri.file(dirPath);
    let entries;
    try {
        entries = await vscode.workspace.fs.readDirectory(uri);
    } catch (error) {
        logException(error);
        console.log(`Couldn't read directory! ${uri.fsPath}`);
        return;
    }
    
    return entries.filter(([, type]) => type === vscode.FileType.Directory).map(([name]) => name);

}

/** Prompts the user to select a version from a list with a given title. */
async function selectVersion(versions: string[], title: string): Promise<string | undefined> {
    return await vscode.window.showQuickPick(versions, { placeHolder: title });
}

async function getLibraryUri(parentPath: string, choice: string, customChoiceLabel: string): Promise<vscode.Uri | undefined> {
    switch (choice) {
        case CUSTOM_CHOICE:
            const uri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(parentPath),
                openLabel: customChoiceLabel
            });
            if (uri && uri.length > 0) {
                return uri[0];
            }
            break;
        case SAME_AS_BUILD_CHOICE:
            return await getBuildCppLibraryUri(); // This 'case' is only for the cpp library
            break;
        default:
            return await createLibraryChoiceUri(parentPath, choice);
            
            break;
    }
    return undefined;
}


async function createLibraryChoiceUri(parentPath: string, choice: string) {
    let returnUri: vscode.Uri;
    try {
        const parentUri = vscode.Uri.file(parentPath);
        returnUri = vscode.Uri.joinPath(parentUri, choice);
    } catch (error) {
        logException(error);
        console.error(`Error trying to create Uri: ${parentPath} , ${choice}`);
        return;
    }

    // We could take clang's word that this directory exists but we check anyway
    let stat: vscode.FileStat;
    try {
        // Attempt to get file system stats for the Uri
        stat = await vscode.workspace.fs.stat(returnUri);
    } catch (error) {
        // Handle the case where the resource doesn't exist
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(`Couldn't determine if Uri was correct with stat! ${returnUri.fsPath}`);
            
        }
        return undefined;
    }

    // Check if the resource is a directory
    // Use bitwise AND to handle cases like symbolic links to directories
    if (stat.type & vscode.FileType.Directory) {
        return returnUri; // It's a folder, return the Uri
    } else {
        return undefined; // It's not a folder (e.g., a file), return undefined
    }
}

async function getBuildCppLibraryUri(): Promise<vscode.Uri | undefined>{
    const projectUri = getProjectWorkspaceFolder()?.uri;

    if(!projectUri) { return;}

    const ccName = await getProjectCompileCommandsName();
    if(!ccName) { return;}
    // This is the cc that we use to create the extension's cc
    const ccPath = vscode.Uri.joinPath(projectUri, consts.FOLDER_NAME_VSCODE, ccName);
    const compilerPath = await getCompilerFromCompileCommands(ccPath);

    if(!compilerPath) {return;}

    const pathParts = compilerPath.split("\\");
    const foundIndex = pathParts.indexOf("MSVC");
    if(foundIndex === -1 || foundIndex + 2 > pathParts.length){
        console.error(`Couldn't find 'MSVC' or bad path! ${compilerPath}`);
        return;
    }
    const versionPathParts = pathParts.slice(undefined, foundIndex + 2); // +2 for MSVC and the version folder

    return vscode.Uri.file(versionPathParts.join("\\"));

}

async function getClangPath() {
    const projectWorkspace = getProjectWorkspaceFolder();
    if(!projectWorkspace) {
        console.error("No project workspace found!");
        return;
    }
    const clangdPath = getClangDPathFromConfig(projectWorkspace);
    if(!clangdPath){ return;}

    const parsedClangdDir = path.parse(clangdPath).dir;
    const clangUri = vscode.Uri.joinPath(vscode.Uri.file(parsedClangdDir), "clang++.exe");

    let stats: vscode.FileStat;
    try {
        stats = await vscode.workspace.fs.stat(clangUri);
    } catch (error) {
        logException(error);
        console.error(`Path ${clangUri.fsPath} is not a valid file!`);
        return;
    }

    if (stats.type & vscode.FileType.File) {
        return clangUri.fsPath; // It's a file, return the Uri
    } else {
        return undefined; // It's not a file, return undefined
    }
}


async function saveCustomLibraryFlagsToClangdConfigs(clangdCfgFolderUri: vscode.Uri, flags: string[]) {
    
    const clangdCfgUri = vscode.Uri.joinPath(clangdCfgFolderUri,  consts.FILE_NAME_CLANGD_CFG);
    if(!(await isFile(clangdCfgUri))){
        console.log(`Project isn't created yet so not running set custom system includes. ${clangdCfgUri.fsPath}`);
        return;
    }

    const cfgFileString = await getFileString(clangdCfgUri);
    if(!cfgFileString) {return;}

    const docs = yaml.parseAllDocuments(cfgFileString);
    if('empty' in docs ) {
        console.error(`.clangd file didn't have any documents! ${clangdCfgUri.fsPath}`);
        return;
    }

    let isDirty = false;
    for (const doc of docs) {
        if(doc.errors.length !== 0){
            console.error(`Errors found when parsing .clangd file for saveCustomLibrary...! ${clangdCfgUri.fsPath}`);
            for (const error of doc.errors) {
                console.error(error.message);
            }
            return;
        }

        const root = doc.contents;
        if (!root || !(root instanceof yaml.YAMLMap)) { 
            continue; 
        };
        const compileFlags = root.get('CompileFlags');
        if (!compileFlags) {
            continue;
        }

        if (!(compileFlags instanceof yaml.YAMLMap)) {
            continue;
        }

        if(!isMainDoc(compileFlags, root.has('InlayHints'))) { 
            continue;
        }

        const addValues = compileFlags.get('Add');

        if (!yaml.isSeq<yaml.Scalar<string>>(addValues)) { 
            continue;
        }

        // Show user any flags that will be replaced
        const replacedValues = getStartsWithFromSequence("getFiltered", SYS_INC_FILTER_PREFIXES, addValues);
        if (replacedValues.length > 0) {
            const choice = await vscode.window.showInformationMessage(
                `The items below will be replaced in:${EOL}${clangdCfgUri.fsPath}${EOL}${EOL}Do you want to proceed? If the below settings look correct then feel free to 'Skip'.`,
                { detail: replacedValues.join(EOL), modal: true }, "Skip", "OK"
            );

            if (choice === undefined || choice === "Skip") { 
                continue; 
            }
        }

        const filteredValues = getStartsWithFromSequence("getNonFiltered", SYS_INC_FILTER_PREFIXES, addValues);
        const newAddValues: yaml.Scalar<string>[] = [];
        for (const flag of flags) {
            newAddValues.push(new yaml.Scalar(flag));
        }
        //flags.forEach(value => { newAddValues.push(new yaml.Scalar(value)); }); // Add new flags

        // replace 'Add' with our new values combined with our old values
        addValues.items = newAddValues.concat(filteredValues);

        isDirty = true;

    }
    
    if(!isDirty) {
        return;
    }

    let newFileString = '';
    for (const value of docs) {
        const nextDoc = value.toString({directives: true, lineWidth:0});
        newFileString = `${newFileString}${nextDoc}`;
    }
    
    if(cfgFileString === newFileString){
        console.log(`Not saving custom system includes, no changes found. ${clangdCfgUri.fsPath}`);
        return;
    }

    console.log(`Saving custom system includes to: ${clangdCfgUri.fsPath}`);
    await saveFile(newFileString, clangdCfgUri);
    return;
}

/**
 * 
 * @param action get the filtered or non filtered lines
 * @param filters The startsWith() filter strings
 * @param sequence The yaml sequence the action is against
 */
function getStartsWithFromSequence( action: 'getFiltered' | "getNonFiltered", filters: string[], sequence: yaml.YAMLSeq<yaml.Scalar<string>>) {
    return sequence.items.filter( item => {
                
        if(!yaml.isScalar(item) || typeof item.value !== 'string') { return false; }  // TODO: Do I need this?

        const isFiltered = filters.some(prefix => item.value.startsWith(prefix));
        return action === 'getFiltered' ? isFiltered : !isFiltered;
        
    });
}

/**
 * TODO: We use all sdk sub directories by default. Should create a settings for: sdkSubDirectories, cppSubDirectories(just in case),
 *  And settings for cl.exe relative path (for getFmsCompatibilityVersion()), and regex
 * @param selectedCppVersionUri 
 * @param selectedSdkVersionUri 
 */
async function createNewFlags(selectedCppVersionUri: vscode.Uri, selectedSdkVersionUri: vscode.Uri) {
    
    let sdkDirectoryContents: [string, vscode.FileType][];
    try {
        sdkDirectoryContents = await vscode.workspace.fs.readDirectory(selectedSdkVersionUri);
    } catch (error) {
        logException(error);
        console.log(`Error reading directory! ${selectedSdkVersionUri.fsPath}`);
        return;
    }
    

    const sdkPathsFlags: string[] = [];
    for (const value of sdkDirectoryContents) {
        const isDirectory = value[1] & vscode.FileType.Directory;
        if(!isDirectory) {
            continue;
        }

        const sdkSubDirectoryUri = vscode.Uri.joinPath(selectedSdkVersionUri, value[0]);
        sdkPathsFlags.push(`/imsvc${convertWindowsDriveLetterToUpper(sdkSubDirectoryUri.fsPath)}`);
    }

    const newFlags = ['/X', ...sdkPathsFlags];

    // Cpp library only has one include for now
    const cppPathFlagUri = vscode.Uri.joinPath(selectedCppVersionUri, 'include');
    newFlags.push(`/imsvc${convertWindowsDriveLetterToUpper(cppPathFlagUri.fsPath)}`);

    const fmsCompVer = await getFmsCompatibilityVersion(selectedCppVersionUri);
    if(!fmsCompVer) {return;}

    newFlags.push(`-fms-compatibility-version=${fmsCompVer}`);
    
    return newFlags;
}


async function getFmsCompatibilityVersion(cppVersionUri: vscode.Uri) {
    const clUri = vscode.Uri.joinPath(cppVersionUri, "bin", "Hostx64", "x64", "cl.exe");

    if(!(await isFile(clUri))){
        console.error(`Uri isn't a file! ${clUri.fsPath}`);
        return;
    }

    const result = await runTerminalCommand(`"${clUri.fsPath}"`, `Error running cl.exe: ${clUri.fsPath}`);
    let re: RegExp;
    try {
        re = new RegExp(`(?<=Compiler Version )[.\\d]+`);
    } catch (error) {
        if(error instanceof Error) { console.error(error.message);}
        console.error("RegExp in getFmsCompatibilityVersion() was malformed!");
        return;
    }
    
    const version = result?.stderr.match(re)?.[0];

    if(!version){
        console.error(`Couldn't get Fms Compatibility Version! re=${re.source} terminalCmdResult=${result ? "result" : "undefined"}`);
        return;
    }
    
    return version;
}


/**
 * 
 * @param compileFlags Easy check for main docs if Doc has InlayHints key and doc's CompilerFlag key has key 'CompilationDatabase' 
 * @returns 
 */
function isMainDoc(compileFlags: yaml.YAMLMap.Parsed, hasInlayHints: boolean) {
    if(hasInlayHints && compileFlags.has('CompilationDatabase') ){
        return true;
    }

    return false;
}
