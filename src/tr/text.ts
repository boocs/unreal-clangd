// visible text


// Titles
export const TTL_CREATION_ARGS = "Creation Arguments";

// Button
export const BTTN_CONTINUE = "Continue";
export const BTTN_YES = "Yes";
export const BTTN_NO = "No";
export const BTTN_OK = "OK";
export const BTTN_DEL = "Delete";
export const BTTN_TO_TRASH = "To Trash";
export const BTTN_SKIP = "Skip";
export const BTTN_ALL = "All";
export const BTTN_PROJECT ="Project Only";
export const BTTN_CHOOSE_CLANGD = "Choose clangd executable";
export const BTTN_FULL = "Full";
export const BTTN_PARTIAL = "Partial";

// Question
export const QST_DO_YOU_WISH_TO_CONTINUE = "Do you wish to continue?";
export const QST_WOULD_YOU_LIKE_TO_UPDATE_INTELLISENSE = "Would you like to update compile command/Intellisense files now?\n\n(note: It will ask what Build Target you want to use at the top of VSCode)";
export const QST_ADD_HEADERS_TO_COMPLETION_HELP = "Would you like to add these to completionHelper.cpp\n\nnote: VSCode will reload after adding";
export const QST_WLD_YOU_LIKE_TO_RELOAD = "Would you like to reload VSCode now?";

// Warning messages
export const WARN_OUT_OF_DATE_EXTENSION = "Extension is out of date. Even small Unreal Version changes can have different requirements.";
export const WARN_INTELLISENSE_FILES_NOT_FOUND = "Intellisense files not found!\n\nUnreal-Clangd needs to create a compile commands file first before proceeding to create a project.";
export const WARN_INTELLISENSE_FILE_DELETION_DETECTED = "Intellisense file deletion detected!";
export const WARN_INTELLISENSE_FILES_NOT_FOUND_ON_STARTUP = "Intellisense files not found on startup!";
export const WARN_NEW_SOURCE_FILE_DETECTED = "New source file(s) detected!";
export const WARN_DONT_SWITCH_COMPLETION_HELPER = "Do not switch to another file until clangd is done processing completionHelper.cpp.\n\nProcessing can be seen on VSCode's bottom left info bar. Make sure it shows clangd:idle and also wait for indexing if it's showing any.";
export const WARN_CODE_COMPLETION_MAY_NOT_BE_ERR = "The error above may not be an error. completionHelper.cpp will be created during creation process.";
export const WARN_CONFLICT_SETTINGS_RELOAD = "VSCode will reload after settings are set and continue with installation.";
export const WARN_CREATION_WILL_CONTINUE = "Creation will continute but clangd/extension may not work!";
export const FOUND_CLANGD_WHEN_OVERWRITE = "Found clangd files while overwrite setting is:";
export const COULDNT_GET_PROJ_WS_WILL_STILL_GET_SET_VARS = "Couldn't get project workspace! We will still attempt to get and set vars.";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const platform_ISNT_SUPPORTED = /** CONTEXT: system platform */ ": isn't supported!";
export const STILL_UPDATING_CC_TRY_AGAIN_LATER = "Currently still updating compile commands... Try again after a few seconds.";
export const COMPLETION_HELPER_WONT_BE_OPENED = "completionHelper.cpp won't be opened because setting is false. This can negatively affect code completion.";
export const UE_VERSION_CHECK_BYPASSED = "Unreal version check was bypassed!";
export const OVERWRITE_IS_UNDEFINED = "Overwrite is undefined: Using overwrite=false instead.";

// Error messages
export const ERR_NO_CREATION_ARGS_WERE_FOUND = "User cancelled creation.";
export const ERR_COULDNT_GET_ARGS_VALUES_FROM = "Couldn't get Arg values from:";
export const ERR_ARG_VALUE_TYPES_DIDNT_MATCH = "Invalid Arg values in some/all arguments:";

