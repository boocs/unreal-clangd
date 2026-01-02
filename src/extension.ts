
// Wait for 3.4.0+?
// ***** Remove prompt to remove invalid entry in Unreal compile_commands.json

// better unreal source support
	// retry -mode=GenerateClangDatabase - this only support full source UE so maybe not...
	// Maybe full source unreal engine soure files only?
// Create an algo to create a custom rsp file for completionHelper.cpp?
	// create a 2nd rsp file that lets you add customizations to the first
	// create algo runs on update compile command

import * as vscode from 'vscode';
import * as tr from './tr/text';

import * as ueHelpers from './libs/ueHelpers';

import * as consts from './libs/consts';

import type * as typ from './libs/types';
import { getProjectWorkspaceFolder } from './libs/ueHelpers';

import {setTimeout} from 'node:timers/promises';

import * as onTextChange from './modules/codeCompletionFix';

import { onSetCustomSystemIncludes, startCheckCustomSystemIncludes } from './modules/setCustomSysInc';
import {getUnrealClangdCompileCommandsUri, getValidatedCompileCommandObjectsFromUri, getUnrealClangdConfig, getUnrealCompileCommandsUriForProject, doesUriExist, getProjectCompileCommandsName, isFile, getFileString, saveFile} from './libs/projHelpers';

import * as console from './libs/console';
import { getIsUpdateCompileCommands, setIsUpdateCompileCommands, updateCompileCommands } from './modules/updateCompileCommands';
import { doesWorkspaceFileContainClangdSettings, getIntellisenseType, getIsFinishingCreation, getIsUninstalling, getIsWantingToCreate,  getSourceFilesFirstChildFolderNames,   getUnrealSemanticVersionString,  hasClangdProjectFiles, restartClangd } from './shared';
import { createUnrealClangdProject, createUnrealSourceProject, finishCreationAfterUpdateCompileCommands } from './modules/createProject';
import { uninstallExtensionProject } from './modules/uninstallExtProj';
import { startAddFilesToUESourceCompileCommands } from './modules/addToUeSourceCC';
import { showProjectInfo } from './modules/showProjectInfo';
import { addCompletionHelperToCompileCommands, FILENAME_ADD_COMPLETIONS, FILENAME_ADD_MACRO_COMPLETIONS, FILENAME_DEFAULT_COMP, FILENAME_MACRO_COMP_HELPER } from './modules/completionFiles';
import { isProjectChange, onProjectChange } from './modules/projectChange';
import { startModifyResponseFiles } from './modules/modifyRspFiles';
import { startCreateRspMatchers } from './modules/createRspMatchers';
import { checkUnrealCompileCommands } from './modules/unrealCCChecker';
import { backupOnConfigChange, backupOrRestoreClangdSettingsInWorkspaceFile, getRestoreState } from './modules/backupWorkspace';


let newSourceFilesDetectionFileWatcher: vscode.FileSystemWatcher | null = null;

let hasCreatedNewSourceFile = false;  // prevents multiple calls asking to update cc
//let isUpdatingCompileCommands = false;
let isUnrealBuildingRebuildingTask = false;
//let isUnrealCleaningTask = false;
let isChangingProject = false;

const MACROS_SPEED_STATUS_FAST_TEXT = "UC$(zap)";
const MACROS_SPEED_STATUS_SLOW_TEXT = "UC$(watch)";
const MACROS_SPEED_STATUS_SLOW_TOOLTIP = "Click to toggle to faster loading completions do to curated macro completions.";
const MACROS_SPEED_STATUS_FAST_TOOLTIP = "Click to toggle to slower loading completions do to enabling almost all macro completions";

const macroSpeedStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MAX_SAFE_INTEGER);
let _isTogglingMacroCompletions = false;


