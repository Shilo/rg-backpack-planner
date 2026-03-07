import { STORAGE_KEY_PREFIX } from "./storage";

/**
 * Exports all application data stored in localStorage under the app prefix.
 * Encodes it as a Base64 string safe for copy-pasting.
 */
export function exportSyncCode(): string {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX)) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                // Store without the prefix to keep keys clean and slightly smaller
                data[key.slice(STORAGE_KEY_PREFIX.length)] = value;
            }
        }
    }
    const json = JSON.stringify(data);

    // Use b64 with UTF-16 support via encodeURIComponent/unescape
    // This handles emojis and special characters in preset names
    return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Imports application data from a Sync Code.
 * Overwrites all existing app data in localStorage.
 * Returns true if successful, false otherwise.
 */
export function importSyncCode(code: string): boolean {
    if (!code || !code.trim()) return false;

    try {
        const decoded = decodeURIComponent(escape(atob(code.trim())));
        const data = JSON.parse(decoded) as Record<string, string>;

        // Basic validation: must have at least build-presets to be considered valid app data
        if (!data["build-presets"]) {
            console.warn("Import failed: Missing 'build-presets' key");
            return false;
        }

        // Clear only app-prefixed keys to avoid affecting other site data
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Restore keys with prefix
        for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, value);
        }

        return true;
    } catch (error) {
        console.error("Failed to import sync code:", error);
        return false;
    }
}
