
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

Extension v2.5.0: For 5.2 and newer releases (Including 5.4+)

This version now uses Native project Intellisense files instead of using the UBT's mode `GenerateClangDataBase`.

For users who already have created a project, you'll need to run the "`Create Unreal Clangd Project`" command again and choose `Full` so that it overwrites old project settings. You shouldn't have to uninstall anything.


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
 
* [C++ Create Definition](https://github.com/boocs/cpp-create-definition) (my extension) `Updated Sept 2023`

* [Unreal Reflection Function Parameters](https://github.com/boocs/UE-Reflection-Func-Params) (my extension) `Updated Sept 2023`

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Quick Start Guide (UE 5.2+)
This is generally correct, when using  non-full source, but your situation could be different.

1. Read the [Requirements](https://github.com/boocs/unreal-clangd/tree/v2#readme) section of the full Documentation
    - Different Unreal Engine versions require different LLVM versions(Unreal 5.3 requires LLVM 16.0.6)

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

7. Use `DebugGame` when you have to Debug something
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

This version now uses Native project Intellisense files instead of using the UBT's mode `GenerateClangDataBase`.

For users who already have created a project, you'll need to run the "`Create Unreal Clangd Project`" command again and choose `Full` so that it overwrites old project settings. You shouldn't have to uninstall anything.

### Uninstalling and Reinstalling
You can use this extension's `uninstall` and `create` commands when upgrading to a new extension version. 


---
## Mac support

This hasn't been proven to work yet`(let me know!)`. 

---
[Top](#unreal-52-clangd-extension-for-vscode-intellisense)