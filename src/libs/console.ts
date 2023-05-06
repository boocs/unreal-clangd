/**
 * Override for console so it shows console messages for both developer and user
 */

import * as vscode from 'vscode';
import { EXTENSION_NAME } from './consts';

export const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);

// If debugging set this to true;
const IS_DEBUG = true;
let errorCount = 0;
let warningCount = 0;

export function log(message: string) {
    if (IS_DEBUG) { console.log(message); }

    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine(message);
}

export function error(message: string) {
    errorCount += 1;

    if (IS_DEBUG) { console.error(message); }

    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine("\n** Error **: ".concat(message));
    outputChannel.show();
}


export function warning(message: string) {
    warningCount += 1;

    if (IS_DEBUG) { console.error(message); }

    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine("\n** Warning **: ".concat(message));
}

export function resetCounts() {
    errorCount = 0;
    warningCount = 0;
}

export function getErrorCount() {
    return errorCount;
}

export function getWarningCount() {
    return warningCount;
}
