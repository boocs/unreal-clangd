/**
 * 
 * This removes the preparse include PCH entry in response files by modifying the .clangd file
 * 
 * NOTE: I decided against using this
 * The cure was worse than the disease
 *      .clangd remove feature has limitations
 *      .clangd remove flag feature doesn't work with flags with spaces
 *      
 *      With .clangd file,
 *      You can make it remove all 'preparse include' flags and add back what you didn't want removed (e.g. 'definitions' preparse include files)
 *      This can make the .clangd file into a monster and cause other problems(which i did fix...)
 * 
 */
import * as vscode from 'vscode';
//import commonPathPrefix from 'common-path-prefix';
import { getValidatedCompileCommandObjectsFromUri, getFileString, getRegex, getResponsePathFromCompileCommand, isFile, saveFile, convertWindowsDriveLetterToUpper } from '../libs/projHelpers';

import { FILE_NAME_CLANGD_CFG, FILE_NAME_COMPILE_COMMANDS, FOLDER_NAME_UNREAL_CLANGD, FOLDER_NAME_VSCODE, YAML_OPTIONS_DEFAULT } from '../libs/consts';
import { CompileCommand, DidFunctionSucceed } from '../libs/types';
import * as nodePath from 'path';
import * as yaml from 'yaml';
import * as os from 'os';
import { iterateOverProjectFolders } from '../shared';

import * as console from '../libs/console';
import { platform } from 'process';
import { getMacroCompletionHelperPath} from './completionFiles';

class SetOfSets {
    private map: Map<string, Set<string>>;
    constructor() {
        this.map = new Map<string, Set<string>>;
    }

    public size() {
        return this.map.size;
    }

    public addValues(key: string, values: Set<string>){
        if(this.map.has(key)){
            const currentValues = this.map.get(key);
            if(!currentValues) {return;}

            for (const value of values) {
                currentValues.add(value);
            }
        }
        else {
            this.map.set(key, new Set<string>(values));
        }
    }

