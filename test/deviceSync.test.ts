import { encodeBuildData } from "../src/lib/buildData/encoder.ts";
import {
    encodePresetsForSync,
    decodeSyncPayload,
    replaceAllPresets,
    mergePresets,
    SYNC_FORMAT_VERSION,
    type SyncPreset,
} from "../src/lib/deviceSync.ts";
import type { BuildPresetsData } from "../src/lib/buildPresetsStore.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(
            `${message}. Expected ${expectedJson}, got ${actualJson}`,
        );
    }
}

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(message);
}

const emptyCode = encodeBuildData({ trees: [[], [], []], owned: 0 });
const buildCode1 = encodeBuildData({ trees: [[1]], owned: 0 });
const buildCode2 = encodeBuildData({ trees: [[2]], owned: 0 });

// ─── encodePresetsForSync ────────────────────────────────────────

{
    const data: BuildPresetsData = {
        active: "a",
        presets: [
            { id: "a", name: "Alpha", buildCode: buildCode1 },
            { id: "b", name: "Beta", buildCode: buildCode2 },
        ],
    };
    const json = encodePresetsForSync(data);
    const parsed = JSON.parse(json);
    assertEqual(parsed.v, SYNC_FORMAT_VERSION, "Version should match");
    assertEqual(parsed.presets.length, 2, "Should encode both presets");
    assertEqual(parsed.presets[0].name, "Alpha", "Name preserved");
    assertEqual(parsed.presets[0].build, buildCode1, "Build code preserved");
    assert(!("id" in parsed.presets[0]), "ID should NOT be included in sync payload");
    assert(!("active" in parsed), "Active should NOT be included in sync payload");
}

// ─── decodeSyncPayload ───────────────────────────────────────────

{
    // Valid payload
    const payload = JSON.stringify({
        v: 1,
        presets: [
            { name: "One", build: buildCode1 },
            { name: "Two", build: buildCode2 },
        ],
    });
    const result = decodeSyncPayload(payload);
    assert(result !== null, "Valid payload should decode");
    assertEqual(result!.length, 2, "Should decode both presets");
    assertEqual(result![0].name, "One", "Name decoded");
    assertEqual(result![0].build, buildCode1, "Build decoded");
}

{
    // Invalid JSON
    assertEqual(decodeSyncPayload("not json"), null, "Invalid JSON returns null");
}

{
    // Missing version
    assertEqual(
        decodeSyncPayload(JSON.stringify({ presets: [] })),
        null,
        "Missing version returns null",
    );
}

{
    // Invalid build code skipped
    const payload = JSON.stringify({
        v: 1,
        presets: [
            { name: "Good", build: buildCode1 },
            { name: "Bad", build: "totally-invalid" },
        ],
    });
    const result = decodeSyncPayload(payload);
    assert(result !== null, "Should still decode valid entries");
    assertEqual(result!.length, 1, "Invalid build codes skipped");
    assertEqual(result![0].name, "Good", "Good preset kept");
}

{
    // Empty presets array
    assertEqual(
        decodeSyncPayload(JSON.stringify({ v: 1, presets: [] })),
        null,
        "Empty presets returns null",
    );
}

{
    // Whitespace name normalized
    const payload = JSON.stringify({
        v: 1,
        presets: [{ name: "   ", build: emptyCode }],
    });
    const result = decodeSyncPayload(payload);
    assert(result !== null, "Whitespace name should decode");
    assertEqual(result![0].name, "Build", "Whitespace name becomes 'Build'");
}

// ─── replaceAllPresets ───────────────────────────────────────────

{
    const incoming: SyncPreset[] = [
        { name: "Imported A", build: buildCode1 },
        { name: "Imported B", build: buildCode2 },
    ];
    const result = replaceAllPresets(incoming);
    assertEqual(result.presets.length, 2, "Replace should have 2 presets");
    assertEqual(result.presets[0].name, "Imported A", "First preset name");
    assertEqual(result.presets[0].buildCode, buildCode1, "First preset code");
    assertEqual(result.active, result.presets[0].id, "Active = first preset");
    assert(result.presets[0].id !== result.presets[1].id, "IDs should be unique");
}

// ─── mergePresets ────────────────────────────────────────────────

{
    // Merge adds new, skips exact duplicates (same name + same code)
    const local: BuildPresetsData = {
        active: "loc-1",
        presets: [
            { id: "loc-1", name: "Existing", buildCode: buildCode1 },
        ],
    };
    const incoming: SyncPreset[] = [
        { name: "Existing", build: buildCode1 },
        { name: "New One", build: buildCode2 },
    ];
    const result = mergePresets(local, incoming);
    assertEqual(result.presets.length, 2, "Should have 2 presets after merge");
    assertEqual(result.presets[0].name, "Existing", "Original kept");
    assertEqual(result.presets[0].id, "loc-1", "Original ID preserved");
    assertEqual(result.presets[1].name, "New One", "New preset added");
    assertEqual(result.active, "loc-1", "Active unchanged");
}

{
    // Merge renames on name collision with different code
    const local: BuildPresetsData = {
        active: "loc-1",
        presets: [
            { id: "loc-1", name: "Build", buildCode: buildCode1 },
        ],
    };
    const incoming: SyncPreset[] = [
        { name: "Build", build: buildCode2 },
    ];
    const result = mergePresets(local, incoming);
    assertEqual(result.presets.length, 2, "Both presets present");
    assert(
        result.presets[1].name !== "Build",
        "Renamed to avoid collision: " + result.presets[1].name,
    );
}

{
    // Merge with no new presets returns same reference
    const local: BuildPresetsData = {
        active: "loc-1",
        presets: [
            { id: "loc-1", name: "Only", buildCode: buildCode1 },
        ],
    };
    const incoming: SyncPreset[] = [
        { name: "Only", build: buildCode1 },
    ];
    const result = mergePresets(local, incoming);
    assert(result === local, "No changes should return same object");
}

// ─── Round-trip test ─────────────────────────────────────────────

{
    const original: BuildPresetsData = {
        active: "x",
        presets: [
            { id: "x", name: "Round Trip", buildCode: buildCode1 },
            { id: "y", name: "Another", buildCode: buildCode2 },
        ],
    };
    const encoded = encodePresetsForSync(original);
    const decoded = decodeSyncPayload(encoded);
    assert(decoded !== null, "Round-trip should decode");
    assertEqual(decoded!.length, 2, "Round-trip count");
    assertEqual(decoded![0].name, "Round Trip", "Round-trip name");
    assertEqual(decoded![0].build, buildCode1, "Round-trip code");
}
