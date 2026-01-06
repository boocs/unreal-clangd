# Change Log

## [3.4.0] 2026-1-6  
- Thanks @jacklp for the idea and code
### Added
- `unreal-clangd.automation` : Automation settings for convenience 
    - auto run update compile commands when new source files dectected
    - auto restore from backup if backup file available
    - don't auto reload vscode window after restore (restart vscode if this causes problems)
### Fixed
- Running update compile commands would double call backupOrRestore when config file changed
- Running backup on config change when not a project

## [3.3.1] 2025-12-14
### Fix
- Fixed restore not working in 3.3.0 by using strip-json-comments
- Pasting something in headers won't trigger the remove #include feature as often
    - Triggers on pasted text that starts with "#include" and when first '\n' is last char in pasted text
- Fixed bug where code-workspace is modified, without clangd settings, and it fails to backup instead of falling back to restore
- npm audit fix
### Added
- Now also creates a .clang-format for Full Source Unreal during installation.
- Can move errors to warning to prevent gui popup. Can currently move only one: `no-rsp-path-match` . Feel free to recommend more annoying errors


## [3.2.1] 2025-11-17
### Changed
- New way of backing up/restoring *.code-workspace settings
### Added
- Backs up workspace cfg on startup or on cfg change (if conditions met)
    - Backup is saved in `.vscode/unreal-clangd/.code-workspace.backup`
- Restores on startup if bad workspace file detected
    - currently only restores sections: `folders`, `settings`, `tasks`, `launch`
- Asks to restore after running command: Update compile commands (refresh project)
- Added manual commands: `Backup Workspace cfg file` , `Restore Workspace cfg file` 
- Added Links to `Unreal 5.7` requirements
### Fixed
- Fixed system include, for Linux, that gets put in .clangd file
    
## [3.1.0] 2025-10-18
### Fixed
- Fixed Unreal source files not working correctly (thanks @romantimm)
### Added
- Added logging when adding source file to Unreal compile commands
- Prompt user to remove invalid entry in Unreal's compile_commands.json

## [3.0.2] 2025-8-30
### Fixed
- (Windows) Polling cl version now works in other languages for 'Set Custom System includes' command
    - Also fixed Polling error message to give better info when can't get cl version number
## [3.0.1] 2025-7-29
### Fixed
- (Windows) Users using professional versions of Visual Studio can now set custom system includes

## [3.0.0] 2025-7-13
### Added
- Extension command: `Set Custom System includes (Windows only)`
  - Also autoruns command when creating extension project
  - Detects and shows warning if not set on startup
    - Set: "unreal-clangd.systemIncludes.showMissingWarning" to false to remove warning
- After Building/Rebuilding restart clangd language server
- Added *.code-workspace 'clangd setting's' eraser detection on startup
- UnrealEdSharedPCH.h to completionHelper.cpp
    - We still keep redundant header files. Header guards should prevent problems.
- Added message when removing auto header for header files
    - And setting to prevent message: autoHeader.showIncludeRemovalMessage
- Added command: `Show Project Info`
- We now remake Unreal compile commands if different project detected on startup
- Added completion files: defaultCompletions.h, addCompletions.h, macroCompletionHelper.h, addMacroCompletions.h
    - The addCompletions.h and addMacroCompletions.h allow you to customize code completion
