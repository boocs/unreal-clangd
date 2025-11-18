
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

`Linux`: Unreal 5.7 - See [upgrading older projects](#upgrading-older-projects) section on upgrading from Unreal 5.6 without extension project reinstall

`WARNING`: Extension version `3.0.0+` has breaking changes. To upgrade version `2.0.0+` projects see section:

   -  [Upgrading Older Projects](https://github.com/boocs/unreal-clangd?tab=readme-ov-file#upgrading-older-projects)


`note`: Ubuntu users: I started getting this error message wtih 5.6.0 but it still seemed to work.
   - Unable to watch for file changes. Please follow the instructions link to resolve this issue.
   - See [here](https://code.visualstudio.com/docs/setup/linux#_visual-studio-code-is-unable-to-watch-for-file-changes-in-this-large-workspace-error-enospc)

---
---

# Table of Contents
- [Updates](#updates)
- [Important info](#important-info)
- [Info](#info)
- [Requirements](#requirements)
    - [General](#general)
    - [Windows](#windows)
    - Also see:
         - [Installing correct LLVM (clangd/clang) version](#installing-correct-llvm-clangdclang-version)
         - [Installing correct Libraries (Windows)](#installing-correct-library-versions-windows)
         - [All supported version requirement links](#all-supported-unreal-version-requirement-links)
- [Recommended Extensions](#other-recommended-extensions)
- [Quick Start Guide](#quick-start-guide-ue-52)
   - [Existing Projects](#8-existing-projects)
   - [Quick Trouble Shooting](#9-quick-trouble-shooting)
- [More Documentation](#documentation)
- [Upgrading Older Projects](#upgrading-older-projects)
- [Mac Support](#mac-support)
- [Troubleshooting](#troubleshooting)
  - [Command: Show Project Info](#show-project-info)
  - [GENERATED BODY Macro causing red error squiggles](#generated_body-macro-causing-red-error-squiggles)
  - [Refresh File's Intellisense](#refresh-files-intellisense)
  - [Required project *.code-workspace file](#your-projects-vscode-code-workspace-file)
  - [Code completion sometimes doesn't work](#code-completion-sometimes-doesnt-work)
  - [Plugins/Module](#pluginsmodules)
  - [Wrong Windows SDK/C++ library (Windows only)](#wrong-windows-sdk-or-c-library-version-windows-only)
  - [Header insertion of platform specific headers](#header-insertion-of-platform-specific-headers)
- [Create Full Source Unreal Engine projects](#create-full-source-unreal-engine-projects)
- [Older Unreal versions with newer C++ libraries (Windows only)](#older-unreal-versions-with-newer-c-libraries-windows-only)
- [Create BuildConfiguration.xml](#create-a-buildconfigurationxml)
- [Installing correct LLVM (clangd/clang) versions](#installing-correct-llvm-clangdclang-version)
- [Installing correct library versions (Windows)](#installing-correct-library-versions-windows)
- [All supported Unreal versions requirement links](#all-supported-unreal-version-requirement-links)
- [Downloading Source Code](#downloading-source-code)

---
---

## Updates

### Version 3.2.1
- Backs up workspace cfg on startup or on cfg change (if conditions met)
    - Backup is saved in `.vscode/unreal-clangd/.code-workspace.backup`
- Restores on startup if bad workspace file detected
    - currently only restores sections: `folders`, `settings`, `tasks`, `launch`
- Asks to restore after running command: Update compile commands (refresh project)
- Added manual commands: `Backup Workspace cfg file` , `Restore Workspace cfg file` 
- Added Links to `Unreal 5.7` requirements
- Fixed system include, for Linux, that gets put in .clangd file (for Unreal 5.7)

### Version 3.1.0
- Fixed bug in Unreal source file support

#### Version 3.0.2
- (Windows) Fixed Polling cl version for set custom system includes for non-English languages

#### Version 3.0.1
- (Windows) Fixed Professional version of Visual Studio not being able to set custom system includes

#### `Version 3`
- Big code organization, new yeoman extension skeleton, strict eslint
- Adds toggle button bottom right(UC) for code completion modes
   - `UC⚡`(fast) = Non-macro completions and the most popular macro completions
   - `UC⌚`(slow) = Non-macro completions and almost all macro completions
- Removed extension's completion file, completionHelper.cpp, loading at startup
- command: `Set custom system includes` (Windows only)
   - Allows you to set Windows SDK and C++ library versions that clang uses
   - Also autoruns command when creating extension project
   - On VSCode start, detects and shows warning if not set 
     - Setting: "unreal-clangd.systemIncludes.showMissingWarning" to false to remove warning   
- command: `Show Project Info`
- command: `Open 'Add Completions' Files`
   - Allows you to customize code completions that aren't added by default
   - addCompletions.h
      - Can add headers to add non-macro completion
      - Doesn't affect code completion file loading speed
   - addMacroCompletions.h
      - Can add headers to add non-macro and macro completions
      - Will affect code completion file loading speed
- Warns, on startup, when project was not refreshed correctly 
- `Note`: Unreal source file support status is changed to partial
   - Looking at future updates for better support (hopefully)

- See `Changelog` for more info:
   - web: [Changelog](https://github.com/boocs/unreal-clangd/blob/v3/CHANGELOG.md) 
   - local: [Changelog](CHANGELOG.md)

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Important Info

1. This extension now uses UBT(Unreal Build Tool) to  `Refresh your project` to update Intellisense files(compile commands). So this runs when you run the `'Update Compile Commands'` command.
Since this refreshes your project, your project's *.code-workspace file will be refreshed removing your clangd settings and others! but...

2. This extension will `automatically backup and restore` your clangd settings when you run the `Update Compile Commands` command.

3. Make sure not to use any other way to `Refresh` your project. 

`Note:` I've added a setting that allows you to add additional settings to be backed up.
See change log for more info: https://github.com/boocs/unreal-clangd/blob/v3/CHANGELOG.md#250-2024-05-05


[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Info
This extension:

* Provides fast Code Completion, Formatting, and other cool features!

* Has a command to create a clangd project for you
  
* Fixes some clangd/Unreal quirks

* Has a uninstall command

  `Note:` Windows users can use clang/clangd for Intellisense and still build with Microsoft's compiler

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Requirements
#### General
- Unreal v5.2+
- LLVM (clang/clangd) Different Unreal versions requirement different LLVM versions (see below)
- Unreal project created for VSCode
- VSCode [clangd](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd) extension (Do not let the VSCode `clangd` extension auto install LLVM)
- Microsoft [C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) for its `Building/Debugging` Capability

#### Windows 
- Powershell 7+

#### Compiler and libraries :
- Before explanation on getting requirements here are some useful links:
   - [How to install correct LLVM (clangd/clang) version](#installing-correct-llvm-clangdclang-version)
   - [Installing correct library versions (Windows)](#installing-correct-library-versions-windows)
   - [All supported Unreal version requirement links](#all-supported-unreal-version-requirement-links)

`note`: The links below will tell you the requirements for `Unreal 5.7.#`
- If you need requirements for other Unreal versions
   - see [All supported Unreal version requirements links](#all-supported-unreal-version-requirement-links)
   ---

1.  [Unreal 5.7 Release Notes (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-7-release-notes?application_version=5.7#platform-sdk-upgrades)

    - Note: The link above can take too long to load so might not take you to the right section (`Platform SDK Upgrades`)
    - Try loading link twice 
    - `Windows`: Best resource (has everything you need)
      - Shows different .NET versions needed
      - Shows `LLVM` (clang/clangd) version needed
      - Shows Windows SDK version needed
      - Shows The C++ library needed
      - Note: I would recommend using the versions mentioned in the section `IDE Version the Build farm compiles against`
      - See: [Installing correct library versions (Windows)](#installing-correct-library-versions-windows)
    - Also shows useful `Linux/Mac` info

2. [Unreal Docs: Hardware and Software Specifications](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.7)
   - Useful info for `Linux` and `Mac` (Not that useful for Windows)
   - Use `Operating System` dropdown to change to Linux/Mac
   - You can change `Unreal Engine version` on left hand side

3. [Unreal Docs: Linux Development Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.7)

   - Shows useful `Linux` info
   - You can change `Unreal Engine version` on left hand side

4. [Unreal Docs: MacOS Development Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.7)

   - Shows usefull `Mac` info
   - You can change `Unreal Engine version` on left hand side

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Other Recommended Extensions

* [Microsoft's C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) `Needed for Building/Debugging`

* [File Switcher](https://github.com/boocs/file-switcher) `For Alt+O clangd keyboard shortcut (Head/Source switcher)` Using Clangd's Alt+O implementation is buggy, for Unreal Source files, so this extension is a good alternative
 
* [C++ Create Definition](https://github.com/boocs/cpp-create-definition) (my extension) `Updated Sept 2023`

* [Unreal Reflection Function Parameters] (Deprecated) New project coming soonish 

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Quick Start Guide (UE 5.2+)
This is generally correct, when using  non-full source, but your situation could be different.

1. Read the [Requirements](#requirements) section
    - Different Unreal Engine versions require different LLVM versions(Unreal 5.6  requires LLVM 18.1.0(Linux) and LLVM 18.1.8(Windows))

  ---

2. Install the vsix file from this github 

    (The vsix file can be downloaded from the `Releases` section on the right side column of this page. You might have to scroll up to see it.)

    ![](https://user-images.githubusercontent.com/62588629/225083466-39ca4a93-e06a-4a04-83ba-82d60b548513.png)

- Click the extensions icon
- Click the ellipsis (3 dots)
- Choose Install from VSIX...

---


3. Ignore any VSCode warning messages (should go away after creating a project)
    
  ---

4. `Linux:` In the next step(project creation), File Dialogues might spawn behind VSCode(known Ubuntu bug)

  ---

5. Run extension command "Create Unreal clangd project" on your Unreal project
    - Example:

      ![image](https://user-images.githubusercontent.com/62588629/225809141-01e39abf-0928-4cc4-a5e9-f5e3c2a82c52.png)

   `Ubuntu`: It'll ask you to locate clangd. I find it in /lib/llvm-18/bin (for Unreal 5.6.#)

  ---
6. Use the `Editor` suffix and `Development` config when Building/Running or light debugging
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

####  8. Existing projects
   - clangd will index your existing project
   - Large projects like Lyra will take ~7 minutes
   - You can still use code completion
   - If on `fast mode` and a file takes 5 seconds to load code completion fully it will take ~10 seconds while indexing
   - This only happens once*
      - Any individual file you add will also be indexed but that won't take very long
    
      

  ---

#### 9. Quick trouble shooting
   - Try building your project
      - Can fix fake red squiggles
   - Or try restarting VSCode
      - Version 3.0.0 can detect stuff on startup
   - Or try running extension command `Update compile commands file (refresh project)`
      - Run after adding source files to your project
         - Extension should alert you automatically. If this isn't run, after adding new files, then errors will occur
         
      ![image](https://user-images.githubusercontent.com/62588629/231914528-3808d25e-1d18-439f-82bd-e325db58460a.png)

   - Other red squiggle errors will be because, with Unreal projects, [IWYU](https://dev.epicgames.com/documentation/en-us/unreal-engine/include-what-you-use-iwyu-for-unreal-engine-programming) is enabled by default.
      - To fix, #include the header to the class or to whatever symbol the red squiggle is complaining about

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Documentation
### Unreal 5.2+

This README has pretty good documentation but if you want to see extended documentation then click below.

### [**Extended Extension Documentation**](https://github.com/boocs/unreal-clangd/tree/v3#readme)

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Upgrading Older Projects

### Extension Version 3.2.1+ 

Upgrading Unreal 5.6 or older projects to `Linux Unreal 5.7`

If you don't wan't to reinstall extension project you can just replace this line in both .clangd files(project/unreal)

``` json
 # Replace line below with line below it
 # - -stdlib++-isystemThirdParty/Unix/LibCxx/include/c++/v1
   - -isystem/include/c++/v1
```
---

### Extension Version 3

`Upgrading extension version 2 projects`

Extension 3.0.0 has `breaking` changes. To upgrade version 2 projects:

1. Run the extension's command: `Uninstall Unreal Clangd Project` on your project.

2. In your Unreal directory:
   - delete file: `.clangd`
   - delete file: `.vscode/unreal-clangd/comple_commands.json`

3. With extension version 3.0.0+: Run the extension's command: `Create Unreal clangd project (cfg files and settings)`

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Mac support

This hasn't been proven to work yet`(let me know!)`. 

There a new setting to try if you haven't been successful in getting clangd to work.

`unreal-clangd.creation.MacFileLanguage`

You can change the clangd Mac file language to C++ or Objective C++ (thanks to user szabot0412)
- The Objective C++ setting, `-xobjective-c++`, is a misnomer. It just means it will treat Objective C++ files as Objective C++ and C++ files as C++
- This setting is set in your .clangd files during project creation (.clangd file in project directory and Unreal directory)
- in the Add: section, it's the line that shows `- -xc++` or `- -xobjective-c++` so if you want to test quickly with reinstalling. I believe `- -xobjective-c++` is the correct one to use but I could be wrong!


[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Troubleshooting

#### Show Project Info

The command `Show Project Info` was added in extension version 3. This command will show Unreal, clangd, build compiler, and clangd compiler versions.

#### <u>GENERATED_BODY Macro causing red error squiggles</u>
Adding code or a space, in a header file, anywhere above the GENERATED_BODY macro, or other similiar Macros, will cause red squiggles. This is because the GENERATED_BODY macro uses the \_\_LINE\_\_ preprocessor macro.

![Image](https://github.com/user-attachments/assets/92d674ff-c3fd-4588-bd18-e9254d13bf41)

1. You'll need to Build your project to get rid of the red squiggles.

After building, extension v3.0.0+ now restarts the clangd language server automatically. If you need for clangd to reevaluate a file manually then you can try the things below.

#### <u>Refresh File's Intellisense</u>
* You can type a space in the file, wait half a second, and delete the space (this makes clangd reevaluate the file)
* You can also run the command clangd: `Restart language server` (on restart clangd will reevaluate the file)
* Or you can close and reopen the file

---

#### <u>Your project's VSCode *.code-workspace file</u>
The extension pulls the Unreal Uri from your project's *.code-workspace file. If you don't create a Unreal (VSCode) project then this file isn't created. You also must double click this file to open your project as a 'Workspace'. You can force Unreal to always create a VSCode project with a BuildConfiguration.xml file.

1. *.code-workspace file

   ![Image](https://github.com/user-attachments/assets/e5231c88-72eb-49c6-8441-40100ace8d2f)

2. When you double click on the file you'll see 'Workspace' in the VSCode title area:
   ![Image](https://github.com/user-attachments/assets/f27aa475-4863-411d-a852-12ce3b2b79a2)

3. When you open VSCode without a project, you'll get this screen which also tells you if you're opening as a 'Workspace'

   ![Image](https://github.com/user-attachments/assets/51ee637a-e3cf-4e33-981f-195d8c81cc1f)

---

#### <u>Code completion sometimes doesn't work</u>

I've run into this bug. On Windows, pressing control+space or control+shift+space will manually activate Code Completion. Look up your keyboard shortcut for your system.

---

#### <u>Plugins/Modules</u>
If you enable a plugin or add a module to *.build.cs you'll need to run the extension command: `Update compile commands file (refresh project)`.

   1. This should add folders to system includes
   2. It probably won't add plugin/module symbols to code completion
   3. You can add headers to code completion by using the extensions addCompletions.h or addMacroCompletions.h
   4. Use extension command: `Open 'Add Completions' files (regular or macro)`

   See [this](https://github.com/boocs/unreal-clangd/tree/v3?tab=readme-ov-file#adding-plugin-headers) section for more info

---

#### Wrong Windows SDK or C++ library version (Windows only)
1. See [this](#installing-correct-library-versions-windows) section on how to install different Windows SDK or C++ library version
2. Run extension command: `Set custom system includes (Windows only)`
   - This command lets you choose the versions that clang uses

---

#### Header insertion of platform specific headers
  - This can happen with the macro of `FORCEINLINE`
      - There could be others
  - Lyra doesn't seem to use IWYU(include what you use) for this macro and doesn't include any header for this macro

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)
  
---
---

## <u>Create Full Source Unreal Engine projects</u>
1. Double click on the UE5.code-workspace file in your Unreal directory
2. Build the Editor inside VSCode
3. Since you want to Launch it after it's done you can just use Run And Debug instead of Run Build Task. Unless you're heavily debugging you'll want to use the Development config.
![Image](https://github.com/user-attachments/assets/5bb83742-8e97-4358-891c-45f42c989ecd)
4. Once you set the above you can run it by hitting the F5 key or ctrl+F5 to run it without debugging.
5. After it builds the Editor should run and you can now create a Full Source project. 
6. This is what pops up after I'm done compiling and it runs: (This is full source 5.4.1)
![Image](https://github.com/user-attachments/assets/73184d81-f975-416a-8b57-900aa16617fa)


[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Older Unreal versions with newer C++ libraries `(Windows only)`

Extension version 3 allows Windows users to choose their library versions so this section no longer applies.

1. See [this](#installing-correct-library-versions-windows) section on how to install different Windows SDK or C++ library version
2. Run extension command: `Set custom system includes (Windows only)`

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Create a BuildConfiguration.xml</u>
To make Unreal Build Tool create a VSCode project by default you can use a BuildConfiguration.xml file. Here is the info about which directories you can create it in and what options are available.

`note`: BuildConfiguration.xml in Project directory either doesn't work or is buggy. I personally wouldn't put it there.

https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configuration-for-unreal-engine

`Note:` On **Windows** I created the directory structure and xml file in my Documents folder (ME is my user name so it will be different for you):
``` 
E:\Users\ME\Documents\Unreal Engine\UnrealBuildTool\BuildConfiguration.xml
```

Here's a basic BuildConfiguration.xml (It's easy to create all this using VSCode)

``` xml
<?xml version="1.0" encoding="utf-8" ?>
<Configuration xmlns="https://www.unrealengine.com/BuildConfiguration">
    <ProjectFileGenerator>
      <Format>VisualStudioCode</Format>
    </ProjectFileGenerator>
</Configuration>
```

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Installing correct LLVM (clangd/clang) version 

`note`: These examples are for Unreal `5.6.#`. Make sure you get the correct library and compiler versions for your `specific` Unreal version [here](#all-supported-unreal-version-requirement-links)

### Windows
1. Get the correct LLVM (clangd/clang) version from the Release Notes of your Unreal version.
   - See: [All supported Unreal version requirements links](#all-supported-unreal-version-requirement-links) for `Release Note` links
2. If you check out the Release Notes link for 5.6.# you see that `Windows uses LLVM 18.1.8`
3. You can download it here: https://github.com/llvm/llvm-project/releases/tag/llvmorg-18.1.8
4. The file you want is: `LLVM-18.1.8-win64.exe`

### Linux
1. Any of the links in [All supported Unreal version requirements links](#all-supported-unreal-version-requirement-links) will tell you which version of `LLVM` (clangd/clang) to install
2. It's hard on Linux to install specific versions unless you want to compile it yourself
3. You can try the latest of the version it recommends but might run into issues
   - If you do run into issues try compiling/using the correct version
4. Here's how I've had success installing version 18 for Unreal 5.6.#
   - Make sure you don't have an existing llvm.sh file already in the directory you have open. The file you download won't overwrite the file already in you directory. It will name it something else.
   - `Note`: This installs 18.1.8 but `18.1.0` is the recommendation for Linux and Unreal 5.6.#
   ```
   wget https://apt.llvm.org/llvm.sh
   chmod +x llvm.sh
   sudo ./llvm.sh 18
   ```
5. With Ubuntu, and Unreal 5.6.0, I find `clangd` in `/lib/llvm-18/bin`
6. `dotnet-runtime-6.0` and `dotnet-sdk-6.0` might also be required but doesn't say in any of the requirement links.
   - This was true in Unreal ~5.2. 
   - Maybe newer versions are required now.
      - dotnet 8 is used for 5.5 and 5.6
   - This may only be true if you use the Microsoft C# extension

### Mac
1. Unreal docs doesn't give specifics about clang/clangd like it does Windows/Linux
2. It gives `Xcode` versions, which you should install for its libraries.
   - I recommend the `Xcode` version listed in the Unreal Release Notes for your Unreal version - Section: `Platform SDK Upgrades` Subsection: `IDE version the Build farm compiles against`
   - See [All supported Unreal version requirements links](#all-supported-unreal-version-requirement-links) for link to Release Notes
3. For what `LLVM` (clang/clangd) version to install I would try following the Linux instructions
   - Extension version 3 has a `Show Project Info` command that will do what's below
   - or  you can...
      - Go to your project's .vscode folder
      - Open up one of the compile commands JSON files that are in there.
      - Check which compiler it's using.
      - Open the compiler's parent folder in your terminal and poll it for version info
      - Install the LLVM version which matches the compiler you just polled


[Back to Requirements](#requirements)

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Installing correct library versions (Windows)
### Windows

`Note`: In the 3.0.0 extension release, you can choose the C++ library and Windows SDK the project uses. This can minimize problems.

1. Run the `Visual Studio Installer` to install other versions of:
   - C++ Libraries
   - Windows SDK
   - .NET libraries

2. I use the stand-alone `Visual Studio Build Tools 2022` but this also should work if you have the `Visual Studio 2022` IDE installed.

3. This example is for Unreal 5.6.# but it can apply to other Unreal versions. Other versions will probably require different clangd/library versions so make sure to see here for other version requirement links: [Other Version Requirement Links](#all-supported-unreal-version-requirement-links)

4. From the `Visual Studio installer` click on `Modify` next to  Build Tools 2022 or VS 2022 IDE

   ![image](https://github.com/boocs/unreal-clangd/assets/62588629/44aa6821-f123-4133-8399-39c20cc5c660)

5. Switch the tab to `Individual components` (To make it easier use Search Components box)

   ![image](https://github.com/boocs/unreal-clangd/assets/62588629/d7e2c16e-bdf3-4bb2-a1e7-204ba285e991)

6. Windows users will most likely find all requirements in the Unreal Release Notes (`Platform SDK Upgrades section`): [5.6 Release Notes](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-6-release-notes?application_version=5.6#platform-sdk-upgrades) (pic of release notes in `step 7`) 
   - `Note:` The 'release notes' link is slow to load so might not take you to the correct 'Platform SDK Upgrades' section unless you load twice.
   - Use C++/Windows SDK versions found in the subsection `IDE Versions the Build farm compiles against`. Found under the **Platform SDK Upgrades** section.
   

Below are the versions found in the Unreal 5.6 Release Notes and what they look like in the `Visual Studio Installer (Individual components)`. 

7. Here's the `Platform SDK Upgrades` section in the Unreal 5.6 Release Notes
   - For other Unreal version Release Notes see [here](#all-supported-unreal-version-requirement-links)

   ![Image](https://github.com/user-attachments/assets/c54ad0fb-1c59-4184-a34d-8af3a424ab6d)


8. Selecting what to install in the `Visual Studio Installer`

   1. `Visual Studio 2022 17.8 14.38.33130` (In subsection: '**IDE Version the Build farm compiles against**' in 5.6 release notes)

      ---
      Visual Studio Installer :

      ![Image](https://github.com/user-attachments/assets/9b7210db-ff1c-41a3-8bce-fd25faf38b1f)

      - Some other entries look similiar.
      - Note the `x64/x86 build tools`

   2. `Windows 10 SDK (10.0.22621.0)` (In subsection: '**IDE Version the Build farm compiles against**' in 5.6 release notes)

      ---
      Visual Studio Installer :

      ![Image](https://github.com/user-attachments/assets/b0a04f30-0d6d-495f-8f41-1f9dce1a99e5)

      - `Windows 11`: Uses same version number unless specified

   3. `.NET 8.0` (Found in Unreal 5.6 Release Notes. **Platform SDK Upgrades** section):

      ---
      Visual Studio Installer :
      
      ![image](https://github.com/user-attachments/assets/d663f86a-3ce4-4c9e-b933-64243e144484)

   4.   `.NET 4.6.2 Targeting Pack`(Found in  Unreal 5.6 Release Notes. **Platform SDK Upgrades** section):

         ---
      
         Visual Studio Installer :
      
         ![Image](https://github.com/user-attachments/assets/c204943a-323b-464f-bdb8-6091b6321749)

12. Make sure to click the Visual Studio Installer's `Modify` button to install your new libraries.

      ![Image](https://github.com/user-attachments/assets/c4bf64d4-63b2-483f-8abc-dbd6833ae3e6)

[Back to Requirements](#requirements)

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## All supported Unreal version requirement links

- Release Notes link is slow to load 
  - Load site twice to go directly to section: `Platform SDK Upgrades`
  - `If that doesn't work` search for 'm SDK' to take you to the correct section

- Release Notes are best for `Windows` but has useful Linux/Mac info
   - Info in Platform SDK Upgrades section
   - For Windows:
      - Use C++/Windows SDK versions found in subsection '**IDE Version the Build farm compiles against**'
- Also see:
   - [Requirements](#requirements)
   - [How to install correct LLVM (clangd/clang) version](#installing-correct-llvm-clangdclang-version)
   - [Installing correct library versions (Windows)](#installing-correct-library-versions-windows)

## Unreal 5.7.#
Release Notes: [5.7.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-7-release-notes?application_version=5.7#platform-sdk-upgrades)

Here's what the Windows requirements look like(section: Platform SDK Upgrades):
![Image](https://github.com/user-attachments/assets/573d2626-97a2-46b1-9f02-86ba8c344f99)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.7) 

Unreal Docs Linux Requirements [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.7)

Unreal Docs MacOS requirements [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.7)

## Unreal 5.6.#
Release Notes: [5.6.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-6-release-notes?application_version=5.6#platform-sdk-upgrades)

Here's what the Windows requirements look like(section: Platform SDK Upgrades):
![Image](https://github.com/user-attachments/assets/c54ad0fb-1c59-4184-a34d-8af3a424ab6d)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.6) 

Unreal Docs Linux Requirements [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.6)

Unreal Docs MacOS requirements [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.6)

## Unreal 5.5.#
Release Notes: [5.5.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-5-release-notes?application_version=5.5#platform-sdk-upgrades)

Here's what the Windows requirements look like (section: Platform SDK Upgrades):
![Image](https://github.com/user-attachments/assets/da92d47b-12df-4b52-9e2d-aa76fd921534)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.5) 

Unreal Docs Linux Requirements [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.5)

Unreal Docs MacOS requirements [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.5)


## Unreal 5.4.#

Release Note: [5.4.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5.4-release-notes?application_version=5.4#platformsdkupgrades)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.4)

Unreal Docs Linux Requirements: [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.4)

Unreal Docs MacOS Requirements: [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.4)

## Unreal 5.3.#

Release Note: [5.3.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5.3-release-notes?application_version=5.3#platformsdkupgrades)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.3)

Unreal Docs Linux Requirements: [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.3)

Unreal Docs MacOS Requirements: [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.3)

## Unreal 5.2.#

Release Note: [5.2.# (Platform SDK Upgrades)](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5.2-release-notes?application_version=5.2#platformsdkupgrades)

Unreal Docs Requirements: [Requirements](https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine?application_version=5.2)

Unreal Docs Linux Requirements: [Linux](https://dev.epicgames.com/documentation/en-us/unreal-engine/linux-development-requirements-for-unreal-engine?application_version=5.2)

Unreal Docs MacOS Requirements: [MacOS](https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine?application_version=5.2)

[Back to Requirements](#requirements)

[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

## Downloading Source Code
If you don't want to install the vsix located on github you can compile it yourself and then use `vsce package` to create the vsix file.

When downloading source code you won't be able to compile until you run:
```npm install``` on the source code parent directory.


[Back to Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---
---

