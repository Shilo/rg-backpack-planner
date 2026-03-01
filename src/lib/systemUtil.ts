import { tr } from "./i18n";

export type OSNameKey =
    | "device"
    | "ios"
    | "android"
    | "windows"
    | "macos"
    | "linux";

/**
 * Detects the operating system name from the browser's user agent and platform.
 * @returns Localized OS name key.
 */
export function getOSNameKey(): OSNameKey {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return "device";
    }
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // iOS detection
    if (/iphone|ipad|ipod/.test(userAgent)) {
        return "ios";
    }

    // Android detection
    if (/android/.test(userAgent)) {
        return "android";
    }

    // Windows detection
    if (/win/.test(platform) || /windows/.test(userAgent)) {
        return "windows";
    }

    // macOS detection
    if (/mac/.test(platform) || /macintosh/.test(userAgent)) {
        return "macos";
    }

    // Linux detection
    if (/linux/.test(platform) && !/android/.test(userAgent)) {
        return "linux";
    }

    return "device";
}

/**
 * Returns localized OS display name.
 */
export function getOSName(): string {
    return tr(`os.${getOSNameKey()}`);
}
