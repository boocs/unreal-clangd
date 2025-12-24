// Unreal reverts your project's *.code-workspace file when Refreshing your project
// This extension uses Unreal's 'Refresh project command' to update compile_commands.json
// This module backs up and restores the *.code-workspace file


// TODO: add command to restore workspace file (and backup?)

import * as vscode from 'vscode';

import * as nodePath from 'node:path';
import {setTimeout} from 'node:timers/promises';

import { getProjectWorkspaceFolder } from '../libs/ueHelpers';
import { askToReloadVSCode, doesUriExist, getFileString, getWorkspaceFileUri, logException, setProjectSetting, writeFile } from '../libs/projHelpers';
import { FOLDER_NAME_UNREAL_CLANGD, FOLDER_NAME_VSCODE } from '../libs/consts';

import * as console from '../libs/console';
import { createUnrealClangdProject } from './createProject';
import { doesWorkspaceFileContainClangdSettings, hasClangdProjectFiles} from '../shared';



export const BACKUP_WORKSPACE_RELATIVE_PATH = [FOLDER_NAME_VSCODE, FOLDER_NAME_UNREAL_CLANGD, ".code-workspace.backup"];

type ClangdSettingsState = 'backup' | 'restore' | 'skip';
type RestoreState = "JustRestored" | "none";

let _restoreState: RestoreState = "none";
export function getRestoreState() { return _restoreState;} 

interface WorkspaceSettingsFile {
    
    folders: {
        name?: string | undefined;
        path: string;
    }[];
    settings: Omit<Record<string, unknown>, "tasks" | "launch">;
    tasks: {
        version: "";
        tasks: Record<string, unknown>[]
    };
    launch: {
        version: "";
        configurations: Record<string, unknown>[]
    };
}


/**
 * Determines the state for Clangd settings in the workspace file.
 * 
 * @param projWorkspaceFolder The project workspace folder.
 * @param isClangdProject Optional flag indicating if it's a Clangd project.
 * @returns The state: 'backup', 'restore', or 'do nothing'.
 */
async function getClangdSettingsState(
    projWorkspaceFolder: vscode.WorkspaceFolder,
    isClangdProject?: boolean
): Promise<ClangdSettingsState> {
    const isProject = isClangdProject ?? await hasClangdProjectFiles(projWorkspaceFolder);
    if (!isProject) {
        return 'skip';
    }

    const hasClangdSettings = doesWorkspaceFileContainClangdSettings(projWorkspaceFolder);
    if (hasClangdSettings) {
        return 'backup';
    }
    
    return 'restore';
}

/**
 * Handles the restore state for Clangd settings and restores workspace cfg file.
 * 
 * Shows a warning message and either restores from backup or runs project installation based on user choice.
 *
 * @param projWorkspaceFolder The project workspace folder.
 * @returns Promise that resolves to void.
 */
async function handleRestoreClangdSettings(projWorkspaceFolder: vscode.WorkspaceFolder, msg?: string): Promise<void> {
    console.log("Running handle restore clangd settings...");

    const backupUri = vscode.Uri.joinPath(projWorkspaceFolder.uri, ...BACKUP_WORKSPACE_RELATIVE_PATH);
    const backupExists = await doesUriExist(backupUri);

    const choices = backupExists ? ["Restore from backup", "Run project installation"] : ["Run project installation"];
    const result = await vscode.window.showWarningMessage(
        msg ?? "Clangd settings not found in your Workspace File! This could be because you refreshed your project without using this extension's `Update compile commands file (refresh project)` command, which prevents this from happening.",
        {
            detail: backupExists ? "Restore: Restore from backup file\nInstall: Run partial install for starter settings" : "Install: Run partial install for starter settings",
            modal: true
        },
        ...choices
    );

    if (!result) {
        return;
    }

    if (result === "Restore from backup") {
        const result = await previewBackupFileAndPrompt(backupUri);

        if(result === "Proceed"){
            await restoreCodeWorkspaceFileSettings();
        }
    } 
    else {
        await createUnrealClangdProject();
    }
}

