import { loadPresetsFromStorage, DEFAULT_PRESET_NAME } from "../src/lib/buildPresetsStore.ts";
import { encodeBuildData } from "../src/lib/buildData/encoder.ts";
import * as storageContext from "../src/lib/storage.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(
            `${message}. Expected ${expectedJson}, got ${actualJson}`,
        );
    }
}

// Setup valid build code
const validBuildData = {
    trees: [[1]],
    owned: 0,
};
const validBuildCode = encodeBuildData(validBuildData);

class MemoryStorage implements Storage {
    #values = new Map<string, string>();
    get length() { return this.#values.size; }
    clear(): void { this.#values.clear(); }
    getItem(key: string): string | null { return this.#values.get(key) ?? null; }
    key(index: number): string | null { return Array.from(this.#values.keys())[index] ?? null; }
    removeItem(key: string): void { this.#values.delete(key); }
    setItem(key: string, value: string): void { this.#values.set(key, value); }
}

const mockStorage = new MemoryStorage();
const globalWithWindow = globalThis as any;
const originalLocalStorage = globalWithWindow.localStorage;
globalWithWindow.window = globalWithWindow;
globalWithWindow.localStorage = mockStorage;

// Prefixes from storage.ts
const STORAGE_PREFIX = "rg-backpack-planner-";

const setMockData = (key: string, value: string | null) => {
    if (value === null) mockStorage.removeItem(STORAGE_PREFIX + key);
    else mockStorage.setItem(STORAGE_PREFIX + key, value);
};

try {
    // Helper to assert default dataset
    function assertIsDefault(data: any, message: string) {
        if (!data || !data.presets || data.presets.length !== 1 || typeof data.active !== "string") {
            throw new Error(`${message}. Expected default dataset format, got ${JSON.stringify(data)}`);
        }
        if (data.presets[0].name !== "Default" || data.active !== data.presets[0].id) {
            throw new Error(`${message}. Expected default dataset content, got ${JSON.stringify(data)}`);
        }
    }

    // Test 1: Empty storage should return default
    mockStorage.clear();
    assertIsDefault(
        loadPresetsFromStorage(),
        "Should return default presets when storage is empty",
    );

    // Test 2: Invalid JSON should return default
    setMockData("build-presets", "invalid-json");
    assertIsDefault(
        loadPresetsFromStorage(),
        "Should return default presets for invalid JSON",
    );

    // Test 3: Missing required fields (id, name, buildCode) skips items
    setMockData("build-presets", JSON.stringify({
        active: "1",
        presets: [
            { id: "1", name: "Valid", buildCode: validBuildCode },
            { id: "2", name: "Missing Code" }, // Invalid
            { id: "3", buildCode: validBuildCode }, // Invalid (missing name)
            { name: "Missing ID", buildCode: validBuildCode }, // Invalid
        ],
    }));
    assertEqual(
        loadPresetsFromStorage(),
        {
            active: "1",
            presets: [{ id: "1", name: "Valid", buildCode: validBuildCode }],
        },
        "Should skip presets missing required fields",
    );

    // Test 4: Invalid build codes skip items
    setMockData("build-presets", JSON.stringify({
        active: "1",
        presets: [
            { id: "1", name: "Valid", buildCode: validBuildCode },
            { id: "2", name: "Invalid Code", buildCode: "totally-invalid-string" },
        ],
    }));
    assertEqual(
        loadPresetsFromStorage(),
        {
            active: "1",
            presets: [{ id: "1", name: "Valid", buildCode: validBuildCode }],
        },
        "Should skip presets with un-decodable build codes",
    );

    // Test 5: ID Deduplication (first one wins)
    setMockData("build-presets", JSON.stringify({
        active: "duplicate",
        presets: [
            { id: "duplicate", name: "First", buildCode: validBuildCode },
            { id: "duplicate", name: "Second", buildCode: validBuildCode },
            { id: "unique", name: "Third", buildCode: validBuildCode },
        ],
    }));
    assertEqual(
        loadPresetsFromStorage(),
        {
            active: "duplicate",
            presets: [
                { id: "duplicate", name: "First", buildCode: validBuildCode },
                { id: "unique", name: "Third", buildCode: validBuildCode },
            ],
        },
        "Should deduplicate presets with the same ID, keeping the first occurrence",
    );

    // Test 6: Fallback active ID to first preset if active is not found
    setMockData("build-presets", JSON.stringify({
        active: "non-existent",
        presets: [
            { id: "1", name: "Valid", buildCode: validBuildCode },
        ],
    }));
    assertEqual(
        loadPresetsFromStorage(),
        {
            active: "1",
            presets: [{ id: "1", name: "Valid", buildCode: validBuildCode }],
        },
        "Should fallback active ID if stored active ID is not in presets list",
    );

} finally {
    // Restore original
    globalWithWindow.localStorage = originalLocalStorage;
}
