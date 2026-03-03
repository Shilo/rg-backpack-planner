import assert from "node:assert";
import { get } from "svelte/store";
import {
    treeLevels,
    treeLevelsTotal,
    treeLevelsGuardian,
    treeLevelsVanguard,
    treeLevelsCannon,
    ensureTreeLevels,
    setTreeLevels,
    resetTreeLevels,
    resetAllTreeLevels,
} from "../src/lib/treeLevelsStore.ts";

// Mock trees for testing (matching the types expected: Array of { nodes: Node[] })
const mockTrees = [
    { nodes: [{} as any, {} as any] },         // Guardian (2 nodes)
    { nodes: [{} as any, {} as any, {} as any] },  // Vanguard (3 nodes)
    { nodes: [{} as any] },                    // Cannon (1 node)
];

// Start from a clean state
resetAllTreeLevels(mockTrees);

// Test ensureTreeLevels initialization
ensureTreeLevels(mockTrees);
assert.deepStrictEqual(get(treeLevels), [[0, 0], [0, 0, 0], [0]]);

// Test setTreeLevels
setTreeLevels(0, [1, 2]);
assert.deepStrictEqual(get(treeLevels)[0], [1, 2]);

// Test derived stores
assert.strictEqual(get(treeLevelsTotal), 3); // 1+2 = 3
assert.strictEqual(get(treeLevelsGuardian), 3);
assert.strictEqual(get(treeLevelsVanguard), 0);
assert.strictEqual(get(treeLevelsCannon), 0);

// Test resetTreeLevels for specific index
resetTreeLevels(0, mockTrees);
assert.deepStrictEqual(get(treeLevels)[0], [0, 0]);
assert.strictEqual(get(treeLevelsTotal), 0);

// Test resetAllTreeLevels
setTreeLevels(0, [1, 1]);
setTreeLevels(1, [1, 1, 1]);
setTreeLevels(2, [1]);
assert.strictEqual(get(treeLevelsTotal), 6);
resetAllTreeLevels(mockTrees);
assert.deepStrictEqual(get(treeLevels), [[0, 0], [0, 0, 0], [0]]);
assert.strictEqual(get(treeLevelsTotal), 0);

// Test ensureTreeLevels adapting to node count changes
setTreeLevels(0, [5, 4]); // valid level
const expandedMockTrees = [
    { nodes: [{} as any, {} as any, {} as any] }, // Guardian grew to 3 nodes
    { nodes: [{} as any, {} as any, {} as any] }, // Vanguard
    { nodes: [{} as any] }, // Cannon
];
ensureTreeLevels(expandedMockTrees);
// Missing elements padded with 0
assert.deepStrictEqual(get(treeLevels)[0], [5, 4, 0]);
