import assert from "node:assert";
import {
    STORAGE_KEY_PREFIX,
    getItem,
    setItem,
} from "../src/lib/storage.ts";
import {
    compareVersions,
    runMigrations,
} from "../src/lib/migrations/runMigrations.ts";

type TestWindow = {
    localStorage: Storage;
    sessionStorage: Storage;
};

const globalWithWindow = globalThis as typeof globalThis & {
    window?: TestWindow;
    localStorage?: Storage;
    sessionStorage?: Storage;
    document?: Pick<Document, "dispatchEvent">;
};
const originalWindow = globalWithWindow.window;
const originalLocalStorage = globalWithWindow.localStorage;
const originalSessionStorage = globalWithWindow.sessionStorage;
const originalDocument = globalWithWindow.document;

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

function installWindow(
    localStorage: Storage,
    sessionStorage: Storage,
    documentValue: Pick<Document, "dispatchEvent">,
): void {
    const win = { localStorage, sessionStorage };
    globalWithWindow.window = win as unknown as NonNullable<
        typeof globalWithWindow.window
    >;
    globalWithWindow.localStorage = localStorage;
    globalWithWindow.sessionStorage = sessionStorage;
    globalWithWindow.document = documentValue;
}

function restoreWindow(): void {
    if (originalWindow) {
        globalWithWindow.window = originalWindow;
        globalWithWindow.localStorage = originalLocalStorage;
        globalWithWindow.sessionStorage = originalSessionStorage;
    } else {
        globalWithWindow.window = undefined as any;
        globalWithWindow.localStorage = undefined as any;
        globalWithWindow.sessionStorage = undefined as any;
    }
    globalWithWindow.document = originalDocument;
}

assert.strictEqual(
    compareVersions("1.0", "1.0.4"),
    -1,
    "v1.0 migration should run before v1.0.4",
);

try {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    const dispatchedEvents: string[] = [];

    installWindow(localStorage, sessionStorage, {
        dispatchEvent(event: Event): boolean {
            dispatchedEvents.push(event.type);
            return true;
        },
    });

    setItem("latest-used-version", "1.0.0");
    const prefixedKey = `${STORAGE_KEY_PREFIX}locale`;
    setItem("locale", "en");
    assert.strictEqual(
        localStorage.getItem(prefixedKey),
        "en",
        "Precondition: stale 'en' should be in storage under prefixed key",
    );

    runMigrations();

    assert.strictEqual(
        getItem("locale"),
        null,
        "runMigrations should clear the stale locale from storage",
    );

    assert.strictEqual(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}onboarding-seen`),
        "false",
        "Later migrations should still run in version order after clearing locale",
    );

    assert.deepStrictEqual(
        dispatchedEvents,
        ["closeSideMenu"],
        "showOnboarding migration should still dispatch its closeSideMenu event",
    );
} finally {
    restoreWindow();
}
