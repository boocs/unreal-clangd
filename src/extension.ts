/* eslint-disable @typescript-eslint/no-unused-vars */


import * as vscode from 'vscode';

import * as tr from './tr/text';

import * as path from 'path';

import { SemVer } from 'semver';
import semver = require('semver');

import { UeClangdCreator } from './ueClangdCreator';
import * as ueHelpers from './libs/ueHelpers';
import { TextDecoder, TextEncoder } from 'util';
import * as consts from './libs/consts';

import * as typ from './libs/types';
import { getProjectWorkspaceFolder } from './libs/ueHelpers';

import * as console from './libs/console';
import { CreationCmdLineSettings, CreationCmdLineValue } from './libs/types';

import * as yaml from 'yaml';
import delay = require('delay');

import * as onTextChange from './codeCompletionFix';
import * as dyn from './dynamic';
import { RelativePattern } from 'vscode';
import { EOL } from 'os';


type UnrealPlatform = import('./libs/indexTypes').UnrealPlatform;

let newSourceFilesDetectionFileWatcher: vscode.FileSystemWatcher | null = null;

let isWantingToCreate = false;

let isUninstallingUeClangdProject = false;
let hasCreatedNewSourceFile = false;  // prevents multiple calls asking to update cc
let isUpdatingCompileCommands = false;
let isUnrealBuildingRebuildingTask = false;
let isUnrealCleaningTask = false;

// https://www.eliostruyf.com/cancel-progress-programmatically-visual-studio-code-extensions/
//let customCancellationToken: vscode.CancellationTokenSource | null = null;

// eslint-disable-next-line prefer-const 
let intellisenseType: typ.ExtensionIntellisenseType = "Native";  // In future this could be change via setting
let _codeWorkspaceSettingsBackup: Record<string, unknown> | undefined = undefined;


