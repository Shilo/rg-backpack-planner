import {
    APP_STORAGE_PREFIX,
    clearAppStorage,
    clearStorageByPrefix,
    readLocalStorage,
    readSessionStorage,
    removeLocalStorage,
    removeSessionStorage,
    writeLocalStorage,
    writeSessionStorage,
} from "../src/lib/storage.ts";

class MemoryStorage implements Storage {
    #values = new Map<string, string>();

    get length() {
        return this.#values.size;
    }

    clear(): void {
        this.#values.clear();
    }

    getItem(key: string): string | null {
        return this.#values.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.#values.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.#values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.#values.set(key, value);
    }
}

class ThrowingStorage implements Storage {
    get length() {
        throw new Error("Storage unavailable");
    }

    clear(): void {
        throw new Error("Storage unavailable");
    }

    getItem(): string | null {
        throw new Error("Storage unavailable");
    }

    key(): string | null {
        throw new Error("Storage unavailable");
    }

    removeItem(): void {
        throw new Error("Storage unavailable");
    }

    setItem(): void {
        throw new Error("Storage unavailable");
    }
}

type TestWindow = {
    localStorage: Storage;
    sessionStorage: Storage;
};

const globalWithWindow = globalThis as typeof globalThis & {
    window?: TestWindow;
};
const originalWindow = globalWithWindow.window;

function installWindow(windowValue?: TestWindow) {
    if (windowValue) {
        globalWithWindow.window = windowValue;
    } else {
        delete globalWithWindow.window;
    }
}

try {
    // Works with no window object (SSR / non-browser test environments)
    installWindow(undefined);
    if (readLocalStorage("missing") !== null) {
        throw new Error("Expected null read when window is unavailable");
    }
    if (writeLocalStorage("a", "1") !== false) {
        throw new Error("Expected writeLocalStorage to fail without window");
    }
    if (clearAppStorage() !== 0) {
        throw new Error("Expected clearAppStorage to remove 0 keys without window");
    }

    // Works with normal local/session storage and only clears app-scoped keys
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    installWindow({ localStorage, sessionStorage });

    writeLocalStorage(`${APP_STORAGE_PREFIX}dark-mode`, "true");
    writeLocalStorage(`${APP_STORAGE_PREFIX}theme-color`, "{\"h\":10}");
    writeLocalStorage("third-party-key", "keep");
    writeSessionStorage(`${APP_STORAGE_PREFIX}stopped-preview-toast`, "true");
    writeSessionStorage("session-other", "keep");

    const localRemoved = clearStorageByPrefix("localStorage");
    if (localRemoved !== 2) {
        throw new Error(`Expected 2 local keys removed, got ${localRemoved}`);
    }
    if (readLocalStorage("third-party-key") !== "keep") {
        throw new Error("Expected non-app localStorage key to remain untouched");
    }

    const totalRemoved = clearAppStorage();
    if (totalRemoved !== 1) {
        throw new Error(
            `Expected clearAppStorage to remove remaining app session key, got ${totalRemoved}`,
        );
    }
    if (readSessionStorage("session-other") !== "keep") {
        throw new Error("Expected non-app sessionStorage key to remain untouched");
    }

    // Basic set/get/remove wrappers operate as expected
    writeLocalStorage(`${APP_STORAGE_PREFIX}active-tab-id`, "guardian");
    if (readLocalStorage(`${APP_STORAGE_PREFIX}active-tab-id`) !== "guardian") {
        throw new Error("Expected localStorage read after write to match value");
    }
    removeLocalStorage(`${APP_STORAGE_PREFIX}active-tab-id`);
    if (readLocalStorage(`${APP_STORAGE_PREFIX}active-tab-id`) !== null) {
        throw new Error("Expected localStorage value to be removed");
    }

    writeSessionStorage(`${APP_STORAGE_PREFIX}cloned-build-toast`, "Sample");
    if (
        readSessionStorage(`${APP_STORAGE_PREFIX}cloned-build-toast`) !== "Sample"
    ) {
        throw new Error("Expected sessionStorage read after write to match value");
    }
    removeSessionStorage(`${APP_STORAGE_PREFIX}cloned-build-toast`);
    if (readSessionStorage(`${APP_STORAGE_PREFIX}cloned-build-toast`) !== null) {
        throw new Error("Expected sessionStorage value to be removed");
    }

    // Storage API failures are handled safely
    installWindow({
        localStorage: new ThrowingStorage(),
        sessionStorage: new ThrowingStorage(),
    });
    if (readLocalStorage("any-key") !== null) {
        throw new Error("Expected null when localStorage getItem throws");
    }
    if (writeLocalStorage("any-key", "value") !== false) {
        throw new Error("Expected false when localStorage setItem throws");
    }
    if (removeLocalStorage("any-key") !== false) {
        throw new Error("Expected false when localStorage removeItem throws");
    }
    if (clearStorageByPrefix("localStorage") !== 0) {
        throw new Error("Expected no removals when localStorage length access throws");
    }
    if (clearStorageByPrefix("sessionStorage") !== 0) {
        throw new Error(
            "Expected no removals when sessionStorage length access throws",
        );
    }
} finally {
    installWindow(originalWindow);
}
