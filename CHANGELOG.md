# Change Log

## [Unreleased]

- Create command that shows clang and clangd version in terminal
- Add a way to add skeleton support for UE5 source intellisense (wont work but people will have a compile_flags.txt and a UE5 .clangd file to try to get it to work)

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