export async function activate(context: vscode.ExtensionContext) {

	//await backupCodeWorkspace();
	//await restoreCodeWorkspaceFileSettings();
	
	if (!await ueHelpers.isUnrealProject()) {
		console.log(tr.NOT_UNREAL_PROJECT);
		return;
	}


	const unrealVersionStr = await getUnrealSemanticVersionString();
	if(unrealVersionStr === undefined){
		console.error("Couldn't get Unreal version!");
		return;
	} 
	console.log(`Started ${consts.EXTENSION_NAME} ${consts.EXTENSION_VERSION} on Unreal ${unrealVersionStr}\n`);
	
	await preActivate();
	
	let disposable = vscode.commands.registerCommand('unreal-clangd.updateCompileCommands', async () => {
		await updateCompileCommands();
	});
	context.subscriptions.push(disposable);


	disposable = vscode.commands.registerCommand('unreal-clangd.createUnrealClangdProject', async () => {
		await createUnrealClangdProject();
	});
	context.subscriptions.push(disposable);

	//disposable = vscode.commands.registerCommand('unreal-clangd.fixIntellisenseFiles', async (uri: vscode.Uri | undefined) => {
		//await startFixResponseFiles();
	//});
	//context.subscriptions.push(disposable);


	disposable = vscode.commands.registerCommand('unreal-clangd.tidyNoLintCurrentLine', async () => {

		const noLintCurrentLineSnippet = {
			"snippet": consts.TIDY_NO_LINT_CURRENT_LINE
		};

		await vscode.commands.executeCommand(consts.VSCODE_INSERT_SNIPPET, noLintCurrentLineSnippet);

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('unreal-clangd.tidyNoLintNextLine', async () => {

		const noLintCurrentLineSnippet = {
			"snippet": consts.TIDY_NO_LINT_NEXT_LINE
		};

		await vscode.commands.executeCommand(consts.VSCODE_INSERT_SNIPPET, noLintCurrentLineSnippet);

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('unreal-clangd.tidyTEST', async () => {

		const noLintCurrentLineSnippet = {
			"snippet": consts.TIDY_TEST
		};

		await vscode.commands.executeCommand(consts.VSCODE_INSERT_SNIPPET, noLintCurrentLineSnippet);

	});
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.tasks.onDidStartTask((e: vscode.TaskStartEvent) => {
		
		if ([" Rebuild", " Build"].some((value: string) => {
			return e.execution.task.name.includes(value);
		})) {
			console.log("Starting Build/Rebuild task");
			isUnrealBuildingRebuildingTask = true;
		}
		//else if (e.execution.task.name.includes(" Clean")) {
			//console.log("Starting Unreal Clean task");
			//isUnrealCleaningTask = true;
		//}
		

	}));

	context.subscriptions.push(vscode.tasks.onDidEndTask(async (e: vscode.TaskEndEvent) => {
		if(getIntellisenseType() === "Native"){
			console.log("Running Native onDidEndTask.");

			if(e.execution.task.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME){
			
				
				const isWantingToCreate = getIsWantingToCreate();
				if(isWantingToCreate){
					await onEndUpdateCompileCommands('creating');
					await finishCreationAfterUpdateCompileCommands();
				}
				else {
					await onEndUpdateCompileCommands('updateCC');
				}
	
				console.log(`End Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
				return;
			}

			if ([" Rebuild", " Build"].some((value: string) => {return e.execution.task.name.includes(value);})) {
				isUnrealBuildingRebuildingTask = false;
				await restartClangd();
			}

			return;
		}
		
		/* if ([" Rebuild", " Build"].some((value: string) => {
			return e.execution.task.name.includes(value);
		})) {
			console.log("Ending Unreal Build/Rebuild task");
			isUnrealBuildingRebuildingTask = false;

			if (e.execution.task.name.includes(" Rebuild")) {
				console.log("GCD 'Rebuild' file deletion detected...");
				await askAndRunUpdateCompileCommands(
					[tr.BTTN_YES, tr.BTTN_NO],
					[tr.BTTN_YES], tr.WARN_INTELLISENSE_FILE_DELETION_DETECTED,
					tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);
			}
		}
		else if (e.execution.task.name.includes(" Clean")) {
			console.log("Ending Unreal Clean task");

			await setTimeout(consts.END_OF_CLEAN_TASK_DELAY); // Delay to check if Reinstall task is being run so Update CC Ask doesn't trigger twice.
			isUnrealCleaningTask = false;

			if(!isUnrealBuildingRebuildingTask){
				console.log("GCD 'Clean' file deletion detected...");
				await askAndRunUpdateCompileCommands(
					[tr.BTTN_YES, tr.BTTN_NO],
					[tr.BTTN_YES], tr.WARN_INTELLISENSE_FILE_DELETION_DETECTED,
					tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);
			}
			
		}
		else if(e.execution.task.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME){
			
			await onEndUpdateCompileCommands();

			console.log(`End Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
		} */

	}));


	context.subscriptions.push(vscode.debug.onDidStartDebugSession((e: vscode.DebugSession) => {
		
		if (e.name.includes("unreal-clangd: Update Compile Commands")) {
			vscode.commands.executeCommand('workbench.debug.action.focusRepl'); // Show debug console if running debug version of Update Compile Commands
		}

	}));

	
	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(async (e: vscode.DebugSession) => {
		if(getIntellisenseType() === "Native"){
			console.log("Running Native onDidEndTask.");

			if(e.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME){
			
				const isWantingToCreate = getIsWantingToCreate();
				if(isWantingToCreate){
					await onEndUpdateCompileCommands('creating');
					await finishCreationAfterUpdateCompileCommands();
				}
				else {
					await onEndUpdateCompileCommands('updateCC');
				}
	
				console.log(`End Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
				return;
			}
			if ([" Rebuild", " Build"].some((value: string) => {return e.name.includes(value);})) {
				await restartClangd();
			}

			return;
		}


		/* if (e.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME) {
			
			await onEndUpdateCompileCommands();

			console.log(`End Debug Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
		} */
	}));


	// Attempt to fix 'macro expansion in place of names' in code completion and auto func param hints
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (e) => {
		await onTextChange.onDidChangeTextDocument(e);
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (e: vscode.TextEditor | undefined) => {
		
		if(!e){
			return;
		}

		await startAddFilesToUESourceCompileCommands(e.document.uri);

	}));

	
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( async e => {
		await onDidChangeConfiguration(e);
	}));

	context.subscriptions.push(vscode.window.onDidChangeWindowState(async  e => {
		if(e.focused){
			const projectFolder = getProjectWorkspaceFolder();
			if(!projectFolder) {return;}
			const unrealClangdConfig = getUnrealClangdConfig(projectFolder);
			const isCreateProject = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);
			if((await hasClangdProjectFiles(projectFolder)) && (await isProjectChange()) && !isCreateProject && !isChangingProject){
				isChangingProject = true;
				console.log("Window state change: Detected project change....");  
				await onProjectChange();
				isChangingProject = false;
			}
		}	
	}));

	
	disposable = vscode.commands.registerCommand('unreal-clangd.uninstall', async () => {
		await uninstallExtensionProject();
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand("unreal-clangd.createUnrealSourceClangdProject", async () => {
		await createUnrealSourceProject();
		await onSetCustomSystemIncludes();
	});
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.backupWorkspaceConfig', async () => {
		const projWorkspaceFolder = getProjectWorkspaceFolder();
		if(!projWorkspaceFolder) {return;}

		if(! doesWorkspaceFileContainClangdSettings(projWorkspaceFolder)) {
			console.error("Can't backup workspace config. No clangd settings found!");
			return;
		}

		await backupOrRestoreClangdSettingsInWorkspaceFile(true, "backup");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.restoreWorkspaceConfig', async () => {
		const projWorkspaceFolder = getProjectWorkspaceFolder();
		if(!projWorkspaceFolder) {return;}

		await backupOrRestoreClangdSettingsInWorkspaceFile(true, "restore");
	}));

	
	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.setCustomSystemIncludes', async () => {
		await onSetCustomSystemIncludes();
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.showProjectInfo', async () => {
		await showProjectInfo();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.toggleMacroCompletions', async () => {
		if(_isTogglingMacroCompletions) {
			await vscode.window.showInformationMessage(
				"Clicked UC button too quickly."
			);
			return;
		}
        await toggleMacroCompletions();
    }));

	context.subscriptions.push(vscode.commands.registerCommand('unreal-clangd.openAddCompletionsFiles', async () => {
        const projUri = getProjectWorkspaceFolder()?.uri;
		if(!projUri) {return;}

		const addCompUri = vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, FILENAME_ADD_COMPLETIONS);
		const addMacroCompUri = vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, FILENAME_ADD_MACRO_COMPLETIONS);

		const uris: vscode.Uri[] = [];

		if((await isFile(addCompUri))){
			uris.push(addCompUri);
		}
		else {
			console.error(`File not found! ${addCompUri.fsPath}`);
		}

		if((await isFile(addMacroCompUri))){
			uris.push(addMacroCompUri);
		}
		else {
			console.error(`File not found! ${addMacroCompUri.fsPath}`);
		}

		for (const uri of uris) {
			await vscode.window.showTextDocument(uri, {preserveFocus: true, preview: false, viewColumn: vscode.ViewColumn.Active});
		}
    }));

	await checkUnrealCompileCommands();

	const mainWorkspaceFolder = getProjectWorkspaceFolder();
	if(!mainWorkspaceFolder){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	let isStartupIntellisenseCheckEnabled: boolean | undefined = false;

	isStartupIntellisenseCheckEnabled = getUnrealClangdConfig(mainWorkspaceFolder).get(consts.settingNames.unrealClangd.settings['utility.checkForIntellisenseFilesOnStartup']);
	
	if (isStartupIntellisenseCheckEnabled) {

		console.log(tr.START_INTELLISENSE_CHECK_ENABLED_AND_CHECKING);
		if(getIntellisenseType() === "Native"){
			console.log("Running Native check for Intellisense files on startup...");
		}
		else {

			/* const mainWorkspaceFolder = getProjectWorkspaceFolder();
			if (!mainWorkspaceFolder) {
				console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
				return;
			}

			const compileCommandsUri = getCompileCommandsUri(mainWorkspaceFolder.uri, { withFileName: true });
			const gcdRelativePattern = new vscode.RelativePattern(mainWorkspaceFolder, consts.GLOB_GCD_FILES);

			await checkForIntellisenseFilesAndAskToCreate(
				compileCommandsUri,
				gcdRelativePattern,
				async () => {
					return await askAndRunUpdateCompileCommands([tr.BTTN_YES, tr.BTTN_NO], [tr.BTTN_YES], tr.WARN_INTELLISENSE_FILES_NOT_FOUND_ON_STARTUP, tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);
				}
			); */
		}
	}
	else {
		console.log(tr.STARTUP_INTELLISENSE_CHECK_DISABLED);
	}

	if (!newSourceFilesDetectionFileWatcher) {
		const projectWorkspace = getProjectWorkspaceFolder();
		if(projectWorkspace){
			const compileCommandsUri = getUnrealClangdCompileCommandsUri(projectWorkspace.uri, {withFileName: true});
			await setupNewSourceFileDetection(projectWorkspace, compileCommandsUri);
		}
		else{
			console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		}
		
	}

	
	await onDidChangeConfiguration(undefined, true);

	const unrealClangdConfig = getUnrealClangdConfig(mainWorkspaceFolder);
	const isCreateProject = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);

	const isClangdProject = await hasClangdProjectFiles(mainWorkspaceFolder);
	if(!isCreateProject && isClangdProject && !getIsFinishingCreation()){
		await backupOrRestoreClangdSettingsInWorkspaceFile(isClangdProject);  // MARK: BACKUP/RESTORE
		await startCheckCustomSystemIncludes();
		await createToggleMacroStatusBarButton();
		if((await isProjectChange()) && !isChangingProject){
			isChangingProject = true;
			console.log("Startup: Detected project change....");
			await onProjectChange();
			isChangingProject = false;
		}
	}
	else if(isCreateProject) {
		await handleCreateProjectIfSet();
	}
	else {
		console.warn("No .clangd/.clang-format files found or wasn't creating project on startup. (This could mean you haven't created a unreal-clangd project yet) ");
	}
		
}


