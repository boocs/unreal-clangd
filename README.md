
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

[Table of Contents](#table-of-contents)

## Releases (`Updated Jan 21, 2024: v2.3.0`)

### Added
- clang-format: added "NamespaceIndentation: All" to default config when created
- Docs: Added Quick Start Guide section
### Changed
- Intellisense now uses DebugGame instead of Development. 
    - You should still use Development most of the time when Building or Running your project. (You will still get Intellisense)
    - This prevents having to Rebuild when Running your project using Development
    - Fixes fake red squiggles after Building your project
- When creating a project, we now put the compile commands path in the .clangd file instead of the workspace cfg file.
    - This will set the stage, for the future, for using a different .clangd file and compile commands/flags file for the Unreal Engine source files.
- Docs: Requirements section is less of a mess
- Docs: Changed Tidy Guide to a link to a separate updated Clang Tidy Guide
### Removed
- clang-tidy: removed -readability-static-accessed-through-instance to default config when created. Added because of Tidy crash in Lyra that's fix in UE5.3. It was also the wrong way to fix the Check that caused the crash.
 

# Table of Contents
- [Info](#info)
- [Recommends Extensions](#other-recommended-extensions)
- [Quick Start Guide](#quick-start-guide-ue-52)
- [Documentation](#documentation)
- [Upgrading Older Projects](#upgrading-older-projects)
- [Mac Support](#mac-support)
- [Future](#future)

## Info

* Provides fast Code Completion, Formatting, and other cool features!

* Has a command to create a clangd project for you
  
* Fixes some clangd/Unreal quirks

* Has a uninstall command

  `Note:` Windows users can use clang/clangd for Intellisense and still build with Microsoft's compiler

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
## Other Recommended Extensions
 
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

If you want to manually update your project, skip to the Manually Update section.

### Uninstalling and Reinstalling
You can use this extension's `uninstall` and `create` commands when upgrading to a new extension version. 

### Manually Update
#### .clang-format 
- `Add` this line
  ```
  NamespaceIndentation: All

  # Make sure to leave blank line at end of file
  ```

---
#### projectname.code-workspace

- `Remove` this line

  Found in setting: clangd.arguments
  ```
  "-compile-commands-dir=e:\\Users\\ME\\Documents\\Unreal Projects\\CleanLyra_5_3\\.vscode\\unreal-clangd"
  ```
---
#### .clangd
- `Add` this line

- Add the path found in your projectname.code-workspace

- `Windows` users: Use one `forward` slash for paths
  ```
  CompileFlags: CompilationDatabase: e:/Users/ME/Documents/Unreal Projects/CleanLyra_5_3/.vscode/unreal-clangd
  ```


---
## Mac support

This hasn't been proven to work yet`(let me know!)`. The ubuntu fix might help people trying to fix the Mac version so a section of .clangd is provided below.



`Note:` Mac doesn't use this directory any more so any 'fix helpers' should try the Xcode equivalent to this directory. 

Of course maybe Mac doesn't need this Ubuntu type fix. 
```
# Rest of file above

CompileFlags:
  Add:
    - -D__INTELLISENSE__
    - -isystem/usr/include

# Rest of file below
```

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## Future
I'd be nice to have these things:

1. Figure out a way to have Intellisense files created for the Unreal source code. I use the Unreal Build Tool's GenerateClangDatabase flag to generate the Intellisense files for your project. Problem is, when you switch to a Unreal source file, clangd will use a translation unit from your project to provide Intellisense for a Unreal source file. It may or may not work. Generating separate Intellisense files for the Unreal source code needs to be looked into.
2. Provide a ready made ,unreal centric, config file for clang tidy. I currently don't use clang tidy but I want to try it! This extension provides a mostly blank clang tidy config file but does have decent guidance in the [**extension documentation.**](https://github.com/boocs/unreal-clangd/tree/v2#readme)
3. Complete rewrite. What I should have done was make a generalized clangd helper extension instead of the Unreal/clangd version we have now. Would maybe need to have another lightweight Unreal extension to complement this extension but maybe not if designed correctly!

---
[Top](#unreal-52-clangd-extension-for-vscode-intellisense)