# Change Log

## [Unreleased]

- Create command that shows clang and clangd version in terminal

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