// this method is called when your extension is deactivated
export function deactivate() {
		
	newSourceFilesDetectionFileWatcher?.dispose();
	console.outputChannel?.dispose();
	macroSpeedStatus.dispose();
}

async function preActivate() {
	
	const projectWorkspace = getProjectWorkspaceFolder();

	if(!projectWorkspace){
		console.error("Couldn't get project workspace in preactivate!");
		return;
	}

	if(await hasClangdProjectFiles(projectWorkspace)){
		await addMSCppExtensionSettings();

		if(getIntellisenseType() === "Native"){
		await startModifyResponseFiles(); 
	}
	}

	await startCreateRspMatchers();
	
}

async function addMSCppExtensionSettings() {

	const projectWorkspace = getProjectWorkspaceFolder();
	if(!projectWorkspace){
		return;
	}

	const cppConfig = vscode.workspace.getConfiguration(consts.defaultCppToolsSettings.extensionSection, projectWorkspace);

	for (const setting in consts.defaultCppToolsSettings.settings) {
		if (Object.prototype.hasOwnProperty.call(consts.defaultCppToolsSettings.settings, setting)) {
			const element = consts.defaultCppToolsSettings.settings[setting as keyof typ.CCppDefaultSettingValues];
			if(!element){
				continue;
			}

			if(cppConfig.has(setting)){
				const currentValue = cppConfig.get<string>(setting);
				if(!currentValue){
					continue;
				}

				if(currentValue !== element.value){
					try {
						await cppConfig.update(setting, element.value, element.configTarget);
					} catch  {
						console.warn("Microsoft Cpp Extensions isn't enabled.");
						return;
					}
				}
			}
			else {
				console.warn("Microsoft Cpp Extensions isn't enabled.");
			}
			
		}
	}
	
}