export const ERR_UNREAL_ISNT_COMPATIBLE_LEFT = "Your version of Unreal "; // (#.#.#)
export const ERR_UNREAL_ISNT_COMPATIBLE_RIGHT = " isn't compatible with this extension.";
export const EXEC_TYPE_NOT_FOUND = "Compile commands exec type wasn't found!";
export const COULDNT_GET_PROJECT_WORKSPACE = "Couldn't get project workspace folder!";
export const COULDNT_GET_UNREAL_PLATFORM = "Couldn't get Unreal platform!";
export const COULDNT_CREATE_PROJECT_INFO_VARS = "Couldn't create project info vars!";
export const COULDNT_GET_CLANG_TIDY_SETTINGS = "Couldn't get clang tidy setting!";
export const ERROR_ADDING_DYNAMIC_SETTINGS = "Error trying to add dynamic settings to config!";
export const COULDNT_GET_CLANGD_EXT_FILES = "Couldn't get clangd extension files!";
export const NO_DEFAULT_CFG_SETTINGS_FOUND = "No default cfg settings found!";
export const COULDNT_GET_CC_URI = "Couldn't get compile commands Uri";
export const COULDNT_CREATE_RSP_FILES = "Couldn't create response files!";
export const COULDNT_GET_FILE_STR_FROM = "Couldn't get file string from:";
export const ERR_FINDING_CFG_SETTING = "Error finding config setting:";
export const COULDNT_GET_UE_VERSION_HEADER_URI = "Couldn't get Unreal Version header uri!";
export const COULDNT_GET_UE_VERSION = "Could not get Unreal version!";
export const CLANGD_PATH_INVALID_URI_CONV_FAILED = "Current clangd path was invalid. Uri conversion unsuccessful!";
export const NO_CLANGD_CFG_FOUND = "No clangd config found!";
export const COULDNT_FIND_UE_URI = "Could not find Unreal Uri!";
export const COULDNT_CREATE_UPDATE_CC_DEBUG_CFG = "Couldn't create Update Compile Commands Debug Cfg";
export const URI_SEND_TO_GETUBTPATH_WAS_UNDEFINED = "Uri sent to getUbtPath was undefined";
export const UBT_PATH_DOESNT_EXIST = "Ubt Path doesn't exist:";
export const COULDNT_GET_UPROJECT_FILE_NAME = "Couldn't get uproject file name!";
export const ERR_COPYING_CC = "Error copying compile commands!";
export const CC_COULDNT_BE_CREATED = "Compile commands couldn't be created!";
export const COULDNT_GET_SOURCE_FILE_URIS = "Couldn't get source file Uris!";
export const CC_URI_UNDEFINED_IN_GET_CC_OBJ_FROM_JSON = "Compile command uri is undefined in get compile commands object from json!";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ERR_READING_FILE_path = "Error reading file:"; /** CONTEXT: path */
export const COULDNT_PARSE_JSON_STR = "Couldn't parse jsonString!";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const NO_RSP_PATHS_FOUND_IN_CC_WITH_REGEX_restring = "No response paths found in compile commands with regex:"; /** CONTEXT: regex string */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ERR_CREATING_URI_WITH_RSP_PATH_path = "Error creating uri with response path:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ERR_READING_RSP_FILE_path = "Error reading response file:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const REPLACEMENT_STR_FOR_RSP_FILE_PATH_WAS_NULL_path = "Replacement string for response file. Path was null:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const COULDNT_ENCODE_FILE_STRING_FROM_path = "Couldn't encode file string from:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FILE_IS_EMPTY_FOR_path = "File is empty for:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ERR_WRITING_FILE_path = "Error while writing file:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_vars = "Bad params for getSourceFilesFirstChildFolders:"; /** CONTEXT: two variable values */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const BAD_PARAMS_GET_SRC_FILES_FIRST_CHILD_FOLDERS_URIS_vars = "Bad params for getSourceFilesFirstChildFoldersUris:"; /** CONTEXT: two variable values */
export const DIDNT_FIND_ANY_SOURCE_FILD_FIRST_CHILD_FOLDER_NAMES = "Didn't find any source file first child folder names!";
export const COULDNT_CREATE_URI_FROM_URI_AND_FOLDER_NAME = "Couldn't create Uri from uri and folder name:"; /** CONTEXT: two variable values */
export const COULDNT_SETUP_SRC_FILE_DETECT = "Couldn't setup source file detection!";
export const WARNINGS_ERRORS_IN_YAMLDOC = "Warning/Errors in yamldoc!";
export const COULDNT_ENCODE_YAML_STRING = "Couldn't encode yamlString!";
export const ERR_WITH_EXEC_TASK = "Error with execing task!";
export const DBGCFG_IS_NULL = "dbgConfig is null!";
export const EXCEPT_WHEN_UPDATING_CC = "Exception when updating compile commands!";
export const COULDNT_GET_CC_FILE = "Couldn't get compile commands file!";
export const CLDNT_WRITE_COMPLETION_HELPER_FILE = "Couldn't write completion helper file:"; /** CONTEXT: path */
export const CLDNT_GET_COMPLETION_HELPER_SETTING = "Couldn't get completion helper setting!";
export const CLDNT_DECODE_CC_FOR_CREATION_HELPER = "Couldn't decode compile commands for creation helper!";
export const CC_ISNT_ARRAY = "Compile commands isn't array!";
export const CC_IS_EMPTY = "Compile commands is empty!";
export const CLDNT_WRITE_CC_FILE = "Couldn't write compile commands file!";
export const CLDNT_GET_URIS_FOR_CPY_CC = "Couldn't get uris for copying compile commands!";
export const UE_CC_DOESNT_EXISTS_CANT_CONTINUE_UDPATE_CC = "Unreal compile commands doesn't exists! Can't continue updating compile commands";
export const EXT_WASNT_BUILT_FOR_YOUR_UE_VERSION = "This extension wasn't built for your Unreal version!";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_COULDNT_GET_SECTION_section_name = "Couldn't get section:";  /** CONTEXT: setting section name */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_COULDNT_GET_SECTION_setting_name = "or settings:"; /** CONTEXT: setting name */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CONFIG_INSPECTION_WAS_UNDEFINED_FOR_SETTING_setting_name = "Config inspection was undefined for setting:"; /** CONTEXT: setting name */
export const TRYING_TO_COMPARE_TWO_DIFF_TYPES = "Trying to compare two different types. Setting wont be set!";
export const COULDNT_UPDATE_SETTING = "Couldn't update setting:";
export const ERROR_CREATING_FILE = "Error creating file!";
export const URI_ERR_IN_CREATE_FORMATE_FILE = "Uri error in createFormatFile";
export const COULDNT_GET_PROJ_SRC_PATH = "Couldn't get project's Source folder path!";
export const COULDNT_FIND_SRC_CC_ENTRY_FOR_COMPLETION_HELPER = "Couldn't find a Source folder compile commands entry for completionHelper to use!";

