// test/calculateTechCrystalsSpent.test.ts
import assert from "node:assert";
import { calculateTechCrystalsSpent } from "../src/lib/techCrystalStore.ts";
import type { TabConfig } from "../src/types/tree.ts";

// attack_boost uses COSTS_100_STAT: costs[0]=5, costs[1]=6, costs[2]=7
const tabA: TabConfig = {
    id: "a",
    label: "A",
    nodes: [{ skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 }],
};

// final_damage_boost uses COSTS_FINAL: costs[0]=1000, maxLevel=1
const tabB: TabConfig = {
    id: "b",
    label: "B",
    nodes: [{ skillId: "final_damage_boost", maxLevel: 1, radius: 1, x: 0, y: 0 }],
};

// All zeros → 0
assert.strictEqual(
    calculateTechCrystalsSpent([[0]], [tabA]),
    0,
    "level 0 should cost 0",
);

// Level 1 at node 0 → costs[0] = 5
assert.strictEqual(
    calculateTechCrystalsSpent([[1]], [tabA]),
    5,
    "attack_boost level 1 should cost 5",
);

// Level 2 at node 0 → costs[0] + costs[1] = 5 + 6 = 11
assert.strictEqual(
    calculateTechCrystalsSpent([[2]], [tabA]),
    11,
    "attack_boost level 2 should cost 11",
);

// Two trees: attack_boost level 1 + final_damage_boost level 1 = 5 + 1000 = 1005
assert.strictEqual(
    calculateTechCrystalsSpent([[1], [1]], [tabA, tabB]),
    1005,
    "two trees should sum correctly",
);

// Empty tabs → 0 (graceful degradation)
assert.strictEqual(
    calculateTechCrystalsSpent([[1, 2, 3]], []),
    0,
    "empty tabs should return 0",
);

// Tab count less than tree count → sums available tabs only
assert.strictEqual(
    calculateTechCrystalsSpent([[1], [1]], [tabA]),
    5,
    "missing tab should contribute 0",
);

// Node index out of bounds within a tab → !node guard fires, contributes 0
assert.strictEqual(
    calculateTechCrystalsSpent([[1, 99]], [tabA]),
    5,
    "out-of-bounds node index should be skipped",
);

console.log("calculateTechCrystalsSpent: all tests passed");