async function onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent | undefined, setAll=false) {
	const projectWorkspace = getProjectWorkspaceFolder();
	if(!projectWorkspace){
		console.error(tr.COULDNT_GET_PROJ_WS_WILL_STILL_GET_SET_VARS);
	}

	if(setAll || e?.affectsConfiguration(`${consts.settingNames.unrealClangd.extensionSection}.${consts.settingNames.unrealClangd.settings['editor.parameterHints']}`)){
		
		const setting = vscode.workspace.getConfiguration(consts.settingNames.unrealClangd.extensionSection, projectWorkspace).get<string>(consts.settingNames.unrealClangd.settings['editor.parameterHints']);
		
		if(setting !== undefined){
			console.log(`${tr.AUTO_PARAM_HINTS_SET_TO} ${setting}`);
			onTextChange.setParamHintsSettingValue(setting as consts.ParamHints);
		}

		if(!setAll){
			return;
		}
	}

	if(setAll || e?.affectsConfiguration(`${consts.settingNames.unrealClangd.extensionSection}.${consts.settingNames.unrealClangd.settings["fixes.delegateFuncCompletions"]}`)){
		const setting = vscode.workspace.getConfiguration(consts.settingNames.unrealClangd.extensionSection, projectWorkspace).get<boolean>(consts.settingNames.unrealClangd.settings["fixes.delegateFuncCompletions"]);
		
		if(setting !== undefined){
			console.log(`${tr.DELEGATE_FUNC_COMPLETIONS_FIX_SET_TO} ${String(setting)}`);
			onTextChange.setDelegateFuncCompletionsFix(setting);
		}

		if(!setAll){
			return;
		}
	}

	if(setAll || e?.affectsConfiguration(`${consts.settingNames.unrealClangd.extensionSection}.${consts.settingNames.unrealClangd.settings["fixes.autoIncludeSourceOnly"]}`)){
		const setting = vscode.workspace.getConfiguration(consts.settingNames.unrealClangd.extensionSection, projectWorkspace).get<boolean>(consts.settingNames.unrealClangd.settings["fixes.autoIncludeSourceOnly"]);
		
		if(setting !== undefined){
			console.log(`${tr.AUTO_INCLUDE_SOURCE_ONLY_SET_TO} ${String(setting)}`);
			onTextChange.setAutoIncludeHeaders(setting);
		}

		if(!setAll){
			return;
		}
	}

	/* if(setAll || e?.affectsConfiguration(`${consts.settingNames.unrealClangd.extensionSection}.${consts.settingNames.unrealClangd.settings["fixes.focusSuggestionDelay"]}`)){
		const setting = vscode.workspace.getConfiguration(consts.settingNames.unrealClangd.extensionSection, projectWorkspace).get<number>(consts.settingNames.unrealClangd.settings["fixes.focusSuggestionDelay"]);
		
		if(setting !== undefined){
			console.log(`${tr.FOCUS_SUGG_DELAY_SET_TO} ${setting}`);
			onTextChange.setFocusSuggestionDelay(setting);
		}

		if(!setAll){
			return;
		}
	} */

	if(!projectWorkspace){
		return;
	}
	const unrealClangdConfig = getUnrealClangdConfig(projectWorkspace);
	const isCreateProject = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);
	if(getRestoreState() !== "JustRestored" && !isCreateProject && !getIsFinishingCreation() && !getIsUninstalling()){
		await backupOnConfigChange();
	}
	
};


