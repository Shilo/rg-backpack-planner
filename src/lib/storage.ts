export const APP_STORAGE_PREFIX = "rg-backpack-planner-";

type StorageType = "localStorage" | "sessionStorage";

function getStorage(type: StorageType): Storage | null {
    if (typeof window === "undefined") return null;
    try {
        return window[type];
    } catch {
        return null;
    }
}

function withStorage<T>(
    type: StorageType,
    fallback: T,
    action: (storage: Storage) => T,
): T {
    const storage = getStorage(type);
    if (!storage) return fallback;
    try {
        return action(storage);
    } catch {
        return fallback;
    }
}

export function readStorageItem(type: StorageType, key: string): string | null {
    return withStorage(type, null, (storage) => storage.getItem(key));
}

export function writeStorageItem(
    type: StorageType,
    key: string,
    value: string,
): boolean {
    return withStorage(type, false, (storage) => {
        storage.setItem(key, value);
        return true;
    });
}

export function removeStorageItem(type: StorageType, key: string): boolean {
    return withStorage(type, false, (storage) => {
        storage.removeItem(key);
        return true;
    });
}

export function clearStorageByPrefix(
    type: StorageType,
    prefix: string = APP_STORAGE_PREFIX,
): number {
    return withStorage(type, 0, (storage) => {
        const keysToRemove: string[] = [];
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (key?.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        let removed = 0;
        for (const key of keysToRemove) {
            try {
                storage.removeItem(key);
                removed += 1;
            } catch {
                // Continue clearing remaining keys if one remove fails
            }
        }
        return removed;
    });
}

export function clearAppStorage(): number {
    return (
        clearStorageByPrefix("localStorage") +
        clearStorageByPrefix("sessionStorage")
    );
}

export function readLocalStorage(key: string): string | null {
    return readStorageItem("localStorage", key);
}

export function writeLocalStorage(key: string, value: string): boolean {
    return writeStorageItem("localStorage", key, value);
}

export function removeLocalStorage(key: string): boolean {
    return removeStorageItem("localStorage", key);
}

export function readSessionStorage(key: string): string | null {
    return readStorageItem("sessionStorage", key);
}

export function writeSessionStorage(key: string, value: string): boolean {
    return writeStorageItem("sessionStorage", key, value);
}

export function removeSessionStorage(key: string): boolean {
    return removeStorageItem("sessionStorage", key);
}
