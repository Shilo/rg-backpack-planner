import assert from "node:assert";
import { get } from "svelte/store";
import { treeLevels, setTreeLevels, resetTreeLevels, resetAllTreeLevels } from "../src/lib/treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "../src/lib/techCrystalStore";
import { undoHistory, canUndo, canRedo } from "../src/lib/undoHistoryStore";

// Mock trees (3 trees with 30 nodes each, matching the real app)
const mockTrees = [
    { nodes: Array(30).fill({} as any) }, // Guardian
    { nodes: Array(30).fill({} as any) }, // Vanguard
    { nodes: Array(30).fill({} as any) }, // Cannon
];

function resetAll() {
    resetAllTreeLevels(mockTrees);
    setTechCrystalsOwned(0);
    undoHistory.clearHistory(0);
}

function setTreeState(treeIndex: number, levels: number[]) {
    const padded = Array(30).fill(0);
    levels.forEach((v, i) => { padded[i] = v; });
    setTreeLevels(treeIndex, padded);
}

// ============================================================
// 1. Leveling different trees and undoing across trees
// ============================================================
resetAll();
setTechCrystalsOwned(5000);
undoHistory.clearHistory(0);

// Level tree 0 (Guardian)
setTreeState(0, [10, 20, 30]);
undoHistory.pushSnapshot(0);

// Level tree 1 (Vanguard)
setTreeState(1, [5, 15, 25]);
undoHistory.pushSnapshot(1);

// Level tree 2 (Cannon)
setTreeState(2, [1, 2, 3]);
undoHistory.pushSnapshot(2);

// Undo should return tree 2's snapshot (which was tree 1 state)
let idx = undoHistory.undo();
assert.strictEqual(idx, 1, "undo from tree 2 should return tree 1 index");
assert.deepStrictEqual(get(treeLevels)[1].slice(0, 3), [5, 15, 25], "tree 1 levels should be restored after undo");
// Tree 2 should be back to zeros
assert.deepStrictEqual(get(treeLevels)[2].slice(0, 3), [0, 0, 0], "tree 2 levels should be zeros after undo");

// Undo again — should return tree 0
idx = undoHistory.undo();
assert.strictEqual(idx, 0, "second undo should return tree 0 index");
assert.deepStrictEqual(get(treeLevels)[0].slice(0, 3), [10, 20, 30], "tree 0 levels should be restored");
// Tree 1 should be back to zeros
assert.deepStrictEqual(get(treeLevels)[1].slice(0, 3), [0, 0, 0], "tree 1 should be zeros after second undo");

// Undo one more — back to initial state (all zeros)
idx = undoHistory.undo();
assert.strictEqual(idx, 0, "third undo should return tree 0 index");
assert.deepStrictEqual(get(treeLevels)[0].slice(0, 3), [0, 0, 0], "tree 0 should be zeros after full undo");

// No more undo available
assert.strictEqual(get(canUndo), false, "no more undo available");

console.log("  ✓ cross-tree undo restores correct tree states and returns correct indices");

// ============================================================
// 2. Redo after undo, verifying full round-trip across trees
// ============================================================
idx = undoHistory.redo();
assert.strictEqual(idx, 0, "redo should return tree 0 index");
assert.deepStrictEqual(get(treeLevels)[0].slice(0, 3), [10, 20, 30], "redo restores tree 0 levels");

idx = undoHistory.redo();
assert.strictEqual(idx, 1, "second redo should return tree 1 index");
assert.deepStrictEqual(get(treeLevels)[1].slice(0, 3), [5, 15, 25], "redo restores tree 1 levels");

idx = undoHistory.redo();
assert.strictEqual(idx, 2, "third redo should return tree 2 index");
assert.deepStrictEqual(get(treeLevels)[2].slice(0, 3), [1, 2, 3], "redo restores tree 2 levels");

assert.strictEqual(get(canRedo), false, "no more redo available after full redo");

console.log("  ✓ redo round-trip restores all trees correctly");