// Info messages
export const INFO_COMPLETION_HELPER = "completionHelper.cpp has opened to load Unreal symbols into clangd's code completion. This 'hack' ensures all specified Unreal symbols will be loaded.";
export const INFO_SET_CONFLICT_SETTINGS = "Extension conflict settings need to be set before project creation.";
export const ADD_TO_COMPLETION_HELPER_INFO = "This will allow you to choose a directory. Any header files found it this folder or subfolders will be added to completionHelper.cpp. All symbols in these headers will be added to code completion.";
export const ADD_TO_COMPLETION_HELPER_DETAIL = "This is useful for adding plugin headers to code completion.\n\nIt can be used to add other directories but remember:\n\"With great power comes great responsibility\"";
export const USER_CANCELLED_ADD_TO_COMPLETION_HELPER = "User cancelled addToCompletionHelper";
export const NOT_UNREAL_PROJECT = "Not an Unreal project. This extension won't activate.";
export const RUNNING_UPDATE_CC = "*** Running command to update compile commands file... ***\n";
export const CHOOSE_BUILD_TARGET = "Choose Build Target: ('Editor' suffix is usally best choice)";
export const COULDNT_GET_WORKSPACE_FOLDERS = "Couldn't get correct workspace folders:";
export const RUNNING_COMMAND_CREATE_UECLANGD_PROJECT = "Running command create Unreal/Clangd project...\n";
export const CREATION_CMD_LINE_OPTIONS = "Creation command line options:";
export const USER_CANCELLED_CLANGD_PATH_SELECTION = "User cancelled clangd path selection.";
export const END_CREATE_UE_CLANGD_PROJECT = "*** End create unreal-clangd project***\n";
export const CONFIG_CHANGED_WANT_TO_RELOAD = "Config may have changed. You must reload VSCode for changes to take affect. Would you like to do it now?";
export const FIXING_RSP_FILES_QUOTED_PATHS = "*** Fixing response files with quotes around paths...***\n";
export const GETTING_RSP_FILES_FROM = "Getting response files from:";
export const END_FIXING_RSP_FILES_QUOTED_PATHS = "*** End fixing response files with quotes around paths. ***\n";
export const FOUND_NO_FILES_TO_UNINSTALL = "Found no files to uninstall";
export const THESE_WILL_BE_DELETED_PROCEED = "These items below will be deleted. Would you like to proceed?";
export const DONE_WITH_UE_CLANGD_PROJECT_UININSTALL = "Done with unreal-clangd project uninstall";
export const START_INTELLISENSE_CHECK_ENABLED_AND_CHECKING = "Startup Intellisense check is enabled and now checking...";
export const STARTUP_INTELLISENSE_CHECK_DISABLED = "Startup Intellisense check is disabled.\n";
export const FOUND_NO_HEADERS_IN = "Found no headers in:";
export const HEADERS_FOUND = /** CONTEXT: number of */ "headers found!";
export const AUTO_PARAM_HINTS_SET_TO ="Auto Parameter Hints was set to";
export const DELEGATE_FUNC_COMPLETIONS_FIX_SET_TO = "Delegate Function Completions Fix was set to";
export const AUTO_INCLUDE_SOURCE_ONLY_SET_TO = "Auto Include Source Files Only was set to";
export const FOCUS_SUGG_DELAY_SET_TO = "Focus Suggestion Delay was set to";
export const FOUND_UE_VERSION = "Found Unreal Version:";
export const CREATING_ARGS_FOR_CC_CREATE = "Creating args for compile commands creation:";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TRY_COPY_CC_FILE_TO_path = "Attempting to copy compile commands file to:"; /** CONTEXT: path */
export const COPY_SUCCESSFUL = "Copy successful!\n";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const QUOTE_FIX_WRITING_FILE_path = "(Quote Fix) Writing file:"; /** CONTEXT: path */
export const INTELLISENSE_FILES_HAVE_BEEN_FOUND = "Intellisense files have been found!\n";
export const SETTING_UP_NEW_SRC_FILE_DETECT = "Setting up new Source file detection...\n";
export const COULDNT_SETUP_NEW_SRC_FILE_DETECT_CC_DOESNT_EXIST = "Warning: Couldn't set up New Source File Detection, compile commands doesn't exist yet.";
export const RSP_FILE_QUOTE_FIX_IS_ENABLED_ATTEMPTING_FIX = "Response file quote fix is enabled. Attempting fix...";
export const INTELLISENSE_FILES_HAVE_BEEN_UPDATED_MAY_NEED_TO_RELOAD = "Intellisense files have been updated!\nYou may need to reload VSCode...";
export const NO_WRKSPC_FLDERS_FND_WILL_NOT_ACTIVATE_EXT = "No workspace folders found! Will not activate extension.";
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CREATING_CC_FILE_IN_path = "Creating compile commands file in:"; /** CONTEXT: path */
export const END_UPDATING_CC_FILE = "*** End updating compile commands file! ***\n";
export const NO_WRK_SPACE_FOLDER_FOUND = "No workspace folder found!";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_SETTINGS_WILL_BE_DELETED_ext_name = `These "`; 
/** CONTEXT: extension name */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_ext_name_SETTINGS_WILL_BE_DELETED = `Extension" settings will be deleted. Deleted settings will use their default values. Would you like to proceed?`;