async function copyCompileCommands(compileCommandsUri: vscode.Uri, target: vscode.Uri) {
	try {
		console.log(`${tr.TRY_COPY_CC_FILE_TO_path} ${target.fsPath}`);
		await vscode.workspace.fs.copy(compileCommandsUri, target, { overwrite: true });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		}
		console.error(tr.ERR_COPYING_CC);

		return false;
	}
	console.log(tr.COPY_SUCCESSFUL);
	
	return true;
}


async function setupNewSourceFileDetection(projectWorkspace: vscode.WorkspaceFolder | undefined, compileCommandsUri: vscode.Uri | undefined) {

	if (await doesUriExist(compileCommandsUri)) {
		const compileCommands = await getValidatedCompileCommandObjectsFromUri(compileCommandsUri);
		const sourceFilesFirstChildFolders = getSourceFilesFirstChildFolderNames(projectWorkspace?.uri, compileCommands);

		if (projectWorkspace && compileCommandsUri && sourceFilesFirstChildFolders && sourceFilesFirstChildFolders.size > 0) {

			const globSourceFilesFirstChildFoldersPrefix = Array.from(sourceFilesFirstChildFolders).join(',');
			const newSourceFilesRelativePattern = new vscode.RelativePattern(projectWorkspace, `{${globSourceFilesFirstChildFoldersPrefix}}${consts.GLOB_SOURCE_FILES_SUFFIX}`);
			if (!newSourceFilesDetectionFileWatcher) { 
				console.log(tr.SETTING_UP_NEW_SRC_FILE_DETECT);

				newSourceFilesDetectionFileWatcher = vscode.workspace.createFileSystemWatcher(newSourceFilesRelativePattern, false, true, true);

				newSourceFilesDetectionFileWatcher.onDidCreate(async () => {

					// Auto-update compile commands without prompting
					if (!hasCreatedNewSourceFile && !isUnrealBuildingRebuildingTask && !getIsUpdateCompileCommands()) {
						hasCreatedNewSourceFile = true;
						console.log("New source file detected - auto-updating compile commands...");
						await updateCompileCommands();
						hasCreatedNewSourceFile = false;
					}

				});
			}
		}
		else {
			console.error(tr.COULDNT_SETUP_SRC_FILE_DETECT);
		}
	}
	else {
		console.log(tr.COULDNT_SETUP_NEW_SRC_FILE_DETECT_CC_DOESNT_EXIST);
	}
}