// ============================================================
// 3. Tech crystals are snapshotted and restored correctly
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTechCrystalsOwned(500);
undoHistory.pushSnapshot(0);

setTechCrystalsOwned(200);
undoHistory.pushSnapshot(0);

undoHistory.undo();
assert.strictEqual(get(techCrystalsOwned), 500, "undo restores techCrystalsOwned to 500");

undoHistory.undo();
assert.strictEqual(get(techCrystalsOwned), 1000, "undo restores techCrystalsOwned to 1000");

undoHistory.redo();
assert.strictEqual(get(techCrystalsOwned), 500, "redo restores techCrystalsOwned to 500");

console.log("  ✓ tech crystals are correctly snapshotted and restored");

// ============================================================
// 4. Combined tree levels + tech crystals undo
// ============================================================
resetAll();
setTechCrystalsOwned(2000);
undoHistory.clearHistory(0);

// Simulate: user levels a node (changes both levels and crystals)
setTreeState(0, [50]);
setTechCrystalsOwned(1500);
undoHistory.pushSnapshot(0);

setTreeState(1, [30]);
setTechCrystalsOwned(1000);
undoHistory.pushSnapshot(1);

// Undo — should restore both levels AND crystals together
undoHistory.undo();
assert.strictEqual(get(treeLevels)[1][0], 0, "tree 1 level 0 should be 0 after undo");
assert.strictEqual(get(techCrystalsOwned), 1500, "tech crystals restored to 1500");

undoHistory.undo();
assert.strictEqual(get(treeLevels)[0][0], 0, "tree 0 level 0 should be 0 after undo");
assert.strictEqual(get(techCrystalsOwned), 2000, "tech crystals restored to 2000");

console.log("  ✓ combined tree levels + tech crystals undo works atomically");

// ============================================================
// 5. clearHistory on mode switch boundary
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

// Build up some history
setTreeState(0, [10]);
undoHistory.pushSnapshot(0);
setTreeState(0, [20]);
undoHistory.pushSnapshot(0);

assert.strictEqual(get(canUndo), true, "should have undo history");

// Simulate mode switch (preview → personal)
undoHistory.clearHistory(0);

assert.strictEqual(get(canUndo), false, "clearHistory should reset undo");
assert.strictEqual(get(canRedo), false, "clearHistory should reset redo");

// Verify current state is captured as new present
const histState = get(undoHistory);
assert.notStrictEqual(histState.present, null, "present should be captured after clearHistory");
assert.strictEqual(histState.past.length, 0, "past should be empty after clearHistory");
assert.strictEqual(histState.future.length, 0, "future should be empty after clearHistory");

console.log("  ✓ clearHistory resets all stacks at mode boundary");

// ============================================================
// 6. clearHistory preserves current state snapshot
// ============================================================
resetAll();
setTechCrystalsOwned(750);
setTreeState(0, [15, 25]);
setTreeState(1, [5]);
undoHistory.clearHistory(1);

// After clearHistory, the present snapshot should reflect current state
const snap = get(undoHistory).present;
assert.notStrictEqual(snap, null, "present should exist");
assert.strictEqual(snap!.techCrystalsOwned, 750, "present snapshot has correct crystals");
assert.strictEqual(snap!.activeTreeIndex, 1, "present snapshot has correct tree index");
assert.strictEqual(snap!.treeLevels[0][0], 15, "present snapshot has correct tree 0 levels");

console.log("  ✓ clearHistory captures current state correctly");

// ============================================================
// 7. Simulate preset switch boundary
// ============================================================
resetAll();
setTechCrystalsOwned(500);
undoHistory.clearHistory(0);

// User makes changes in preset A
setTreeState(0, [10, 20]);
undoHistory.pushSnapshot(0);
setTreeState(0, [30, 40]);
undoHistory.pushSnapshot(0);

assert.strictEqual(get(canUndo), true);

// Switch to preset B (simulated)
resetAllTreeLevels(mockTrees);
setTechCrystalsOwned(0);
undoHistory.clearHistory(0);