    public entries() {
        return this.map.entries();
    }
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
/*export*/ async function startSetPreParseIncludesInClangdCfg() {
    console.log("Running start set preparse includes...");

    await iterateOverProjectFolders( execSetPreParseIncludesInClangdCfg, (result, uri) => {
        if(!result){
            console.warning(`Error with set preparse includes. Might be because project hasn't been created yet. ${uri.fsPath}`);
            console.log("***** This could also not be a bug if it's for Unreal Source. It has dynamic compile commands creation and might not have a compile_commands.json file yet.");
        }
        return 'continue';
    });
}

/*export*/ async function execSetPreParseIncludesInClangdCfg(parentUri: vscode.Uri): Promise<DidFunctionSucceed> {

    const ccUri = vscode.Uri.joinPath(parentUri, FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, FILE_NAME_COMPILE_COMMANDS);
    const clangdCfgUri = vscode.Uri.joinPath(parentUri, FILE_NAME_CLANGD_CFG);

    if(!(await isFile(ccUri)) || !(await isFile(clangdCfgUri))) { 
        //console.warning(`One or all of these doesn't exist. This probably means project hasn't been created yet. cc: ${ccUri.fsPath} , cfg: ${clangdCfgUri.fsPath}`);
        return false;
    }

    const ccObjects = await getValidatedCompileCommandObjectsFromUri(ccUri);
    if(!ccObjects) { 
        return false;
    }

    const responseToSources: Record<string, string[]> = getRspFilesAndCorrispondingSourceFilePaths(ccObjects);
    if(Object.keys(responseToSources).length === 0) {
        console.error("Didn't find response/sources in compile commands! (small chance this isn't an error)");
        return false;
    }

    const cfgValues = await getClangdCfgValues(parentUri, responseToSources);
        
    return await setPreParseIncludesInClangdCfg(clangdCfgUri, cfgValues);
    
}

/**
 * @returns key: response paths , values: All files that use the response path
 */
function getRspFilesAndCorrispondingSourceFilePaths(ccObjects: CompileCommand[]): Record<string, string[]> {
    const responseToSources: Record<string, string[]> = {};

    for (const cc of ccObjects) {
        const rspPath = getResponsePathFromCompileCommand(cc);
        const srcFilePath = convertWindowsDriveLetterToUpper(cc.file);
        if(!rspPath || !srcFilePath) { continue;}
        
        if ( rspPath in responseToSources) {
            // If the responsePath already exists, append the sourcePath to its array
            responseToSources[rspPath].push(srcFilePath);
        } else {
            // If the responsePath is new, initialize its array with the sourcePath
            responseToSources[rspPath] = [srcFilePath];
        }
    }

    return responseToSources;
}


async function getClangdCfgValues(parentUri: vscode.Uri, responseToSources: Record<string, string[]>) {
    const parentPath = convertWindowsPathToUnix(parentUri.fsPath);
    const cfgValues = new SetOfSets();
    for (const [rspPath, sourcePaths] of Object.entries(responseToSources)) {
        const addValue = await getAddValue(rspPath);
        if(!addValue) {continue;}

        const pathMatchValues = getPathMatchValue(parentPath, sourcePaths);

        cfgValues.addValues(addValue, pathMatchValues);
    }

    return cfgValues;
}


function getPathMatchValue(parentPath: string, paths: string[]) {
    
    const returnPathMatchValues = new Set<string>();
    for (const sourcePath of paths) {
         // If/PathMatch, in .clangd, uses Unix style path sep
        const sourcePathDir = convertWindowsPathToUnix(nodePath.parse(sourcePath).dir);
        const relativePath: string = nodePath.posix.relative(parentPath, sourcePathDir);

        if(relativePath.startsWith("..")){ continue; }
        
        returnPathMatchValues.add(`${relativePath}/[^/]+\\.(cpp|h)`);
    }

    return returnPathMatchValues;
}


/**
 * - Does validate Windows path by checking if path has ':' with charAt(1)
 *   - Returns unaltered path otherwise
 * - Also normalizes drive letter to upppercase
 * @param winPath 
 * @returns 
 */
function convertWindowsPathToUnix(pathToConvert: string) {
    
    if(pathToConvert.length > 2 && pathToConvert.charAt(1) === ':') {
        const unixLikePath = pathToConvert.replace(/\\+/g, '/');
        return `${unixLikePath.slice(0,1).toUpperCase()}${unixLikePath.slice(1)}`;  // Normalize drive letter to uppercase
    }
    
    return pathToConvert;  // non drive letter paths
}

async function getAddValue(rspPath: string) {
    const rspUri = vscode.Uri.file(rspPath);
    const rspFileString = await getFileString(rspUri);
    if(!rspFileString) {return;}
    
    if(!hasPCHPreParse(rspFileString)) {
        console.warning(`(probably not bug) No PCH preparse found in: ${rspPath}`);
        return;
    }
    
    //const re = getRegex("^(?:(?:\/FI|-include)[ ]?.*Definitions.*?)(?=[ ]*(?:\\r\\n|\\n))", "m");
    const re = getRegex("(?<=^(?:\/FI|-include)[ ]?[\"']?)(?:[\\w/].*Definitions.*?)(?=[\"']?[ ]*$)", "m");
    if(!re) {return;}
    const pathWithoutQuotes = rspFileString.match(re)?.[0];

    if(!pathWithoutQuotes) {
        console.error(`Couldn't get Add Value for: ${rspUri.fsPath}`);
        return;
    }

    return getFullPreparseIncludeLine(pathWithoutQuotes);
    
}


export function getFullPreparseIncludeLine(path: string) {

    const platform: NodeJS.Platform = os.platform();
    // MARK: /FI future bug?
    // .clangd doesn't like /FI with a space after. It's suppose to be correct though.
    // Seems to work but get error message in logs so we don't include space.
    // This could cause problems in future if they fix this. 
    const flagValue = platform === 'win32' ? "/FI" : "-include";

    return `${flagValue}${path}`;
}


async function setPreParseIncludesInClangdCfg(cfgUri: vscode.Uri, cfgValues: SetOfSets): Promise<DidFunctionSucceed> {
    const cfgFileStr = await getFileString(cfgUri);
    if(!cfgFileStr) { return false;}

    const docs = yaml.parseAllDocuments(cfgFileStr);
    if('empty' in docs) { return false; }

    // We remove the previous set removed preparse includes b
    let newDocsFileString = "";
    for (const doc of docs) {
        if(doc.errors.length !== 0) { 
            console.error(`Errors found when parsing .clangd file for setPreParse...! ${cfgUri.fsPath}`);
            for (const error of doc.errors) {
                console.error(error.message);
            }
            return false;
        }
        if(isPreParseIncludeDoc(doc) || isMacroCompletionHelperDoc(doc)) {continue;}

        newDocsFileString = `${newDocsFileString}${yaml.stringify(doc, YAML_OPTIONS_DEFAULT)}`;
    }

    for (const [addValue, PathMatchValues] of cfgValues.entries()) {
        const newDoc = createSetPreParseIncludesYamlDoc(addValue, [...PathMatchValues.values()]);
        if(!newDoc) { continue;}
        
        newDocsFileString = `${newDocsFileString}${newDoc}`;
    }

    const macroCompletionHelperFileStr = getMacroCompletionHelperFileString();
    if(macroCompletionHelperFileStr){
        newDocsFileString = `${newDocsFileString}${macroCompletionHelperFileStr}`;
    }
    

    if(cfgFileStr === newDocsFileString) {
        console.log(`No new foward include fixes found: ${cfgUri.fsPath}`);
        return true;
    }

    if(await saveFile(newDocsFileString, cfgUri) === "success"){
        console.log(`Saved new preparse includes: ${cfgUri.fsPath}`);
        return true;
    }
    else {
        return false;
    }
    
}

function isPreParseIncludeDoc(doc: yaml.Document.Parsed) {
    
    if(!yaml.isMap(doc.contents)) {
        return false;
    }

    const docContents = doc.contents;
    // docContents should only have 2 keys. 'CompileFlags' and 'If'
    if(docContents.items.length !== 2) {
        return false;
    }

    // Our main doc also has an If but we'll leave this in
    if(!docContents.has("If")){
        return false;
    }

    // Get CompileFlags and ensure it’s a yaml.Map
    const compileFlags = docContents.get('CompileFlags');
    if (!yaml.isMap(compileFlags)) {
        return false;
    }
    
    // Check for "Remove" and "Add" keys within CompileFlags using has
    if (!compileFlags.has('Remove') || !compileFlags.has('Add')) {
        return false;
    }

    // Get Add and ensure it’s a yaml.Sequence
    const add = compileFlags.get('Add');
    if (!yaml.isSeq(add)) {
        return false;
    }

    if(add.items.length !== 1 || !add.items[0].toString().includes("Definitions")) {
        return false;
    }

    return true;
}


function createSetPreParseIncludesYamlDoc( add: string, pathMatch: string[]) {

    const removeValue = process.platform !== 'win32' ? "-include" : "/FI";

    const jsDoc = {
        "If": {
            "PathMatch": pathMatch
        },
        "CompileFlags": {
            "Remove": [removeValue],
            "Add": [add]
        }
    };

    return yaml.stringify(jsDoc, YAML_OPTIONS_DEFAULT);
        
}


function hasPCHPreParse(rspFileString: string) {
    
    const re = getRegex("(?<=^(?:\/FI|-include)[ ]?[\"']?)(?:[\\w/].*PCH.*?)(?=[\"']?[ ]*$)", "m");
    if(!re) {
        return false;
    }

    const match = rspFileString.match(re)?.[0];
    if(!match) {
        return false;
    }

    return true;
}



function isMacroCompletionHelperDoc(doc: yaml.Document.Parsed) {
    
    if(!yaml.isMap(doc.contents)) {
        return false;
    }

    const docContents = doc.contents;
    // docContents should only have 2 keys. 'CompileFlags' and 'If'
    if(docContents.items.length !== 2) {
        return false;
    }

    // Our main doc also has an If but we'll leave this in
    if(!docContents.has("If")){
        return false;
    }

    // Get CompileFlags and ensure it’s a yaml.Map
    const compileFlags = docContents.get('CompileFlags');
    if (!yaml.isMap(compileFlags)) {
        return false;
    }
    
    // Check for "Remove" and "Add" keys within CompileFlags using has
    if (!compileFlags.has('Add')) {
        return false;
    }

    // Get Add and ensure it’s a yaml.Sequence
    const add = compileFlags.get('Add');
    if (!yaml.isSeq(add)) {
        return false;
    }

    if(add.items.length !== 1 || !add.items[0].toString().includes("macroCompletionHelper.h")) {
        return false;
    }

    return true;
}

function getMacroCompletionHelperFileString() {
    interface Config {
        If: {
            PathMatch: string[];
        };
        CompileFlags: {
            Add: string[];
        };
    }

    const  preparseIncludeFlag: string = platform === "win32" ? '/FI' : '-include';
    
    const macroCompletionHelperPath = getMacroCompletionHelperPath();
    if(!macroCompletionHelperPath) {
        console.error("Error getting macro completion helper path!");
        return;
    }

    const config: Config = {
        If: {
            // Matches files ending with .cpp or .h
            PathMatch: ['.*\\.(cpp|h)']
        },
        CompileFlags: {
            // Adds preparse include flag 
            Add: [`${preparseIncludeFlag}${macroCompletionHelperPath}`]
        }
    };

    return yaml.stringify(config, YAML_OPTIONS_DEFAULT);
}

