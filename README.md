
# Unreal 5.2+ Clangd extension for VSCode (Intellisense+)

`Windows users:` There's a problem using older versions of of Unreal (such as 5.4) with newer versions of C++ libraries. `Info` and `fix` are available [here](#bug-older-unreal-versions-with-newer-c-libraries-windows-only)


# Table of Contents
- [Updates](#updates)
- [Important info](#important-info)
- [Info](#info)
- [Recommends Extensions](#other-recommended-extensions)
- [Quick Start Guide](#quick-start-guide-ue-52)
- [Documentation](#documentation)
- [Upgrading Older Projects](#upgrading-older-projects)
- [Mac Support](#mac-support)
- [Troubleshooting](#troubleshooting)
  - [GENERATED BODY Macro causing red error squiggles](#generated_body-macro-causing-red-error-squiggles)
  - [Refresh File's Intellisense](#refresh-files-intellisense)
  - [Required project *.code-workspace file](#your-projects-vscode-code-workspace-file)
  - [Code completion sometimes doesn't work](#code-completion-sometimes-doesnt-work)
  - [Plugins](#plugins)
  - [Create Full Source Unreal Engine projects](#create-full-source-unreal-engine-projects)
- [(Bug) Older Unreal versions with newer C++ libraries (Windows only)](#bug-older-unreal-versions-with-newer-c-libraries-windows-only)
- [Create BuildConfiguration.xml](#create-a-buildconfigurationxml)
---
---

## Updates
`New info Mar 15, 2025`

This page has been updated. New sections and updated info.

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

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## Important Info

1. This extension now uses UBT to  `Refresh your project` to update Intellisense files(compile commands). So this runs when you run the `'Update Compile Commands'` command.
Since this refreshes your project, your project's *.code-workspace file will be refreshed removing your clangd settings and others! but...

2. This extension will `automatically backup and restore` your clangd settings when you run the `Update Compile Commands` command.

3. Make sure not to use any other way to `Refresh` your project. 

`Note:` I've added a setting that allows you to add additional settings to be backed up.
See change log for more info: https://github.com/boocs/unreal-clangd/blob/v2/CHANGELOG.md#250-2024-05-05


[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## Info
This extension:

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

    (The vsix file can be downloaded from the `Releases` section on the right side column of this page. You might have to scroll up to see it.)

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
- The Objective C++ setting, `-xobjective-c++`, is a misnomer. It just means it will treat Objective C++ files as Objective C++ and C++ files as C++
- This setting is set in your .clangd files during project creation (.clangd file in project directory and Unreal directory)
- in the Add: section, it's the line that shows `- -xc++` or `- -xobjective-c++` so if you want to test quickly with reinstalling. I believe `- -xobjective-c++` is the correct one to use but I could be wrong!


[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## Troubleshooting

#### <u>GENERATED_BODY Macro causing red error squiggles</u>
Adding code or a space, in a header file, anywhere above the GENERATED_BODY macro will cause red squiggles. This is because the GENERATED_BODY macro uses the \_\_LINE\_\_ preprocessor macro.

![Image](https://github.com/user-attachments/assets/92d674ff-c3fd-4588-bd18-e9254d13bf41)

1. You'll need to Build your project to get rid of the red squiggles.
2. Now you'll need to get clangd to reevaluate the file. See the Refresh File's Instellisense section below

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

I've run into this bug. Pressing control+space (Windows) will manually activate Code Completion. Look up your keyboard shortcut for your system.

---

#### <u>Plugins</u>
If you add a plugin to *.build.cs you'll need to run the extension command to Update Compile Commands.

   See [this](https://github.com/boocs/unreal-clangd/tree/v2?tab=readme-ov-file#adding-plugin-headers) section for more info

---

#### <u>Create Full Source Unreal Engine projects</u>
1. Double click on the UE5.code-workspace file in your Unreal directory
2. Build the Editor inside VSCode
3. Since you want to Launch it after it's done you can just use Run And Debug instead of Run Build Task. Unless you're heavily debugging you'll want to use the Development config.
![Image](https://github.com/user-attachments/assets/5bb83742-8e97-4358-891c-45f42c989ecd)
4. Once you set the above you can run it by hitting the F5 key or ctrl+F5 to run it without debugging.
5. After it builds the Editor should run and you can now create a Full Source project. 
6. This is what pops up after I'm done compiling and it runs: (This is full source 5.4.1)
![Image](https://github.com/user-attachments/assets/73184d81-f975-416a-8b57-900aa16617fa)

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## (bug) Older Unreal versions with newer C++ libraries `(Windows only)`

Thanks to user [nmdMnk](https://github.com/nmdMnk) for the report!
### Unreal 5.4.# example:
1. Unreal 5.4 on Windows requires clang `16.0.6`
2. Unreal 5.4's defaults are MSVC 14.38.33130 and Windows 10 SDK 10.0.18362.0 (according to 5.4 release notes)
3. Trouble is Unreal 5.4 can and will use newer versions of MSVC and Windows 10 SDKs
4. Newer MSVC versions require clang `18+`
5. So now you get errors if you have the updated C++ libraries.

### There are 2 fixes:
### 1. Unreal 5.4.# simple fix
This fix might work better if you're using Visual Studio Build Tools 2022 instead of relying on Visual Studio 2022's libraries.

`Note:` This 'simple' fix isn't for everyone. Uninstalling and preventing newer C++ library updates is easy but might cause problems elsewhere. Also you might forget that you did this and, in the future, wonder why newer versions of Unreal aren't working.

The `2nd fix`, below this fix, takes a little more work but works within clangd to fix it.

1st Fix:
1. Simple fix would be to uninstall the newer C++ libraries and Windows 10 SDKs
2. The Visual Studio Installer allows you to do this
3. Check out the 2nd fix below for pictures of modifying the Visual Studio Installer
4. You will want to uninstall any MSVC versions above 14.38
5. Make sure to also remove the checkmark to always install the latest MSVC version
 
   ![Image](https://github.com/user-attachments/assets/61452c62-4e11-4e9f-902c-e5b9dbe97b9a)
6. Also make sure to uninstall any Windows 10 SDKs above 10.0.18362.0

### 2. Unreal 5.4.# Fix:
If you don't want to do the first fix this fix works within clangd to fix the problem. You won't have to worry about uninstalling anything.

1. Add this to both .clangd files (your project and Unreal directory)
    Add it to the 'Add' section.
   ```
   Add:
       - /X
       - -fms-compatibility-version=19.38.33144
       - /imsvcC:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.38.33130\include
       - /imsvcC:\Program Files (x86)\Windows Kits\10\Include\10.0.18362.0\ucrt
       - /imsvcC:\Program Files (x86)\Windows Kits\10\Include\10.0.18362.0\shared
       - /imsvcC:\Program Files (x86)\Windows Kits\10\Include\10.0.18362.0\um
       - /imsvcC:\Program Files (x86)\Windows Kits\10\Include\10.0.18362.0\winrt
       - /imsvcC:\Program Files (x86)\Windows Kits\10\Include\10.0.18362.0\cppwinrt
   ```
2. All/some paths might be different so you'll have to adjust them (note the single backslash)

   1. Your path also might be different because you're using Visual Studio 2022 and not Visual Studio Build Tools like I am
   2. Visual Studio 2022 follows the same pattern as Visual Studio Build Tools 2022
   3. Here is a users example of the path he used for Visual Studio 2022
      ```
      - /imsvcC:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.38.33130\include
      ```
3. All version numbers are correct and you should probably use them
4. When you check the 5.4 release notes it says for Windows that  MSVC 14.38.33130 and Windows 10 SDK 10.0.18362.0 are the default
5. You can download different MSVC versions from the Visual Studio Installer
   
   ![Image](https://github.com/user-attachments/assets/76443ba0-192c-4eb3-94e9-a8f9f10ef4da)
6. You can download different Windows 10 SDKs from the Visual Studio Installer

   ![Image](https://github.com/user-attachments/assets/9fc188a4-6ef5-44a9-83e5-0e387b1f0425)

7. /X was the key. It prevents clangd from pulling the version from a environmental variable
8. You can make sure -fms-compatibility-version=19.38.33144 is correct by doing `.\cl` in powershell. Here's what it looks like:

   ![Image](https://github.com/user-attachments/assets/f915afe5-d313-4df5-81e0-f32aae169cb0)
9. `Note:` 5.5.# currently doesn't have this problem. If it does in the future, it actually has another include to use. 
   ```
    - /imsvcC:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.38.33130\atlmfc\include\
   ```
   So in the future this fix might need to adjust to the newer includes of future Unreal Engine releases.

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---

## Create a BuildConfiguration.xml</u>
To make Unreal Build Tool create a VSCode project by default you can use a BuildConfiguration.xml file. Here is the info about which directories you can create it in and what options are available.

https://dev.epicgames.com/documentation/en-us/unreal-engine/build-configuration-for-unreal-engine

`Note:` On **Windows** I created the directory structure and xml file in my Documents folder (ME is my user name so it will be different for you):
```
E:\Users\ME\Documents\Unreal Engine\UnrealBuildTool\BuildConfiguration.xml
```

Here's a basic BuildConfiguration.xml (It's easy to create all this using VSCode)
```
<?xml version="1.0" encoding="utf-8" ?>
<Configuration xmlns="https://www.unrealengine.com/BuildConfiguration">
    <ProjectFileGenerator>
      <Format>VisualStudioCode</Format>
    </ProjectFileGenerator>
</Configuration>
```

[Top](#unreal-52-clangd-extension-for-vscode-intellisense)

---