assert.strictEqual(get(canUndo), false, "undo should be empty after preset switch");
assert.strictEqual(get(canRedo), false, "redo should be empty after preset switch");

// New actions in preset B
setTreeState(1, [5]);
undoHistory.pushSnapshot(1);

assert.strictEqual(get(canUndo), true, "new actions in preset B create undo history");

undoHistory.undo();
assert.strictEqual(get(treeLevels)[1][0], 0, "undo in preset B works correctly");
assert.strictEqual(get(canUndo), false, "only one undo step in preset B");

console.log("  ✓ preset switch boundary isolates undo history");

// ============================================================
// 8. Rapid sequential actions (stress test)
// ============================================================
resetAll();
setTechCrystalsOwned(10000);
undoHistory.clearHistory(0);

// Simulate rapid clicking: 50 level changes
for (let i = 1; i <= 50; i++) {
    setTreeState(0, [i]);
    undoHistory.pushSnapshot(0);
}

// Should be capped at 30 past entries
const rapidState = get(undoHistory);
assert.strictEqual(rapidState.past.length, 30, "past capped at 30 after 50 pushes");

// Undo all 30 entries
for (let i = 0; i < 30; i++) {
    undoHistory.undo();
}

// After 30 undos, we should be at the oldest surviving snapshot
// The 50th push is present, 30 undos should get us back to entry 20
assert.strictEqual(get(canUndo), false, "no more undo after 30 undos");
assert.strictEqual(get(treeLevels)[0][0], 20, "oldest surviving snapshot has level 20");

// Redo all 30 back
for (let i = 0; i < 30; i++) {
    undoHistory.redo();
}
assert.strictEqual(get(treeLevels)[0][0], 50, "redo all returns to level 50");
assert.strictEqual(get(canRedo), false, "no more redo");

console.log("  ✓ rapid sequential actions respect FIFO cap and undo/redo correctly");

// ============================================================
// 9. Interleaved undo/redo/push (fork behavior)
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

// Undo twice: back to [10]
undoHistory.undo(); // back to [20]
undoHistory.undo(); // back to [10]
assert.strictEqual(get(treeLevels)[0][0], 10, "undo twice gets to [10]");
assert.strictEqual(get(canRedo), true, "redo available after undo");

// Now push new action — should fork (clear redo stack)
setTreeState(0, [99]);
undoHistory.pushSnapshot(0);

assert.strictEqual(get(canRedo), false, "redo cleared after new push (fork)");
assert.strictEqual(get(canUndo), true, "can still undo after fork");

undoHistory.undo();
assert.strictEqual(get(treeLevels)[0][0], 10, "undo after fork returns to pre-fork state");

// Old redo path ([20], [30]) is gone
undoHistory.redo();
assert.strictEqual(get(treeLevels)[0][0], 99, "redo after fork goes to new branch, not old");

console.log("  ✓ push after undo correctly forks (clears redo stack)");

// ============================================================
// 10. Snapshot isolation — mutations don't affect stored snapshots
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10, 20, 30]);
undoHistory.pushSnapshot(0);

// Mutate the current state directly
const currentLevels = get(treeLevels);
currentLevels[0][0] = 999;
treeLevels.set(currentLevels);

// Undo should restore the snapshot's original state, not the mutated one
undoHistory.undo();
assert.strictEqual(get(treeLevels)[0][0], 0, "undo restores original initial state, not mutated");

undoHistory.redo();
assert.strictEqual(get(treeLevels)[0][0], 10, "redo restores snapshot's original [10], not mutated 999");

console.log("  ✓ snapshot isolation: mutations don't corrupt stored snapshots");

// ============================================================
// 11. Undo/redo with activeTreeIndex tracking across all 3 trees
// ============================================================
resetAll();
setTechCrystalsOwned(5000);
undoHistory.clearHistory(0);

// Action on tree 0
setTreeState(0, [5]);
undoHistory.pushSnapshot(0);

// Action on tree 1
setTreeState(1, [10]);
undoHistory.pushSnapshot(1);

