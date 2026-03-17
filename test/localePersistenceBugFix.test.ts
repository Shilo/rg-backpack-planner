/**
 * Regression tests for the locale persistence bug (v1.0.4 fix).
 *
 * Bug: Japanese-speaking users on Android were stuck seeing English because
 * svelte-whisper's old init() persisted the auto-detected "en" to localStorage.
 * On return visits, localStorage won over browser language detection, so the
 * newly-added "ja" locale was never used.
 *
 * Fixes verified here:
 * 1. v1.0.4 migration clears stale persisted locale from localStorage
 * 2. index.html prevents Chrome auto-translation (which broke Svelte's DOM)
 * 3. i18n init uses the correct prefixed persistKey
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
    STORAGE_KEY_PREFIX,
    getItem,
    setItem,
    removeItem,
} from "../src/lib/storage.ts";
import { compareVersions } from "../src/lib/migrations/runMigrations.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function installWindow(localStorage: Storage, sessionStorage: Storage): void {
    const win = { localStorage, sessionStorage };
    globalWithWindow.window = win as unknown as NonNullable<
        typeof globalWithWindow.window
    >;
    globalWithWindow.localStorage = localStorage;
    globalWithWindow.sessionStorage = sessionStorage;
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
}

// ---------------------------------------------------------------------------
// 1. Migration v1.0.4 exists and clears stale locale
// ---------------------------------------------------------------------------

const migrationSource = readFileSync(
    "src/lib/migrations/runMigrations.ts",
    "utf8",
);

// The MIGRATIONS array must contain an entry targeting v1.0.4
assert.ok(
    /toVersion:\s*["']1\.0\.4["']/.test(migrationSource),
    "runMigrations.ts should contain a migration with toVersion '1.0.4'",
);

// The v1.0.4 migration must call removeItem("locale")
assert.ok(
    /removeItem\(\s*["']locale["']\s*\)/.test(migrationSource),
    'v1.0.4 migration should call removeItem("locale")',
);

// v1.0.4 migration sorts after v1.0 migration
assert.strictEqual(
    compareVersions("1.0", "1.0.4"),
    -1,
    "v1.0 migration should run before v1.0.4",
);

// ---------------------------------------------------------------------------
// 2. Migration effect: removeItem("locale") clears stale persisted locale
// ---------------------------------------------------------------------------

try {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();
    installWindow(localStorage, sessionStorage);

    // Simulate the stale state: svelte-whisper persisted "en" via the old init()
    const prefixedKey = `${STORAGE_KEY_PREFIX}locale`;
    setItem("locale", "en");
    assert.strictEqual(
        localStorage.getItem(prefixedKey),
        "en",
        "Precondition: stale 'en' should be in storage under prefixed key",
    );

    // Run the migration's effect
    removeItem("locale");
    assert.strictEqual(
        localStorage.getItem(prefixedKey),
        null,
        "After migration effect, stale locale should be cleared from storage",
    );

    // Verify the key is fully gone (not empty string)
    assert.strictEqual(
        getItem("locale"),
        null,
        "getItem('locale') should return null after removal",
    );
} finally {
    restoreWindow();
}

// ---------------------------------------------------------------------------
// 3. index.html prevents Chrome auto-translation
// ---------------------------------------------------------------------------

const indexHtml = readFileSync("index.html", "utf8");

// <html> tag must have translate="no" attribute
assert.ok(
    /<html[^>]+translate\s*=\s*["']no["']/.test(indexHtml),
    'index.html <html> tag should have translate="no" to prevent Chrome auto-translate',
);

// Must include the Google notranslate meta tag
assert.ok(
    /<meta\s+name\s*=\s*["']google["']\s+content\s*=\s*["']notranslate["']\s*\/?>/.test(
        indexHtml,
    ),
    'index.html should include <meta name="google" content="notranslate" />',
);

// ---------------------------------------------------------------------------
// 4. i18n init uses the correct prefixed persistKey
// ---------------------------------------------------------------------------

const i18nSource = readFileSync("src/lib/i18n.ts", "utf8");

// Must use prefixKey("locale") as the persistKey
assert.ok(
    /persistKey:\s*prefixKey\(\s*["']locale["']\s*\)/.test(i18nSource),
    'i18n init should use persistKey: prefixKey("locale")',
);

// Must import prefixKey from storage
assert.ok(
    /import\s+\{[^}]*prefixKey[^}]*\}\s+from\s+["'].\/storage["']/.test(
        i18nSource,
    ),
    "i18n should import prefixKey from ./storage",
);

// The resulting persistKey matches what svelte-whisper reads from localStorage
assert.strictEqual(
    `${STORAGE_KEY_PREFIX}locale`,
    "rg-backpack-planner-locale",
    "Prefixed locale key should be 'rg-backpack-planner-locale'",
);
