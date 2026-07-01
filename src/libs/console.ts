/**
 * Override for console so it shows console messages for both developer and user
 */

import * as vscode from "vscode";
import process from "node:process";
import { EXTENSION_NAME } from "./consts";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogOptions {
	/** An optional scope tag, e.g., 'semantic' -> <semantic> */
	tag?: string;
	/** If true, shows a VS Code modal/toast notification to the user */
	showModal?: boolean;
	messageOption?: vscode.MessageOptions;
}

export const outputChannel: vscode.LogOutputChannel | undefined =
	vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });

const IS_DEBUG = !!process.env.IS_DEBUGGING_VSCEXT;
let errorCount = 0;
let warningCount = 0;
let duplicateCount = 0;
let lastLogKey = "";

function flushDuplicates() {
	if (duplicateCount > 0) {
		outputChannel?.appendLine(
			`   ↳ [Suppressed ${duplicateCount.toString()} identical duplicate log lines]`,
		);
		duplicateCount = 0;
	}
}

function _log(
	level: LogLevel,
	message: string,
	options: LogOptions = {},
): void {
	const tagPrefix = options.tag ? `<${options.tag}> ` : "";
	const formattedMessage = `${tagPrefix}${message}`;
	const logKey = `${level}:${formattedMessage}`;

	// Handle Duplicates
	if (logKey === lastLogKey) {
		duplicateCount++;
		// Silently suppress continuous duplicates, or you can choose to flush
		// a "Last message repeated X times" line when the key changes.
		return;
	} else {
		flushDuplicates();
		lastLogKey = logKey;
	}

	// Route to native VS Code LogOutputChannel (handles timestamps and [level] flags)
	switch (level) {
		case "info":
			outputChannel?.info(formattedMessage);
			if (options.showModal) {
				vscode.window.showInformationMessage(
					message,
					options.messageOption ?? {},
				);
			}
			break;
		case "warn":
			outputChannel?.warn(formattedMessage);
			if (options.showModal) {
				vscode.window.showWarningMessage(
					message,
					options.messageOption ?? {},
				);
			}
			break;
		case "error":
			outputChannel?.error(formattedMessage);
			// Modals for errors usually benefit from an explicit anchor action or modal flag
			if (options.showModal) {
				vscode.window.showErrorMessage(
					message,
					options.messageOption ?? {},
				);
			}
			break;
		case "debug":
			outputChannel?.debug(formattedMessage);
			break;
	}
}

export function log(message: string): void;
export function log(logLevel: LogLevel, message: string): void;
export function log(a: string, b?: string) {
	if (typeof b === "undefined") {
		// single-argument: treat as info
		const message = a;
		if (IS_DEBUG) {
			console.log(message);
		}
		_log("info", message);
		return;
	}

	const level = a as LogLevel;
	const message = b;
	_log(level, message);
}

export function error(message: string) {
	errorCount += 1;

	if (IS_DEBUG) {
		console.error(message);
	}

	if (!outputChannel) {
		return;
	}
	_log("error", message, { modal: true });
}

export function warn(message: string) {
	warningCount += 1;

	if (IS_DEBUG) {
		console.error(message);
	}
	_log("warn", message);
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