async function onUnrealCompileCommandsCreatedOrChanged() {
	const projectWorkspace = getProjectWorkspaceFolder();
	if(!projectWorkspace){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	//const isResponseFixEnabled = getUnrealClangdConfig(projectWorkspace).get(consts.settingNames.unrealClangd.settings['fixes.intellisenseFiles']);
	//if (isResponseFixEnabled) {
		//console.log(tr.RSP_FILE_QUOTE_FIX_IS_ENABLED_ATTEMPTING_FIX);
		// TODO ?
		//await startFixResponseFiles();  // We aren't doing anything to response files with 'Native' intellisense now.
	//}
	
	
	if (!newSourceFilesDetectionFileWatcher) {

		const compileCommandsUri = getUnrealClangdCompileCommandsUri(projectWorkspace.uri, { withFileName: true });
		await setupNewSourceFileDetection(projectWorkspace, compileCommandsUri);
	}
	
}


async function handleCreateProjectIfSet() {
	await vscode.commands.executeCommand(consts.EXT_CMD_CREATE_CLANGD_PROJECT);
}


async function copyNewlyCreatedCompileCommandToCCFolder() {
	const unrealWorkspaceUri = ueHelpers.getUnrealWorkspaceFolder()?.uri;
	const mainWorkspaceUri = getProjectWorkspaceFolder()?.uri;

	if (!unrealWorkspaceUri || !mainWorkspaceUri) {
		console.error(tr.CLDNT_GET_URIS_FOR_CPY_CC);
		return;
	}

	let ccUriToCopy: vscode.Uri | undefined = undefined;

	if(getIntellisenseType() === "Native"){
		const ccName = await getProjectCompileCommandsName();
		if(!ccName) {return;}
		ccUriToCopy = vscode.Uri.joinPath(mainWorkspaceUri, consts.FOLDER_NAME_VSCODE, ccName);
	}
	else {
		ccUriToCopy = getUnrealCompileCommandsUriForProject(unrealWorkspaceUri);
	}
	
	const projectCCUri = getUnrealClangdCompileCommandsUri(mainWorkspaceUri, { withFileName: true });

	if (await doesUriExist(ccUriToCopy)) {
		if(!(await copyCompileCommands(ccUriToCopy, projectCCUri))){
			console.error(tr.ERR_COPYING_CC);
			return;}
	}
	else{
		console.error(tr.UE_CC_DOESNT_EXISTS_CANT_CONTINUE_UDPATE_CC);
	}

}


async function onEndUpdateCompileCommands(state: 'updateCC' | 'creating') {
	// MARK: BACKUP

	const projectWorkspaceFolder = getProjectWorkspaceFolder();
	if(projectWorkspaceFolder && state === 'updateCC'){
		await backupOrRestoreClangdSettingsInWorkspaceFile(true, "restore");
	}
	else {
		
	}

	await setTimeout(500);  // MARK: TEST was 1250

	await copyNewlyCreatedCompileCommandToCCFolder();

	//if(getIntellisenseType() === "Native" && state === 'updateCC'){
		//await startSetPreParseIncludesInClangdCfg();
	//}
	
	await onUnrealCompileCommandsCreatedOrChanged();  // MARK: need this?

	await addCompletionHelperToCompileCommands();

	await startModifyResponseFiles();
				
	setIsUpdateCompileCommands(false);

	if (state === 'updateCC') {
		await restartClangd();
	}

}


export async function createToggleMacroStatusBarButton() {
	if(macroSpeedStatus.text) {return;}  // It's been created already

	const projUri = getProjectWorkspaceFolder()?.uri;
	if(!projUri) {return;} 

	const macroCompHelperUri = vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, FILENAME_MACRO_COMP_HELPER);

	const fileStr = await getFileString(macroCompHelperUri);
	if(!fileStr) {
		console.error(`Couldn't find ${FILENAME_MACRO_COMP_HELPER}: ${macroCompHelperUri.fsPath}`);
		return;
	}

	if(fileStr.includes("// #inc")) {
		macroSpeedStatus.text = MACROS_SPEED_STATUS_FAST_TEXT;
		macroSpeedStatus.tooltip = MACROS_SPEED_STATUS_FAST_TOOLTIP;
	}
	else {
		macroSpeedStatus.text = MACROS_SPEED_STATUS_SLOW_TEXT;
		macroSpeedStatus.tooltip = MACROS_SPEED_STATUS_SLOW_TOOLTIP;
	}
	
	macroSpeedStatus.command = 'unreal-clangd.toggleMacroCompletions';
	macroSpeedStatus.show();
}