export const COMPLETION_HELPER_EXISTS_WONT_OVERWRITE = "Completion helper file already exists. Will not overwrite.";
export const COMPLETION_HELPER_WILL_NOT_BE_CREATED_SETTING_IS_FALSE = "Completion helper will not be created. Setting is false.";
export const CLDNT_GET_COMPLETION_HELPER_MP_SETTING = "Couldn't get completion helper MP setting. Will still create completion helper without MP.";
export const USER_CANCELLED_PROJECT_CREATE = "User cancelled project creation.";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const number_FILES_IN_path =  /* CONTEXT: number */ "files in:\n"; /** CONTEXT: path */
export const SEE_LOGS = "(See logs)";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_NO_SETTING_FOR = "No settings set for "; /** CONTEXT: extension name */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_NO_SETTING_FOR = /** CONTEXT: extension name */ ". No need to uninstall.";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NO_NEED_TO_DEL_URI_DOESNT_EXIST_path = "No need to delete uri. It doesn't exist:"; /** CONTEXT: path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SUCCESS_DEL_path = "Successfully deleted:"; /** CONTEXT: path */
export const USER_CANCELLED_RUN = "User cancelled run.";
export const TRASH = "Trash"; /** CONTEXT Trash is label of path to be put in computer's trash not deleted */
export const DELETE = "Delete"; /** CONTEXT Delete is label of path to be deleted and not put in computer's trash */
export const CANCELLING_CREATION = "Cancelling creation...";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const left_ATTEMPING_TO_SET_section_name = "Attempting to set settings section:"; /** CONTEXT: section name for a setting */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const right_ATTEMPING_TO_SET = "(empty = VSCode)"; 

// eslint-disable-next-line @typescript-eslint/naming-convention
export const END_SET_SETTINGS_section_name = "End set settings: section ="; /** CONTEXT: section name */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const FILE_CANT_BE_OVERWRITTEN_IF_OVERWRITE_path = "*** File cannot be overwritten if overwrite is false!"; /** CONTEXT: file path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const START_CREATION_path = "Start creation:"; /** CONTEXT: file path */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const END_CREATION_path = "End creation:"; /** CONTEXT: file path */
export const ADD_FILES_TO_PROJ_SRC_TO_CORRECT_ERR = "Once you add files to your project's Source folder the above error will correct itself.";

export const WHAT_INSTALL_TYPE = "Choose a project install type.";
export const FULL_OR_PARTIAL = "Full : Overwrite any file and setting.\nPartial : Setup anything not already set or created.";