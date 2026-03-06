import assert from "node:assert";
import {
    GLOBAL_LEVELED_LEAF_NODE_CAP,
    buildLeafNodeFlags,
    countGlobalLeveledLeafNodesInTree,
    countGlobalLeveledLeafNodesOutsideActiveTree,
    isGlobalLeafNodeIncrementLocked,
    shouldBlockIncrementForGlobalLeafCap,
} from "../src/lib/globalLeafCap.ts";

const SHARED_TREE_TOPOLOGY = [
    {},
    { parent: 0 },
    { parent: 0 },
    { parent: 1 },
    { parent: [1, 2] },
];

assert.strictEqual(GLOBAL_LEVELED_LEAF_NODE_CAP, 3);

assert.deepStrictEqual(buildLeafNodeFlags([]), []);
assert.deepStrictEqual(buildLeafNodeFlags(SHARED_TREE_TOPOLOGY), [
    false,
    false,
    false,
    true,
    true,
]);

assert.strictEqual(
    countGlobalLeveledLeafNodesInTree(SHARED_TREE_TOPOLOGY, null),
    0,
);
assert.strictEqual(
    countGlobalLeveledLeafNodesInTree(SHARED_TREE_TOPOLOGY, [0, 0, 0, 0, 0]),
    0,
);
assert.strictEqual(
    countGlobalLeveledLeafNodesInTree(SHARED_TREE_TOPOLOGY, [0, 8, 9, 1, 0]),
    1,
);
assert.strictEqual(
    countGlobalLeveledLeafNodesInTree(SHARED_TREE_TOPOLOGY, [0, 0, 0, 5, 2]),
    2,
);

const tabs = [
    { id: "guardian", label: "Guardian", nodes: SHARED_TREE_TOPOLOGY },
    { id: "vanguard", label: "Vanguard", nodes: SHARED_TREE_TOPOLOGY },
    { id: "cannon", label: "Cannon", nodes: SHARED_TREE_TOPOLOGY },
];
const treeLevels = [
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 0, 0, 1],
];

assert.strictEqual(
    countGlobalLeveledLeafNodesOutsideActiveTree(tabs, treeLevels, 0),
    3,
);
assert.strictEqual(
    countGlobalLeveledLeafNodesOutsideActiveTree(tabs, treeLevels, 1),
    2,
);
assert.strictEqual(
    countGlobalLeveledLeafNodesOutsideActiveTree(tabs, treeLevels, 2),
    3,
);

assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: true,
        currentLevel: 0,
        globalLeveledLeafNodeCount: 3,
    }),
    true,
);
assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: true,
        currentLevel: 0,
        globalLeveledLeafNodeCount: 4,
    }),
    true,
);
assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: true,
        currentLevel: 0,
        globalLeveledLeafNodeCount: 2,
    }),
    false,
);
assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: false,
        currentLevel: 0,
        globalLeveledLeafNodeCount: 3,
    }),
    false,
);
assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: true,
        currentLevel: 1,
        globalLeveledLeafNodeCount: 3,
    }),
    false,
);
assert.strictEqual(
    isGlobalLeafNodeIncrementLocked({
        isLeafNode: true,
        currentLevel: 0,
        globalLeveledLeafNodeCount: 1,
        globalLeveledLeafNodeCap: 1,
    }),
    true,
);

assert.strictEqual(
    shouldBlockIncrementForGlobalLeafCap({
        currentGlobalLeveledLeafNodeCount: 3,
        nextGlobalLeveledLeafNodeCount: 4,
    }),
    true,
);
assert.strictEqual(
    shouldBlockIncrementForGlobalLeafCap({
        currentGlobalLeveledLeafNodeCount: 4,
        nextGlobalLeveledLeafNodeCount: 5,
    }),
    true,
);
assert.strictEqual(
    shouldBlockIncrementForGlobalLeafCap({
        currentGlobalLeveledLeafNodeCount: 4,
        nextGlobalLeveledLeafNodeCount: 4,
    }),
    false,
);
assert.strictEqual(
    shouldBlockIncrementForGlobalLeafCap({
        currentGlobalLeveledLeafNodeCount: 4,
        nextGlobalLeveledLeafNodeCount: 3,
    }),
    false,
);
assert.strictEqual(
    shouldBlockIncrementForGlobalLeafCap({
        currentGlobalLeveledLeafNodeCount: 2,
        nextGlobalLeveledLeafNodeCount: 3,
    }),
    false,
);