/**
 * Backup or Restore Workspace file for Clangd settings.
 * 
 * This function checks if Clangd settings are missing from the workspace file,
 * which might occur after a UBT 'Refresh Project' command without using the extension's update command.
 * If missing, it offers to restore from backup or reinstall the project.
 * If present, it backs up the workspace file.
 *
 * @param isClangdProject Optional flag indicating if it's a Clangd project. If undefined, it will be determined automatically.
 * @returns Promise that resolves to void.
 */
export async function backupOrRestoreClangdSettingsInWorkspaceFile(isClangdProject?: boolean, forceAction?: "backup" | "restore" | "backupFallbackRestore"): Promise<void> {
    const projWorkspaceFolder = getProjectWorkspaceFolder();
    if (!projWorkspaceFolder) {
        return;
    }

    console.log("Checking if Clangd settings are missing in workspace file...");

    const state = await getClangdSettingsState(projWorkspaceFolder, isClangdProject);

    if (state === 'skip') {
        console.error("Not a Unreal Clangd project. Can't backup or restore!");
        return;
    }

    if (state === 'backup' && forceAction !== "restore") {
        console.log("Clangd settings are present. Backing up workspace file.");
        await backupCodeWorkspace();
        return;
    }

    
    if(forceAction !== "backup") {
        let msg: string | undefined = undefined;
        if(forceAction === "restore"){
            msg = "Restoring workspace file settings. Choose an option:";
        }
        await handleRestoreClangdSettings(projWorkspaceFolder, msg);
                
        return;
    }

    console.error("Couldn't do backup. Conditions weren't correct!");
}


async function backupCodeWorkspace() {
    console.log("Running backupCodeWorkspace...");

    const projectWorkspaceFolder = getProjectWorkspaceFolder();
    
    const projectUri = projectWorkspaceFolder?.uri;
    if(!projectUri){
        console.error("No project uri!");
        return;
    }
    
    const workspaceFile = getWorkspaceFileUri();
    if(!workspaceFile){
        console.error("No workspace file uri found!");
        return;
    }
    const newBackupFileString = await getFileString(workspaceFile);

    if(!newBackupFileString){
        return;
    }
    
    const saveUri = vscode.Uri.joinPath(projectUri, ...BACKUP_WORKSPACE_RELATIVE_PATH);

    const oldFileString = await getFileString(saveUri);

    await writeFile(saveUri, oldFileString, newBackupFileString);
        
}


function getSortedWorkspaceFolders() {
    return vscode.workspace.workspaceFolders ?  [...vscode.workspace.workspaceFolders].sort((a, b) => a.index - b.index) : undefined;
}


async function previewBackupFileAndPrompt(backupUri: vscode.Uri) {
    // Step 1: Open and display the known file
    const document = await vscode.workspace.openTextDocument(backupUri);
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One }); // Opens in the main editor column

    // Step 2: Show confirmation dialog after file is displayed
    const message = 'Review the file underneath. Do you want to proceed with restore?';
    const detail = "Use mouse scroll wheel or 'Page Up/Down' buttons to navagate.";

    let selection;
    for (;;) {
        selection = await vscode.window.showInformationMessage(message, {detail: detail, modal: true}, "Page Up", "Page Down", 'Proceed');
        if(selection !== "Page Down" && selection !== "Page Up") {
            break;
        }

        if(selection === "Page Down") {
            await vscode.commands.executeCommand("scrollPageDown");
        }
        else {
            await vscode.commands.executeCommand("scrollPageUp");
        }
    }

    // close preview backup file 
    const currentDocument = vscode.window.activeTextEditor?.document;
    if(currentDocument && nodePath.relative(backupUri.fsPath, currentDocument.fileName) === ""){
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }

    return selection;
}

