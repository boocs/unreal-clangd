
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

`New info Feb 12, 2025`

**Windows**: Should use LLVM (clang-cl/clangd) 18.1.3-18.1.8 for Unreal 5.5.# . `Note`: Linux is still recommended for 18.1.0

**Updated Quick Start Guide**: Updated below to latest/correct info

`New update Nov 30, 2024`

Extension v2.6.1: For Unreal 5.2 `and newer releases`
- Changed Mac fix default setting

Also from older release:

- Has Unreal Source file support (`finally!`) see [here](https://github.com/boocs/unreal-clangd/tree/v2?tab=readme-ov-file#unreal-source-support)
- UE 5.5 support (`note:` now uses clang/clangd v18.1.0)
- Potential Mac [fix](https://github.com/boocs/unreal-clangd/tree/v2?tab=readme-ov-file#mac-fixes)
- See [Changelog](https://github.com/boocs/unreal-clangd/blob/v2/CHANGELOG.md) for more info


## Important Info

This extension now uses UBT to  `Refresh your project` to update Intellisense files(compile commands). So this runs when you run the `'Update Compile Commands'` command.
Since this refreshes your project, your code-workspace will be refreshed removing your clangd settings and others! but...

This extension will `automatically backup and restore` your clangd settings when you run the `Update Compile Commands` command.

`Note:` I've added a setting that allows you to add additional settings to be backed up.
See change log for more info: https://github.com/boocs/unreal-clangd/blob/v2/CHANGELOG.md#250-2024-05-05


# Table of Contents
- [Info](#info)
- [Recommends Extensions](#other-recommended-extensions)
- [Quick Start Guide](#quick-start-guide-ue-52)
- [Documentation](#documentation)
- [Upgrading Older Projects](#upgrading-older-projects)
- [Mac Support](#mac-support)


## Info

* Provides fast Code Completion, Formatting, and other cool features!

* Has a command to create a clangd project for you
  
* Fixes some clangd/Unreal quirks

* Has a uninstall command

  `Note:` Windows users can use clang/clangd for Intellisense and still build with Microsoft's compiler

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Other Recommended Extensions

* [Microsoft's C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) `Needed for Building/Debugging`

* [File Switcher](https://github.com/boocs/file-switcher) `For Alt+O clangd keyboard shortcut (Head/Source switcher)` Using Clangd's Alt+O implementation is buggy, for Unreal Source files, so this extension is a good alternative
 
* [C++ Create Definition](https://github.com/boocs/cpp-create-definition) (my extension) `Updated Sept 2023`

* [Unreal Reflection Function Parameters] (Deprecated) New project coming soonish 

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Quick Start Guide (UE 5.2+)
This is generally correct, when using  non-full source, but your situation could be different.

1. Read the [Requirements](https://github.com/boocs/unreal-clangd/tree/v2#readme) section of the full Documentation
    - Different Unreal Engine versions require different LLVM versions(Unreal 5.5  requires LLVM 18.1.0(Linux) and LLVM 18.1.8(Windows))

  ---

2. Install the vsix file from this github

    ![](https://user-images.githubusercontent.com/62588629/225083466-39ca4a93-e06a-4a04-83ba-82d60b548513.png)

- Click the extensions icon
- Click the ellipsis (3 dots)
- Choose Install from VSIX...

---


3. Ignore any VSCode warning messages (should go away after creating a project)
    
  ---

4. `Linux:` In the next step(project creation), File Dialogues will spawn behind VSCode(known bug)

  ---

5. Run extension command "Create Unreal clangd project" on your Unreal project
    - Example:

      ![image](https://user-images.githubusercontent.com/62588629/225809141-01e39abf-0928-4cc4-a5e9-f5e3c2a82c52.png)

  ---
6. Use the `Editor` suffix and `Development` config when Building/Running
    - Build
    
      ![image](https://github.com/boocs/unreal-clangd/assets/62588629/fbada348-a3a5-42ed-ad2f-d02255d70c3d)

      ---
    - Run/Debug
    
      ![image](https://github.com/boocs/unreal-clangd/assets/62588629/b651f4e3-0fab-43da-b5e7-02fb8cec24e7)

  ---

7. Use `Editor` suffix and `DebugGame` when you have to Debug something. 
    - Debugging
    
      ![image](https://github.com/boocs/unreal-clangd/assets/62588629/72ef61c0-bf11-48cb-9d3b-fd03253689d7)

  ---

8. Run extension command 'Update Compile Commands' to fix fake red squiggles that may rarely happen.

    ![image](https://user-images.githubusercontent.com/62588629/231914528-3808d25e-1d18-439f-82bd-e325db58460a.png)

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Documentation
### Unreal 5.2+
`Note:` Make sure to read requirements! Different Unreal version usually require different `clang/clangd` and `XCode` versions

`Windows Users:` The requirements sections has `easy` instructions on how to install different Build Tools 2022 versions. These are required because other versions may cause `fake red error squiggles`.

### [**Extension Documentation**](https://github.com/boocs/unreal-clangd/tree/v2#readme)

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Upgrading Older Projects

`This version had some changes!`

---
## Mac support

This hasn't been proven to work yet`(let me know!)`. 

There a new setting to try if you haven't been successful in getting clangd to work.

`unreal-clangd.creation.MacFileLanguage`

You can change the clangd Mac file language to C++ or Objective C++ (thanks to user szabot0412)
- This setting is set in your .clangd files during project creation
- in the Add: section it's the line that shows `- -xc++` or `- -xobjective-c++`

---
[Top](#unreal-52-clangd-extension-for-vscode-intellisense)