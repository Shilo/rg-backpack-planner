import assert from "node:assert";
import { get } from "svelte/store";
import { treeLevels } from "../src/lib/treeLevelsStore.ts";
import { techCrystalsOwned } from "../src/lib/techCrystalStore.ts";
import {
    undoHistory,
    canUndo,
    canRedo,
} from "../src/lib/undoHistoryStore.ts";

console.log("  undoHistory");

// --- Setup: initialize stores to a known state ---
treeLevels.set([[10, 20], [30, 40], [50, 60]]);
techCrystalsOwned.set(1000);
undoHistory.clearHistory(0);

// 1. canUndo is false with no history
assert.strictEqual(
    get(canUndo),
    false,
    "canUndo should be false with no past entries",
);

// 2. canRedo is false with no history
assert.strictEqual(
    get(canRedo),
    false,
    "canRedo should be false with no future entries",
);

// 3. pushSnapshot makes canUndo true
treeLevels.set([[1, 2], [3, 4], [5, 6]]);
techCrystalsOwned.set(500);
undoHistory.pushSnapshot(1);
assert.strictEqual(
    get(canUndo),
    true,
    "canUndo should be true after pushSnapshot",
);

// 4. undo restores previous state and returns activeTreeIndex
const undoResult = undoHistory.undo();
assert.strictEqual(
    undoResult,
    0,
    "undo should return the activeTreeIndex of the restored snapshot",
);
assert.deepStrictEqual(
    get(treeLevels),
    [[10, 20], [30, 40], [50, 60]],
    "undo should restore previous treeLevels",
);
assert.strictEqual(
    get(techCrystalsOwned),
    1000,
    "undo should restore previous techCrystalsOwned",
);

// 5. undo makes canRedo true
assert.strictEqual(
    get(canRedo),
    true,
    "canRedo should be true after undo",
);

// 6. redo restores next state and returns activeTreeIndex
const redoResult = undoHistory.redo();
assert.strictEqual(
    redoResult,
    1,
    "redo should return the activeTreeIndex of the redone snapshot",
);
assert.deepStrictEqual(
    get(treeLevels),
    [[1, 2], [3, 4], [5, 6]],
    "redo should restore next treeLevels",
);
assert.strictEqual(
    get(techCrystalsOwned),
    500,
    "redo should restore next techCrystalsOwned",
);

// 7. pushSnapshot after undo clears redo stack
// Setup: push two snapshots, undo once, then push a new one
treeLevels.set([[10, 20], [30, 40], [50, 60]]);
techCrystalsOwned.set(1000);
undoHistory.clearHistory(0);

treeLevels.set([[1, 2], [3, 4], [5, 6]]);
techCrystalsOwned.set(500);
undoHistory.pushSnapshot(0);

treeLevels.set([[7, 8], [9, 10], [11, 12]]);
techCrystalsOwned.set(250);
undoHistory.pushSnapshot(0);

undoHistory.undo(); // go back to snapshot with [[1,2]...]

assert.strictEqual(
    get(canRedo),
    true,
    "canRedo should be true after undo (setup for clearing test)",
);

// Now push a new snapshot — should clear the future
treeLevels.set([[99, 88], [77, 66], [55, 44]]);
techCrystalsOwned.set(999);
undoHistory.pushSnapshot(2);

assert.strictEqual(
    get(canRedo),
    false,
    "pushSnapshot after undo should clear the redo stack",
);

// 8. clearHistory resets all stacks
treeLevels.set([[0, 0], [0, 0], [0, 0]]);
techCrystalsOwned.set(0);
undoHistory.clearHistory(0);

assert.strictEqual(
    get(canUndo),
    false,
    "clearHistory should leave no past entries",
);
assert.strictEqual(
    get(canRedo),
    false,
    "clearHistory should leave no future entries",
);
assert.deepStrictEqual(
    get(undoHistory).present,
    {
        treeLevels: [[0, 0], [0, 0], [0, 0]],
        techCrystalsOwned: 0,
        activeTreeIndex: 0,
    },
    "clearHistory should capture the current state as present",
);

// 9. FIFO eviction at 30 entries
treeLevels.set([[0, 0], [0, 0], [0, 0]]);
techCrystalsOwned.set(0);
undoHistory.clearHistory(0);

// Push 31 additional snapshots (present becomes entry 0, then we push 31 more)
for (let i = 1; i <= 31; i++) {
    treeLevels.set([[i, i], [i, i], [i, i]]);
    techCrystalsOwned.set(i * 10);
    undoHistory.pushSnapshot(0);
}

const historyState = get(undoHistory);
assert.strictEqual(
    historyState.past.length,
    30,
    "past should be capped at MAX_HISTORY (30)",
);
// The oldest entry (the clearHistory snapshot, i=0) should be evicted.
// Entry i=1 should now be the oldest entry remaining in past.
assert.deepStrictEqual(
    historyState.past[0].treeLevels,
    [[1, 1], [1, 1], [1, 1]],
    "FIFO eviction should drop the oldest entry when cap is exceeded",
);

// 10. undo when past is empty is a no-op (returns null)
treeLevels.set([[10, 20], [30, 40], [50, 60]]);
techCrystalsOwned.set(1000);
undoHistory.clearHistory(0);

const noopUndoResult = undoHistory.undo();
assert.strictEqual(
    noopUndoResult,
    null,
    "undo with empty past should return null",
);
assert.deepStrictEqual(
    get(treeLevels),
    [[10, 20], [30, 40], [50, 60]],
    "undo with empty past should not change treeLevels",
);

// 11. redo when future is empty is a no-op (returns null)
undoHistory.pushSnapshot(0);
const noopRedoResult = undoHistory.redo();
assert.strictEqual(
    noopRedoResult,
    null,
    "redo with empty future should return null",
);

console.log("    \u2713 canUndo and canRedo start false");
console.log("    \u2713 pushSnapshot makes canUndo true");
console.log("    \u2713 undo restores state and returns activeTreeIndex");
console.log("    \u2713 undo makes canRedo true");
console.log("    \u2713 redo restores state and returns activeTreeIndex");
console.log("    \u2713 pushSnapshot after undo clears redo stack");
console.log("    \u2713 clearHistory resets all stacks");
console.log("    \u2713 FIFO eviction at 30 entries");
console.log("    \u2713 undo when past is empty is a no-op");
console.log("    \u2713 redo when future is empty is a no-op");
console.log("  \u2713 undoHistory\n");