async function restoreCodeWorkspaceFileSettings() {


    const projectWorkspace = getProjectWorkspaceFolder();
    if(!projectWorkspace){
        return;
    }

    const workspaceFile = getWorkspaceFileUri();
    if(!workspaceFile) {  
        console.error("No workspace file found!");
        return;
    }
    const workspaceCfgFileString = await getFileString(workspaceFile);
    if(workspaceCfgFileString === undefined){
        console.error("Couldn't get workspace cfg file string!");
        return;
    }
    
    const backupFileString = await getFileString(vscode.Uri.joinPath(projectWorkspace.uri, ...BACKUP_WORKSPACE_RELATIVE_PATH));
    if (!backupFileString) {
        return;
    }

    if(workspaceCfgFileString === backupFileString){
        console.log("Will not restore workspace file. Workspace file and backup file are equal!");
        return;
    }
    
    let json: WorkspaceSettingsFile;
    try {
        const { default: stripJsonComments } = await import('strip-json-comments');
        json = JSON.parse(stripJsonComments(backupFileString)) as unknown as WorkspaceSettingsFile;
    } catch (error) {
        logException(error);
        return;
    }
    
    if(!isWorkspaceSettingsFile(json)){
        return;
    }

    await restoreFromJson(json);

    await askToReloadVSCode();
    
    return;
}


function isWorkspaceSettingsFile(obj: unknown): obj is WorkspaceSettingsFile {
    
    if (typeof obj !== 'object' || obj === null) { 
        return false; }

    const o = obj as Record<string, unknown>;

    // Check folders: array of objects with optional name (string) and required path (string)
    if (!Array.isArray(o.folders)) { 
        return false; }
    for (const folder of o.folders) {
        if (typeof folder !== 'object' || folder === null) { 
            return false; }
        const f = folder as Record<string, unknown>;
        if (typeof f.path !== 'string') { 
            return false; }
        if ('name' in f && typeof f.name !== 'string' && f.name !== undefined) { 
            return false; }
    }

    // Check settings: object without "tasks" or "launch" keys; values can be anything
    if (typeof o.settings !== 'object' || o.settings === null) { 
        return false; }
    const settings = o.settings as Record<string, unknown>;
    if ('tasks' in settings || 'launch' in settings) { 
        return false; }
    // No need to check individual values since they're unknown

    // Check tasks: object with literal empty string version and array of objects
    if (typeof o.tasks !== 'object' || o.tasks === null) { 
        return false; }
    const tasks = o.tasks as Record<string, unknown>;
    if (typeof tasks.version !== 'string' || tasks.version === '') { 
        return false; }
    if (!Array.isArray(tasks.tasks)) { 
        return false; }
    for (const task of tasks.tasks) {
        if (typeof task !== 'object' || task === null) { 
            return false; }
        // Record<string, unknown> just means non-null object; no further checks needed
    }

    // Check launch: similar to tasks
    if (typeof o.launch !== 'object' || o.launch === null) { 
        return false; }
    const launch = o.launch as Record<string, unknown>;
    if (typeof launch.version !== 'string' || launch.version === '') { 
        return false; }
    if (!Array.isArray(launch.configurations)) { 
        return false; }
    for (const config of launch.configurations) {
        if (typeof config !== 'object' || config === null) { 
            return false; }
        // Record<string, unknown> just means non-null object
    }

    return true;
}

async function restoreFromJson(json: WorkspaceSettingsFile) {

    _restoreState = "JustRestored";
    
    restoreFolders(json.folders);

    await restoreSettings(json.settings);

    await restoreTasksAndLaunch({"tasks":json.tasks, "launch": json.launch});

    await setTimeout(1000);
    
    console.log("Done restoring!");
    _restoreState = "none";
}


