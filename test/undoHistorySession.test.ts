import assert from "node:assert";
import { get } from "svelte/store";
import { treeLevels, resetAllTreeLevels } from "../src/lib/treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "../src/lib/techCrystalStore";
import { undoHistory, canUndo, canRedo } from "../src/lib/undoHistoryStore";

// Polyfill sessionStorage for Node.js
if (typeof globalThis.sessionStorage === "undefined") {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, String(value)); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
        get length() { return store.size; },
        key: (index: number) => [...store.keys()][index] ?? null,
    } as Storage;
}

const mockTrees = [
    { nodes: Array(30).fill({} as any) },
    { nodes: Array(30).fill({} as any) },
    { nodes: Array(30).fill({} as any) },
];

function resetAll() {
    resetAllTreeLevels(mockTrees);
    setTechCrystalsOwned(0);
    undoHistory.clearHistory(0);
    sessionStorage.clear();
}

function setTreeState(treeIndex: number, levels: number[]) {
    const padded = Array(30).fill(0);
    levels.forEach((v, i) => { padded[i] = v; });
    const current = get(treeLevels);
    current[treeIndex] = padded;
    treeLevels.set(current);
}

console.log("  undoHistorySession");

// ============================================================
// 1. persistToSession saves to sessionStorage
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10, 20]);
undoHistory.pushSnapshot(0);

setTreeState(0, [30, 40]);
undoHistory.pushSnapshot(0);

undoHistory.persistToSession();

const raw = sessionStorage.getItem("undo-history");
assert.notStrictEqual(raw, null, "persistToSession should write to sessionStorage");

const saved = JSON.parse(raw!);
assert.strictEqual(saved.past.length, 2, "saved state should have 2 past entries");
assert.notStrictEqual(saved.present, null, "saved state should have a present");
assert.strictEqual(saved.future.length, 0, "saved state should have empty future");

console.log("    ✓ persistToSession writes undo state to sessionStorage");

// ============================================================
// 2. restoreFromSession restores past/future and clears key
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);

setTreeState(0, [20]);
undoHistory.pushSnapshot(0);

setTreeState(0, [30]);
undoHistory.pushSnapshot(0);

// Undo once so we have a future entry
undoHistory.undo();
assert.strictEqual(get(canUndo), true);
assert.strictEqual(get(canRedo), true);

const pastLenBefore = get(undoHistory).past.length;
const futureLenBefore = get(undoHistory).future.length;

undoHistory.persistToSession();

// Simulate reload: clear the in-memory undo state
undoHistory.clearHistory(0);
assert.strictEqual(get(canUndo), false, "after clearHistory, canUndo is false");
assert.strictEqual(get(canRedo), false, "after clearHistory, canRedo is false");

// Restore from session
const restored = undoHistory.restoreFromSession(0);
assert.strictEqual(restored, true, "restoreFromSession should return true");
assert.strictEqual(get(undoHistory).past.length, pastLenBefore, "past length should match");
assert.strictEqual(get(undoHistory).future.length, futureLenBefore, "future length should match");
assert.strictEqual(get(canUndo), true, "canUndo restored");
assert.strictEqual(get(canRedo), true, "canRedo restored");

// Key should be consumed
assert.strictEqual(
    sessionStorage.getItem("undo-history"),
    null,
    "sessionStorage key should be removed after restore",
);

console.log("    ✓ restoreFromSession restores past/future and clears sessionStorage key");

// ============================================================
// 3. restoreFromSession replaces present with fresh capture
// ============================================================
resetAll();
setTechCrystalsOwned(500);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);

undoHistory.persistToSession();

// Simulate reload: different current state than what was saved
setTreeState(0, [99]);
setTechCrystalsOwned(999);
undoHistory.clearHistory(0);

undoHistory.restoreFromSession(0);

// Present should reflect the CURRENT state, not the saved one
const present = get(undoHistory).present;
assert.strictEqual(present!.treeLevels[0][0], 99, "present should reflect current tree state (99), not saved (10)");
assert.strictEqual(present!.techCrystalsOwned, 999, "present should reflect current crystals (999), not saved (500)");

// But past should come from the saved data
assert.strictEqual(get(canUndo), true, "past should be restored from session");

console.log("    ✓ restoreFromSession replaces present with fresh capture of current state");

// ============================================================
// 4. restoreFromSession returns false when no data exists
// ============================================================
resetAll();
const result = undoHistory.restoreFromSession(0);
assert.strictEqual(result, false, "should return false when sessionStorage has no data");

console.log("    ✓ restoreFromSession returns false when sessionStorage is empty");

// ============================================================
// 5. restoreFromSession returns false for corrupted data
// ============================================================
resetAll();
sessionStorage.setItem("undo-history", "not valid json {{{");
const corruptResult = undoHistory.restoreFromSession(0);
assert.strictEqual(corruptResult, false, "should return false for corrupted data");
assert.strictEqual(
    sessionStorage.getItem("undo-history"),
    null,
    "corrupted key should still be removed",
);

console.log("    ✓ restoreFromSession handles corrupted data gracefully");

