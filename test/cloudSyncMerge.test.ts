import { mergePresets, type MergeInput } from "../src/lib/cloudSync/merge.ts";
import type { BuildPreset } from "../src/lib/buildPresetsStore.ts";
import type { SyncDocument } from "../src/lib/cloudSync/firestore.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(`${message}. Expected ${expectedJson}, got ${actualJson}`);
    }
}

function makePreset(id: string, name: string, updatedAt: number): BuildPreset {
    return { id, name, buildCode: `code-${id}`, updatedAt };
}

function makeRemote(presets: Record<string, { name: string; buildCode: string; updatedAt: number }>, order: string[]): SyncDocument {
    return { presets, order, revision: 1, updatedAt: null };
}

function remoteEntry(id: string, name: string, updatedAt: number) {
    return { name, buildCode: `code-${id}`, updatedAt };
}

try {
    // Test 1: Both have same preset — remote newer wins
    {
        const local = [makePreset("a", "Local A", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "Remote A", 200) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].name, "Remote A", "Test 1: remote newer should win");
        assertEqual(result.presets[0].updatedAt, 200, "Test 1: updatedAt should be remote's");
    }

    // Test 2: Both have same preset — local newer wins
    {
        const local = [makePreset("a", "Local A", 300)];
        const remote = makeRemote({ a: remoteEntry("a", "Remote A", 200) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].name, "Local A", "Test 2: local newer should win");
    }

    // Test 3: Both have same preset — equal updatedAt keeps local
    {
        const local = [makePreset("a", "Local A", 200)];
        local[0].buildCode = "local-code";
        const remote = makeRemote({ a: { name: "Remote A", buildCode: "remote-code", updatedAt: 200 } }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets[0].buildCode, "local-code", "Test 3: equal updatedAt should keep local");
    }

    // Test 4: Remote-only preset — added to local
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({
            a: remoteEntry("a", "A", 100),
            b: remoteEntry("b", "B", 200),
        }, ["a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 2, "Test 4: should have 2 presets");
        assertEqual(result.presets[1].name, "B", "Test 4: remote-only preset added");
    }

    // Test 5: Local-only preset, was in previous remote — deleted (remote deleted it)
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 1, "Test 5: remotely deleted preset should be removed");
        assertEqual(result.presets[0].id, "a", "Test 5: only preset 'a' should remain");
    }

    // Test 6: Local-only preset, NOT in previous remote — kept (local addition)
    {
        const local = [makePreset("a", "A", 100), makePreset("c", "C", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "c"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 2, "Test 6: local addition should be kept");
        assertEqual(result.presets[1].id, "c", "Test 6: local-only preset 'c' kept");
    }

    // Test 7: Pending local deletion — skipped, not re-added from remote
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({
            a: remoteEntry("a", "A", 100),
            b: remoteEntry("b", "B", 200),
        }, ["a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(["b"]),
        });
        assertEqual(result.presets.length, 1, "Test 7: pending deletion should not be re-added");
    }

    // Test 8: Order — remote order as base, local-only appended
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100), makePreset("c", "C", 100)];
        const remote = makeRemote({
            b: remoteEntry("b", "B", 100),
            a: remoteEntry("a", "A", 100),
        }, ["b", "a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b", "c"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.order, ["b", "a", "c"], "Test 8: remote order + local-only appended");
    }

    // Test 9: Active ID invalidation — falls back to first preset
    {
        const local = [makePreset("a", "A", 100), makePreset("b", "B", 100)];
        const remote = makeRemote({ a: remoteEntry("a", "A", 100) }, ["a"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b"], localActiveId: "b",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.activeId, "a", "Test 9: active should fall back to first when deleted");
    }

    // Test 10: Empty presets after merge — default created
    {
        const local = [makePreset("a", "A", 100)];
        const remote = makeRemote({}, []);
        const result = mergePresets({
            localPresets: local, localOrder: ["a"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 1, "Test 10: should create default when all deleted");
        assertEqual(result.presets[0].name, "Default", "Test 10: default preset name");
    }

    // Test 11: Multiple presets mixed scenario
    {
        const local = [
            makePreset("a", "Old A", 100),  // both have, remote newer
            makePreset("b", "Local B", 300), // both have, local newer
            makePreset("d", "Local D", 100), // local-only addition
        ];
        const remote = makeRemote({
            a: remoteEntry("a", "New A", 200),
            b: remoteEntry("b", "Remote B", 200),
            c: remoteEntry("c", "Remote C", 200),
        }, ["c", "a", "b"]);
        const result = mergePresets({
            localPresets: local, localOrder: ["a", "b", "d"], localActiveId: "a",
            remote, lastRemotePresetIds: new Set(["a", "b"]), pendingLocalDeletions: new Set(),
        });
        assertEqual(result.presets.length, 4, "Test 11: should have 4 presets");
        assertEqual(result.presets[0].name, "Remote C", "Test 11: remote-only 'c' added");
        assertEqual(result.presets[1].name, "New A", "Test 11: remote newer 'a' wins");
        assertEqual(result.presets[2].name, "Local B", "Test 11: local newer 'b' wins");
        assertEqual(result.presets[3].name, "Local D", "Test 11: local addition 'd' appended");
        assertEqual(result.order, ["c", "a", "b", "d"], "Test 11: correct order");
    }

    console.log("  cloudSyncMerge: all 11 tests passed");
} catch (e) {
    console.error("  cloudSyncMerge: FAIL", e);
    process.exit(1);
}
