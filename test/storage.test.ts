import {
    STORAGE_KEY_PREFIX,
    clearAll,
    getItem,
    removeItem,
    sessionGetItem,
    sessionRemoveItem,
    sessionSetItem,
    setItem,
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

const globalWithWindow = globalThis as typeof globalThis & {
    window?: { localStorage: Storage; sessionStorage: Storage };
    localStorage?: Storage;
    sessionStorage?: Storage;
};
const originalWindow = globalWithWindow.window;

function installWindow(
    windowValue?: { localStorage: Storage; sessionStorage: Storage },
) {
    if (windowValue) {
        globalWithWindow.window = windowValue;
        globalWithWindow.localStorage = windowValue.localStorage;
        globalWithWindow.sessionStorage = windowValue.sessionStorage;
    } else {
        delete globalWithWindow.window;
        delete globalWithWindow.localStorage;
        delete globalWithWindow.sessionStorage;
    }
}

try {
    // Works with no window object (SSR / non-browser test environments)
    installWindow(undefined);
    if (getItem("missing") !== null) {
        throw new Error("Expected null read when window is unavailable");
    }
    setItem("missing", "value"); // no-op, should not throw
    clearAll(); // no-op, should not throw

    // Keys are auto-prefixed
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    installWindow({ localStorage, sessionStorage });

    setItem("dark-mode", "true");
    if (localStorage.getItem(`${STORAGE_KEY_PREFIX}dark-mode`) !== "true") {
        throw new Error("Expected setItem to prefix key and store value");
    }
    if (getItem("dark-mode") !== "true") {
        throw new Error("Expected getItem to read prefixed key");
    }
    removeItem("dark-mode");
    if (getItem("dark-mode") !== null) {
        throw new Error("Expected removeItem to clear prefixed key");
    }

    sessionSetItem("cloned-build-toast", "Sample");
    if (
        sessionStorage.getItem(`${STORAGE_KEY_PREFIX}cloned-build-toast`) !==
        "Sample"
    ) {
        throw new Error("Expected sessionSetItem to prefix key and store value");
    }
    if (sessionGetItem("cloned-build-toast") !== "Sample") {
        throw new Error("Expected sessionGetItem to read prefixed key");
    }
    sessionRemoveItem("cloned-build-toast");
    if (sessionGetItem("cloned-build-toast") !== null) {
        throw new Error("Expected sessionRemoveItem to clear prefixed key");
    }

    // clearAll clears localStorage
    setItem("active-tab-id", "guardian");
    clearAll();
    if (localStorage.length !== 0) {
        throw new Error("Expected clearAll to clear localStorage");
    }
} finally {
    installWindow(undefined);
}
