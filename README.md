
# Unreal 5 Clangd extension for VSCode (Intellisense+)

## Releases (`Updated Sept 22, 2023`)
### v2.1.0 for Unreal **5.2+**
   * Supports all Unreal versions >= 5.2
   * Definitive fix for Ubuntu 22.04
   * See Changelog for more info
 

# Table of Contents
- [Info](#info)
- [Recommends Extensions](#other-recommended-extensions)
- [Documentation](#documentation)
- [Upgrading Projects](#upgrading-projects)
- [Mac Support](#mac-support)

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
### [**Extension Documentation**](https://github.com/boocs/unreal-clangd/tree/v2#readme)

---
## Upgrading Projects
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

---
[Back to Top](#unreal-5-clangd-extension-for-vscode-intellisense)