// ============================================================
// 6. restoreFromSession returns false when present is null
// ============================================================
resetAll();
sessionStorage.setItem("undo-history", JSON.stringify({
    past: [],
    present: null,
    future: [],
}));
const nullPresentResult = undoHistory.restoreFromSession(0);
assert.strictEqual(nullPresentResult, false, "should return false when present is null");
assert.strictEqual(
    sessionStorage.getItem("undo-history"),
    null,
    "key should be removed even when present is null",
);

console.log("    ✓ restoreFromSession rejects state with null present");

// ============================================================
// 7. persistToSession is a no-op when present is null
// ============================================================
resetAll();
// Force a null present by directly setting state (store starts with null)
undoHistory.restoreState({ past: [], present: null, future: [] });
undoHistory.persistToSession();
assert.strictEqual(
    sessionStorage.getItem("undo-history"),
    null,
    "persistToSession should not write when present is null",
);

console.log("    ✓ persistToSession skips write when present is null");

// ============================================================
// 8. Restored undo/redo operations work correctly after restore
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
setTechCrystalsOwned(900);
undoHistory.pushSnapshot(0);

setTreeState(0, [20]);
setTechCrystalsOwned(800);
undoHistory.pushSnapshot(0);

setTreeState(0, [30]);
setTechCrystalsOwned(700);
undoHistory.pushSnapshot(0);

undoHistory.persistToSession();

// Simulate reload: reload same state
resetAllTreeLevels(mockTrees);
setTreeState(0, [30]);
setTechCrystalsOwned(700);
undoHistory.clearHistory(0);

undoHistory.restoreFromSession(0);

// Now undo should work through the restored history
const u1 = undoHistory.undo();
assert.strictEqual(u1, 0, "undo returns correct activeTreeIndex");
assert.strictEqual(get(treeLevels)[0][0], 20, "undo 1: tree state restored to [20]");
assert.strictEqual(get(techCrystalsOwned), 800, "undo 1: crystals restored to 800");

const u2 = undoHistory.undo();
assert.strictEqual(u2, 0);
assert.strictEqual(get(treeLevels)[0][0], 10, "undo 2: tree state restored to [10]");
assert.strictEqual(get(techCrystalsOwned), 900, "undo 2: crystals restored to 900");

const u3 = undoHistory.undo();
assert.strictEqual(u3, 0);
assert.strictEqual(get(treeLevels)[0][0], 0, "undo 3: tree state restored to initial");
assert.strictEqual(get(techCrystalsOwned), 1000, "undo 3: crystals restored to 1000");

assert.strictEqual(get(canUndo), false, "no more undo");

// Redo all the way back
undoHistory.redo();
undoHistory.redo();
undoHistory.redo();
assert.strictEqual(get(treeLevels)[0][0], 30, "redo back to [30]");
assert.strictEqual(get(techCrystalsOwned), 700, "redo back to 700 crystals");
assert.strictEqual(get(canRedo), false, "no more redo");

console.log("    ✓ undo/redo operations work correctly after session restore");

// ============================================================
// 9. Second restoreFromSession call returns false (one-shot)
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);
undoHistory.persistToSession();

undoHistory.clearHistory(0);
const first = undoHistory.restoreFromSession(0);
assert.strictEqual(first, true, "first restore succeeds");

undoHistory.clearHistory(0);
const second = undoHistory.restoreFromSession(0);
assert.strictEqual(second, false, "second restore fails (key already consumed)");

console.log("    ✓ restoreFromSession is one-shot (key consumed on first call)");

// ============================================================
// 10. restoreFromSession does not trigger treeLevels/techCrystals writes
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);
undoHistory.persistToSession();

// Set current state and subscribe to detect writes
setTreeState(0, [10]);
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

let treeLevelsWriteCount = 0;
let crystalsWriteCount = 0;
const unsubTree = treeLevels.subscribe(() => { treeLevelsWriteCount++; });
const unsubCrystals = techCrystalsOwned.subscribe(() => { crystalsWriteCount++; });

// Reset counters after subscription (subscribe fires immediately with current value)
treeLevelsWriteCount = 0;
crystalsWriteCount = 0;

undoHistory.restoreFromSession(0);

assert.strictEqual(treeLevelsWriteCount, 0, "restoreFromSession should not write to treeLevels");
assert.strictEqual(crystalsWriteCount, 0, "restoreFromSession should not write to techCrystalsOwned");

unsubTree();
unsubCrystals();

console.log("    ✓ restoreFromSession does not trigger store writes (no applySnapshot)");

// ============================================================
// 11. activeTreeIndex passed to restoreFromSession sets present correctly
// ============================================================
resetAll();
setTechCrystalsOwned(500);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);
undoHistory.persistToSession();

undoHistory.clearHistory(0);
undoHistory.restoreFromSession(2);

const restoredPresent = get(undoHistory).present;
assert.strictEqual(restoredPresent!.activeTreeIndex, 2, "present activeTreeIndex should match argument (2)");

console.log("    ✓ restoreFromSession uses provided activeTreeIndex for present snapshot");

// Cleanup
resetAll();

console.log("  ✓ undoHistorySession\n");
