import assert from "node:assert";
import { buildCompareSections } from "../src/lib/compare/compareStats.ts";
import type { CompareState } from "../src/lib/compare/compareStore.ts";
import type { TabConfig } from "../src/types/tree.ts";

const emptyTabs: TabConfig[] = [
    { id: "guardian", label: "Guardian", nodes: [] },
    { id: "vanguard", label: "Vanguard", nodes: [] },
    { id: "cannon", label: "Cannon", nodes: [] },
];

const buildA = {
    data: { trees: [[], [], []], owned: 0 },
    label: "Build A",
    source: { type: "preset" as const, id: "a" },
};
const buildB = {
    data: { trees: [[], [], []], owned: 0 },
    label: "Build B",
    source: { type: "preset" as const, id: "b" },
};

// activeSide "a": live values → valueA, frozen → valueB
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "a",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    // Section 1 = TC Spent, row 0 = total
    const totalRow = sections[1].rows[0];
    assert.strictEqual(totalRow.valueA, 100, "activeSide a: live TC → valueA");
    assert.strictEqual(totalRow.valueB, 0, "activeSide a: frozen TC → valueB");
    // Section 2 = node levels, row 0 = total
    const levelsRow = sections[2].rows[0];
    assert.strictEqual(levelsRow.valueA, 50, "activeSide a: live levels → valueA");
    assert.strictEqual(levelsRow.valueB, 0, "activeSide a: frozen levels → valueB");
}

// activeSide "b": live values → valueB, frozen → valueA
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "b",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    const totalRow = sections[1].rows[0];
    assert.strictEqual(totalRow.valueA, 0, "activeSide b: frozen TC → valueA");
    assert.strictEqual(totalRow.valueB, 100, "activeSide b: live TC → valueB");
    const levelsRow = sections[2].rows[0];
    assert.strictEqual(levelsRow.valueA, 0, "activeSide b: frozen levels → valueA");
    assert.strictEqual(levelsRow.valueB, 50, "activeSide b: live levels → valueB");
}

// per-tree values are assigned correctly
{
    const state: CompareState = {
        isComparing: true,
        activeSide: "a",
        buildA,
        buildB,
    };
    const live = {
        skillBonuses: new Map(),
        techCrystalsSpent: 100,
        techCrystalsSpentByTree: [40, 35, 25],
        treeLevelsTotal: 50,
        treeLevelsByTree: [20, 20, 10],
    };
    const sections = buildCompareSections(state, emptyTabs, live, (k) => k);
    const tcSection = sections[1];
    assert.strictEqual(tcSection.rows[1].valueA, 40, "guardian TC valueA");
    assert.strictEqual(tcSection.rows[2].valueA, 35, "vanguard TC valueA");
    assert.strictEqual(tcSection.rows[3].valueA, 25, "cannon TC valueA");
}

// returns empty array when not comparing
{
    const state: CompareState = {
        isComparing: false,
        activeSide: "a",
        buildA: null,
        buildB: null,
    };
    const sections = buildCompareSections(state, emptyTabs, {
        skillBonuses: new Map(),
        techCrystalsSpent: 0,
        techCrystalsSpentByTree: [0, 0, 0],
        treeLevelsTotal: 0,
        treeLevelsByTree: [0, 0, 0],
    }, (k) => k);
    assert.deepStrictEqual(sections, []);
}
