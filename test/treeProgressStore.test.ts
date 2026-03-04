import assert from "node:assert";
import {
    compressTreeProgress,
    expandTreeProgress,
} from "../src/lib/treeProgressStore.ts";

const mockTrees = [
    { nodes: [{} as any, {} as any, {} as any] }, // 3 nodes
    { nodes: [{} as any, {} as any] },            // 2 nodes
];

// Test compression
const expandedOriginal = [
    [1, 0, 0], // Trailing zeros should be removed
    [0, 2],    // No trailing zero, should remain same length
    [0, 0, 0], // All zeros, should go to []
];
const compressed = compressTreeProgress(expandedOriginal);
assert.deepStrictEqual(compressed, [
    [1],
    [0, 2],
    [],
]);

// Test expansion
// expandedOriginal has 3 arrays, but mockTrees only has 2, so it will return empty array
const reExpandedMismatch = expandTreeProgress(compressed, mockTrees);
assert.deepStrictEqual(reExpandedMismatch, []); // length mismatch

const validCompressed = [[1], [0, 2]];
const validExpanded = expandTreeProgress(validCompressed, mockTrees);
assert.deepStrictEqual(validExpanded, [
    [1, 0, 0],
    [0, 2],
]);

// Test mismatch when tree grows (compression was [1, 2], now tree has 4 nodes)
const expandedGrown = expandTreeProgress([[1, 2], [3]], [
    { nodes: Array(4).fill({}) },
    { nodes: Array(3).fill({}) }
]);
assert.deepStrictEqual(expandedGrown, [
    [1, 2, 0, 0],
    [3, 0, 0]
]);
