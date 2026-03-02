/**
 * Centralized storage API for localStorage and sessionStorage.
 * All keys are automatically prefixed with STORAGE_KEY_PREFIX to avoid collisions.
 * Callers pass only the key suffix (e.g. "build-presets"); the prefix is applied internally.
 */

export const STORAGE_KEY_PREFIX = "rg-backpack-planner-";

function prefixKey(key: string): string {
    return `${STORAGE_KEY_PREFIX}${key}`;
}

/** localStorage.getItem with automatic key prefix */
export function getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(prefixKey(key));
    } catch {
        return null;
    }
}

/** localStorage.setItem with automatic key prefix */
export function setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(prefixKey(key), value);
    } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "QuotaExceededError"
        ) {
            console.warn("localStorage quota exceeded:", key);
        } else {
            console.error("Failed to save to localStorage:", key, error);
        }
    }
}

/** localStorage.removeItem with automatic key prefix */
export function removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(prefixKey(key));
    } catch {
        // ignore
    }
}

/** sessionStorage.getItem with automatic key prefix */
export function sessionGetItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return sessionStorage.getItem(prefixKey(key));
    } catch {
        return null;
    }
}

/** sessionStorage.setItem with automatic key prefix */
export function sessionSetItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(prefixKey(key), value);
    } catch {
        // ignore
    }
}

/** sessionStorage.removeItem with automatic key prefix */
export function sessionRemoveItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(prefixKey(key));
    } catch {
        // ignore
    }
}

/**
 * Removes all localStorage and sessionStorage keys that belong to this app (prefixed keys).
 * Use for "Clear all data" instead of localStorage.clear() to avoid wiping other apps.
 */
export function clearAll(): void {
    if (typeof window === "undefined") return;
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(STORAGE_KEY_PREFIX)) {
                sessionKeysToRemove.push(key);
            }
        }
        sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (error) {
        console.error("Failed to clear app storage:", error);
    }
}