// Action on tree 2
setTreeState(2, [15]);
undoHistory.pushSnapshot(2);

// Action back on tree 0
setTreeState(0, [25]);
undoHistory.pushSnapshot(0);

// Undo sequence: should return indices 0, 2, 1, 0
idx = undoHistory.undo();
assert.strictEqual(idx, 2, "undo 1: returns tree 2 index");

idx = undoHistory.undo();
assert.strictEqual(idx, 1, "undo 2: returns tree 1 index");

idx = undoHistory.undo();
assert.strictEqual(idx, 0, "undo 3: returns tree 0 index");

idx = undoHistory.undo();
assert.strictEqual(idx, 0, "undo 4: returns tree 0 index (initial)");

console.log("  ✓ activeTreeIndex tracked correctly for tab auto-switching");

// ============================================================
// 12. clearHistory with different activeTreeIndex values
// ============================================================
resetAll();
undoHistory.clearHistory(2); // Clear with tree index 2

const snap2 = get(undoHistory).present;
assert.strictEqual(snap2!.activeTreeIndex, 2, "clearHistory(2) sets present activeTreeIndex to 2");

undoHistory.clearHistory(0);
const snap0 = get(undoHistory).present;
assert.strictEqual(snap0!.activeTreeIndex, 0, "clearHistory(0) sets present activeTreeIndex to 0");

console.log("  ✓ clearHistory respects activeTreeIndex parameter");

// ============================================================
// 13. Empty state — undo/redo no-ops with consistent state
// ============================================================
resetAll();
undoHistory.clearHistory(0);

assert.strictEqual(get(canUndo), false);
assert.strictEqual(get(canRedo), false);

// Attempting undo/redo on empty history should not crash or change state
idx = undoHistory.undo();
assert.strictEqual(idx, null, "undo on empty returns null");
assert.strictEqual(get(canUndo), false);
assert.strictEqual(get(canRedo), false);

idx = undoHistory.redo();
assert.strictEqual(idx, null, "redo on empty returns null");
assert.strictEqual(get(canUndo), false);
assert.strictEqual(get(canRedo), false);

// State should be unchanged
assert.deepStrictEqual(get(treeLevels)[0].slice(0, 3), [0, 0, 0], "state unchanged after no-op undo/redo");

console.log("  ✓ empty state undo/redo are safe no-ops");

// ============================================================
// 14. Multiple clearHistory calls in sequence
// ============================================================
resetAll();
setTechCrystalsOwned(1000);
undoHistory.clearHistory(0);

setTreeState(0, [10]);
undoHistory.pushSnapshot(0);

// Clear multiple times
undoHistory.clearHistory(0);
undoHistory.clearHistory(1);
undoHistory.clearHistory(2);

assert.strictEqual(get(canUndo), false, "multiple clears don't create history");
assert.strictEqual(get(canRedo), false, "multiple clears don't create redo");
assert.strictEqual(get(undoHistory).present!.activeTreeIndex, 2, "last clearHistory index wins");

console.log("  ✓ multiple clearHistory calls are idempotent");

// ============================================================
// 15. Undo/redo with only one snapshot
// ============================================================
resetAll();
undoHistory.clearHistory(0);

setTreeState(0, [42]);
undoHistory.pushSnapshot(0);

assert.strictEqual(get(canUndo), true, "one action means one undo step");

undoHistory.undo();
assert.strictEqual(get(treeLevels)[0][0], 0, "undo single action restores initial");
assert.strictEqual(get(canUndo), false, "no more undo");
assert.strictEqual(get(canRedo), true, "can redo");

undoHistory.redo();
assert.strictEqual(get(treeLevels)[0][0], 42, "redo restores the single action");
assert.strictEqual(get(canRedo), false, "no more redo");
assert.strictEqual(get(canUndo), true, "can undo again");

console.log("  ✓ single snapshot undo/redo cycle works correctly");

console.log("undoHistoryEdgeCases: all tests passed");