- Extension command: `Open Add Completion Files (regular and macro)
    - Let's users add any missing header files for regular completions or regular/macro completions
- Extension command: `Toggle Macro Completions mode (fast/slow)`
    - Enables/disables defaultMacroCompletions.h
    - Toggles between enabling a curated macro completions list(fast) to almost all macro completions(slow)
    - In bottom-right status bar you can also click between `UC⚡`(fast) or `UC⌚`(slow)
- Add preparse include file called macroCompletionHelper.h in .clangd files
- Added progress meter for Rsp matcher and intellisense file modification
### Fixed
- Partial install wasn't working correctly
- No longer use static file names for the 2 manually rsp matchers...
- completionHelper.cpp also gets added to Unreal's compile_commands.json
- Fixes not being able to run the command Update Compile Commands again when running `debug` Update Compile Commands without the Microsoft C# extension
    - Also shows error message in extension log
### Changed
- Unreal source support changed to - partial (thinking of ways to fix for upcoming releases)
- We no longer load completionHelper.cpp on start
    - No longer rely on macro commpletions staying in memory
    - So now any included macros will just work
- Changed some window reloading to clangd.restart instead 
    - Reloading still occurs during creation, when setting extension conflict settings, and at the end.
- Updated to latest yeoman extension generator
- Docs
    - Moved sections to Front facing docs
    - Added local copy of front facing docs
- 'Update compile commands file' command text is now `Update compile commands file (refresh project)` for a more informant title. 
- Organized code into more source files
- Changed to more strict eslint settings and fixed all the problems that showed up
- We use 'project name' compile commands instead of default (file and folder)
- Dynamic Unreal compile commands entries now uses upper case drive letters


## [2.6.1] 2024-11-30
### Changed
- Mac setting: "unreal-clangd.creation.MacFileLanguage" (idea from user szabot0412)
    - MacFileLanguage setting is now default set to Objective C++
- Ending installation message

## [2.6.0] 2024-11-18
### Added
- Unreal Source support
    - The command below will run when you create a clangd project with this extension
    - Command "Create Unreal Source support"
        - Creates .clangd file in Unreal source directory
    - Auto creates compile commands file and entries when visiting Unreal Source files
        - Calculated based on Unreal Source rsp files created by Unreal when creating a VSCode Unreal project
        - compile_commands.json is created in Unreal Source directory (/.vscode/unreal-clangd)
- UE 5.5 support
- Added in .clangd Diagnostic->UnusedIncludes = None for clang/clangd 18.1.0
- Mac fix setting: "unreal-clangd.creation.MacFileLanguage" (idea from user szabot0412)
    - Can switch file language from C++ to Objective C++ (default is C++ for now)
- Ignore errors for Non Full Source Unreal Engine *.cpp files
### Fixed
- npm audit fix

## [2.5.1] 2024-07-22 
### Added from user 94Bo
- Linux and Mac users will use RunUBT.sh instead of calling UBT directly if available
- When choosing a compile commands entry for completionHelper.cpp, filter out non main source folders
### Added
- Windows will use RunUBT.bat if available
### Removed
- removed -vscode flag when calling UBT (it gets ignored anyway)
### Fixed
- npm audit fix

## [2.5.0] 2024-05-05
### Changed
- Moved to using a project's Native Intellisense files instead of using UBT's mode=GenerateClangDataBase
    - mode=GenerateClangDataBase was overwriting build files causing you to have to rebuild
- In .clangd, CompilationDatabase is now a relative path(set during creation process)
### Added
- Native - Removed PCH header from Intellisense files. Not needed and increases intellisense loading greatly.
- Native - Setting: unreal-clangd.IntellisenseType. This is always set to 'Native' even if switched.
- Native - Setting: unreal-clangd.native.minutesTillIntellisenseFilesAreOld
    - Can cause circular run of Update Compile Commands if set too low. You can also run Update Compile Commands manually if you run into trouble with it being too high.
- Native - Setting: unreal-clangd.native.code-workspaceFileBackupSettings
    - Array so you can specify which settings to backup in your *.code-workspace file when the native `Update Compile Commands` is run. This runs UBT's 'refresh project files' command that will overwrite your *code.workspace file. Some settings will automatically be backed up and are listed in your settings.
### Removed
- -D\_\_INTELLISENSE\_\_ from .clangd (always muddled on if I should include it). 5.4 forced me to remove it since it caused a error if enabled.
### Fixed
- Code that added compiler flags to eventually go in .clangd

## [2.3.0] 2024-01-21
### Added
- clang-format: added "NamespaceIndentation: All" to default config when created
- Docs: Added Quick Start Guide section
### Changed
- Intellisense now uses DebugGame instead of Development. 
    - You should still use Development most of the time when Building or Running your project. (You will still get Intellisense)
    - This prevents having to Rebuild when Running your project using Development
    - Fixes fake red squiggles after Building your project
- When a Creating Project we now put the compile commands path in the .clangd file instead of the workspace cfg file.
    - This will set the stage, for the future, for using a different .clangd file and compile commands/flags file for the Unreal Engine source files.
- Docs: Requirements section is less of a mess
- Docs: Changed Tidy Guide to a link to a separate Clang Tidy Guide
### Removed
- clang-tidy: removed -readability-static-accessed-through-instance to default config when created. Added because of Tidy crash in Lyra that's fixed in UE5.3. It was also the wrong way to fix the Check that caused the crash.

## [2.2.1] - 2023-10-21
### Changed
- It will prompt you when running the creation command on whether you want a full or partial install.
- You no longer have to change the creation.overwrite setting manually
### Added
- Extension is now bundled. Smaller size and faster start.

## [2.1.0] - 2023-9-22
### Removed
- Ubuntu: promote.h preinclude
- Unreal version checker(supports any Engine version >= 5.2)
### Changed
- Ubuntu: include for /usr/include now uses -isystem instead of -I (fixed everything)
### Updated
- completionHelper.h
### Fixed
- exception when MS Cpp Ext is disabled/uninstalled and you create a project

## [2.0.1] - 2023-5-13
### Added
- Added 5.2.0 support to Ubuntu 22.04 by preincluding promote.h (not the ideal fix but works for now and is a simple fix)
### Changed
- 'Linux Fixes' section of docs to explain new fix
- Linux requirements
- Mac requirements

## [2.0.0] - 2023-05-05
### Added
- Added InlayHints options to .clangd file (new clangd feature)
- Added InlayHints color options to *.code-workspace file
- Added compiler path option on creation (new clangd feature)
- Added docs on how to add compiler path manually
### Changed
- Adjusted requirements in docs for clang/clangd 15.0.1
- Adjusted docs because bracket initialization completion now works