export async function activate(context: vscode.ExtensionContext) {
	
	if(!(await isUnrealProject())){
		console.warning("This isn't an Unreal Project. Extensions will not activate.");
		return;
	}
	await preActivate();
	
	if (!await isUnrealProject()) {
		console.log(tr.NOT_UNREAL_PROJECT);
		return;
	}

	console.log(`Started ${consts.EXTENSION_NAME} ${consts.EXTENSION_VERSION}\n`);


	let disposable = vscode.commands.registerCommand('unreal-clangd.updateCompileCommands', async () => {

		console.log(tr.RUNNING_UPDATE_CC);
		
		const unrealWorkspaceFolder = ueHelpers.getUnrealWorkspaceFolder();
		const projectWorkspaceFolder = getProjectWorkspaceFolder();
		if (!projectWorkspaceFolder || !unrealWorkspaceFolder) {
			console.error(`${tr.COULDNT_GET_WORKSPACE_FOLDERS} ${projectWorkspaceFolder}, ${unrealWorkspaceFolder} `);
			return;
		}

		const ueClangdConfig = getUnrealClangdConfig(projectWorkspaceFolder);
		const execType = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.execType']);
		let args: string[] | undefined = undefined;

		if (intellisenseType !== "Native") {
			const targetNames: string[] | undefined = await ueHelpers.getBuildTargetNames(consts.BUILD_TARGET_EDITOR_SUFFIX);

			if (!targetNames || targetNames.length === 0) {
				console.error(`targetNames length was: ${targetNames?.length}`);
				return;
			}

			let buildTargetName: string;
			if (targetNames.length > 1) {

				const target = await vscode.window.showQuickPick(targetNames, {
					ignoreFocusOut: true,
					title: tr.CHOOSE_BUILD_TARGET
				});

				if (!target) {
					return;
				}
				buildTargetName = target;
			}
			else {
				buildTargetName = targetNames[0];
			}

			// Delete old compile commands from unreal directory allows us to know for sure that new one was created
			if (!(await permDeleteUri(getUnrealCompileCommandsUriForProject(unrealWorkspaceFolder.uri)))) {
				return;
			}

			const platform: string | undefined = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.platform']);
			const architecture: string | undefined = ueClangdConfig.get(consts.settingNames.unrealClangd.settings['compileCommands.architecture']);

			args = await getUpdateCCArgs(buildTargetName, platform, architecture);
		}
		else {
			const uprojectUri = await ueHelpers.getUprojectUri();
			if(!uprojectUri){
				console.error("Project's uproject file not found!");
				return;
			}

			args = [
				"-projectfiles",
				"-vscode",
				`-project=${uprojectUri.fsPath}`,
				"-game",
				"-engine",
				"-dotnet"
			];
		}

		let command = await getUbtPath(unrealWorkspaceFolder.uri);	

		if(!command || !args || args.length === 0){
			return;
		}

		command = `.${path.sep}${path.relative(unrealWorkspaceFolder.uri.fsPath, command)}`;

		const ubtCommand = {command: command, args: args };
		//const ubtCommand: {command: vscode.ShellQuotedString | string, args: (vscode.ShellQuotedString | string)[]} = getShellQuoting(command, args);
		if (execType === consts.COMPILE_COMMANDS_EXEC_TYPE_TASK) {
			await runUpdateCompileCommandsWithTask(projectWorkspaceFolder ,unrealWorkspaceFolder, ubtCommand);
		}
		else if (execType === consts.COMPILE_COMMANDS_EXEC_TYPE_DEBUG) {
			await runUpdateCompileCommandsWithDebug(projectWorkspaceFolder ,unrealWorkspaceFolder, ubtCommand);
		}
		else {
			console.error(tr.EXEC_TYPE_NOT_FOUND);
		}

	});
	context.subscriptions.push(disposable);


	disposable = vscode.commands.registerCommand('unreal-clangd.createUnrealClangdProject', async () => {

		console.log(tr.RUNNING_COMMAND_CREATE_UECLANGD_PROJECT);

		const mainWorkspaceFolder = getProjectWorkspaceFolder();
		if (!mainWorkspaceFolder) {
			console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
			return;
		}

		const ueClangdConfig = getUnrealClangdConfig(mainWorkspaceFolder);
		
		const creatingProjectAfterReload = ueClangdConfig.get<string>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);
		if (!creatingProjectAfterReload && !isWantingToCreate) {
			const installTypeResult = await vscode.window.showWarningMessage(tr.WHAT_INSTALL_TYPE, { detail: tr.FULL_OR_PARTIAL, modal: true }, tr.BTTN_FULL, tr.BTTN_PARTIAL);
		
			if(!installTypeResult){
				return;
			}

			if (installTypeResult === tr.BTTN_FULL) {
				await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['creation.overwrite'], consts.OVERWRITE_FULL, vscode.ConfigurationTarget.WorkspaceFolder);
			}
			else {
				await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['creation.overwrite'], consts.OVERWRITE_PARTIAL, vscode.ConfigurationTarget.WorkspaceFolder);
			}
		}

		// Prevent redoing setup after a reload
		await ueClangdConfig.update(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup'], false);

		if(!(await handleUnrealVersionCheck(await getUnrealVersion(), getUnrealVersionBypass(mainWorkspaceFolder)))){
			return;
		}

		const compileCommandsUri = getCompileCommandsPath(mainWorkspaceFolder.uri, {withFileName: true});
		if (!compileCommandsUri) {
			console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
			return;
		}

		if(!(await handleExtensionConflict(mainWorkspaceFolder))){
			return;
		}
		
		const gcdRelativePattern = new vscode.RelativePattern(mainWorkspaceFolder, consts.GLOB_GCD_FILES);

		if(isWantingToCreate) {
			isWantingToCreate = false;
		}	
		const hasFoundIntellisense = await checkForIntellisenseFilesAndAskToCreate(
			compileCommandsUri,
			gcdRelativePattern,
			async () => {
				const runUpdateCCResult = await askAndRunUpdateCompileCommands([tr.BTTN_YES, tr.BTTN_NO], [tr.BTTN_YES], tr.WARN_INTELLISENSE_FILES_NOT_FOUND, tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);

				if (runUpdateCCResult === tr.BTTN_YES) {
					isWantingToCreate = true;
				}
				return runUpdateCCResult;
			}
		);

		if (hasFoundIntellisense === tr.BTTN_NO) {  // We process creation later when cc is created and then copied
			return;
		}

		const uePlatform = getUnrealPlatform(process.platform);
		if (!uePlatform) {
			console.error(`${tr.COULDNT_GET_UNREAL_PLATFORM} ${process.platform}${tr.platform_ISNT_SUPPORTED}`);
			return;
		}

		const creationCmdLine: typ.CreationCmdLineArgs = new Map<CreationCmdLineSettings, CreationCmdLineValue>(consts.defaultCreationCmdLine);
		setCreationCmdLineDynamicValues(mainWorkspaceFolder, creationCmdLine, uePlatform);
		const cmdLineString = getCmdLineString(creationCmdLine);

		const result = await vscode.window.showInformationMessage(tr.CREATION_CMD_LINE_OPTIONS, { detail: cmdLineString, modal: true }, tr.BTTN_OK);

		if (result !== tr.BTTN_OK) {
			console.log(tr.ERR_NO_CREATION_ARGS_WERE_FOUND);
			return;
		}

		const currentClangdPath = getClangDPathFromConfig(mainWorkspaceFolder);
		const newClangdUri : vscode.Uri | undefined = await getClangDPathFromUser(currentClangdPath, process.platform);

		if (!newClangdUri) {
			console.log(tr.USER_CANCELLED_CLANGD_PATH_SELECTION);
			return;
		}

		const projectInfo: typ.ProjectInfoVars | null = await getProjectInfo(mainWorkspaceFolder, compileCommandsUri);
		if (!projectInfo) {
			console.error(tr.COULDNT_CREATE_PROJECT_INFO_VARS);
			return;
		}

		const isClangTidyEnabled: boolean | undefined = getCfgValue(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.tidy']);

		if (isClangTidyEnabled === undefined) {
			console.error(tr.COULDNT_GET_CLANG_TIDY_SETTINGS);
			return;
		}

		let forcedCompiler: vscode.Uri | undefined = undefined;
		if(process.platform === "win32"){
			const clangdDirPath =  path.parse(newClangdUri.fsPath).dir;
			forcedCompiler = vscode.Uri.joinPath(vscode.Uri.file(clangdDirPath), consts.CLANG_CL_FILE_NAME);
		}

		if(forcedCompiler){
			await setCompilerSetting( mainWorkspaceFolder, forcedCompiler);
		}
		
		const defaultClangdCfgSettings = consts.defaultGeneralClangdCfgSettings;
		dyn.addSettingsToClangdCfg(mainWorkspaceFolder, defaultClangdCfgSettings);

		const clangdExtYamlFiles: typ.ExtensionYamlFiles = getDefaultClangdExtYamlFiles(projectInfo, defaultClangdCfgSettings, isClangTidyEnabled);

		const defaultCfgSettings: typ.AllDefaultSettings = consts.defaultConfigSettings;
		
		const ueVersion: ueHelpers.UnrealVersion | undefined = await getUnrealVersion();
		const isError = dyn.addDynamicDefaultSettingsToConfig(ueVersion, clangdExtYamlFiles, defaultCfgSettings, newClangdUri.fsPath, getCompileCommandsPath(mainWorkspaceFolder.uri, {withFileName:false}));
		
		if(isError){
			console.error(tr.ERROR_ADDING_DYNAMIC_SETTINGS);
			return;
		}
		
		dyn.addPlatformSpecificChanges( intellisenseType, uePlatform, clangdExtYamlFiles);

		const clangdExtFiles = await getClangdExtFiles(clangdExtYamlFiles);

		if (!clangdExtFiles) {
			console.error(tr.COULDNT_GET_CLANGD_EXT_FILES);
			return;
		}

		if (!defaultCfgSettings) {
			console.error(tr.NO_DEFAULT_CFG_SETTINGS_FOUND);
			return;
		}

		const creator = new UeClangdCreator(creationCmdLine, projectInfo, defaultCfgSettings, clangdExtFiles);
		await creator?.create();

		//await resetOverwriteSetting(mainWorkspaceFolder);

		console.log(tr.END_CREATE_UE_CLANGD_PROJECT);

		const reloadResult = await vscode.window.showInformationMessage(
			tr.CONFIG_CHANGED_WANT_TO_RELOAD,
			{ modal: true },
			tr.BTTN_YES
		);

		if (reloadResult === tr.BTTN_YES) {
			await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);
		}


	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('unreal-clangd.fixIntellisenseFiles', async (uri: vscode.Uri | undefined) => {
		console.log("Fixing intellisense files...");
		

		const mainWorkspace: vscode.WorkspaceFolder | undefined = ueHelpers.getProjectWorkspaceFolder();
		if(!mainWorkspace){
			return;
		}

		if(intellisenseType === "Native"){
			console.log("Running Native update Fix Intellisense files...");
			return;
		}

		const gcdRelativePattern = new vscode.RelativePattern(mainWorkspace, consts.GLOB_GCD_FILES);

		const responseFiles = await getResponseFileUris(gcdRelativePattern);
		if (!responseFiles) {
			console.error(tr.COULDNT_CREATE_RSP_FILES);
			return;
		}

		await fixResponseFiles(responseFiles);

		console.log(tr.END_FIXING_RSP_FILES_QUOTED_PATHS);
	});
	context.subscriptions.push(disposable);


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

	context.subscriptions.push(vscode.tasks.onDidStartTask(async (e: vscode.TaskStartEvent) => {
		
		if ([" Rebuild", " Build"].some((value: string) => {
			return e.execution.task.name.includes(value);
		})) {
			console.log("Starting Build/Rebuild task");
			isUnrealBuildingRebuildingTask = true;
		}
		else if (e.execution.task.name.includes(" Clean")) {
			console.log("Starting Unreal Clean task");
			isUnrealCleaningTask = true;
		}
		else if(e.execution.task.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME){
			console.log("Update CC Task has started...");

			//await onStartTaskUpdateCompileCommands();
			
		}

	}));

	context.subscriptions.push(vscode.tasks.onDidEndTask(async (e: vscode.TaskEndEvent) => {
		if(intellisenseType === "Native"){
			console.log("Running Native onDidEndTask.");

			if(e.execution.task.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME){
			
				await onEndUpdateCompileCommands();
	
				console.log(`End Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
			}
			return;
		}
		
		if ([" Rebuild", " Build"].some((value: string) => {
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

			await delay(consts.END_OF_CLEAN_TASK_DELAY); // Delay to check if Reinstall task is being run so Update CC Ask doesn't trigger twice.
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
		}

	}));

	
	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(async (e: vscode.DebugSession) => {
		if (e.name === consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME) {
			
			await onEndUpdateCompileCommands();

			console.log(`End Debug Task: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME}`);
		}
	}));


	// Attempt to fix 'macro expansion in place of names' in code completion and auto func param hints
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(onTextChange.onDidChangeTextDocument));

	
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(onDidChangeConfiguration));


	disposable = vscode.commands.registerCommand('unreal-clangd.uninstall', async () => {
		isUninstallingUeClangdProject = true;

		const projectWorkspaceFolder = getProjectWorkspaceFolder();
		if (!projectWorkspaceFolder) {
			console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
			return;
		}

		// First remove settings
		if(!await uninstallSettings(projectWorkspaceFolder)){
			return;
		}

		// Now remove files
		const ueClangdProjectFiles = await getAllUrisToDelete(projectWorkspaceFolder);

		if(!ueClangdProjectFiles){
			isUninstallingUeClangdProject = false;
			return;
		}

		if(ueClangdProjectFiles.clangdCfgFiles.length === 0 && ueClangdProjectFiles.intellisenseFiles.length === 0 && ueClangdProjectFiles.compileCommandsDirFiles.length === 0){
			console.log(tr.FOUND_NO_FILES_TO_UNINSTALL);
		}
		else {
			const detailString = getDeleteFilesWindowDetailString(projectWorkspaceFolder, ueClangdProjectFiles);

			const deleteFilesResult = await vscode.window.showInformationMessage(
				tr.THESE_WILL_BE_DELETED_PROCEED, 
				{
					detail: detailString,
					modal:true
				},
				tr.BTTN_DEL, tr.BTTN_TO_TRASH, tr.BTTN_SKIP
			);
			

			if(deleteFilesResult && [tr.BTTN_DEL, tr.BTTN_TO_TRASH].includes(deleteFilesResult)){
				const filesToDelete = [];

				for (const fileUris in ueClangdProjectFiles) {
					if (Object.prototype.hasOwnProperty.call(ueClangdProjectFiles, fileUris)) {
						const element = ueClangdProjectFiles[fileUris as keyof typ.ProjectFiles];
						filesToDelete.push(...element);
					}
				}
				
				const isToTrash: boolean = deleteFilesResult === tr.BTTN_TO_TRASH;

				filesToDelete.forEach(async (value) => {
					const trashLabel = isToTrash? tr.TRASH : tr.DELETE;
					console.log(`${trashLabel}: ${value.fsPath}`);
					await vscode.workspace.fs.delete(value, {useTrash:isToTrash});
				});
			}
		}

		await delay(consts.END_OF_UNINSTALL_DELAY); // Prevents uninstall var updating before file deletion lag (triggers gcd delete detect without)
		isUninstallingUeClangdProject = false;

		console.log(tr.DONE_WITH_UE_CLANGD_PROJECT_UININSTALL);
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('unreal-clangd.addToCompletionHelper', addToCompletionHelper);
	context.subscriptions.push(disposable);

	const mainWorkspaceFolder = getProjectWorkspaceFolder();
	if(!mainWorkspaceFolder){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	let isStartupIntellisenseCheckEnabled: boolean | undefined = false;

	isStartupIntellisenseCheckEnabled = getUnrealClangdConfig(mainWorkspaceFolder).get(consts.settingNames.unrealClangd.settings['utility.checkForIntellisenseFilesOnStartup']);
	
	if (isStartupIntellisenseCheckEnabled) {

		console.log(tr.START_INTELLISENSE_CHECK_ENABLED_AND_CHECKING);
		if(intellisenseType === "Native"){
			console.log("Running Native check for Intellisense files on startup...");
		}
		else {


			const mainWorkspaceFolder = getProjectWorkspaceFolder();
			if (!mainWorkspaceFolder) {
				console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
				return;
			}

			const compileCommandsUri = getCompileCommandsPath(mainWorkspaceFolder.uri, { withFileName: true });
			if (!compileCommandsUri) {
				console.error(tr.COULDNT_GET_CC_URI);
				return;
			}
			const gcdRelativePattern = new vscode.RelativePattern(mainWorkspaceFolder, consts.GLOB_GCD_FILES);

			await checkForIntellisenseFilesAndAskToCreate(
				compileCommandsUri,
				gcdRelativePattern,
				async () => {
					return await askAndRunUpdateCompileCommands([tr.BTTN_YES, tr.BTTN_NO], [tr.BTTN_YES], tr.WARN_INTELLISENSE_FILES_NOT_FOUND_ON_STARTUP, tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE);
				});
		}
	}
	else {
		console.log(tr.STARTUP_INTELLISENSE_CHECK_DISABLED);
	}

	if (!newSourceFilesDetectionFileWatcher) {
		const projectWorkspace = getProjectWorkspaceFolder();
		if(projectWorkspace){
			const compileCommandsUri = getCompileCommandsPath(projectWorkspace?.uri, {withFileName: true});
			await setupNewSourceFileDetection(projectWorkspace, compileCommandsUri);
		}
		else{
			console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		}
		
	}

	
	await onDidChangeConfiguration(undefined, true);
	
	await handleCompletionHelperOpening(mainWorkspaceFolder);

	await handleCreateProjectIfSet(mainWorkspaceFolder);
	
}


// this method is called when your extension is deactivated
export function deactivate() {
		
	newSourceFilesDetectionFileWatcher?.dispose();
	console.outputChannel.dispose();
}

async function preActivate() {
	
	const projectWorkspace = getProjectWorkspaceFolder();

	if(!projectWorkspace){
		console.error("Couldn't get project workspace in preactivate!");
		return;
	}

	if(await hasClangdProjectFiles(projectWorkspace)){
		await addMSCppExtensionSettings();
	}
	
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
					} catch (error) {
						console.warning("Microsoft Cpp Extensions isn't enabled.");
						return;
					}
				}
			}
			else {
				console.warning("Microsoft Cpp Extensions isn't enabled.");
			}
			
		}
	}
	
}


const addToCompletionHelper = async () => {
	const result = await vscode.window.showInformationMessage(
		tr.ADD_TO_COMPLETION_HELPER_INFO,
		{modal:true, detail:tr.ADD_TO_COMPLETION_HELPER_DETAIL},
		tr.BTTN_OK
	);

	if(result !== tr.BTTN_OK){
		console.log(tr.USER_CANCELLED_ADD_TO_COMPLETION_HELPER);
		return;
	}

	const uriWithHeaders = await vscode.window.showOpenDialog(
		{canSelectFiles:false, canSelectFolders:true, canSelectMany:false}
	);
	
	if(!uriWithHeaders || uriWithHeaders.length === 0){
		console.log(tr.USER_CANCELLED_ADD_TO_COMPLETION_HELPER);
		return;
	}

	const foundHeaders = await vscode.workspace.findFiles(new RelativePattern(uriWithHeaders[0], consts.GLOB_ALL_HEADERS));

	if(foundHeaders.length === 0){
		console.log(`${tr.FOUND_NO_HEADERS_IN} ${uriWithHeaders[0].fsPath}`);
		return;
	}

	const askAddHeadersResult = await vscode.window.showInformationMessage(
		`${foundHeaders.length} ${tr.HEADERS_FOUND}`,
		{modal: true, detail:tr.QST_ADD_HEADERS_TO_COMPLETION_HELP},
		tr.BTTN_OK
	);

	if(askAddHeadersResult !== tr.BTTN_OK){
		console.log(tr.USER_CANCELLED_ADD_TO_COMPLETION_HELPER);
		return;
	}

	const workspaceUri = getProjectWorkspaceFolder()?.uri;

	if(!workspaceUri){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	const completionHelperUri = getCompletionHelperPath(workspaceUri, {withFileName:true});
	const appendString = getHeadersAppendString(uriWithHeaders[0], foundHeaders);
	await appendToFile(completionHelperUri, appendString);

	await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);
	return;
	
};


const onDidChangeConfiguration = async (e: vscode.ConfigurationChangeEvent | undefined, setAll=false) => {
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

};

function setCreationCmdLineDynamicValues(workspaceFolder: vscode.WorkspaceFolder, creationCmdLine: typ.CreationCmdLineArgs, uePlatform: UnrealPlatform) {
	const ueClangdConfig = getUnrealClangdConfig(workspaceFolder);

	creationCmdLine.set('platform', uePlatform);
	creationCmdLine.set('overwrite', getCfgValue<string>(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.overwrite']));
	creationCmdLine.set('tidy', getCfgValue<boolean>(ueClangdConfig, consts.settingNames.unrealClangd.settings['creation.tidy']));
}


// Todo: This doesn't seem right? What doesn't seem right? Bad comment...
function getCfgValue<T>(config: vscode.WorkspaceConfiguration, setting: string): T | undefined {
	const value = config.get<T>(setting);

	if (value === undefined) {
		console.error(`${tr.ERR_FINDING_CFG_SETTING} ${setting}`);
		return value;
	}

	return value;
}


function getCmdLineString(creationCmdLine: typ.CreationCmdLineArgs): string {
	let cmdLineString = "";

	for (const setting of creationCmdLine) {
		cmdLineString += `-${setting[0]}=${setting[1]} `;
	}

	return cmdLineString;
}


async function getUnrealVersion() {
	const ueUri = ueHelpers.getUnrealVersionUri();
	if (!ueUri) {
		console.error(tr.COULDNT_GET_UE_VERSION_HEADER_URI);
		return undefined;
	}

	const unrealVersionFile = await getFileString(ueUri);

	return ueHelpers.getUnrealVersion(unrealVersionFile);
}


function isValidUnrealVersion(userVersion: ueHelpers.UnrealVersion | null, extensionVersion = consts.VALIDATE_UNREAL_VERSIONS): typ.ValidateUnrealResults {
	if (!userVersion) {
		console.error(tr.COULDNT_GET_UE_VERSION);
		return typ.ValidateUnrealResults.failed;
	}

	console.log(`${tr.FOUND_UE_VERSION} ${userVersion.major}.${userVersion.minor}.${userVersion.patch}\n`);
	
	const extMinVer = new SemVer(`${extensionVersion.min.major}.${extensionVersion.min.minor}.${extensionVersion.min.patch}`);
	const extMaxVer = new SemVer(`${extensionVersion.max.major}.${extensionVersion.max.minor}.${extensionVersion.max.patch}`);
	const extPlusVer = new SemVer(`${extensionVersion.max.major}.${extensionVersion.max.minor}.${extensionVersion.max.patch + 1}`);

	const userVer = new SemVer(`${userVersion.major}.${userVersion.minor}.${userVersion.patch}`);
	

	if( semver.lt(userVer, extMinVer)){
		console.error(`${tr.ERR_UNREAL_ISNT_COMPATIBLE_LEFT}(${userVer.raw})${tr.ERR_UNREAL_ISNT_COMPATIBLE_RIGHT}`);
		return typ.ValidateUnrealResults.failed;
	}

	if(semver.lte(userVer, extMaxVer)){
		return typ.ValidateUnrealResults.passed;
	}

	if(semver.eq(userVer, extPlusVer)){
		return typ.ValidateUnrealResults.passWithWarning;
	}

	console.error(`${tr.ERR_UNREAL_ISNT_COMPATIBLE_LEFT}(${userVer.raw})${tr.ERR_UNREAL_ISNT_COMPATIBLE_RIGHT}`);
	return typ.ValidateUnrealResults.failed;
	
}


async function isOkWithWarning(text: string, detail: string, modal = true): Promise<boolean> {
	const results = await vscode.window.showWarningMessage(
		text,
		{ detail: detail, modal: modal },
		tr.BTTN_CONTINUE);

	if (results === tr.BTTN_CONTINUE) {
		return true;
	}

	return false;
}

async function getClangDPathFromUser(currentClangdPath: string | undefined, platform: NodeJS.Platform) {
	
	let currentClangdUri;
	
	try {
		currentClangdUri = currentClangdPath? await checkValidUri(vscode.Uri.file(currentClangdPath)) : undefined;
	} catch (error) {
		console.error(tr.CLANGD_PATH_INVALID_URI_CONV_FAILED);
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		currentClangdUri = undefined;
	}
	
	let filter: {[name: string]: string[];} | undefined = undefined;
	if(platform === "win32"){
		// eslint-disable-next-line @typescript-eslint/naming-convention
		filter = { 'clangd': ['exe'], 'All Files': ['*'] };
	}

	const result = await vscode.window.showOpenDialog(
		{
			canSelectFiles:false,
			canSelectFolders:false,
			canSelectMany: false,
			defaultUri: currentClangdUri,
			openLabel: tr.BTTN_CHOOSE_CLANGD,
			filters: filter
		}
	);

	if (!result || result.length === 0) {
		if (currentClangdUri) {
			return currentClangdUri;
		}
		else {
			return undefined;
		}
	}

	return result[0];

}


function getClangDPathFromConfig(workspaceFolder: vscode.WorkspaceFolder,section: string = consts.CONFIG_SECTION_CLANGD, setting: string = consts.SETTING_CLANGD_PATH): string | undefined {
	const clangdConfig = vscode.workspace.getConfiguration(section, workspaceFolder);

	if (!clangdConfig) {
		console.error(tr.NO_CLANGD_CFG_FOUND);
		return undefined;
	}
	return clangdConfig.get(setting);
}


async function getUpdateCompileCommandsDbgCfg(
	unrealUri: vscode.Uri | undefined,
	ubtPath: string | null,
	ubtArgs: string[] | null
): Promise<vscode.DebugConfiguration | null> {

	if (!unrealUri) {
		console.error(tr.COULDNT_FIND_UE_URI);
		return null;
	}

	const updateCCCwd: string = unrealUri.fsPath;

	if ((!ubtPath || ubtPath.length < 2) || !ubtArgs || !updateCCCwd) {

		console.error(tr.COULDNT_CREATE_UPDATE_CC_DEBUG_CFG);
		return null;
	}

	console.log(tr.CREATING_ARGS_FOR_CC_CREATE);
	console.log(
		`type: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_TYPE}\n` +
		`request: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_REQUEST}\n` +
		`program: ${ubtPath}\n` +
		`args: [${ubtArgs}]\n` +
		`console: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE}\n` +
		`stopAtEntry: ${consts.UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY}\n` +
		`cwd: ${updateCCCwd}\n`
	);

	const dbgConfig: typ.UpdateCompileCommandsDebugConfig = {
		name: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME,
		type: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_TYPE,
		request: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_REQUEST,
		program: ubtPath,
		args: ubtArgs,
		console: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_CONSOLE,
		stopAtEntry: consts.UPDATE_COMPILE_COMMANDS_DBGCFG_STOPATENTRY,
		cwd: updateCCCwd
		//,
		//logging: {
		//	enableLogging: true
		//}
	};

	return dbgConfig;
}


async function getUbtPath(ueUri: vscode.Uri | undefined) {

	if (!ueUri) {
		console.error(tr.URI_SEND_TO_GETUBTPATH_WAS_UNDEFINED);
		return null;
	}
	const ubtDirUri = vscode.Uri.joinPath(ueUri, ...consts.END_DIRECTORY_NAMES_TO_UNREAL_BUILD_TOOL);

	if (!(await doesUriExist(ubtDirUri))) {
		console.error(`${tr.UBT_PATH_DOESNT_EXIST} (${ubtDirUri.fsPath})`);
		return null;
	}

	const ubtAppUri = vscode.Uri.joinPath(ubtDirUri, consts.UNREAL_BUILD_TOOL_APP_NAME);

	return ubtAppUri.fsPath;

}


async function getUpdateCCArgs(buildTargetName: string, platform: string | undefined, architecture: string | undefined): Promise<string[] | undefined> {

	let unrealPlatform: string | undefined;

	if (platform) {
		unrealPlatform = platform;
	}
	else {
		
		unrealPlatform = getUnrealPlatform(process.platform);
		if (!unrealPlatform) {
			console.error(`${process.platform}${tr.platform_ISNT_SUPPORTED}`);
			return undefined;
		}
	}

	const uprojectFileName = await ueHelpers.getUProjectFileName(ueHelpers.getProjectWorkspaceFolder());
	if (!uprojectFileName) {
		console.error(tr.COULDNT_GET_UPROJECT_FILE_NAME);
		return undefined;
	}

	const projectWorkspaceFolderUri = ueHelpers.getProjectWorkspaceFolder()?.uri;
	if (!projectWorkspaceFolderUri) {
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return undefined;
	}
	const uprojectFilePath = vscode.Uri.joinPath(projectWorkspaceFolderUri, uprojectFileName).fsPath;

	let args: string[] = [];
	
	args = [
		buildTargetName,
		unrealPlatform,
		consts.UPDATE_COMPILE_COMMANDS_ARG_DEVELOPMENT,
		uprojectFilePath,
		consts.UPDATE_COMPILE_COMMANDS_COMPILER_CLANG,
		consts.UPDATE_COMPILE_COMMANDS_ARG_GEN_CLANGDB
	];
	
	
	if (architecture && intellisenseType !== "Native") {
		args.push(`${consts.UPDATE_COMPILE_COMMANDS_ARG_ARCHITECTURE_EMPTY}${architecture}`);
	}

	return args;
}


function getUnrealPlatform(platform: NodeJS.Platform): UnrealPlatform | undefined {
	switch (platform) {
		case "win32":
			return "Win64";
			break;
		case "linux":
			return "Linux";
			break;
		case "darwin":
			return "Mac";
			break;
		default:
			return undefined;
			break;
	}
}


async function copyCompileCommands(compileCommandsUri: vscode.Uri, target: vscode.Uri) {
	try {
		console.log(`${tr.TRY_COPY_CC_FILE_TO_path} ${target.fsPath}`);
		await vscode.workspace.fs.copy(compileCommandsUri, target, { overwrite: true });
	} catch (error) {
		if (error instanceof Error) {
			console.error(`${error.message}`);
		}
		console.error(tr.ERR_COPYING_CC);

		return false;
	}
	console.log(tr.COPY_SUCCESSFUL);
	
	return true;
}


async function getProjectInfo(mainWorkspaceFolder: vscode.WorkspaceFolder | undefined, compileCommandsUri: vscode.Uri | null): Promise<typ.ProjectInfoVars | null> {

	if (!mainWorkspaceFolder || !compileCommandsUri) {
		console.error(`${mainWorkspaceFolder?.uri}; ${compileCommandsUri?.fsPath}`);
		return null;
	}

	const compileCommands = await getCompileCommandObjectsFromJson(compileCommandsUri);
	if (!compileCommands) {
		console.error(tr.CC_COULDNT_BE_CREATED);
		return null;
	}

	const firstChildUrisWithSource = getSourceFilesFirstChildFolderUris(mainWorkspaceFolder.uri, compileCommands);

	if (!firstChildUrisWithSource) {
		console.error(tr.COULDNT_GET_SOURCE_FILE_URIS);
		return null;
	}

	return {
		mainWorkspaceFolder: mainWorkspaceFolder,
		compileCommands: compileCommands,
		firstChildUrisWithSource: firstChildUrisWithSource
	};

}


async function getCompileCommandObjectsFromJson(compileCommandUri: vscode.Uri | undefined): Promise<typ.CompileCommand[] | undefined> {
	if (!compileCommandUri) {
		console.error(tr.CC_URI_UNDEFINED_IN_GET_CC_OBJ_FROM_JSON);
		return undefined;
	}

	const fileString = await getFileString(compileCommandUri);

	if (!fileString) {
		return undefined;
	}

	return parseJson(fileString);
}


async function getFileString(uri: vscode.Uri): Promise<string | undefined> {
	let fileString;
	try {
		fileString = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
	} catch (error) {
		console.error(`${tr.ERR_READING_FILE_path} ${uri.fsPath}`);
		if (error instanceof Error) {
			console.error(`${error.message}`);
		}
		return;
	}

	return fileString;
}


function parseJson(jsonString: string) {
	let parsedJson;
	try {
		parsedJson = JSON.parse(jsonString);
	} catch (error) {
		console.error(tr.COULDNT_PARSE_JSON_STR);
		if (error instanceof Error) {
			console.error(`${error.message}`);
		}
		return undefined;
	}

	return parsedJson;
}


async function getResponseFileUris(relativePattern: vscode.RelativePattern): Promise<typ.File[] | null> {

	const gcdFileUris = await vscode.workspace.findFiles(relativePattern);

	if (!gcdFileUris || gcdFileUris.length < 1) {
		console.error("No GCD files found!");
		return null;
	}

	const responseFiles: typ.File[] = [];
	for (const gcdUri of gcdFileUris) {
		
		responseFiles.push({
			uri: gcdUri,
			fileString: ""
		});
	}

	return responseFiles;
}


async function createResponseFileStrings(responseFiles: typ.File[]) {
	for (const responseFile of responseFiles) {

		let file;
		try {
			file = await vscode.workspace.fs.readFile(responseFile.uri);
		} catch (error) {
			console.error(`${tr.ERR_READING_RSP_FILE_path} ${responseFile.uri.fsPath}`);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}
			continue;
		}

		const fileString = new TextDecoder().decode(file);
		if (!fileString) {
			continue;
		}
		responseFile.fileString = fileString;
	}

	return;
}


function fixResponseStrings(responseFiles: typ.File[]) {

	const re = /(?<=(?:\/I|\/imsvc|-I|-isystem)\s*)(?:(?:\w|\/)(?:[\w:/\s\-.]+?))(?=[\r\n|\r|\n])/gm;
	for (const responseFile of responseFiles) {
		let replacementString = responseFile.fileString?.replace(/""/gm, `"`); // Fix double quote (UE 5.4) // TODO Check not escaping ""

		replacementString = replacementString?.replace(re, substring => {  // Fix no quotes around paths
			return `"${substring}"`;  // Adding quotes
		});

		replacementString = replacementString?.replace(/Shared.rsp"/gm, "Shared.rsp.gcd\""); // Fix wrong shared file in gcd files

		replacementString = replacementString?.replace(/Definitions.h"/gm, `${consts.FILE_NAME_GCD_DEFINITIONS}"`);  // Fix wrong shared file in gcd files

		if (replacementString && responseFile.fileString !== replacementString) {
			responseFile.fileString = replacementString;
		}
		else {
			if (!replacementString) {
				console.error(`${tr.REPLACEMENT_STR_FOR_RSP_FILE_PATH_WAS_NULL_path} ${responseFile.uri.fsPath}`);
			}
			responseFile.fileString = undefined;
			continue;
		}
	}

}


async function saveFixedResponseStrings(responseFiles: typ.File[]) {
	for (const responseFile of responseFiles) {
		if (!responseFile.fileString) {
			// console.log(`Skipping fix for ${responseFile.uri.fsPath}, file is most likely already fixed.`); // Disabled because too much noise in logs
			continue;
		}

		let file;
		try {
			file = new TextEncoder().encode(responseFile.fileString);
		} catch (error) {
			console.error(`${tr.COULDNT_ENCODE_FILE_STRING_FROM_path} ${responseFile.uri.fsPath}`);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}
			continue;
		}

		if (!file) {
			console.error(` ${responseFile.uri.fsPath}`);
			return;
		}

		console.log(`${tr.QUOTE_FIX_WRITING_FILE_path} ${responseFile.uri.fsPath}`);
		try {
			await vscode.workspace.fs.writeFile(responseFile.uri, file);
		} catch (error) {
			console.error(`${tr.ERR_WRITING_FILE_path} ${responseFile.uri.fsPath}`);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}
			continue;
		}

	}
}


async function fixResponseFiles(responseFiles: typ.File[]) {
	await createResponseFileStrings(responseFiles);

	fixResponseStrings(responseFiles);

	await saveFixedResponseStrings(responseFiles);
}

function getSourceFilesFirstChildFolderNames(baseUri: vscode.Uri | undefined, compileCommands: typ.CompileCommand[] | undefined) {
	if (!compileCommands || !baseUri) {
		console.error(`${tr.BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_vars} ${compileCommands}, ${baseUri}`);
		return;
	}

	const restringSourceFolders = `(?<=${baseUri.fsPath.split(path.sep).join(path.posix.sep)}[/])${consts.RE_STRING_FOLDER_NAME}`;
	const reSourceFolders = new RegExp(restringSourceFolders, "gmi");

	const matchedPathStrings: Set<string> = new Set();
	for (const compileCommand of compileCommands) {
		const posixFile = compileCommand.file.split(path.sep).join(path.posix.sep);
		const match = posixFile.match(reSourceFolders);

		if (!match || match.length === 0) {
			//console.error(`re: ${reSourceFolders.source} didn't work on path: ${compileCommand.file}`);
			continue;
		}

		matchedPathStrings.add(match[0]);
	}

	return matchedPathStrings;
}


function getSourceFilesFirstChildFolderUris(baseUri: vscode.Uri | undefined, compileCommands: typ.CompileCommand[] | undefined) {

	if (!baseUri) {
		console.error(`${tr.BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_URIS_vars} ${compileCommands}, ${baseUri}`);
		return;
	}

	const matchedFolderNames: Set<string> | undefined = getSourceFilesFirstChildFolderNames(baseUri, compileCommands);

	if (!matchedFolderNames || matchedFolderNames.size === 0) {
		console.error(tr.DIDNT_FIND_ANY_SOURCE_FILD_FIRST_CHILD_FOLDER_NAMES);
		return undefined;
	}

	const pathUris = [];  // TODO why isn't this a Set?
	for (const folderName of matchedFolderNames) {
		try {
			pathUris.push(vscode.Uri.joinPath(baseUri, folderName));
		} catch (error) {
			console.error(`${tr.COULDNT_CREATE_URI_FROM_URI_AND_FOLDER_NAME} ${baseUri.fsPath}, ${folderName}`);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}

			continue;
		}
	}

	if (pathUris.length === 0) {
		return undefined;
	}

	return pathUris;
}


