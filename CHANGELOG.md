# Change Log

## [Unreleased]

- Create command that shows clang and clangd version in terminal

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

