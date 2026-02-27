import {
    applyLevelChange,
    tierIndex,
    tierSize,
    tierUpper,
    unlockedTierForNode,
} from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node, NodeIndex } from "../src/types/tree.ts";

function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
        throw new Error(message ?? `Expected ${expected}, got ${actual}`);
    }
}

function assertLevelsEqual(
    actual: LevelsByIndex,
    expected: LevelsByIndex,
    message: string,
) {
    assertEqual(
        actual.length,
        expected.length,
        `${message}: levels length mismatch`,
    );
    for (let i = 0; i < expected.length; i += 1) {
        assertEqual(actual[i], expected[i], `${message}: levels[${i}] mismatch`);
    }
}

function applyAndAssert(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    expected: LevelsByIndex;
    message: string;
}): LevelsByIndex {
    const { nodes, levels, index, targetLevel, expected, message } = params;
    const result = applyLevelChange({ nodes, levels, index, targetLevel });
    assertLevelsEqual(result.levels, expected, message);
    return result.levels;
}

(function triggerIncrementRaisesEntireDescendantBranch() {
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 1, y: 0 },
        {
            skillId: "defense_boost",
            parent: 1,
            maxLevel: 100,
            radius: 1,
            x: 2,
            y: 0,
        },
        { skillId: "dodge", parent: 2, maxLevel: 100, radius: 1, x: 3, y: 0 },
    ];

    assertEqual(tierSize(100), 20, "tierSize for maxLevel 100");
    assertEqual(tierUpper(2, 100), 40, "tierUpper for tier 2 / maxLevel 100");
    assertEqual(tierIndex(21, 100), 2, "tierIndex for level 21 / maxLevel 100");

    let levels: LevelsByIndex = [20, 0, 0, 0];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 30,
        expected: [30, 20, 20, 20],
        message: "trigger increment uses trigger tier across full descendant branch",
    });
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 50,
        expected: [50, 40, 40, 40],
        message: "higher trigger tier updates full descendant branch",
    });
})();

(function triggerDecrementLowersEntireDescendantBranch() {
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 1, y: 0 },
        {
            skillId: "defense_boost",
            parent: 1,
            maxLevel: 100,
            radius: 1,
            x: 2,
            y: 0,
        },
        { skillId: "dodge", parent: 2, maxLevel: 100, radius: 1, x: 3, y: 0 },
    ];

    let levels: LevelsByIndex = [50, 40, 40, 40];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        expected: [10, 0, 0, 0],
        message: "trigger decrement to tier 1 forces descendants to tier 0 cap",
    });
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 0,
        expected: [0, 0, 0, 0],
        message: "trigger decrement to zero keeps full branch at zero",
    });
})();

(function triggerIncrementRaisesAllAncestors() {
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 1, y: 0 },
        {
            skillId: "defense_boost",
            parent: 1,
            maxLevel: 100,
            radius: 1,
            x: 2,
            y: 0,
        },
        { skillId: "dodge", parent: 2, maxLevel: 100, radius: 1, x: 3, y: 0 },
    ];

    let levels: LevelsByIndex = [0, 0, 0, 0];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 3,
        targetLevel: 30,
        expected: [40, 40, 40, 30],
        message: "leaf trigger increment raises all ancestors to trigger tier cap",
    });
    assertEqual(
        unlockedTierForNode(nodes, levels, 3),
        2,
        "unlocked tier remains based on min parent tier",
    );
})();

(function mixedMaxLevelsRespectTriggerCaps() {
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "global_hp", parent: 0, maxLevel: 50, radius: 1, x: 1, y: 0 },
        {
            skillId: "final_damage_boost",
            parent: 1,
            maxLevel: 1,
            radius: 1,
            x: 2,
            y: 0,
        },
    ];

    let levels: LevelsByIndex = [20, 0, 0];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 30,
        expected: [30, 10, 1],
        message: "mixed max levels use trigger-tier child cap across branch",
    });
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        expected: [10, 0, 0],
        message: "mixed max levels decrement uses trigger-tier child cap across branch",
    });
})();

(function sameTierEditStillTraversesButCanRemainUnchanged() {
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 1, y: 0 },
        {
            skillId: "defense_boost",
            parent: 1,
            maxLevel: 100,
            radius: 1,
            x: 2,
            y: 0,
        },
    ];

    let levels: LevelsByIndex = [10, 0, 0];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 20,
        expected: [20, 0, 0],
        message: "same-tier increment keeps descendants at trigger-tier child cap",
    });
})();

(function branchIsolationAndCycleSafety() {
    const nodes: Node[] = [
        {
            skillId: "attack_boost",
            parent: 2,
            maxLevel: 100,
            radius: 1,
            x: 0,
            y: 0,
        },
        {
            skillId: "hp_boost",
            parent: 0,
            maxLevel: 100,
            radius: 1,
            x: 1,
            y: 0,
        },
        {
            skillId: "defense_boost",
            parent: 1,
            maxLevel: 100,
            radius: 1,
            x: 2,
            y: 0,
        },
        { skillId: "global_hp", maxLevel: 100, radius: 1, x: 5, y: 0 },
        { skillId: "global_atk", parent: 3, maxLevel: 100, radius: 1, x: 6, y: 0 },
    ];

    let levels: LevelsByIndex = [0, 0, 0, 0, 0];
    levels = applyAndAssert({
        nodes,
        levels,
        index: 0,
        targetLevel: 30,
        expected: [30, 40, 40, 0, 0],
        message: "cycle branch increment settles deterministically without touching isolated branch",
    });
    levels = applyAndAssert({
        nodes,
        levels,
        index: 3,
        targetLevel: 30,
        expected: [30, 40, 40, 30, 20],
        message: "isolated branch updates independently",
    });
    levels = applyAndAssert({
        nodes,
        levels,
        index: 1,
        targetLevel: 0,
        expected: [0, 0, 0, 30, 20],
        message: "cycle branch decrement settles deterministically without infinite recursion",
    });
})();

console.log("tierLeveling tests passed");
