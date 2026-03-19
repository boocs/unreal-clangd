import * as vscode from "vscode";
import * as consts from "../libs/consts";
import { LINUX_STDLIB_SYS_INCLUDE_V2, LINUX_STDLIB_SYS_INCLUDE_V3 } from "../libs/consts";
import { getCfgValue, getUnrealSemanticVersion } from "../shared";
import { getProjectWorkspaceFolder, getUnrealUri } from "../libs/ueHelpers";
import path from "node:path";

import * as console from '../libs/console';

const LINUX_STD_LIB_FOLDER_WPREFIXES = "include/c++/v1";
const LINUX_TARGET_X86_64 = "x86_64";
const LINUX_TARGET_AARCH_64 = "aarch64";


/**
 *  Returns .clangd lines for linux to include Unreal's std c++ lib
 *  MARK: TODO we should go back to earlier Unreal versions to see if
 *      we only need the new getNewLinuxStdLibSystemIncludeLines()
 */
export async function getLinuxStdLibSystemInclude(): Promise<string[]> {
    const unrealVersion = await getUnrealSemanticVersion();
    if (!unrealVersion) {
        return [LINUX_STDLIB_SYS_INCLUDE_V3];
    }
    else if (unrealVersion.major === 4 || (unrealVersion.major === 5 && unrealVersion.minor < 7)) {
        return [LINUX_STDLIB_SYS_INCLUDE_V2];
    }
    else if (unrealVersion.major === 5 && unrealVersion.minor >= 7) {
        return await getNewLinuxStdLibSupportLines();
    }
    return [LINUX_STDLIB_SYS_INCLUDE_V2];

}

async function getNewLinuxStdLibSupportLines(): Promise<string[]> {
    const stdLibPaths = await getNewLinuxStdLibPaths();

    console.log("Found these Unreal Std Lib Paths:");
    for (const element of stdLibPaths) {
        console.log(`   ${element}`);
    }

    if(stdLibPaths.length === 0){
        console.warn(`Found incorrect amount of std lib paths: ${stdLibPaths.length.toString()}`);
        return [LINUX_STDLIB_SYS_INCLUDE_V2];
    }
    const parentPath =  getParentStdLibPath(stdLibPaths);

    if(!parentPath){
        console.warn("Couldn't get parent std lib path in Unreal!");

        return [LINUX_STDLIB_SYS_INCLUDE_V2];
    }

    return parseUnrealStdCppLibPathForSupportLines(parentPath);
    
}

function getParentStdLibPath(stdLibPaths: string[]) {
    
    if(stdLibPaths.length === 1){
        return stdLibPaths[0];
    }
    else {
        return getParentStdLibPathFromPaths(stdLibPaths);
    }

}
async function getNewLinuxStdLibPaths() {
    const ueUri = getUnrealUri();
    if (!ueUri) { return []; }

    const relPat = new vscode.RelativePattern( ueUri,`{Engine/Extras/ThirdPartyNotUE/SDKs/HostLinux,Engine/Source/ThirdParty/Unix}/**/${LINUX_STD_LIB_FOLDER_WPREFIXES}/string.h`);
    return [...new Set(
        (await vscode.workspace.findFiles( relPat))
        .map(f => path.dirname(f.fsPath))
    )];
}


function getParentStdLibPathFromPaths(stdLibPaths: string[]): string | undefined {
    const linuxTarget = getCfgValue<string>(
        consts.settingNames.unrealClangd.settings['creation.LinuxTarget'],
        getProjectWorkspaceFolder()
    );

    if (linuxTarget === LINUX_TARGET_X86_64) {
        return stdLibPaths.find(p => p.includes(LINUX_TARGET_X86_64));
    }
    else if(linuxTarget === LINUX_TARGET_AARCH_64) {
        return stdLibPaths.find(p => p.includes(LINUX_TARGET_AARCH_64));
    }
    
    return undefined;
}


function parseUnrealStdCppLibPathForSupportLines(parentPath: string) {
    const ueUri = getUnrealUri();
    if (!ueUri) { return [LINUX_STDLIB_SYS_INCLUDE_V2]; }
    const ueBase = vscode.Uri.joinPath(ueUri, "Engine").fsPath;  // working unreal dir is ueUri + Engine
    
    const includeAbsPath = path.dirname(path.dirname(parentPath));  // strip c++/v1 → .../include
    const sysrootAbsPath = path.dirname(includeAbsPath);             // strip include → .../x86_64-unknown-linux-gnu

    const relFull    = '../' + path.posix.relative(ueBase, parentPath);
    const relInclude = '../' + path.posix.relative(ueBase, includeAbsPath);
    const relSysroot = '../' + path.posix.relative(ueBase, sysrootAbsPath);
    const archName   = path.basename(sysrootAbsPath);

    return [
        `-isystem${relFull}`,
        `-isystem${relInclude}`,
        `--sysroot=${relSysroot}`,
        `--target=${archName}`,
        `-nostdinc++`,
    ];
}