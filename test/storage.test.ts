import {
    STORAGE_KEY_PREFIX,
    clearAll,
    getItem,
    sessionGetItem,
    removeItem,
    sessionRemoveItem,
    setItem,
    sessionSetItem,
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
    get length(): number {
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
    localStorage?: Storage;
    sessionStorage?: Storage;
};
const originalWindow = globalWithWindow.window;
const originalLocalStorage = globalWithWindow.localStorage;
const originalSessionStorage = globalWithWindow.sessionStorage;

function installWindow(
    windowValue?: { localStorage: Storage; sessionStorage: Storage },
) {
    if (windowValue) {
        globalWithWindow.window = windowValue as unknown as NonNullable<
            typeof globalWithWindow.window
        >;
        globalWithWindow.localStorage = windowValue.localStorage;
        globalWithWindow.sessionStorage = windowValue.sessionStorage;
    } else {
        globalWithWindow.window = undefined as any;
        globalWithWindow.localStorage = undefined as any;
        globalWithWindow.sessionStorage = undefined as any;
    }
}

try {
    // Works with no window object (SSR / non-browser test environments)
    installWindow(undefined);
    if (getItem("missing") !== null) {
        throw new Error("Expected null read when window is unavailable");
    }
    // setItem/clearAll handle absence of window by returning immediately
    setItem("a", "1");
    clearAll();

    // Works with normal local/session storage
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    installWindow({ localStorage, sessionStorage });

    setItem("dark-mode", "true");
    setItem("theme-color", "{\"h\":10}");

    // Verify prefix is implicitly added
    if (localStorage.getItem(`${STORAGE_KEY_PREFIX}dark-mode`) !== "true") {
        throw new Error("Expected internal storage keys to be prefixed automatically");
    }

    sessionSetItem("stopped-preview-toast", "true");

    clearAll();
    if (localStorage.length !== 0) {
        throw new Error("Expected all localStorage cleared by clearAll()");
    }

    // clearAll doesn't clear sessionStorage currently, check that session storage persists
    if (sessionStorage.getItem(`${STORAGE_KEY_PREFIX}stopped-preview-toast`) !== "true") {
        throw new Error("Expected sessionStorage to remain untouched by clearAll()");
    }

    // Basic set/get/remove wrappers operate as expected
    setItem("active-tab-id", "guardian");
    if (getItem("active-tab-id") !== "guardian") {
        throw new Error("Expected localStorage read after write to match value");
    }
    removeItem("active-tab-id");
    if (getItem("active-tab-id") !== null) {
        throw new Error("Expected localStorage value to be removed");
    }

    sessionSetItem("cloned-build-toast", "Sample");
    if (sessionGetItem("cloned-build-toast") !== "Sample") {
        throw new Error("Expected sessionStorage read after write to match value");
    }
    sessionRemoveItem("cloned-build-toast");
    if (sessionGetItem("cloned-build-toast") !== null) {
        throw new Error("Expected sessionStorage value to be removed");
    }

    // Storage API failures are handled safely (do not throw exceptions to caller)
    installWindow({
        localStorage: new ThrowingStorage(),
        sessionStorage: new ThrowingStorage(),
    });
    if (getItem("any-key") !== null) {
        throw new Error("Expected null when localStorage getItem throws");
    }
    setItem("any-key", "value");
    removeItem("any-key");
    clearAll();
} finally {
    installWindow(originalWindow ? { localStorage: originalLocalStorage!, sessionStorage: originalSessionStorage! } : undefined);
}
