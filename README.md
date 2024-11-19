```
```

# Unreal 5.2+ clangd extension for VSCode
#### `(Supports any Unreal version >= 5.2)` This version has been updated for 5.4+ support

[https://github.com/boocs/unreal-clangd](https://github.com/boocs/unreal-clangd)

### Table of Contents
- [Quick Start Guide](#quick-start-guide-ue-52)
- [Warnings Before Use](#warnings-before-use)
  - [General](#warnings-before-use)
  - [Linux/Ubuntu](#linuxubuntu)
  - [Mac M1/M2](#mac-m1m2-note)
- [About](#about)
  - [General](#about)
  - [Benefits](#benefits)
- [Requirements](#requirements)
  - [Mac](#mac-xcodellvm)
  - [Windows](#windows-llvm)
  - [More Windows](#windows-requirements)
  - [Ubuntu](#ubuntu-2204-requirements)
  - [Arch Linux](#arch-linux-requirements)
- [Older Unreal Versions](#older-unreal-versions)
- [Extension](#extension)
  - [Commands](#commands)
  - [Settings](#settings)
- [Extension Installation](#installation)
- [Creating a Unreal Clangd Project](#creating-a-unreal-clangd-project)
  - [General](#creating-a-unreal-clangd-project)
  - [Creating Clang Tidy Cfg at a later date](#creating-a-clang-tidy-cfg-on-a-later-date)
- [Unreal Source support](#unreal-source-support)
- [Info](#info)
  - [Logs](#logs)
  - [.clangd file](#clangd-file)
  - [.clang-format file](#clang-format-file)
  - [.clang-tidy file](#clang-tidy-file)
  - [Bottom Info Bar](#bottom-info-bar)
  - [*.code-workspace file](#code-workspace-file)
- [Code Completion](#code-completion)
  - [completionHelper.cpp](#completionhelpercpp)
  - [Adding plugin headers](#adding-plugin-headers)
  - [Adding Virtual Function quirk](#adding-virtual-functions-quirk)
  - [Snippets with inline setting](#snippets-with-inline-setting)
  - [Font Size](#font-size)
- [Updating Compile Commands](#updating-compile-commands)
- [Fixes](#fixes-1)
  - [Quotes around paths](#quotes-around-paths-in-response-files)
  - [Delegate Func Completion](#delegate-function-name-completions)
  - [Function parameter completions](#function-parameter-completions)
  - [Linux Fixes](#linux-fixes)
  - [Mac Fixes](#mac-fixes)
- [Auto Include](#auto-includes)
  - [General](#auto-includes)
  - [Enabling for headers](#enabling-auto-include-for-header-files)
  - [Pasting #include in headers](#pasting-include-line-in-headers)
  - [Quick Fix Auto Include](#quick-fix-auto-include)
  - [Auto Include Failure](#auto-include-failure)
- [Auto Parameter Hints](#auto-parameter-hints)
  - [General](#auto-parameter-hints)
  - [Side effects with 'all'](#side-effects-using-all-setting)
  - [Template Functions](#template-functions)
- [Inlay Hints](#inlay-hints)
  - [General](#inlay-hints)
  - [Disable](#disable-inlay-hints)
  - [View Options](#view-options)
- [Clang Tidy](#clang-tidy)
- [Go to Symbol in Workspace](#go-to-symbol-in-workspace)
- [Reinstall Without Overwrite](#reinstall-without-overwrite)
- [Uninstalling](#uninstalling)
- [Full Source Project](#full-source-project)
  - [Task vs Debug](#task-vs-debug)
  - [C# Intellisense Errors](#c-intellisense-errors)
  - [clangd indexing](#clangd-indexing)
- [Compiler Path](#compiler-path)
  - [General](#compiler-path)
  - [Why?](#why-set-this)
  - [Manually Set](#manually-set-path)
- [Help](#help)
- [Known Issues](#known-issues)
  - [General](#known-issues)
  - [Parameters for UPROPERTY](#parameters-for-uproperty)
  - [Refresh Visual Studio Project](#refresh-visual-studio-project)
  - [Adding a Different Source Folder](#adding-a-different-source-folder)
  - [Ubuntu/Linux File Dialogues](#ubuntulinux-file-dialogues)
  - [Installing Microsoft C++ After Install](#installing-microsoft-c-extension-after-install)
  - [Resizing Code Completion Window](#resizing-code-completion-window)
- [Release Notes](#release-notes)
- [More Info](#more-info)
  - [Lyra](#lyra)
  - [FPS Template](#fps-template)

```
```

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


---
## Warnings Before Use

1. Code Completion/completionHelper.cpp is the heart of the extension. It's how you get Unreal symbols into code completion. [See Section](#code-completion)
1. Like other Intellisense, you must wait for a file to load before using code completion [See Info Bar section](#bottom-info-bar)
    - Still pretty fast!
1. Weird Virtual function code completion behavior [See Section](#adding-virtual-functions-quirk)
1. This version `does have brace initialization` completion!

   * `Note:` This is because we're using an updated clangd version
1. After installing the clangd extension(not this extension) it might ask you to automatically download and install the latest LLVM/clang/clangd. 

    **Make sure to choose No to this.**
  
   Unreal doesn't work with some versions of LLVM/clang/clangd.

2. Some delegate function names wont show up correctly with code completion because of macro expansion
   - This extension has a fix that is enabled by default
   - See [this](#delegate-function-name-completions) section for more info
3. The clangd extension doesn't have Auto Parameter Hints.
   - This extension has a fix that is enabled by default
   - If you disable this setting you can always use the keyboard shortcut
   - See [this](#auto-parameter-hints) section for more info
4. Clangd has an option to `bundle` code completion choices that have the same name. This option `should not be used` and is automatically disabled with this extension.
   - Bundle setting causes completions to be wrong (e.g. template functions)
   - Bundle setting doesn't work with VSCode's deprecated strikethrough setting
4. This extension deletes/creates a compile_commands.json in the parent Unreal Engine directory and then copies it over to the project.
    - Current Native Intellisense options doesn't do it this way
6. clangd intellisense currently uses 'no precompiled headers' mode (`Will work with pch projects!`)
7. Popup dialogs use systems sounds. Most Operating Systems allow you to adjust System(OS) sounds without affecting overall sound volume.
8. Just like Microsoft's C++ extension, with clangd the UPROPERTY type macros don't work with code completion for their parameters.

   
9. clangd's Intellisense cache will be stored in your project's .vscode/unreal-clangd/cache folder
10. With both clangd extension and Microsoft's C++ extension installed you might get this window pop up. 

  - **Ignore this window. It will go away soon** 

    ![](https://user-images.githubusercontent.com/62588629/224883775-e7548187-d12d-4787-b143-19f31ec2fa8f.jpg)

    `note:` You should still use Microsoft's C++ extension for it's Building/Debugging ability

```
```
### Linux/Ubuntu
  - Your file dialogues might spawn behind the VSCode window.

     https://github.com/microsoft/vscode/issues/146422

     https://github.com/electron/electron/issues/32857
  - This was tested with Ubuntu 22.04
  - This also includes a fix for my Ubuntu 22.04 setup
    - This fix is in the .clangd cfg file ([added include directory](#linux-fixes))
    - Your version of Linux may or maybe not need this fix
  
  `Nov 2024`: Had trouble installing LLVM 18 for Unreal 5.5 (Ubuntu 22.04)

-  Found this to work 
- Make sure you don't have an `llvm.sh` file already in the directory you have open. The file you download won't overwrite the file already in your directory. It will name it something else.
- This will install LLVM 18.1.8 (`for Unreal 5.5, make sure to install the correct version for your version of Unreal`)
- Epic recommends 18.1.0
- In a perfect world, patch update versions wouldn't matter
- For me, it does seems to work fine but you could have problems. You can always build from source if you want the specific 18.1.0 version.

`Here's the instructions`:
1. wget https://apt.llvm.org/llvm.sh
2. chmod +x llvm.sh
3. sudo ./llvm.sh 18
```
```
### Mac M1/M2 Note
  - This extension has a setting that lets you set the `architecture` UBT flag
  - You can try setting this to `arm64`
  - You might not need this and is only provided for things to try in case it's not working
  - **note:** Do this before creating your project

```
```

[Top](#table-of-contents)

---

## About

This extension creates the files and config settings needed to get clangd working with Unreal Engine 5.2+

This doesn't run automatically. You must run a command to create the configs.

Windows and Unreal 5.2+(`non Full Source`) have been tested with:
- First Person template (Windows/Ubuntu 22.04)
  - This does have 'fake' errors but are fixable if you add required include files to the top of certain .cpp files 
  - See [this](#fps-template) section for more info

`Mac` will have to be tested by other users.

`Linux`: Tested with Ubuntu 22.04 using FPS Template

```
```

### Benefits

- After clangd [parses](#bottom-info-bar) your file, you open, you'll get:
    - Quick/Snappy code completions
    - No weird slow Header file code completions
- Uses '[non pch](https://docs.unrealengine.com/5.1/en-US/include-what-you-use-iwyu-for-unreal-engine-programming/)' mode which can warn of headers that should be included
- [Auto include](#auto-includes) is enabled by default which automatically pastes the correct include for any symbols you code complete
   - For headers this is automatically disabled as it doesn't make sense for headers. [see section](#auto-includes)
- [Adds](#auto-parameter-hints) auto parameter hints
- [Fixes](#delegate-function-name-completions) Delegate function completions
- Includes a basic clang [format](#clang-format-file) file which can be modified, greatly, to your liking
- If enabled, includes a basic clang tidy(linter) cfg file
  - **Off by default because you can't indiscriminately fix Unreal code with this**
  - **Some warnings it gives should not be fixed and the warnings themselves should be disabled!**
  - **See the clang tidy [section](#clang-tidy) for more details**
- This extension has an uninstall command which will remove the 'extension created' files and settings
  
```
```

[Top](#table-of-contents)

---
## Requirements

#### General Requirements

- Unreal Engine v5.2+
- Unreal project created for VSCode
- Requires specific LLVM/clang/clangd versions!
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.5
  - Make sure to select correct Unreal Engine version (the link goes to UE 5.5)
  - Requirements are only posted after a full release of UE. For Beta/Preview releases you'll have to test clang versions
- VSCode [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension (Do not let clangd extension auto install LLVM)
- Microsoft C++ [extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) for its `Building/Debugging` capability

`Note:` Read below for specific Windows, Mac, and Linux requirements

#### Mac (XCode/LLVM)
`note:` Versions for these are usually different for each release.

https://docs.unrealengine.com/5.3/en-US/hardware-and-software-specifications-for-unreal-engine/

- Make sure to choose the correct Engine version in the documentation (the link above is for UE 5.3)
- You still need XCode for it's libraries(See link above)
- Does XCode come with clang++,clangd,clang-tidy, and clang-format? Use that version
  - Else download the clang(LLVM) version specified in the `Linux` section of the above link
  - For Unreal 5.3 it would be LLVM 16.0.6
  - For Unreal 5.5 it would be LLVM 18.1.0

- `Nov 20224` Add new setting: "unreal-clangd.creation.MacFileLanguage"
  - This allows you to change the File Language from C++ to Ojbective C++
  - Git user szabot0412 said chaning the language to Objective C++ fixed his red squiggles
  - If more people confirm this then I might change Objective C++ to default file language

#### Windows (LLVM)
- Windows users should use the Linux clang(LLVM) version requirement
  - Make sure you select the correct Unreal Version for the Docs
  - Different Unreal versions require different LLVM versions
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.5
- Download clang/clangd from https://github.com/llvm/llvm-project/releases/
  - Filename will be LLVM-(version)-win64.exe (e.g. for UE 5.5.#, the filename will be 
LLVM-18.1.0-win64.exe )
  - Remember if not using UE 5.5.# the LLVM version will be different
- `note:` For best Unreal compatibility install LLVM in the default directory.

### Other requirements
#### Windows Requirements
- Visual Studio Build Tools 2022 
  - Download here: https://visualstudio.microsoft.com/downloads/
    - Scroll down to **Tools for Visual Studio** and download `"Build Tools for Visual Studio 2022"`
  - Direct Link https://aka.ms/vs/17/release/vs_BuildTools.exe

- Note: `Different versions of Visual Studio Build Tools 2022 are required`

    It's very easy to install different versions with the **Visual Studio Installer**.
    
    1. Open the Visual Studio Installer and click **Modify** on Visual Studio Build Tools 2022.

       ![image](https://github.com/boocs/unreal-clangd/assets/62588629/44aa6821-f123-4133-8399-39c20cc5c660)

    2. Now go to **Individual components**

       ![image](https://github.com/boocs/unreal-clangd/assets/62588629/d7e2c16e-bdf3-4bb2-a1e7-204ba285e991)

    3. Scroll down to all the listings for **MSVC v143 - VS 2022 C++ x64/x86 build tools**
    
       * For `Unreal 5.2` you want to enable `v14.34`:

          ![image](https://github.com/boocs/unreal-clangd/assets/62588629/b5d8f068-8e77-43f0-b68d-7f390f007d4c)

       * For `Unreal 5.3` you want to enable `v14.36`:

          ![image](https://github.com/boocs/unreal-clangd/assets/62588629/aec88536-557e-4171-96c3-c73d8dc15766)

       * For `Unreal 5.4` you want to enable `v14.38`
          - (Pic not shown)

       * For `Unreal 5.5` you want to enable `v14.38`
          - (Pic not shown)
    
    4. If you haven't created your Unreal project yet you can skip step 5
    5. For existing Unreal projects, run this extension's commands called: `Update Compile Commands file`
       * This command is the same command that also refreshes your project

#### Ubuntu 22.04 Requirements
- dotnet-runtime-6.0
- dotnet-sdk-6.0 (Only needed for seeing UBT logs when updating compile commands)

`Nov 2024`: Had trouble installing LLVM 18 for Unreal 5.5 (Ubuntu 22.04)

-  Found this to work 
- Make sure you don't have an `llvm.sh` file already in the directory you have open. The file you download won't overwrite the file already in your directory. It will name it something else.
- This will install LLVM 18.1.8 (`for Unreal 5.5, make sure to install the correct version for your version of Unreal`)
- Epic recommends 18.1.0
- In a perfect world, patch update versions wouldn't matter
- For me, it does seems to work fine but you could have problems. You can always build from source if you want the specific 18.1.0 version.

`Here's the instructions`:
1. wget https://apt.llvm.org/llvm.sh
2. chmod +x llvm.sh
3. sudo ./llvm.sh 18

#### Arch Linux Requirements
- dotnet-runtime-6.0
- clang
- dotnet-sdk-6.0 (Only needed for seeing UBT logs when updating compile commands)


```
```

[Top](#table-of-contents)

---
## Older Unreal Versions
I probably won't release this for older Unreal versions. 5.0.0 had many compile command bugs(at least for Windows). These bugs are fixable just by using the clangd cfg so 5.0.0 would work with clangd...

The other reason was a Unreal design change. 5.0.0 uses compile commands while 5.1.1+ uses compile commands + response files. It would require  a little bit different extension code.

```
```

[Top](#table-of-contents)

---

## Extension
### Commands

* `unreal-clangd.createUnrealClangdProject`: Creates all files and settings for clangd to work with an Unreal project
* `unreal-clangd.updateCompileCommands`: Creates/Updates the compile commands file which clangd uses for Intellisense. Created in project/.vscode folder. **(Extension will, in most cases, prompt you to update automatically)**
* `unreal-clangd.uninstall`: Uninstalls Unreal-clangd files and settings **(It will prompt you before deletion)**
* `unreal-clangd.fixIntellisenseFiles`: Runs the quote fix for paths in response files **(Will auto run if setting is true)**
* `unreal-clangd.tidyNoLintCurrentLine`: Removes clang Tidy linting on current line
  - **Modifies code**
  - **Also found in context menu**
* `unreal-clangd.tidyNoLintNextLine`: Removes clang Tidy linting on next line **(Modifies code)**
  - **Modifies code**
  - **Also found in context menu**
* `unreal-clangd.tidyTEST`: Pastes code that produces clang Tidy warning **(Modifies code)**
  - **Modifies code**
  - **Also found in context menu**

```
```

### Settings

* `unreal-clangd.IntellisenseType`: This is always set to 'Native' even if switched (for now)
#### Native
* `unreal-clangd.native.minutesTillIntellisenseFilesAreOld`:
    - Can cause circular run of Update Compile Commands if set too low. You can also run Update Compile Commands manually if you run into trouble with it being too high.
* `unreal-clangd.native.code-workspaceFileBackupSettings`:
    - Array so you can specify which settings to backup in your *.code-workspace file when the native `Update Compile Commands` is run. This runs UBT's 'refresh project files' command that will overwrite your *code.workspace file. Some settings will automatically be backed up and are listed in your settings.
#### Compile Commands
* `unreal-clangd.compileCommands.execType`: Task | Debug
    - **Debug requires Microsoft C# extension which lets you see UBT logs**
* `unreal-clangd.compileCommands.platform`: **Leave blank for auto detection**
* `unreal-clangd.compileCommands.architecture`: **Most users can leave this blank**
  - Mac M1/M2 users should set this to arm64 (not tested)
#### Creation
* `unreal-clangd.creation.overwrite`: Allows overwriting of project. **note: You don't need to set this manually**
  - "partial": Never overwrite but create files/settings that haven't been created
  - "full": Overwrite everything
* `unreal-clangd.creation.completionHelper`: true(default) Needed to make code completion functional. Creates a completionHelper.cpp and adds it to compile_commands.json
* `unreal-clangd.creation.completionHelperMP`: true(default) Also add UnrealNetwork.h(multiplayer) to completionHelper.cpp
* `unreal-clangd.creation.tidy`: false(default) creates a clangd tidy file, during creation command, if true **(see clang tidy section)**
* `unreal-clangd.creation.MacFileLanguage`: Can switch Mac file language support to C++ or Objective C++
#### Editor
* `unreal-clangd.editor.parameterHints`: Automatically pops up param hints windows after function name completion
  - disabled:
  - needed: `(default)` Only on functions that require parameters
  - all: Will also work on functions with only Default Parameters and Empty parameters
     - This setting has a side affect of moving the cursor inside the function parentheses
     - Also activates when copying and pasting a function

#### Fixes
* `unreal-clangd.fixes.intellisenseFiles`: Enables/disables Change or fix intellisense files when needed. **(This will auto fix whenever it detects compile command changes)**
* `unreal-clangd.fixes.delegateFunctionCompletions`: Some delegate functions completions aren't correct because of macro expansion. This will fix the completion when detected.
  - See [this](#delegate-function-name-completions) section for more info
* `unreal-clangd.fixes.focusSuggestionDelay`: Fixes code completion selection not happening with parameter hints. Default 350 [see section](#function-parameter-completions)
#### Completion
* `unreal-clangd.completion.openCompletionHelperOnStartup`: Opens completionHelper.cpp on startup. 'Hack' to add Unreal 'macro' symbols to code completion.
* `unreal-clangd.completion.completionHelperInfoOnStartup`: You can disable warning message about completionHelper.cpp on startup

```
```

[Top](#table-of-contents)

---

## Installation

This extension is installed manually with a VSIX file downloaded [from this github](https://github.com/boocs/unreal-clangd/releases)

To install the VSIX file in VSCode do the following:

![](https://user-images.githubusercontent.com/62588629/225083466-39ca4a93-e06a-4a04-83ba-82d60b548513.png)

1. Click the extensions icon
2. Click the ellipsis (3 dots)
3. Choose Install from VSIX...

```
```

[Top](#table-of-contents)

---

## Creating a Unreal Clangd Project

- `Note:` The default is not seeing the debug info when creating Intellisense files. If you run into any problems, you can change this with this setting:

    ![](https://user-images.githubusercontent.com/62588629/225502685-2b4df67c-182a-4686-b7d8-4a79183192c3.png)

    `Note:` Weirdly Debug was faster than Task when testing a Full Source project
* You may see this window popup because you have clangd and Microsoft extension installed at the same time.
   - **Ignore this, it will go away soon**

     ![](https://user-images.githubusercontent.com/62588629/224883775-e7548187-d12d-4787-b143-19f31ec2fa8f.jpg)

Here's a `movie `of the installation process. `Step by Step` instructions are below the movie:

https://user-images.githubusercontent.com/62588629/235394029-1319054d-9224-4ac0-8578-9e5ea0e2d0f0.mp4


1. Make sure the correct clangd version is installed and you have all the [requirements](#requirements)
1. Build your project without errors
1. Inside VSCode press F1 and search for `unreal clangd`
    - It should list all the commands this exention has
1. Choose the `Create Unreal clangd project` command:

    ![](https://user-images.githubusercontent.com/62588629/225482780-2642ee39-5425-469a-89dd-96884f60125a.png)

1. The first thing that will happen is it will add settings to remove the extension conflict warning. It will then reload the VSCode window and continue installation.

1. Because we haven't created a compile commands file yet it'll ask you to do so:

    ![](https://user-images.githubusercontent.com/62588629/225499256-66135d68-03e3-4b7b-bd27-910f04691a47.png)
1. After choosing Yes, at the top of VSCode you'll be given a list of Build Targets to choose from. The `Editor suffix` Build target is usually the best choice and the one that should be at the top of the list:

    ![](https://user-images.githubusercontent.com/62588629/225500170-a036dd89-f741-4b0e-a7c0-cba9c58a51a9.png)
    
1. A window will pop up showing you the creation options you have set:

    ![](https://user-images.githubusercontent.com/62588629/225504422-dd992f6b-2641-40a0-b346-1069960a472e.png)

1. After a file dialogue will appear so you can select your clangd executable.
  
    For example, on `Windows`, my clangd executable is found at:
    **C:\Program Files\LLVM\bin\clangd.exe**

    On `Ubuntu` it was found at: 
    **/usr/lib/llvm-16/bin/clangd**  (If installing for `Unreal 5.3`)

    On `Arch Linux` installing the `clang` package it was found at:
     /usr/sbin/clangd

    `Ubuntu/Linux:` Your file dialogue might spawn behind the VSCode window:

      * https://github.com/microsoft/vscode/issues/146422

      * https://github.com/electron/electron/issues/32857

    
1. And finally it'll ask you to reload the VSCode window:

    ![](https://user-images.githubusercontent.com/62588629/225506131-3f47e01d-11f3-47b2-8b96-fe9470db3414.png)

1. After creating and reloading your project you might get this window pop up.
   - Choose: **Yes, use this setting**

     ![](https://user-images.githubusercontent.com/62588629/224883778-45d20c22-9a7e-4e79-aee3-ba0e7148d09b.png)
1. `Intellisense should now start working!`
   - Remember to wait for your file to be [parsed](#bottom-info-bar) by clangd

1. Your project should not have any Intellisense errors
    - Of course if you have clang Tidy enabled you may have a lot of warnings

15. If your project has errors it could be because you have missing include files in your cpp files
    - This is because we're using the non-pch mode for Intellisense
    - See [this](#fps-template) section for an example
    
1. It's also possible, if you have errors, that .clangd isn't setup properly

```
```

### Creating a Clang Tidy cfg On a Later Date

If you noticed above, in the Creating a Unreal Clangd Project section, the command line option `-tidy` was disabled. You may not want to mess with clang Tidy at first. This will show you the easiest way to install the clang tidy cfg on a later date.

  1. First open your project's .vscode/settings.json file
  
      ![](https://user-images.githubusercontent.com/62588629/225807084-4c18b6a8-671d-4cb4-9df4-e35a80028f8b.png)

  2. Add these settings to the settings.json file
     
     ```
     "unreal-clangd.creation.tidy": true
     ```
  3. Press F1 and run the Create Unreal Clangd Project command again

       ![](https://user-images.githubusercontent.com/62588629/225809141-01e39abf-0928-4cc4-a5e9-f5e3c2a82c52.png)

  4. Go through the creation process again but choose the 'Partial' install option

      Note: If you choose the `Partial` install option it shouldn't overwrite any other files and settings.

  5. `The clang tidy linter should now work!`

  6. Oh no!

      ![](https://user-images.githubusercontent.com/62588629/225810841-0eaaf8c6-090c-4c53-807a-7a43e658e631.png)

  7. See the [clang tidy](#clang-tidy) section for more info.

```
```

[Top](#table-of-contents)

---

## Unreal Source support
Starting with extension version 2.6.0, it now support Unreal Source files

  - `Requirements:` Must have created a VSCode project using Unreal/UBT
    - This is because this extension uses the files that were created for your project

  - When creating a project it will also create a .clangd file in the Unreal directory(only if there isn't one there)
  - It will never overwrite a clangd file in your Unreal directory
  - You can also use the command: `Create Unreal Source Support` if you want to only create a Unreal Source support project
  - This dynamically creates a compile commands file based on the response files that are created when you created your Unreal project

`Note:` This extension turns off errors for .cpp files `for Non-Full source Unreal Engine Files`
  - This is because some .cpp files have special include macros
  - The files required for these include statements don't exist in Non-Full source projects
  - This shouldn't affect anything
  - `This won't affect your project files`. Just Unreal Source files.
  - This is feature is found in the .clangd file in the Unreal Engine parent directory so it can easily be removed if you want

  #### Example of an erring macro below(I believe there are other include macros that error)
  ![](https://private-user-images.githubusercontent.com/62588629/386956610-48b676d1-e1cb-4f10-8cd0-50ca4ff13416.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MzE4NDY4MDEsIm5iZiI6MTczMTg0NjUwMSwicGF0aCI6Ii82MjU4ODYyOS8zODY5NTY2MTAtNDhiNjc2ZDEtZTFjYi00ZjEwLThjZDAtNTBjYTRmZjEzNDE2LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDExMTclMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQxMTE3VDEyMjgyMVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTc4YTE5MDFiOTg5ZGE0MjM0ZmU2YWUwZmI5NjNjYzM5ZWEyNTY0MmFkNjVlMjg0NmNhNWJjMGUyMWEwODIzNTgmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.AhQMn4Qne-jcUq6xfVeyc1uPgB2VuxjRiXlPMW-Wk84)

```
```

[Top](#table-of-contents)

---

## Info
### Logs
Click the console 'OUTPUT' tab and change the top right drop down to 'unreal clangd':

* ![](https://user-images.githubusercontent.com/62588629/233814109-2ff37ccf-faaa-4fc0-bf77-e9e85bfa6120.png)
```
```
### Clangd Project Files

### **.clangd file**
Lets you Add/Remove Intellisense compile flags that clang uses, among other things. See [clangd docs.](https://clangd.llvm.org/config)

**note:** A lot of functionality was added with clangd-14 so won't work wth earlier versions



### **.clang-format file**

The clangd extension will take over formatting of your C++ documents.

The .clang-format file will be located in your project directory.

This extension creates a bare minimum format file that makes code look pretty good.

**Note:** This can be highly customized. There are even websites that will generate .clang-format files to your liking.

For more format settings info: https://clang.llvm.org/docs/ClangFormatStyleOptions.html


### **.clang-tidy file**
Used for the C++ linter. You can see the docs [here](https://clang.llvm.org/extra/clang-tidy/)

Check the [Tidy Section](#clang-tidy) for more info.

```
```
### **Bottom Info Bar**
VSCode's bottom info bar can tell you info about clangd's opened file status.

It will show Parsing and Indexing.

* When you first open a file you need to wait for these to finish before using code completions.

* When you include or auto include a header file you also need to wait

* You can also tell a file is done parsing because the #includes will be underlined
  * Note: Indexing might not be done yet though. I would wait for that as well.

![](https://user-images.githubusercontent.com/62588629/228985953-7a45460c-cc19-42ed-92bc-4a09c98a0d0c.png)


```
```
### *.code-workspace file
This contains clangd settings for your project.
You can change these from the default if you like.

The file is located in your project's parent folder.

`Warning`: Using the Unreal Engine's `Refresh Visual Studio Project` or `Generate Visual Studio Project files` command will overwrite this file. See [this](#refresh-visual-studio-project) section.


```
```

[Top](#table-of-contents)

---


## Code Completion
### **completionHelper.cpp**
No Unreal source headers are added to your project's compile_commands.json.
So how do we get Unreal symbols for code completion?

I've come up with a solution called completionHelper.cpp

It contains includes that have a lot of the more popular Unreal class and function symbols for code completion. It also gets added to compile_commands.json every time it gets updated.

`note: Please let me know if any other headers should be included by default`

There is a problem though. Macros don't show up and Unreal uses a lot of macros.

Here is an example from UnrealNetwork.h:

![](https://user-images.githubusercontent.com/62588629/230822835-ae27db30-4f12-45b9-9d08-2d7ff8a6cc7f.png)

I've come up with another solution. If we `open completionHelper.cpp at the start of VSCode`, and let clangd [parse](#bottom-info-bar) the file, Macro symbols do load and are available to code completion!

![](https://user-images.githubusercontent.com/62588629/230821304-973d50c7-9d14-4ad3-80a2-5d6defedf16e.png)

`This feature is enabled by default`

![](https://user-images.githubusercontent.com/62588629/231932714-ec1c1fac-0512-44a0-8ff2-28539214b6ab.png)

```
```
### Adding plugin headers

If we add plugins we need the ability to also add the plugin's header symbols into clangd's code completion.

Here's a workflow I've come up with:

1. Let's say we've added the plugin `EnhancedInput` to your project's *.build.cs

   ![](https://user-images.githubusercontent.com/62588629/231914264-91aec970-41f2-4f49-9aea-b6bb25462263.png)

1. Once we do so, we need to `update compile_commands.json` using the extension command.
Doing this should include the plugin's path in your include paths.

   ![](https://user-images.githubusercontent.com/62588629/231914528-3808d25e-1d18-439f-82bd-e325db58460a.png)

1. Updating compile_commands.json should automatically reload VSCode. completionHelper.cpp should now be open.

1. Once completionHelper.cpp loads, we can now type a temporary include to try to find that path the holds the plugin's header files. The path is in code completion because of our previous steps.

   ![](https://user-images.githubusercontent.com/62588629/231915031-5e512d74-8a25-4d05-9908-42a4b1ef0fbe.png)

5. When you hover over the file path it'll show you how to open that file:

   ![](https://user-images.githubusercontent.com/62588629/231915255-0676584b-3bbd-466d-a3db-c0b852b9854a.png)

6. Follow the link to open the file and don't switch away from the file.

   ![](https://user-images.githubusercontent.com/62588629/231917347-1be7889d-087f-477c-abb5-da5f68539d00.png)

7. Now we run the extension's command to Add Headers:

   ![](https://user-images.githubusercontent.com/62588629/231915456-34993a40-a197-465c-bb43-fca3eb4682a4.png)

8. Because we had the plugin's file open, the folder chooser dialog should have the correct folder already open:

   ![](https://user-images.githubusercontent.com/62588629/231940561-cb9c5661-3d1f-428b-b4ee-b65c79c48db8.png)

   `Note:` Ubuntu/Linux users see [here](#ubuntulinux-file-dialogues) if file dialogue doesn't appear.

9. If the file dilogue doesn't open to the directory of the file you currently have open, you can always copy the plugin's file directory from VSCode's left panel and paste it into the dialogue:

   ![](https://user-images.githubusercontent.com/62588629/231915905-c4bd539c-8276-4537-a619-33e0e3f2f4ce.png)

10. When you choose the folder, the header files are copied to completionHelper.cpp

    `note: I manually removed the temporary #include from the previous step`

    ![](https://user-images.githubusercontent.com/62588629/231916608-04f8be2a-883f-4483-b09f-44bc074f484e.png)

11. In the above example, it copied 18 header paths. Try to copy only the headers you need. Don't copy parent directories which would include hundreds of headers.

```
```

### **Adding Virtual Functions quirk**

When you include the return type you won't get code completion (note: the completion shown is a user made snippet):

![](https://user-images.githubusercontent.com/62588629/232259155-8da0a452-bf7c-4b32-90ca-0e60f70d5b5c.png)

`Leave out the return type to get completions:`

![](https://user-images.githubusercontent.com/62588629/232259110-575a8e0f-5db4-41e7-83fb-82b233e0331e.png)

```
```

### **Snippets with Inline setting**
The snippet inline setting doesn't appear to work with clangd. User snippets will be found at the bottom of the code completion list. You could use the Top setting, for snippets, but many would find that annoying.

If you're looking for snippets you can press the Up Arrow key to get to the bottom of the code completion list.

```
```
### **Font Size**
You can change the font size of the code completion window:
* Open the `*.code-workspace` file in your project's parent directory
* Find the `"editor.suggestFontSize"` setting and set it to a setting that lets you see the parameters of functions in the code completion window.

  `Note:` The "editor.suggestFontSize" setting should already be set to `0` in the *.code-workspace file. The zero setting sets it to the same font size as the editor.
```
```

[Top](#table-of-contents)

---

## Updating Compile Commands

This extension should automatically detect when you need to update compile commands and ask you if you would like to update.

It should auto detect when:
* Adding a new .h or .cpp file
* Running a task with the words Rebuild or Clean

`Note`: If you add a plugin to your *.build.cs file, you'll need to run the command manually.

#### Manually
Run extension command 'Update Compile Commands' manually to fix fake red squiggles that may rarely happen.

![image](https://user-images.githubusercontent.com/62588629/231914528-3808d25e-1d18-439f-82bd-e325db58460a.png)

```
```

[Top](#table-of-contents)

---

## Fixes
### Quotes Around Paths in Response Files
This was causing problems with the Windows config. Paths with spaces weren't being included so would cause errors. This fix, which is `enabled by default`, will try to fix all the paths without quotes.

```
```
### Delegate Function Name Completions
Clang does macro expansion causing functions, that use macros, to have incorrect code completion.
When code completing delegates, some of the function names might appear like so:
  - ![](https://user-images.githubusercontent.com/62588629/224883780-027ef162-04e4-4c80-b522-345d31de5023.png)

  - These are `real/legit` function names
  - You'll probably use some of these functions in most of your projects!
  - If you complete the completion, the wrong functon will be used
  - This extension has a fix that is `enabled by default` but  you can disable it like so:

  - ![](https://user-images.githubusercontent.com/62588629/224905249-a42a6c72-c199-4f24-9815-f60d9fd455e9.png)
  - **Without** the fix enabled, the incorrect function is completed:

    ![](https://user-images.githubusercontent.com/62588629/224905373-b09e6d85-0c0b-4881-ad3d-d2a8966b4fec.png)

  - **With** the fix enabled, the correct 'function' is used:

    ![](https://user-images.githubusercontent.com/62588629/224905537-d1c24ecc-cb26-483a-aabc-f308b081cee4.png)

```
```
### Function Parameter Completions
When typing in function parameters, completion choices wouldn't show.

The setting editor.suggest.snippetsPreventQuickSuggestions was to blame.

We set this to false in the settings.json file in your project's .vscode folder.

Thanks to Mark at [stackoverflow](https://stackoverflow.com/a/76096050/13950944) for fix!

```
```
### Linux Fixes
`Nov 2024`: Had trouble installing LLVM 18 for Unreal 5.5 (Ubuntu 22.04)

-  Found this to work 
- Make sure you don't have an `llvm.sh` file already in the directory you have open. The file you download won't overwrite the file already in your directory. It will name it something else.
- This will install LLVM 18.1.8 (`for Unreal 5.5, make sure to install the correct version for your version of Unreal`)
- Epic recommends 18.1.0
- In a perfect world, patch update versions wouldn't matter
- For me, it does seems to work fine but you could have problems. You can always build from source if you want the specific 18.1.0 version.

`Here's the instructions`:
1. wget https://apt.llvm.org/llvm.sh
2. chmod +x llvm.sh
3. sudo ./llvm.sh 18

### Mac Fixes
- `Nov 20224` Add new setting: "unreal-clangd.creation.MacFileLanguage"
  - This allows you to change the File Language from C++ to Ojbective C++ (`during clangd project creation`)
  - Git user szabot0412 said changing the file language to Objective C++ fixed his red squiggles
  - If more people confirm this then I might change Objective C++ to default file language for Mac users

  #### Manual Mac File Language Fix
  - Open up your .clangd files in your project parent directory and Unreal Source parent directory
  - Change this line under `Add:`
    ```
      - -xc++
    ```
    Change to this:
    ```
      - -xobjective-c++
    ```

```
```

[Top](#table-of-contents)

---

## Auto Includes

clangd has an cool auto include feature.

When adding a symbol(e.g. class) to your code, it will automatically add the #include for the symbol!

* The white dot, to left of completion symbol, shows what completions will also do auto include
* You must wait, [see info bar section](#bottom-info-bar), for clangd to process the symbols in the new header.

https://user-images.githubusercontent.com/62588629/235394484-329cd42f-6eae-4c61-80f5-42664b120efe.mp4


`This feature is enabled by default`

To disable:

1. Open your \(ProjectName\).code-workspace file (In your project's parent directory)
2. Change this line:
```
"-header-insertion=iwyu",
```
3. To this:
```
"-header-insertion=never",
```
4. Reload VSCode (or Restart)
5. Choose 'Yes, use this setting' when asked:

   ![](https://user-images.githubusercontent.com/62588629/224883778-45d20c22-9a7e-4e79-aee3-ba0e7148d09b.png)


```
```
### Enabling Auto Include for Header Files
Auto include doesn't make much sense for header files. You usually forward declare. It also does some silly stuff like including the header for UPROPERTY.

`Auto include for headers is default disabled`

You can enable it for header files in this extension's settings:

`note: I strongly recomment not to do this`

![](https://user-images.githubusercontent.com/62588629/229004768-c9c25b12-86ce-4e2b-b4c4-b23d7a83d94f.png)

`There is a side effect with disabling Auto Include for headers that can be easily solved. See next section below.`
```
```

### Pasting #include Line in Headers

In a rare case, you may want to paste an #include line in your header file.

If you have Auto Include disabled for header files, then pasting an #include line will also be removed.
- To fix, just use Undo (Ctrl-Z) to get your #Include line back

### Quick Fix Auto Include
Some includes need to be done with the quick fix feature.

The source file doesn't know about the UCharacterMovementComponent* returned by GetCharacterMovement()

  - ![](https://user-images.githubusercontent.com/62588629/232264880-715c344c-edce-40fa-be2d-01f9fd532048.png)

If we hover the cursor over the red squiggle a window will pop up:

   - ![](https://user-images.githubusercontent.com/62588629/232264903-7bb5e502-65aa-475f-95a1-c0e5c8152ff2.png)

We can choose 'Quick Fix...' to get another pop up to add the correct header file:

  - ![](https://user-images.githubusercontent.com/62588629/232264920-64318a5c-76f5-4c02-86cf-395968f35f82.png)

```
```

### Auto Include Failure

What to do when auto include fails?

* ![](https://user-images.githubusercontent.com/62588629/232331743-dd81354a-8304-45f4-99e5-6cd97c103196.png)

You can `temporarily` type the class name to bring up the completion window:

* ![image](https://user-images.githubusercontent.com/62588629/232331669-e89bf291-ec67-4009-bbc1-838a639bb006.png)

**`Press Enter key to finish the completion and auto include the header`**

After clangd processes the new header your code should now work! 

* ![image](https://user-images.githubusercontent.com/62588629/232331885-2653c7fc-d5f7-4ad5-b4e4-5ce4eb7dffcd.png)

Note: You can also `temporarily` type a symbol on a blank line and finish the completion to get the auto include to happen. You don't need to do it inside your code like the above example.

```
```

[Top](#table-of-contents)

---

## Auto Parameter Hints
Clangd parameter hints don't trigger automatically but this extension `enables this functionality by default`.
If you disable this setting, you can trigger parameter hints manually using a VSCode shortcut.
Search VSCode keyboard shortcuts for your keybinds.

![](https://user-images.githubusercontent.com/62588629/225048674-a8ec2da0-15e8-4efc-9c24-e104490dccee.png)

If you want to change the Auto Parameter Hints setting you can do so:

![](https://user-images.githubusercontent.com/62588629/225049882-de6de4d3-09f3-4ec4-823b-c14083518fbc.png)

With the setting enabled, you wont have to use a keyboard shortcut to get parameter hints:

![](https://user-images.githubusercontent.com/62588629/225059083-6d36b78b-3d47-4bdc-bdc2-77b820a9e803.png)

### Side Effects using 'all' setting
If you use the 'all' setting, functions with only default parameters and empty parameters will also trigger the auto parameter setting. Some side effects include:
  - The cursor must be moved for these particular functions
  - Copy and pasting a function with an empty parameter will trigger the cursor move and parameter window

**The 'needed' setting value will not have these side effects**

```
```
### Template Functions

Auto Parameter Hints doesn't work with template functions. This could be a clangd version problem.

You must use the keyboard shortcut to trigger them when you get to the non-template parameters.

Check above on how to see your keybind for parameter hints. The default keybind, for Windows, is Ctrl+Shift+Space.

```
```

[Top](#table-of-contents)

---

## Inlay Hints

Note: Inlay Hints are new to Unreal because of the updated clangd version.

Inlay Hints show the variable names of function parameters and more.

`On:`

![](https://user-images.githubusercontent.com/62588629/236118340-c49c78c1-0d79-4fb9-8130-73a214bdad00.png)

`Off:`

![](https://user-images.githubusercontent.com/62588629/236118474-17da67c2-8095-4eb1-921e-31f0be691ec9.png)

```
```
### Disable Inlay Hints

1. Open the `.clangd` file in your project's parent directory
1. Under `InlayHints:` change Enabled to No like so:
    ```
    InlayHints:
      Enabled: No
    ```

```
```
### View Options

**To Adjust Color:**
1. Open your *.code-workspace file in your project's parent directory
2. Adjust these settings that should already be there:
    ```
    "workbench.colorCustomizations": {
		"editorInlayHint.foreground": "#a2a2a2c0",
		"editorInlayHint.background": "#00000000"
	}
    ```
   `Note:` These colors aren't the default since the default colors didn't look good

**To Adjust Size:**

This setting isn't in the *.code-workspace file but you can add and adjust it to your liking:

  ```
  "editor.inlayHints.fontSize": 12
  ```



[Top](#table-of-contents)

---
## Clang Tidy

Clang Tidy is off by default. This is because there's a lot of ambiguity that applies to what clang tidy code Checks to enable/disable. 

I've created a separate guide to clang tidy:

https://github.com/boocs/Unreal-clang-tidy-guide

`Note`: In the settings of this extension you can enable a Tidy setting so that whenever you create a project it will automatically create a .clang-tidy file.

```
```

[Top](#table-of-contents)

---

## Go to Symbol in Workspace

If you make use of this VSCode menu item, there is a clangd setting you might want to look at.
Open your project's *.code-workspace cfg file in your project's parent directory.
Change the setting:
```
-limit-references=2000
```
The default for this setting is 2000.
You can set it to `0 for unlimited` or set it to whatever you like.

Note: I don't know what performance impact this has.

```
```

[Top](#table-of-contents)

---

## Reinstall Without Overwrite

This is now easier than early extension versions.

Just run the Create Unreal Clangd Project command again using the `Partial` option when prompted

  ![](https://user-images.githubusercontent.com/62588629/225809141-01e39abf-0928-4cc4-a5e9-f5e3c2a82c52.png)

Because we chose the `Partial` options it shouldn't overwrite any other files and settings.


```
```

[Top](#table-of-contents)

---

## Uninstalling

Run the `unreal-clangd.uninstall` command to uninstall the files and settings created by this extension.

It will show you what files will be deleted and if you want to delete them permanantly or send them to the trash.

It will ask which settings to delete and if you want to delete the settings for the project only or globally as well.

Here's a `movie` of the process:

https://user-images.githubusercontent.com/62588629/235394362-533ec9d5-669c-4f3e-a292-51823bbaac3b.mp4


```
```

[Top](#table-of-contents)

---

## Full Source Project

A full source Unreal project seems to work but does have some quirks.

```
```
### Task vs Debug
It seems when updating compile commands it takes a long time when using the `task` exec type  instead of the `debug` exec type. This is counterintuitive so not sure what's going on there.

You can see how to `change` the default `task to debug` using the Exec Type setting [here](#creating-a-unreal-clangd-project)

If you change the Exec Type setting to `debug` you'll need to install the [Microsoft C# extension](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csharp)

```
```
### C# Intellisense Errors

After installing the C# extension you may get this window.

When this windows pops up choose "Do not load any":

![image](https://github.com/boocs/unreal-clangd/assets/62588629/0739a3c0-2427-40c2-be1c-a4817b30acb0)

`Note:` If you already set a default, then the setting should be found in your project's *.code-workspace file

You can remove it if it's not working correctly.

    "dotnet.defaultSolution": "UE5/Engine/Plugins/ScriptPlugin/Source/Lua/Lua.sln"

---
### clangd indexing 

Because we're using Full Source clangd indexing took longer:
  * It took less than 3 minutes
  * It only happens after you first install. Subsequent indexing will be faster.

```
```

[Top](#table-of-contents)

---

## Compiler Path

You can auto set your compiler path when creating a project using this setting:

![](https://user-images.githubusercontent.com/62588629/236426669-d1812e6e-87c5-4a56-8ed0-7918de4eaf14.png)

`Note:` Most people wont need to set this

### Why set this?

Windows:

`note:` This is no longer possible with Unreal 5.3. You need to install LLVM 16.0.6 in it's default folder because Unreal Build Tool needs to see the LLVM path and won't be able to in a nonstandard directory.

If you're not Building Unreal with clang(only using it for Intellisense) and you're using both Unreal 5.1.1 and 5.2.0 you could install LLVM 15 in a non-standard directory. clangd 13.0.1 doesn't have the ability to change the compiler path. LLVM 15.0.1 does though.

Unreal will use clang 13.0.1 because it's in the default path when your really want 15.0.1 with Unreal 5.2.0

Linux:

Unreal usually adds their own clang path. You can change this if you like.

### Manually Set Path

* Open your `.clangd` file in your project's parent folder
* Add `Compiler:` under `CompileFlags:` like so:
  ```
  CompileFlags:
    Add:
      - -D__INTELLISENSE__
    Compiler: C:\Program Files\LLVM-15\bin\clang-cl.exe
  ```
* Note: Your path will probably be different
```
```

[Top](#table-of-contents)

---

## Help

You can post bugs or ask questions here:

https://github.com/boocs/unreal-clangd/issues


```
```

[Top](#table-of-contents)

---

## Known Issues
1. Adding code or a space, in a header file, **anywhere** above the GENERATED_BODY macro will cause red squiggles. This is because the GENERATED_BODY macro uses the \_\_LINE\_\_ preprocessor macro. 

    **You'll need to Build your project to get rid of the red squiggles.**

2. Code completion sometimes doesn't work

    I've run into this bug. Pressing control+space (Windows) will manually activate Code Completion. Look up your keyboard shortcut for your system.

3. You can close/reopen file to refresh Intellisense.
  
   You can also try typing a space, wait half a second, and delete the space.

4. If you add a plugin to *.build.cs you'll need to run the extension command to Update Compile Commands.
    - See [this](#adding-plugin-headers) section for more info

```
```
### Parameters for UPROPERTY
Just like the Microsoft C++ extension, parameter code completion for UPROPERTY(and others) macro doesn't work.

I created an extension for this:

https://github.com/boocs/UE-Reflection-Func-Params
```
```
### Refresh Visual Studio Project
`Warning`: Using the Unreal Engine feature to `Refresh Visual Studio Project` or `Generate Visual Studio Project files` will overwrite your *.code-workspace file.

This file contains your project's clangd settings!

See [this](#reinstall-without-overwrite) section on how to easily reinstall without overwriting other settings.

```
```
### Adding a Different Source Folder
When creating a project it pulls all the Source folders from the compile commands file.

If you add a source folder(e.g. Plugins) after the fact, then Intellisense wont work for this folder.
You can fix this easy by adding the folder name to the .clangd file like so:

![](https://user-images.githubusercontent.com/62588629/226145617-8dd23291-03d4-4677-85ca-6ddaf13b05a0.png)

You'll also need to run the Update Compile Commands command:

![](https://user-images.githubusercontent.com/62588629/231914528-3808d25e-1d18-439f-82bd-e325db58460a.png)

```
```
### Ubuntu/Linux File Dialogues
File dialogues currently spawn behind VSCode:

https://github.com/microsoft/vscode/issues/146422

https://github.com/electron/electron/issues/32857

```
```
### Installing Microsoft C++ Extension After Install

The extension `now detects` that the Microsoft C++ extension is installed and will auto set correct settings on startup or reload.

```
```
### Resizing Code Completion Window
Some might not know you can do this. With how function name code completions work, you may need to do this to see the parameters.
* Just grab and drag the edge of the code completion window like you normally do.
```
```

[Top](#table-of-contents)

---

## Release Notes
See [CHANGLELOG](/CHANGELOG.md)

```
```

[Top](#table-of-contents)

---

## More Info
### Lyra
This is the setting that can crash clangd (`note`: This should be tested with later clangd versions to see if it has been fixed)
```
readability-static-accessed-through-instance
```
This is automatically disabled when you create a project with tidy enabled.

Here is more info about the crash:
```
// Code that crashes when clang tidy setting readability-static-accessed-through-instance is enabled
// This code is found in Lyra's LyraCameraComponent.cpp and LyraPlayerCameraManager.cpp
DisplayDebugManager.SetFont(GEngine->GetSmallFont());
```

### FPS Template
This extension uses the non-pch version of Intellisense which will show missing include files that will show up as 'fake' errors on pch verson projects.

The FPS Template that Epic provides has some of these errors.

To fix this you just need to include some header files:

For *Character.cpp
```
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"
```

For TP_WeaponComponent.cpp
```
#include "Animation/AnimInstance.h"
#include "Engine/LocalPlayer.h"
```


---

```
```

[Top](#table-of-contents)