async function askAndRunUpdateCompileCommands(buttons: string[], positiveConfirms: string[], message: string, detailMessage: string) {
	const result = await vscode.window.showInformationMessage(
		message,
		{ modal: true, detail: detailMessage },
		...buttons);

	if (result !== undefined && positiveConfirms.includes(result)) {
		await vscode.commands.executeCommand(consts.EXT_CMD_UPDATE_COMPILE_COMMANDS);
	}

	return result;
}


async function checkForIntellisenseFilesAndAskToCreate(compileCommandsUri: vscode.Uri, gcdRelativePattern: vscode.RelativePattern, askCreate: () => Promise<string | undefined>): Promise<string> {

	const doesCompilesCommandExist = await doesUriExist(compileCommandsUri);

	if(intellisenseType === "Native"){
		if(!doesCompilesCommandExist) {
			await askCreate();
			return tr.BTTN_NO;
		}
		
		let fileStat: vscode.FileStat;
		try {
			fileStat = await vscode.workspace.fs.stat(compileCommandsUri);
		} catch (error) {
			console.error("Error getting compile commands file info!");
			return tr.BTTN_YES;
		}
		
		const fileDate = new Date(fileStat.ctime);
		
		const ccFileMinutesOld = getMinutesDifference(fileDate, new Date());

		const projectWorkspace = getProjectWorkspaceFolder();
		if(!projectWorkspace){
			console.error("Couldn't get project workspace!");
			return tr.BTTN_YES;
		}
		const compileCommandsIsTooOldInMinutes: number | undefined = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, projectWorkspace).get<number>("native.minutesTillIntellisenseFilesAreOld");

		if(compileCommandsIsTooOldInMinutes === undefined){
			console.error("Couldn't get Compile Commands too old minutes!");
			return tr.BTTN_YES;
		}

		if(ccFileMinutesOld > consts.NATIVE_COMPILE_COMMANDS_TOO_OLD_IN_MINUTES){
			await askCreate();
			return tr.BTTN_NO;
		}

		return tr.BTTN_YES;
	}

	// weak check
	const gcdFiles = await vscode.workspace.findFiles(gcdRelativePattern, undefined, 1);

	if (!doesCompilesCommandExist || gcdFiles.length === 0) {
		await askCreate();
		return tr.BTTN_NO;
	}
	else {
		console.log(tr.INTELLISENSE_FILES_HAVE_BEEN_FOUND);
		return tr.BTTN_YES;
	}

}

