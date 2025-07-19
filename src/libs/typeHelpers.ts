
import type {UnrealPlatform, Overwrite, Architecture} from './indexTypes';
import type { CompileCommand } from './types';

export function isUnrealPlatformType(platform: string): platform is UnrealPlatform {
	return ["Win64", "Linux", "Mac"].includes(platform);
}

export function isArchitectureType(architecture: string): architecture is Architecture {
	return ["default", "x86_64", "arm64"].includes(architecture);
}

export function isOverwriteType(overwrite: string): overwrite is Overwrite {
	return ["strict", "lazy", "full"].includes(overwrite);
}

/* export function isCompileCommandsJson(json: unknown): json is CompileCommand[] {
    if (!Array.isArray(json)) {
        return false;
    }
    return json.every(entry => {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
            return false;
        }
        if (!('directory' in entry) || typeof entry.directory !== 'string') {
            return false;
        }
        if (!('file' in entry) || typeof entry.file !== 'string') {
            return false;
        }
        if (
            !(
                ('command' in entry && typeof entry.command === 'string') ||
                ('arguments' in entry && Array.isArray(entry.arguments) && entry.arguments.every(arg => typeof arg === 'string'))
            )
        ) {
            return false;
        }
        return true;
    });
} */

export function isCompileCommand(entry: unknown): entry is CompileCommand {
	if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
		return false;
	}
	const obj = entry as Record<string, unknown>; // Safely cast to check properties
	return (
		'directory' in obj && typeof obj.directory === 'string' &&
		'file' in obj && typeof obj.file === 'string' &&
		(
			('command' in obj && typeof obj.command === 'string') ||
			('arguments' in obj && Array.isArray(obj.arguments) &&
				obj.arguments.every(arg => typeof arg === 'string'))
		)
	);
}

export function isCompileCommandsJson(json: unknown): json is CompileCommand[] {
	if (!Array.isArray(json)) {
		return false;
	}
	return json.every(isCompileCommand);
}