export async function toggleMacroCompletions() {
	_isTogglingMacroCompletions = true;

	const projUri = getProjectWorkspaceFolder()?.uri;
	if(!projUri) {return;} 

	const macroCompHelperUri = vscode.Uri.joinPath(projUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, FILENAME_MACRO_COMP_HELPER);

	const fileStr = await getFileString(macroCompHelperUri);
	if(!fileStr) {
		console.error(`Couldn't find ${FILENAME_MACRO_COMP_HELPER}: ${macroCompHelperUri.fsPath}`);
		return;
	}

	let macrosSpeed: "fast" | "slow";
	let newFileStr: string;
	if(fileStr.includes("// #inc")) {
		newFileStr = fileStr.replace("// #inc", "#inc");
		macrosSpeed = "slow";
	}
	else {
		newFileStr = fileStr.replace(`#include \"${FILENAME_DEFAULT_COMP}`, `// #include \"${FILENAME_DEFAULT_COMP}`);
		macrosSpeed = "fast";
	}

	const saveStatus = await saveFile(newFileStr, macroCompHelperUri);
	if(saveStatus === "success") {
		if(macrosSpeed === "fast") {
			macroSpeedStatus.text = MACROS_SPEED_STATUS_FAST_TEXT;
			macroSpeedStatus.tooltip = MACROS_SPEED_STATUS_FAST_TOOLTIP;
		}
		else {
			macroSpeedStatus.text = MACROS_SPEED_STATUS_SLOW_TEXT;
			macroSpeedStatus.tooltip = MACROS_SPEED_STATUS_SLOW_TOOLTIP;
		}
	}

	macroSpeedStatus.show();

	await restartClangd();

	_isTogglingMacroCompletions = false;
}