function getMinutesDifference(date1: Date, date2: Date): number {
	const millisecondsDifference = date2.getTime() - date1.getTime();
	const minutesDifference = millisecondsDifference / (1000 * 60);
	return Math.abs(minutesDifference);
  }


async function setupNewSourceFileDetection(projectWorkspace: vscode.WorkspaceFolder | undefined, compileCommandsUri: vscode.Uri | undefined) {

	if (await doesUriExist(compileCommandsUri)) {
		const compileCommands = await getCompileCommandObjectsFromJson(compileCommandsUri);
		const sourceFilesFirstChildFolders = getSourceFilesFirstChildFolderNames(projectWorkspace?.uri, compileCommands);

		if (projectWorkspace && compileCommandsUri && sourceFilesFirstChildFolders && sourceFilesFirstChildFolders.size > 0) {

			const globSourceFilesFirstChildFoldersPrefix = Array.from(sourceFilesFirstChildFolders).join(',');
			const newSourceFilesRelativePattern = new vscode.RelativePattern(projectWorkspace, `{${globSourceFilesFirstChildFoldersPrefix}}${consts.GLOB_SOURCE_FILES_SUFFIX}`);
			if (!newSourceFilesDetectionFileWatcher) {
				console.log(tr.SETTING_UP_NEW_SRC_FILE_DETECT);

				newSourceFilesDetectionFileWatcher = vscode.workspace.createFileSystemWatcher(newSourceFilesRelativePattern, false, true, true);

				newSourceFilesDetectionFileWatcher.onDidCreate(async (uri) => {

					const detailMessage = intellisenseType === "Native" ? "Would you like to update compile command/Intellisense files now?" : tr.QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE;

					if (!hasCreatedNewSourceFile && !isUnrealBuildingRebuildingTask && !isUpdatingCompileCommands) {
						hasCreatedNewSourceFile = true;
						await askAndRunUpdateCompileCommands([tr.BTTN_YES, tr.BTTN_NO], [tr.BTTN_YES], tr.WARN_NEW_SOURCE_FILE_DETECTED, detailMessage);
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


async function doesUriExist(uri: vscode.Uri | undefined): Promise<boolean> {
	if (!uri) {
		return false;
	}

	try {
		await vscode.workspace.fs.stat(uri);
	} catch (error) {
		return false;
	}

	return true;
}


async function onUnrealCompileCommandsCreatedOrChanged() {
	const projectWorkspace = getProjectWorkspaceFolder();
	if(!projectWorkspace){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	const isResponseFixEnabled = getUnrealClangdConfig(projectWorkspace).get(consts.settingNames.unrealClangd.settings['fixes.intellisenseFiles']);
	if (isResponseFixEnabled) {
		console.log(tr.RSP_FILE_QUOTE_FIX_IS_ENABLED_ATTEMPTING_FIX);
		
		//await vscode.commands.executeCommand(consts.EXT_CMD_FIX_INTELLISENSE_FILES, copyTarget); // TODO We never did anything with this copyTarget???
		await vscode.commands.executeCommand(consts.EXT_CMD_FIX_INTELLISENSE_FILES);
	}
	
	
	if (!newSourceFilesDetectionFileWatcher) {

		const compileCommandsUri = getCompileCommandsPath(projectWorkspace.uri, { withFileName: true });
		await setupNewSourceFileDetection(projectWorkspace, compileCommandsUri);
	}

	if (isWantingToCreate) {
		//isWantingToCreate = false;
		await vscode.commands.executeCommand(consts.EXT_CMD_CREATE_CLANGD_PROJECT);
	}

	if (await hasClangdProjectFiles(projectWorkspace)) {  // We don't reload window when no project because after creating project it'll ask to reload
		const reloadAfterCCUpdateResult = await vscode.window.showInformationMessage(tr.INTELLISENSE_FILES_HAVE_BEEN_UPDATED_MAY_NEED_TO_RELOAD, { detail: tr.QST_WLD_YOU_LIKE_TO_RELOAD, modal: true }, tr.BTTN_YES, tr.BTTN_SKIP);

		if (reloadAfterCCUpdateResult === tr.BTTN_YES) {
			await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);
		}
	}

}


async function hasClangdProjectFiles(workspace: vscode.WorkspaceFolder, globString: string = consts.GLOB_SIMPLE_CHECK_CLANGD_PROJECT_FILES) {

	const globPattern = new vscode.RelativePattern(workspace, globString);
	const clangdFiles = await vscode.workspace.findFiles(globPattern, undefined, 1);

	if (!clangdFiles || clangdFiles.length === 0) {
		return false;
	}

	return true;
}


async function isUnrealProject(): Promise<boolean> {

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		console.log(tr.NO_WRKSPC_FLDERS_FND_WILL_NOT_ACTIVATE_EXT);
		return false;
	}

	for (const folder of workspaceFolders) {
		if (folder.name === consts.UE5_WORKSPACE_NAME) { // skip UE5 folder
			continue;
		}
		const workspaceFileType = await vscode.workspace.fs.readDirectory(folder.uri);
		const hasFound = workspaceFileType.find(e => {
			return e[0].endsWith(consts.UPROJECT_FILE_EXTENSION_WITH_DOT);
		});

		if (hasFound) {
			return true;
		}
	}

	return false;
}


function getDefaultClangdExtYamlFiles(projectInfo: typ.ProjectInfoVars, defaultClangdCfgSettings: typ.ClangdCfgFileSettings, isTidyEnabled: boolean): typ.ExtensionYamlFiles {

	const pathMatch : string[] = [consts.CLANGD_PATHMATCH_COMPLETION_HELPER_PATH];  // Add completionHelper.cpp to .clangd file

	for (const firstChildSourceFolderUri of projectInfo.firstChildUrisWithSource) {
		const lastFolderName = firstChildSourceFolderUri.fsPath.match(/[\w\s\-.]+$/gm);  // TODO Check not escaping .

		if(lastFolderName && lastFolderName.length > 0){
			pathMatch.push(`${lastFolderName}/.*\\.${consts.UECPP_SOURCE_FILE_EXTENSIONS_REGEX}`);
		}
		
	}

	defaultClangdCfgSettings.If.PathMatch = pathMatch;

	const installFolders = [projectInfo.mainWorkspaceFolder.uri];

	const clangdCfgFile: typ.YamlFile = {
		docObjects: [defaultClangdCfgSettings],
		stringifyOptions: consts.CLANGD_STRINGIFY_OPTIONS,
		installFolders: installFolders,
		topComment: "",
		name: consts.FILE_NAME_CLANGD_CFG
	};

	const clangFormatFile: typ.YamlFile = {
		docObjects: [consts.defaultGeneralClangFormatFile],
		stringifyOptions: consts.CLANG_FORMAT_STRINGIFY_OPTIONS,
		installFolders: installFolders,
		topComment: null,
		name: consts.FILE_NAME_CLANG_FORMAT
	};

	const clangdExtFiles: typ.ExtensionYamlFiles = {
		clangd:[clangdCfgFile],
		format:[clangFormatFile]
	};

	if (isTidyEnabled) {
		const clangTidyFile: typ.YamlFile = {
			docObjects: [consts.defaultGeneralClangTidySettings],
			stringifyOptions: consts.CLANG_TIDY_STRINGIFY_OPTIONS,
			installFolders: installFolders,
			topComment: null,
			name: consts.FILE_NAME_CLANG_TIDY
		};

		clangdExtFiles.tidy = [clangTidyFile];
	}


	return clangdExtFiles;
}


async function getClangdExtFiles(clangdYamlFiles: typ.ExtensionYamlFiles): Promise<typ.ClangdExtensionFile[] | undefined> {
	
	let yamlFiles: typ.YamlFile[] = [];

	for (const [i, partOfYamlFiles] of Object.entries(clangdYamlFiles)) {
		yamlFiles = yamlFiles.concat(partOfYamlFiles);
	}

	const clangdExtFiles: typ.ClangdExtensionFile[] = [];

	for (const yamlFile of yamlFiles) {
		let file;

		const yamlDocs = [];

		let hasCommented = false;
		for (const doc of yamlFile.docObjects) {

			const yamlDoc = new yaml.Document(doc);
			if (!hasCommented) {
				yamlDoc.commentBefore = yamlFile.topComment;
			}
			hasCommented = true;

			if (yamlDoc.warnings.length !== 0 || yamlDoc.errors.length !== 0) {
				console.error(tr.WARNINGS_ERRORS_IN_YAMLDOC);
				return undefined;
			}

			yamlDocs.push(yamlDoc);
		}

		let yamlFileString = "";
		for (const doc of yamlDocs) {
			const yamlString = yaml.stringify(doc, yamlFile.stringifyOptions);
			yamlFileString += yamlString;
		}

		try {
			file = new TextEncoder().encode(yamlFileString);
		}
		catch (error) {
			console.error(tr.COULDNT_ENCODE_YAML_STRING);
			if(error instanceof Error){
				console.error(`${error.message}`);
			}
			return;
		}

		const extFile: typ.ClangdExtensionFile = {
			file: file,
			uris: yamlFile.installFolders,
			fileName: yamlFile.name
		};

		clangdExtFiles.push(extFile);
	}

	return clangdExtFiles;
}

function getShellQuoting(command: string, args: string[]): {command: vscode.ShellQuotedString | string, args: (vscode.ShellQuotedString | string)[]}{
	
	let modArgs: (string | vscode.ShellQuotedString)[] = [];
	if(process.platform === "win32"){
		for (const arg of args) {
			modArgs.push({value: arg, quoting: vscode.ShellQuoting.Strong});
		}
	}
	else {
		modArgs = args;
	}

	const modCommand = process.platform === "win32" ? { value: command, quoting: vscode.ShellQuoting.Strong } : { value: command, quoting: vscode.ShellQuoting.Weak };
	
	return {command: modCommand, args: modArgs};
}

async function runUpdateCompileCommandsWithTask(projectWorkspace: vscode.WorkspaceFolder, unrealWorkspace: vscode.WorkspaceFolder, ubtCommand: {command: string, args:string[]}) {
	
	if(intellisenseType !== "Native") {
		console.error("NonNative runUpdateCompileCommandsWithTask needs testing...");
		return;
	}

	const modUbtCommand = getShellQuoting(ubtCommand.command, ubtCommand.args);

	const source = consts.CONFIG_SECTION_UNREAL_CLANGD;

	const updateCCTask: vscode.Task = new vscode.Task({ type: consts.TASK_TYPE }, unrealWorkspace, consts.UPDATE_COMPILE_COMMANDS_DBGCFG_NAME, source, vscode.ShellExecution);
	
	updateCCTask.group = vscode.TaskGroup.Build;
	updateCCTask.problemMatchers = ["$msCompile"];
	
	const shellExec = process.platform === "win32"? consts.POWERSHELL_FILE_NAME : undefined;

	updateCCTask.execution = new vscode.ShellExecution(
		modUbtCommand.command,
		modUbtCommand.args,
		{cwd: unrealWorkspace.uri.fsPath, executable: shellExec} 
	);

	if (isUpdatingCompileCommands === false) {
		isUpdatingCompileCommands = true;
		try {
			console.log(`${tr.CREATING_CC_FILE_IN_path} ${unrealWorkspace.uri.fsPath}\n`);
			backupWorkspaceSettings();
			await vscode.tasks.executeTask(updateCCTask);
		} catch (error) {
			console.error(tr.ERR_WITH_EXEC_TASK);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}
			_codeWorkspaceSettingsBackup = undefined;
			isUpdatingCompileCommands = false;
			return;
		}
		console.log(tr.END_UPDATING_CC_FILE);
	}
	else {
		console.warning(tr.STILL_UPDATING_CC_TRY_AGAIN_LATER);
	}
}

async function runUpdateCompileCommandsWithDebug(
	projectWorkspace: vscode.WorkspaceFolder,
	unrealWorkspace: vscode.WorkspaceFolder,
	ubtCommand: {command: string, args: string[]}) {
	
	if(intellisenseType !== "Native") {
		console.error("NonNative runUpdateCompileCommandsWithTask needs testing...");
		return;
	}

	const newCommand = `${ubtCommand.command}`;
	const newArgs: string[] = [];
	ubtCommand.args.forEach((value: string, index: number, array: string[]) => {
		newArgs.push(`${value}`);
	});

	const dbgConfig: vscode.DebugConfiguration | null = await getUpdateCompileCommandsDbgCfg(
		unrealWorkspace.uri,
		newCommand,
		newArgs
	);

	if (!dbgConfig) {
		console.error(tr.DBGCFG_IS_NULL);
		return;
	}

	if (isUpdatingCompileCommands === false) {
		isUpdatingCompileCommands = true;
		try {
			console.log(`${tr.CREATING_CC_FILE_IN_path} ${unrealWorkspace.uri.fsPath}\n`);
			backupWorkspaceSettings();
			await vscode.debug.startDebugging(unrealWorkspace, dbgConfig);
		} catch (error) {
			console.error(tr.EXCEPT_WHEN_UPDATING_CC);
			if (error instanceof Error) {
				console.error(`${error.message}`);
			}

			_codeWorkspaceSettingsBackup = undefined;
			isUpdatingCompileCommands = false;
			return;
		}

		console.log(tr.END_UPDATING_CC_FILE);
	}
	else {
		console.warning(tr.STILL_UPDATING_CC_TRY_AGAIN_LATER);
	}
}


async function getAllUrisToDelete(workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<typ.ProjectFiles | undefined> {
	if(!workspaceFolder){
		console.log(tr.NO_WRK_SPACE_FOLDER_FOUND);
		return;
	}

	const clangdCfgFilesRelP = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_CLANGD_CFG_FILES);
	const projectFilesGCDRelP = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_GCD_AND_GCD_OLD_FILES);

	const ccDirFiles = await getDeletableFilesFromCompileCommandsDirectory(workspaceFolder);
	
	const clangdCfgFiles = await vscode.workspace.findFiles(clangdCfgFilesRelP);
	const intellisenseFiles = await vscode.workspace.findFiles(projectFilesGCDRelP);

	

	return {
		clangdCfgFiles: clangdCfgFiles,
		intellisenseFiles: intellisenseFiles,
		compileCommandsDirFiles: ccDirFiles
	};
}


async function askDeleteSettings(extensionName: string, settingNames: Record<string, string>) {
	let settingNamesString = "";
	for (const name in settingNames) {
		if (Object.prototype.hasOwnProperty.call(settingNames, name)) {
			settingNamesString += `${settingNames[name]}\n`;
		}
	}

	return await vscode.window.showInformationMessage(
		`${tr.left_SETTINGS_WILL_BE_DELETED_ext_name}${extensionName} ${tr.right_ext_name_SETTINGS_WILL_BE_DELETED}`,
		{
			detail: settingNamesString,
			modal: true
		},
		tr.BTTN_ALL, tr.BTTN_PROJECT, tr.BTTN_SKIP
	);
}


async function processDeleteSettingsResult(projectWorkspaceFolder: vscode.WorkspaceFolder, settings: typ.ValuesOfAllSettingNames, isDeleteAll: boolean) {
	const config = vscode.workspace.getConfiguration(settings.extensionSection, projectWorkspaceFolder);

	const settingNames: typ.CfgSettings<string, undefined> = settings.settings;
	for (const nameKey in settingNames) {
		if (Object.prototype.hasOwnProperty.call(settingNames, nameKey)) {
			
			try {
				await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.Workspace);
			} catch (error) { // We don't do anything
			}
			
			try {
				await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.WorkspaceFolder);
			} catch (error) {  // We don't do anything
			}
			

			if (isDeleteAll) {
				try {
					await config.update(settingNames[nameKey], undefined, vscode.ConfigurationTarget.Global);
				} catch (error) { // We don't do anything
				}
				
			}
		}
	}
}


function getCompileCommandsPath(baseUri: vscode.Uri, options: {withFileName: boolean}) {
	const fileName = options.withFileName? consts.FILE_NAME_COMPILE_COMMANDS : "";
	return vscode.Uri.joinPath(baseUri, consts.FOLDER_NAME_VSCODE, consts.FOLDER_NAME_UNREAL_CLANGD, fileName);
}

function getCompletionHelperPath(baseUri: vscode.Uri, options: {withFileName: boolean}) {
	const fileName = options.withFileName? consts.FILE_NAME_COMPLETION_HELPER : "";
	const ccUri = getCompileCommandsPath(baseUri, {withFileName: false});
	return vscode.Uri.joinPath(ccUri, fileName);
}


async function handleCompletionHelper() {

	const projectWorkspace = getProjectWorkspaceFolder();
	if(!projectWorkspace){
		return;
	}

	const compileCommandsUri = getCompileCommandsPath(projectWorkspace.uri, {withFileName:true});
	
	const completionHelperPathUri = getCompletionHelperPath(projectWorkspace.uri,{withFileName: true} );
	const fileContent = getCompletionHelperFileContent(projectWorkspace);

	if(!fileContent){
		return;
	}
	
	await createCompletionHelper(completionHelperPathUri, fileContent);

	const ccFile = await getNonEmptyCompileCommandFile(compileCommandsUri);

	if(!ccFile){
		console.error(tr.COULDNT_GET_CC_FILE);
		return;
	}
	
	const mainSourceFolderPathLower = (await ueHelpers.getMainSourceFolderUri())?.fsPath.toLowerCase();
	if(!mainSourceFolderPathLower){
		console.error(tr.COULDNT_GET_PROJ_SRC_PATH);
		return;
	}

	const ccFileString = await getFileString(compileCommandsUri);
	if(!ccFileString){
		return;
	}

	const responsePaths = await getUniqueResponseFilePathsFromCompileCommands(ccFileString);
	if(!responsePaths){
		return;
	}
	
	let responsePathMostEntries;
	
	responsePathMostEntries = Object.keys(responsePaths).reduce((previous, current, i, pathsArray) => {	
		return responsePaths[current] > responsePaths[previous] ? current : previous; 
	});

	if(!responsePathMostEntries){
		return;
	}
		
	const winResponsePathMostEntries = responsePathMostEntries.replaceAll(`\\\\`, `\\`);
	const sourceFolderCC = ccFile.find((value: typ.CompileCommand, index: number, obj: typ.CompileCommand[]) => {
		let hasResponsePathMostEntries = value.command?.includes(responsePathMostEntries) || value.arguments?.some((v) => {
			return v.includes(responsePathMostEntries);
		});

		if(!hasResponsePathMostEntries && process.platform === "win32"){
			hasResponsePathMostEntries = value.command?.includes(winResponsePathMostEntries) || value.arguments?.some((v) => {
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

	await writeCcFile(compileCommandsUri, ccFile);

	return;
}

/**
 * This doesn't overwrite file
 * @param filePathUri file path to write to
 */
async function createCompletionHelper(filePathUri: vscode.Uri, content: string) {

	const doesPathExist = await doesUriExist(filePathUri);
	
	if(doesPathExist){
		console.log(tr.COMPLETION_HELPER_EXISTS_WONT_OVERWRITE);
		return false; // already a file but not an error (we don't overwrite)
	}

	const contentArray = new TextEncoder().encode(content);
	try {
		await vscode.workspace.fs.writeFile(filePathUri, contentArray);
	} catch (error) {
		console.error(`${tr.CLDNT_WRITE_COMPLETION_HELPER_FILE} ${filePathUri}`);
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		return false;
	}
	
	return true;
}


function getCompletionHelperFileContent(workspace: vscode.WorkspaceFolder) {
	const unrealClangdConfig = getUnrealClangdConfig(workspace);

	const isCompletionHelper = unrealClangdConfig.get(consts.settingNames.unrealClangd.settings['creation.completionHelper']);
	const isCompletionHelperMP = unrealClangdConfig.get(consts.settingNames.unrealClangd.settings['creation.completionHelperMP']);

	if(isCompletionHelper === undefined){
		console.error(tr.CLDNT_GET_COMPLETION_HELPER_SETTING);
		return "";
	}

	if(!isCompletionHelper){
		console.log(tr.COMPLETION_HELPER_WILL_NOT_BE_CREATED_SETTING_IS_FALSE);
		return "";
	}

	if(isCompletionHelperMP === undefined){
		console.error(tr.CLDNT_GET_COMPLETION_HELPER_MP_SETTING);  // error but we dont return
	}

	let content = consts.completionHelperCppContent;

	if(isCompletionHelperMP){
		content += consts.completionHelperCppMPcontent;
	}

	return content;
}

async function getNonEmptyCompileCommandFile(uri: vscode.Uri): Promise<typ.CompileCommandFile | undefined> {
	let ccFile: typ.CompileCommandFile;
	try {
		ccFile = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri)));
	} catch (error) {
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		console.error(tr.CLDNT_DECODE_CC_FOR_CREATION_HELPER);
		return;
	}

	if(!Array.isArray(ccFile)){
		console.error(tr.CC_ISNT_ARRAY);
		return;
	}

	if(ccFile.length < 1){
		console.error(tr.CC_IS_EMPTY);
		return;
	}

	return ccFile;
}

function getCompletionHelperCC(compileCommand: typ.CompileCommand, completionHelperUri: vscode.Uri): typ.CompileCommand{
	
	return  {
		command: compileCommand.command,
		directory: compileCommand.directory,
		file: completionHelperUri.fsPath,
		arguments: compileCommand.arguments
	};
}

async function writeCcFile(compileCommandsUri: vscode.Uri, modifiedCcContent: typ.CompileCommandFile) {
	
	try {
		await vscode.workspace.fs.writeFile(compileCommandsUri, new TextEncoder().encode(JSON.stringify(modifiedCcContent, undefined, 4)));
	} catch (error) {
		console.error(tr.CLDNT_WRITE_CC_FILE);
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		return;
	}
}


async function handleCompletionHelperOpening(projectWorkspace: vscode.WorkspaceFolder | undefined) {
	if(!projectWorkspace){
		console.error(tr.COULDNT_GET_PROJECT_WORKSPACE);
		return;
	}

	if(!await hasClangdProjectFiles(projectWorkspace)){
		return;
	}

	const unrealClangdConfig = getUnrealClangdConfig(projectWorkspace);

	const isCompletionHelperOpen = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['completion.openCompletionHelperOnStartup']);
	const isInfoCompletionHelper = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['completion.completionHelperInfoOnStartup']);

	if(!isCompletionHelperOpen){
		console.warning(tr.COMPLETION_HELPER_WONT_BE_OPENED);
		return;
	}

	const completionHelperPathUri = getCompletionHelperPath(projectWorkspace.uri, {withFileName:true});

	const completionHelperDoc = await openTextDocument(completionHelperPathUri, tr.WARN_CODE_COMPLETION_MAY_NOT_BE_ERR);

	if(!completionHelperDoc){
		return;
	}

	await vscode.window.showTextDocument(completionHelperDoc, undefined, false);

	if(!isInfoCompletionHelper){
		return;
	}

	await vscode.window.showInformationMessage(tr.INFO_COMPLETION_HELPER, {modal:true, detail: tr.WARN_DONT_SWITCH_COMPLETION_HELPER}, tr.BTTN_OK);
}

function getUnrealClangdConfig(workspaceFolder: vscode.WorkspaceFolder){
	return vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, workspaceFolder);
}

async function openTextDocument(uri: vscode.Uri, errorMsg: string){
	let textDoc = undefined;

	try {
		textDoc = await vscode.workspace.openTextDocument(uri);
	} catch (error) {
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		console.error(errorMsg);
		return undefined;
	}

	return textDoc;
}


async function handleExtensionConflict(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
	
	const unrealClangdConfig = getUnrealClangdConfig(workspaceFolder);
	const clangdConfig = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_CLANGD, workspaceFolder);
	const cCppConfig = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_CPP, workspaceFolder);
	const cCppSettingNames = consts.settingNames.cCpp.settings;

	const hasClangdSetting = clangdConfig.get(consts.settingNames.clangd.settings.detectExtensionConflicts) === false;
	const hasCCppSettings = 
		cCppConfig.get(cCppSettingNames.autocomplete) === consts.SETTING_DISABLED &&
		cCppConfig.get(cCppSettingNames.errorSquiggles) === consts.SETTING_DISABLED &&
		cCppConfig.get(cCppSettingNames.formatting) === consts.SETTING_DISABLED &&
		cCppConfig.get(cCppSettingNames.intelliSenseEngine) === consts.SETTING_DISABLED;

	const isCppExtEnabled = cCppConfig.has(cCppSettingNames.autocomplete);  // workaround to see if extension is disabled

	if((hasClangdSetting && hasCCppSettings) || !isCppExtEnabled){
		if(!isCppExtEnabled){
			console.warning("Microsoft Cpp extension is disabled!");
		}
		return true;
	}

	const results = await vscode.window.showInformationMessage(
		tr.INFO_SET_CONFLICT_SETTINGS,
		{modal:true, detail: tr.WARN_CONFLICT_SETTINGS_RELOAD},
		tr.BTTN_OK);

	if(results !== tr.BTTN_OK){
		console.log(tr.USER_CANCELLED_PROJECT_CREATE);
		return false;
	}

	await unrealClangdConfig.update(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup'], true, vscode.ConfigurationTarget.WorkspaceFolder);
	await clangdConfig.update(consts.settingNames.clangd.settings.detectExtensionConflicts, false, vscode.ConfigurationTarget.Workspace);
	
	try {	// Will fail if cpp ext is disabled. our workaround above should catch this but check anyway
		await cCppConfig.update(cCppSettingNames.autocomplete, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
		await cCppConfig.update(cCppSettingNames.errorSquiggles, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
		await cCppConfig.update(cCppSettingNames.formatting, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
		await cCppConfig.update(cCppSettingNames.intelliSenseEngine, consts.SETTING_DISABLED, vscode.ConfigurationTarget.WorkspaceFolder);
	} catch (error) {
		if(error instanceof Error){
			console.warning(error.message);
			console.warning("This warning above isn't an error if you have the MS C++ extension disabled.");
		}
	}
	

	await vscode.commands.executeCommand(consts.VSCODE_CMD_RELOAD_WINDOW);

	return false;
}


async function handleCreateProjectIfSet(mainWorkspaceFolder: vscode.WorkspaceFolder) {
	
	const unrealClangdConfig = getUnrealClangdConfig(mainWorkspaceFolder);
	const isCreateProject = unrealClangdConfig.get<boolean>(consts.settingNames.unrealClangd.settings['utility.createProjectOnStartup']);

	if(isCreateProject === true){
		await vscode.commands.executeCommand(consts.EXT_CMD_CREATE_CLANGD_PROJECT);
	}
}


async function getDeletableFilesFromCompileCommandsDirectory(workspaceFolder: vscode.WorkspaceFolder) {
	const ccPathUri = getCompileCommandsPath(workspaceFolder.uri, {withFileName: false});

	const doesCCDirExist = await doesUriExist(ccPathUri);
	if(!doesCCDirExist){
		return [];
	}
	
	const relPat = new vscode.RelativePattern(workspaceFolder, consts.GLOB_ALL_COMPILE_COMMANDS_DIR_FILES);

	return await vscode.workspace.findFiles(relPat);
}

function getDeleteFilesWindowDetailString(workspace: vscode.WorkspaceFolder, ueClangdProjectFiles: typ.ProjectFiles) {
	let ccPath = "";

	if (ueClangdProjectFiles.compileCommandsDirFiles.length > 0) {
		const compileCommandsUri = getCompileCommandsPath(workspace.uri, { withFileName: false });
		ccPath = `${ueClangdProjectFiles.compileCommandsDirFiles.length} ${compileCommandsUri.fsPath}\n${tr.SEE_LOGS}`;

		if (ueClangdProjectFiles.clangdCfgFiles.length > 0 || ueClangdProjectFiles.intellisenseFiles.length > 0) {
			ccPath += "\nand\n";
		}
	}

	let detailString = `${ccPath}`;

	for (const uri of ueClangdProjectFiles.clangdCfgFiles) {
		detailString += `${uri.fsPath}\n`;
	}

	if (ueClangdProjectFiles.intellisenseFiles.length > 0) {
		detailString += `\nAnd ${ueClangdProjectFiles.intellisenseFiles.length} intellisense files(see logs)`;
	}

	if(ueClangdProjectFiles.compileCommandsDirFiles.length > 0 || ueClangdProjectFiles.intellisenseFiles.length > 0){
		const filesToShow = ueClangdProjectFiles.intellisenseFiles.concat(ueClangdProjectFiles.compileCommandsDirFiles);
		console.outputChannel.show(true);
		for (const file of filesToShow) {
			console.log(`${file.fsPath}`);
		}
	}
	
	return detailString;
}

async function uninstallSettings(projectWorkspaceFolder: vscode.WorkspaceFolder){
	for (const nameKey in consts.settingNames) {
		if (Object.prototype.hasOwnProperty.call(consts.settingNames, nameKey)) {
			const settings = consts.settingNames[nameKey as typ.KeysOfAllSettingExtensionNames];
			
			// Check if we can skip
			let hasSettingsSet = false;
			const config = vscode.workspace.getConfiguration(settings.extensionSection, projectWorkspaceFolder);
			const names: typ.CfgSettings<string, undefined> = settings.settings; 
			for (const key in names) {
				if (Object.prototype.hasOwnProperty.call(names, key)) {

					const settingName = names[key];
					
					const settingInspection = config.inspect(settingName);
					if(settingInspection?.globalValue !== undefined || settingInspection?.workspaceFolderValue !== undefined || settingInspection?.workspaceValue !== undefined){
						hasSettingsSet = true;
					}
				}
			}

			if(!hasSettingsSet){
				console.log(`${tr.left_NO_SETTING_FOR}${nameKey}${tr.right_NO_SETTING_FOR}`);
				continue;
			}

			const deleteSettingsResult = await askDeleteSettings(nameKey, names);
			if (deleteSettingsResult === tr.BTTN_ALL || deleteSettingsResult === tr.BTTN_PROJECT) {
				await processDeleteSettingsResult(projectWorkspaceFolder, settings, deleteSettingsResult === tr.BTTN_ALL);
			}
			else if(deleteSettingsResult === undefined){
				console.log(`${tr.USER_CANCELLED_RUN}`);
				return false;
			}
		}
	}

	return true;
}


function getHeadersAppendString(uri: vscode.Uri, foundHeaders: vscode.Uri[]): string {
	let appendString = `\n// Added headers from ${uri.fsPath}\n`;

	for (const headerUri of foundHeaders) {
		appendString += `#include "${headerUri.fsPath}"\n`;
	}

	return appendString;
}


async function appendToFile(uri: vscode.Uri, text: string) {
	let file : Uint8Array;

	try {
		file = await vscode.workspace.fs.readFile(uri);
	} catch (error) {
		console.error(`${tr.ERR_READING_FILE_path} ${uri.fsPath}`);
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		return;
	}

	let newFileString = new TextDecoder().decode(file);
	newFileString += text;

	const newFile = new TextEncoder().encode(newFileString);
	
	try {
		await vscode.workspace.fs.writeFile(uri, newFile);
	} catch (error) {
		console.error(`${tr.ERR_WRITING_FILE_path} ${uri.fsPath}`);
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		return;
	}

}


async function checkValidUri(uri: vscode.Uri){
	try {
		await vscode.workspace.fs.stat(uri);
	} catch (error) {
		return undefined;
	}

	return uri;
}


async function permDeleteUri(uri: vscode.Uri){
	try {
		await vscode.workspace.fs.stat(uri);
	} catch (error) {
		console.log(`${tr.NO_NEED_TO_DEL_URI_DOESNT_EXIST_path} ${uri.fsPath}`);
		return true;  // Uri not valid so no need to delete
	}

	try {
		await vscode.workspace.fs.delete(uri, {useTrash:false});
	} catch (error) {
		if(error instanceof Error){
			console.error(`${error.message}`);
		}
		return false;
	}

	console.log(`${tr.SUCCESS_DEL_path} ${uri.fsPath}`);
	return true;
}


function getUnrealCompileCommandsUriForProject(uri: vscode.Uri){
	return vscode.Uri.joinPath(uri, consts.FILE_NAME_COMPILE_COMMANDS);
}

async function copyNewlyCreatedCompileCommandToCCFolder() {
	const unrealWorkspaceUri = ueHelpers.getUnrealWorkspaceFolder()?.uri;
	const mainWorkspaceUri = getProjectWorkspaceFolder()?.uri;

	if (!unrealWorkspaceUri || !mainWorkspaceUri) {
		console.error(tr.CLDNT_GET_URIS_FOR_CPY_CC);
		return;
	}

	let ccUriToCopy: vscode.Uri | undefined = undefined;

	if(intellisenseType === "Native"){
		ccUriToCopy = vscode.Uri.joinPath(mainWorkspaceUri, consts.FOLDER_NAME_VSCODE, consts.NATIVE_COMPILE_COMMANDS_NAME);
	}
	else {
		ccUriToCopy = getUnrealCompileCommandsUriForProject(unrealWorkspaceUri);
	}
	
	const projectCCUri = getCompileCommandsPath(mainWorkspaceUri, { withFileName: true });

	if (await doesUriExist(ccUriToCopy)) {
		if(!(await copyCompileCommands(ccUriToCopy, projectCCUri))){
			console.error(tr.ERR_COPYING_CC);
			return;}
	}
	else{
		console.error(tr.UE_CC_DOESNT_EXISTS_CANT_CONTINUE_UDPATE_CC);
	}

}
async function setupAndRunOnUnrealCompileCommandsCreatedOrChanged() {
	
	//await onUnrealCompileCommandsCreatedOrChanged(ccUriToCopy, projectCCUri);
	
}


function getUnrealVersionBypass(workspace: vscode.WorkspaceFolder){
	return vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, workspace).
		get<boolean>(consts.settingNames.unrealClangd.settings['creation.bypassUnrealVersionCheck']);
}


async function handleUnrealVersionCheck(unrealVersion: ueHelpers.UnrealVersion | undefined, isUnrealVersionBypass: boolean | undefined) {

	if (!unrealVersion) {
		console.error(tr.COULDNT_GET_UE_VERSION);
		console.error(tr.WARN_CREATION_WILL_CONTINUE);
	}
	else if (!isUnrealVersionBypass) {

		switch (isValidUnrealVersion(unrealVersion)) {
			case typ.ValidateUnrealResults.passed:

				break;
			case typ.ValidateUnrealResults.passWithWarning:
				if (!await isOkWithWarning(tr.WARN_OUT_OF_DATE_EXTENSION, tr.QST_DO_YOU_WISH_TO_CONTINUE)) {
					console.log(tr.USER_CANCELLED_RUN);
					return false;
				}
				break;
			case typ.ValidateUnrealResults.failed:
			default:
				console.error(tr.EXT_WASNT_BUILT_FOR_YOUR_UE_VERSION);
				return false;
				break;
		}

	}
	else if (isUnrealVersionBypass) {
		console.warning(tr.UE_VERSION_CHECK_BYPASSED);
		console.warning(tr.WARN_CREATION_WILL_CONTINUE);
	}

	return true;
}


async function findMultipleFiles(workspace: vscode.WorkspaceFolder, fileGlobs: typ.GlobPatterns) {

	let uriResults: vscode.Uri[] = [];
	for (const glob in fileGlobs) {
		if (Object.prototype.hasOwnProperty.call(fileGlobs, glob)) {
			const maxResults = fileGlobs[glob].MaxResults;
			
			const relPat = new RelativePattern(workspace, glob);
			const results = await vscode.workspace.findFiles( relPat, undefined, maxResults);

			if(results && results.length > 0){
				uriResults = uriResults.concat(results);
			}
		}
	}
	
	return uriResults;
}


async function isFile(uri: vscode.Uri) {
	let uriStat;
	try {
		uriStat = await vscode.workspace.fs.stat(uri);
	} catch (error) {
		return false;
	}

	if(uriStat.type === vscode.FileType.File){
		return true;
	}

	false;
}


async function onEndUpdateCompileCommands() {
	await restoreWorkspaceSettings();

	await delay(2000);

	//customCancellationToken?.cancel();
	await copyNewlyCreatedCompileCommandToCCFolder();

	await handleCompletionHelper();

	if(intellisenseType === "Native"){
		await modifyResponseFiles();
	}
	

	await onUnrealCompileCommandsCreatedOrChanged();
				
	isUpdatingCompileCommands = false;

}


async function changeFileNames(uris: vscode.Uri[], newName: (fileNameNoExt?: string, dotExtension?: string) => string): Promise<vscode.Uri[]> {
	const newUris: vscode.Uri[] = [];

	for (const uri of uris) {
		if(!(await isFile(uri))) {
			console.error(`Non-file uri sent to changeFileNames! ${uri.fsPath}`);
			continue;
		}

		const parsedPath = path.parse(uri.fsPath);
		const newNameUri = vscode.Uri.joinPath(vscode.Uri.file(parsedPath.dir), newName(parsedPath.name, parsedPath.ext));

		try {
			await vscode.workspace.fs.rename(uri, newNameUri, { overwrite: true });
		} catch (error) {
			console.error(`Couldn't rename file: ${uri.fsPath}\n${newNameUri.fsPath}`);
			continue;
		}

		newUris.push(newNameUri);

	}

	return newUris;

}


async function removeExtensionFromUris(uris: vscode.Uri[], extension: string) {
	for (const uri of uris) {
		const parsedPath = path.parse(uri.fsPath);
		
		if(parsedPath.ext !== extension){
			continue;
		}

		const restoredUri = vscode.Uri.joinPath(vscode.Uri.file(parsedPath.dir), parsedPath.name);
		try {
			await vscode.workspace.fs.rename(uri, restoredUri, {overwrite:true});
		} catch (error) {
			console.error(`Couldn't retore backup file: ${uri.fsPath}\n${restoredUri.fsPath}`);
			continue;
		}
		
	}
}


async function onStartTaskUpdateCompileCommands() {
	/*await vscode.window.withProgress({
		title: 'Updating Compile Commands...',
		location: vscode.ProgressLocation.Notification,
		cancellable: false
	},
		async (progress, token) => {
			// eslint-disable-next-line no-async-promise-executor
			return new Promise((async (resolve) => {  // TODO: check if using async here is ok
				// You code to process the progress

				customCancellationToken = new vscode.CancellationTokenSource();

				customCancellationToken.token.onCancellationRequested(() => {
					customCancellationToken?.dispose();
					customCancellationToken = null;

					resolve(null);
					return;
				});

				const seconds = 300;
				for (let i = 0; i < seconds; i++) {
					await delay(1000);
				}

				resolve(null);
			}));
		});
*/
}


async function setCompilerSetting(mainWorkspace: vscode.WorkspaceFolder, forcedCompiler: vscode.Uri) {
	const unrealClangdCfg = vscode.workspace.getConfiguration(consts.CONFIG_SECTION_UNREAL_CLANGD, mainWorkspace);
	await unrealClangdCfg.update(consts.settingNames.unrealClangd.settings["creation.compilerPath"], forcedCompiler.fsPath);
}


function backupWorkspaceSettings() {
	
	if(_codeWorkspaceSettingsBackup !== undefined){
		console.error("Backup settings have already been set!");
		return;
	}
	
	const workspace = getProjectWorkspaceFolder();	
	const globalConfig = vscode.workspace.getConfiguration(undefined, workspace);
	

	let settings: string[] = globalConfig.get<string[]>("unreal-clangd.native.code-workspaceFileBackupSettings", []);

	settings = settings.concat(consts.NATIVE_CODE_WORKSPACE_BACKUP_SETTINGS);

	_codeWorkspaceSettingsBackup = {};
	for (const setting of settings) {

		let value: unknown = undefined;
		try {
			value = globalConfig.inspect(setting)?.workspaceValue;
		} catch (error) {
			console.warning(`Error trying to backup setting: ${setting} (might not be a bug)`);
			continue;
		}
		
		if(value === undefined){
			console.warning(`Error trying to backup setting: ${setting} (might not be a bug)`);
			continue;
		}

		_codeWorkspaceSettingsBackup[setting] = value;
	}

}


async function restoreWorkspaceSettings() {
	if(_codeWorkspaceSettingsBackup === undefined){
		console.error("Trying to restore workspace settings but there are none!");
		return;
	}

	const workspace = getProjectWorkspaceFolder();	
	const globalConfig = vscode.workspace.getConfiguration(undefined, workspace);

	for (const key in _codeWorkspaceSettingsBackup) {
		if (!Object.prototype.hasOwnProperty.call(_codeWorkspaceSettingsBackup, key)) {
			continue;
		}

		const value = _codeWorkspaceSettingsBackup[key];

		try {
			await globalConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
		} 
		catch (error) {
			console.warning(`Error trying to backup workspace setting: ${key} (might not be a bug)`);
			continue;
		}
		
	}

}


async function removePchHeadersFromResponseFiles(rspFiles: typ.File[]){
	console.log("Removing PCH header files from Intellisense...");
		
	for (const rspFile of rspFiles) {
		const fileString = rspFile.fileString;
		if(!fileString){
			continue;
		}

		const reSharedPCH = new RegExp("^(?:(\/FI|-include).*SharedPCH.*(\r\n|\n))", "m");
		const newFileString = fileString.replace(reSharedPCH, "");

		if(fileString === newFileString){
			console.warning(`Didn't replace PCH header file in rsp file: ${rspFile.uri.fsPath}`);
			continue;
		}

		rspFile.fileString = newFileString;
		console.log(`Removed pch header from intellisense file: ${rspFile.uri.fsPath}`);
	}
	
	return;
}


async function convertFilePathsToUris(paths: Iterable<string>) {
	let rspUris: vscode.Uri[] = [];  
	for (const _path of paths) {
		const uri = vscode.Uri.file(_path);

		if((await isFile(uri))){
			rspUris.push(uri);
		}
	}

	return rspUris;
}

async function getUniqueResponseFilePathsFromCompileCommands(ccFileString: string): Promise<Record<string, number> | undefined> {
		
	const reResponseFlag = new RegExp(consts.REGEX_RESPONSE_COMPILER_FLAG, "gm");
	const rspPathStrings = ccFileString.matchAll(reResponseFlag);

	const rspPaths: Record<string, number> = {};
	for (const pathString of rspPathStrings) {


		if (pathString[0] in rspPaths) {
			rspPaths[pathString[0]] += 1;
		}
		else {
			rspPaths[pathString[0]] = 1;
		}

	}

	return rspPaths;  // Check modified function
}


async function addMissingSharedResponseFlagsToResponse(intellisenseRspFiles: typ.File[]) {
	console.log("addMissingSharedResponseFlagsToResponse...");

	const projectUri = getProjectWorkspaceFolder()?.uri;
	if(!projectUri){
		return;
	}
	const compileCommands = await getCompileCommandObjectsFromJson(getCompileCommandsPath(projectUri,{withFileName:true}));
	if(!compileCommands){
		return;
	}

	const moduleFolderNameAndUris = await getFolderNameAndUris(vscode.Uri.joinPath(projectUri, "Source"));
	
	const moduleNameAndResponse: {moduleName: string, path: string}[] = [];

	for (const compileCommand of compileCommands) {
		const found = moduleFolderNameAndUris.find((value: { name: string; uri: vscode.Uri; }, index: number, obj: { name: string; uri: vscode.Uri; }[]) => {
			const modulePath = value.uri.fsPath;
			const ccModulePath = compileCommand.file.slice(undefined, modulePath.length);  // TODO length can be problem?
						return path.relative(modulePath, ccModulePath) === "";  // arePathsEqual
		});

		if(!found){
			continue;
		}

		const responsePath = getResponsePathFromCompileCommand(compileCommand);
		if(!responsePath){
			continue;
		}

		const alreadyHasModuleName = moduleNameAndResponse.some((value: { moduleName: string; path: string; }, index: number, array: { moduleName: string; path: string; }[]) => {
			return value.moduleName === found.name;
		});

		if(alreadyHasModuleName){
			continue;
		}

		moduleNameAndResponse.push({moduleName:found.name, path:responsePath});
		
	}

	
	for (const modAndRsp of moduleNameAndResponse) {
		const relPat = new vscode.RelativePattern(projectUri, `Intermediate/Build/**/UnrealEditor/**/Development/**/${modAndRsp.moduleName}/*.Shared.rsp`);
		const sharedUri = await vscode.workspace.findFiles(relPat, undefined, 1);

		if(!sharedUri || sharedUri.length === 0){
			console.error(`Couldn't find Shared rsp for module: ${modAndRsp.moduleName}`);
			continue;
		}

		for (const rspFile of intellisenseRspFiles) {
			if(path.relative(rspFile.uri.fsPath, modAndRsp.path) !== ""){
				continue;
			}

			const sharedFileStr = await getFileString(sharedUri[0]);
			if(!sharedFileStr || !rspFile.fileString){
				console.error(`Couldn't get file string!\n${sharedUri[0]}\n${rspFile.fileString}`);
				break;
			}

			const missingPaths = await findMissingResponseFlags(rspFile.fileString, sharedFileStr);
			if(!missingPaths || missingPaths.length < 1){
				break;
			}
			
			const missingIncludes = createIncludeFlagsFromPaths(missingPaths);

			const newLine = rspFile.fileString.endsWith(`\n`) ? "" : EOL;
			rspFile.fileString += `${newLine}${missingIncludes}`;

			break;
		}
	}

}

async function getFolderNameAndUris(folder: vscode.Uri) {
	let directory: [string, vscode.FileType][];
	try {
		directory = await vscode.workspace.fs.readDirectory(folder);
	} catch (error) {
		console.error(`Couldn't read directory! ${folder.fsPath}`);
		return [];
	}

	let nameAndUris: {name: string, uri: vscode.Uri}[] = [];
	for (const [name, fileType] of directory) {
		if(fileType === vscode.FileType.Directory){
			nameAndUris.push({name:name, uri:vscode.Uri.joinPath(folder, name)});
		}
	}

	return nameAndUris;
}

function getResponsePathFromCompileCommand(compileCommand: typ.CompileCommand, regexStr=consts.REGEX_RESPONSE_COMPILER_FLAG){
	
	if(compileCommand.command){
		return compileCommand.command.match(regexStr)?.[0];
	}
	else if(compileCommand.arguments){
		for (const arg of compileCommand.arguments) {
			const path = arg.match(regexStr)?.[0];
			if(path){
				return path;
			}
		}
	}

	return undefined;
}

async function modifyResponseFiles() {

	const projectUri = getProjectWorkspaceFolder()?.uri;
	if(!projectUri){
		return;
	}

	const ccFileString = await getFileString(getCompileCommandsPath(projectUri, {withFileName:true}));
	if(!ccFileString){
		return;
	}

	const rspPaths = await getUniqueResponseFilePathsFromCompileCommands(ccFileString);
	if(!rspPaths){
		return;
	}
	let responseFiles: typ.File[] = [];
	for (const rspPath of Object.keys(rspPaths)) {
		
		let rspUri;
		let rspFileString;
		try {
			rspUri = vscode.Uri.file(rspPath);
			rspFileString = await getFileString(rspUri);
		} catch (error) {
			console.error(`Couldn't get response file object: ${rspPath}`);
			continue;
		}

		if(!rspFileString){
			console.error(`Couldn't get response file string: ${rspPath}`);
			continue;
		}
		responseFiles.push({uri: rspUri, fileString: rspFileString});
	}

	await removePchHeadersFromResponseFiles(responseFiles);
	await addMissingSharedResponseFlagsToResponse(responseFiles);
	

	await saveFiles(responseFiles);


	return;
}

async function saveFiles(files: typ.File[]) {

	for (const file of files) {
		const encFile = new TextEncoder().encode(file.fileString);
		if(!encFile){
			console.error(`Encoded file was empty. Will not save. ${file.uri.fsPath}`); // TODO what if someone wants to overwrite file as empty?
			continue;
		}

		try {
			await vscode.workspace.fs.writeFile(file.uri, encFile);
		} catch (error) {
			console.error(`Couldn't write file! ${file.uri.fsPath}`);
			if(error instanceof Error){
				console.error(error.message);
			}
			continue;
		}
	}
	
}


async function findMissingResponseFlags(rspFileStr: string, sharedFileStr: string) {
	
	// Only include dirs for now
	const reInclude = new RegExp(`(?<=[/-]I\\s?").*(?="\s?)`, "gm");
	const rspIncludes = rspFileStr.matchAll(reInclude);
	const test = rspFileStr.match(reInclude);
	const sharedIncludes = sharedFileStr.matchAll(reInclude);

	const ueUri = ueHelpers.getUnrealUri();
	if(!ueUri){
		return;
	}

	const ueWorkingUri = vscode.Uri.joinPath(ueUri, "Engine", "Source");
	// Rsp incude should only be absolute paths. Shared can be either.
	
	let sharedCount = 0;
	const missingIncludePaths: string[] = [];
	for (const sharedInclude of sharedIncludes) {
		sharedCount += 1;

		const sharedIncludePath = sharedInclude[0];
		let sharedAbsPath = "";
		if (path.isAbsolute(sharedIncludePath)) {
			sharedAbsPath = sharedIncludePath;

		}
		else {
			
			const absIncPath = path.resolve(ueWorkingUri.fsPath, sharedIncludePath);
			if(!(await isFolder(vscode.Uri.file(absIncPath)))) {
				console.error(`Path not a real folder in response: ${absIncPath}`);
				continue;
			}
			sharedAbsPath = absIncPath;
		}

		let found = false;
		
		for (const rspInclude of rspIncludes) {
			
			if(path.relative(sharedAbsPath, rspInclude[0]) === ""){
				found = true;
				break;
			}
		}
		
		if(found){
			continue;
		}
		
		console.warning(`Found shared include not in Intellisense Response: ${sharedAbsPath}`);
		missingIncludePaths.push(sharedAbsPath);

	}
	console.log(`Number of shared includes: ${String(sharedCount)}`);
		
	return missingIncludePaths;
}

async function isFolder(uri: vscode.Uri){

	try {
		return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
	} catch (error) {
		return false;
	}
}

function createIncludeFlagsFromPaths(missingPaths: string[]) {
	const includeFlagOnlyWithSpace = process.platform === "win32" ? "/I " : "-I";

	let i = 0;
	let includeFlags = "";
	for (const path of missingPaths) {
		i += 1;
		
		const missingPath = process.platform !== "win32" ? path : `${path[0].toUpperCase()}${path.slice(1)}`;
		const endOfLine = i !== missingPaths.length ? EOL : "";
		includeFlags += `${includeFlagOnlyWithSpace}"${missingPath}" ${endOfLine}`;
	}

	return includeFlags;

}
