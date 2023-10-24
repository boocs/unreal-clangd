
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

## Releases (`Updated Oct 22, 2023`)

- It will prompt you when running the creation command on whether you want a full or partial install.
- You no longer have to change the creation.overwrite setting manually
- Extension is now bundled using esbuild. Smaller size and faster start.
 

# Table of Contents
- [Info](#info)
- [Recommends Extensions](#other-recommended-extensions)
- [Documentation](#documentation)
- [Upgrading Projects](#upgrading-projects)
- [Mac Support](#mac-support)
- [Future](#future)

## Info

* Provides fast Code Completion, Formatting, and other cool features!

* Has a command to create a clangd project for you
  
* Fixes some clangd/Unreal quirks

* Has a uninstall command

  `Note:` Windows users can use clang/clangd for Intellisense and still build with Microsoft's compiler

---
## Other Recommended Extensions
* [Microsoft C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) (Still useful for `debugging`)
 
* [C++ Create Definition](https://github.com/boocs/cpp-create-definition) (my extension) `Updated Sept 2023`

* [Unreal Reflection Function Parameters](https://github.com/boocs/UE-Reflection-Func-Params) (my extension) `Updated Sept 2023`

---
## Documentation
### Unreal 5.2+
`Note:` Make sure to read requirements! Different Unreal version usually require different `clang/clangd` and `XCode` versions

`Windows Users:` The requirements sections has `easy` instructions on how to install different Build Tools 2022 versions. These are required because other versions may cause `fake red error squiggles`.

### [**Extension Documentation**](https://github.com/boocs/unreal-clangd/tree/v2#readme)

---
## Upgrading Projects
`Current extension version:` Has no file changes so projects do not  need to be reinstalled

It's best to use this extension's uninstall and reinstall commands when upgrading to a new extension version. This is because different files could need to be upgraded.

---
## Mac support
This hasn't been proven to work yet`(let me know!)`. The ubuntu fix might help people trying to fix the Mac version so a section of .clangd is provided below.

`Note:` Mac doesn't use this directory any more so any 'fix helpers' should try the Xcode equivalent to this directory. Of course maybe Mac does work without anything to fix. 
```
CompileFlags:
  Add:
    - -D__INTELLISENSE__
    - -isystem/usr/include
```
`Note:` In previous extension versions, I wrongly used -I instead of -isystem for this include (it took awhile to figure that out)

## Future
I'd be nice to have these things:

1. Figure out a way to have Intellisense files created for the Unreal source code. I use the Unreal Build Tool's GenerateClangDatabase flag to generate the Intellisense files for your project. Problem is, when you switch to a Unreal source file, clangd will use a translation unit from your project to provide Intellisense for a Unreal source file. It may or may not work. Generating separate Intellisense files for the Unreal source code needs to be looked into.
2. Provide a ready made ,unreal centric, config file for clang tidy. I currently don't use clang tidy but I want to try it! This extension provides a mostly blank clang tidy config file but does have decent guidance in the [**extension documentation.**](https://github.com/boocs/unreal-clangd/tree/v2#readme)
3. Complete rewrite. What I should have done was make a generalized clangd helper extension instead of the Unreal/clangd version we have now. Would maybe need to have another lightweight Unreal extension to complement this extension but maybe not if designed correctly!

---
[Back to Top](#unreal-5-clangd-extension-for-vscode-intellisense)