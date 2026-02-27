import {
    applyLevelChange,
    tierIndex,
    tierSize,
    tierUpper,
    unlockedTierForNode,
} from "../src/lib/tierLeveling.ts";
import type { Node, LevelsByIndex } from "../src/types/tree.ts";

function assert(condition: unknown, message: string) {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
        throw new Error(message ?? `Expected ${expected}, got ${actual}`);
    }
}

// Simple tree helpers
const root: Node = {
    skillId: "attack_boost",
    maxLevel: 100,
    radius: 1,
    x: 0,
    y: 0,
};
const child: Node = {
    skillId: "hp_boost",
    parent: 0,
    maxLevel: 100,
    radius: 1,
    x: 0,
    y: 10,
};

(function testTierMath() {
    assertEqual(tierSize(100), 20, "tierSize 100");
    assertEqual(tierSize(50), 10, "tierSize 50");
    assertEqual(tierSize(1), 0, "tierSize 1");
    assertEqual(tierIndex(0, 100), 0, "tierIndex 0");
    assertEqual(tierIndex(1, 100), 1, "tierIndex 1");
    assertEqual(tierUpper(1, 100), 20, "tierUpper 1/100");
    assertEqual(tierUpper(4, 50), 40, "tierUpper 4/50");
})();

(function childToParentCascade() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 1, targetLevel: 21 });
    assertEqual(next[0], 20, "parent raised to prev tier cap");
    assertEqual(next[1], 21, "child set to target");
})();

(function parentToChildCascade() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 21 });
    assertEqual(next[0], 21, "parent leveled");
    assertEqual(next[1], 20, "child raised to previous tier cap");
})();

(function multiTierJump() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 1, targetLevel: 100 });
    assertEqual(next[1], 100, "child maxed");
    // child enters tiers 1-5, so parent should end at tier4 cap = 80
    assertEqual(next[0], 80, "parent raised to tier4 cap");
})();

(function downwardClamp() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [21, 20];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 19 });
    assertEqual(tierIndex(next[0], 100), 1, "parent tier now 1");
    assertEqual(next[1], 0, "child clamped below allowed tier");
})();

(function multiParentMinGating() {
    const a: Node = {
        skillId: "ignore_dodge",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const b: Node = {
        skillId: "dodge",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const c: Node = {
        skillId: "global_def",
        parent: [0, 1],
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [a, b, c];
    let levels: LevelsByIndex = [40, 10, 0]; // a tier2, b tier1
    const unlocked = unlockedTierForNode(nodes, levels, 2);
    assertEqual(unlocked, 1, "min parent tier used");
    const result = applyLevelChange({ nodes, levels, index: 2, targetLevel: 21 });
    // child can be leveled but cascade should raise parents only to prev tier (tier1 -> 20)
    assertEqual(result.levels[0], 40, "parent a unchanged (already higher)");
    assertEqual(result.levels[1], 20, "parent b raised to prev tier cap");
})();

(function childlessCascadeRaisesAll() {
    const solo: Node = {
        skillId: "global_hp",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const other: Node = {
        skillId: "global_atk",
        maxLevel: 50,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [solo, other];
    const levels: LevelsByIndex = [0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 21 });
    assertEqual(next[0], 21, "solo leveled");
    assertEqual(next[1], 0, "other branch untouched");
})();

(function raisesLockedNodesToo() {
    const base: Node = {
        skillId: "attack_boost",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const a: Node = {
        skillId: "hp_boost",
        parent: 0,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const b: Node = {
        skillId: "defense_boost",
        parent: 0,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const locked: Node = {
        skillId: "global_def",
        parent: [1, 2],
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [base, a, b, locked];
    const levels: LevelsByIndex = [20, 0, 0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 21 });
    assertEqual(next[1], 20, "child a raised to tier1 cap");
    assertEqual(next[2], 20, "child b raised to tier1 cap");
    assertEqual(next[3], 20, "locked grandchild raised to tier1 cap even while visually locked");
})();

(function branchIsolation() {
    // two branches (roots with no shared parents/children)
    const yRoot: Node = { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 };
    const yChild: Node = { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 0, y: 0 };
    const bRoot: Node = { skillId: "hp_boost", maxLevel: 100, radius: 1, x: 0, y: 0 };
    const bChild: Node = { skillId: "defense_boost", parent: 2, maxLevel: 50, radius: 1, x: 0, y: 0 };
    const nodes: Node[] = [yRoot, yChild, bRoot, bChild];
    const levels: LevelsByIndex = [20, 0, 0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 21 });
    assertEqual(next[1], 20, "yellow child raised");
    assertEqual(next[3], 0, "blue child unchanged (other branch)");
})();

(function noTierNodeDoesNotUnlock() {
    const one: Node = {
        skillId: "final_damage_boost",
        maxLevel: 1,
        radius: 1,
        x: 0,
        y: 0,
    };
    const childOne: Node = {
        skillId: "attack_boost",
        parent: 0,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [one, childOne];
    const levels: LevelsByIndex = [1, 0];
    const unlocked = unlockedTierForNode(nodes, levels, 1);
    assertEqual(unlocked, 0, "no tiers when maxLevel=1");
})();

console.log("tierLeveling tests passed");