function restoreFolders(folders: {
    name?: string | undefined;
    path: string;
}[]) {

    const projectUri = getProjectWorkspaceFolder()?.uri;
    if(!projectUri){
        return;
    }

    // Map the array to the required workspace folder format
    const newWorkspaceFolders =  folders.map(folder => {
        return mapBackupFolder(projectUri, folder);
    });
    
    
    // Get the current workspace folders
    const currentFolders = getSortedWorkspaceFolders() ?? [];

    // Find the first index where they differ
    const minLength = Math.min(currentFolders.length, newWorkspaceFolders.length);
    let mismatchIndex = 0;
    for (; mismatchIndex < minLength; mismatchIndex++) {
        const current = currentFolders[mismatchIndex];
        const newFolder = newWorkspaceFolders[mismatchIndex];
        if (nodePath.relative(current.uri.fsPath, newFolder.uri.fsPath) !== "" || current.name !== newFolder.name) {
            break;
        }
    }

    // If all are equal (including lengths), no update needed
    if (mismatchIndex === currentFolders.length && mismatchIndex === newWorkspaceFolders.length) {
        console.log('The workspace folders are already equal. No update needed.');
        return;
    }

    // Update the workspace folders starting from the mismatch index
    const success = vscode.workspace.updateWorkspaceFolders(
        mismatchIndex,
        currentFolders.length - mismatchIndex,
        ...newWorkspaceFolders.slice(mismatchIndex)
    );
    if (success) {
        console.log('Workspace folders updated successfully.');
    } else {
        console.error('Failed to update workspace folders.');
    }
}


function mapBackupFolder(projectUri: vscode.Uri, folder: {
        name?: string | undefined;
        path: string;
    }) {

    let uri: vscode.Uri;
    if (folder.path === '.') {
        uri = projectUri;
    } else if (nodePath.isAbsolute(folder.path)) { 
        uri = vscode.Uri.file(folder.path);
    } else {
        uri = vscode.Uri.file(nodePath.resolve(projectUri.fsPath, folder.path));
    }
    return {
        name: folder.name,
        uri
    };
}


async function restoreSettings(settings: Omit<Record<string, unknown>, "tasks" | "launch">) {
    console.log("Restoring settings...");
    const projectWorkspace = getProjectWorkspaceFolder();
    if(!projectWorkspace){
        console.error("Couldn't get project workspace. Can't restore settings!");
        return;
    }
    
    const config = vscode.workspace.getConfiguration(undefined, projectWorkspace);

    for (const key in settings) {
        if (!Object.hasOwn(settings, key)) {continue;}
        
        const element = settings[key];
        await setProjectSetting(config, key, element, vscode.ConfigurationTarget.Workspace);
    }
}


async function restoreTasksAndLaunch(tasksAndLaunch: { "tasks": { version: ""; tasks: Record<string, unknown>[]; }; "launch": { version: ""; configurations: Record<string, unknown>[]; }; }) {
    
    const projectWorkspace = getProjectWorkspaceFolder();
    if(!projectWorkspace){
        console.error("Couldn't get project workspace. Can't restore tasks/launch!");
        return;
    }
    const config = vscode.workspace.getConfiguration(undefined, projectWorkspace);

    // Narrow keys to the known union type
    const keys = Object.keys(tasksAndLaunch) as (keyof typeof tasksAndLaunch)[];
    for (const key of keys) {
        const element = tasksAndLaunch[key];
        
        await setProjectSetting(config, key, element, vscode.ConfigurationTarget.Workspace);
    }
        
}


export async function backupOnConfigChange() {
    // Step 1: Delay for 1 seconds
    await setTimeout(1000);

    // Step 2: Check if the *.code-workspace file has been modified in the last minute
    const workspaceFile = getWorkspaceFileUri();
    if (!workspaceFile) {
        console.log('No .code-workspace file found.');
        return;
    }

    const stats = await vscode.workspace.fs.stat(workspaceFile);    
    const currentTime = Date.now();
    const oneMinuteInMs = 60 * 1000;
    const timeDifference = Math.abs(currentTime - stats.mtime);

    const projectFolder = getProjectWorkspaceFolder();
    if(!projectFolder){
        return;
    }
    if (timeDifference < oneMinuteInMs) {
        console.log('Workspace file modified. Backing up file.');
        await backupOrRestoreClangdSettingsInWorkspaceFile(true, "backupFallbackRestore");       
    } else {
        console.log('Workspace file not modified on config change. No workspace file backup will occur.');
    }

}


export async function getWorkspaceFileString(workspace: vscode.WorkspaceFolder, relativePath: string[]) {
    const uri = vscode.Uri.joinPath(workspace.uri, ...relativePath);
    return await getFileString(uri);
}