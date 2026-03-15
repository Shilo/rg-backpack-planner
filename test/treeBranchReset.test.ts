import assert from "node:assert";
import { get } from "svelte/store";
import { baseTree } from "../src/config/baseTree.ts";
import {
    ensureTreeLevels,
    resetAllTreeLevels,
    setTreeLevels,
    treeLevels,
} from "../src/lib/treeLevelsStore.ts";
import * as treeLevelsStore from "../src/lib/treeLevelsStore.ts";

const withTreeBranchLevelsReset = (treeLevelsStore as {
    withTreeBranchLevelsReset?: (
        levels: number[],
        branch: "yellow" | "orange" | "blue",
    ) => number[];
}).withTreeBranchLevelsReset;

const sumTreeBranchLevels = (treeLevelsStore as {
    sumTreeBranchLevels?: (
        levels: number[] | null | undefined,
        branch: "yellow" | "orange" | "blue",
    ) => number;
}).sumTreeBranchLevels;

const resetTreeBranchLevels = (treeLevelsStore as {
    resetTreeBranchLevels?: (
        index: number,
        branch: "yellow" | "orange" | "blue",
    ) => void;
}).resetTreeBranchLevels;

assert.strictEqual(
    typeof withTreeBranchLevelsReset,
    "function",
    "treeLevelsStore should export withTreeBranchLevelsReset(levels, branch).",
);
assert.strictEqual(
    typeof sumTreeBranchLevels,
    "function",
    "treeLevelsStore should export sumTreeBranchLevels(levels, branch).",
);
assert.strictEqual(
    typeof resetTreeBranchLevels,
    "function",
    "treeLevelsStore should export resetTreeBranchLevels(index, branch).",
);

if (
    typeof withTreeBranchLevelsReset === "function" &&
    typeof sumTreeBranchLevels === "function" &&
    typeof resetTreeBranchLevels === "function"
) {
    const originalLevels = Array.from(
        { length: baseTree.length },
        (_, index) => index + 1,
    );
    const resetOrange = withTreeBranchLevelsReset(originalLevels, "orange");

    assert.deepStrictEqual(
        resetOrange.slice(0, 10),
        originalLevels.slice(0, 10),
        "Resetting the orange branch should preserve yellow branch levels.",
    );
    assert.deepStrictEqual(
        resetOrange.slice(10, 20),
        Array(10).fill(0),
        "Resetting the orange branch should clear indices 10-19.",
    );
    assert.deepStrictEqual(
        resetOrange.slice(20),
        originalLevels.slice(20),
        "Resetting the orange branch should preserve blue branch levels.",
    );
    assert.deepStrictEqual(
        originalLevels.slice(10, 20),
        Array.from({ length: 10 }, (_, index) => index + 11),
        "withTreeBranchLevelsReset should not mutate the original levels array.",
    );

    assert.strictEqual(
        sumTreeBranchLevels(originalLevels, "yellow"),
        55,
        "Yellow branch total should sum indices 0-9.",
    );
    assert.strictEqual(
        sumTreeBranchLevels(originalLevels, "orange"),
        155,
        "Orange branch total should sum indices 10-19.",
    );
    assert.strictEqual(
        sumTreeBranchLevels(originalLevels, "blue"),
        255,
        "Blue branch total should sum indices 20-29.",
    );

    const mockTrees = [{ nodes: baseTree }, { nodes: baseTree }];
    resetAllTreeLevels(mockTrees);
    ensureTreeLevels(mockTrees);
    setTreeLevels(0, [...originalLevels]);
    setTreeLevels(1, Array(baseTree.length).fill(9));

    resetTreeBranchLevels(0, "blue");

    const nextTreeLevels = get(treeLevels);
    assert.deepStrictEqual(
        nextTreeLevels[0].slice(0, 20),
        originalLevels.slice(0, 20),
        "Store branch reset should preserve non-targeted branch levels in the active tree.",
    );
    assert.deepStrictEqual(
        nextTreeLevels[0].slice(20),
        Array(10).fill(0),
        "Store branch reset should clear targeted branch levels in the active tree.",
    );
    assert.deepStrictEqual(
        nextTreeLevels[1],
        Array(baseTree.length).fill(9),
        "Store branch reset should not affect other trees.",
    );
}

console.log("treeBranchReset: all tests passed");
