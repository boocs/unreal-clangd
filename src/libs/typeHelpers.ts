
import type {UnrealPlatform, Overwrite, Architecture} from './indexTypes';

export function isUnrealPlatformType(platform: string): platform is UnrealPlatform {
	return ["Win64", "Linux", "Mac"].indexOf(platform) !== -1;
}

export function isArchitectureType(architecture: string): architecture is Architecture {
	return ["default", "x86_64", "arm64"].indexOf(architecture) !== -1;
}

export function isOverwriteType(overwrite: string): overwrite is Overwrite {
	return ["strict", "lazy", "full"].indexOf(overwrite) !== -1;
}
