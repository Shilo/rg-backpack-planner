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
    assertEqual(tierIndex(1, 1), 1, "tierIndex 1/1");
    assertEqual(tierUpper(1, 100), 20, "tierUpper 1/100");
    assertEqual(tierUpper(4, 50), 40, "tierUpper 4/50");
})();

(function childToParentCascade() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [0, 0];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 1, targetLevel: 21 });
    assertEqual(next[0], 40, "parent raised to child tier cap");
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
    // parent should be raised to child's tier cap (tier5) = 100
    assertEqual(next[0], 100, "parent raised to child max tier cap");
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
    // child leveled to tier2 -> parents raised to tier2 cap (40)
    assertEqual(result.levels[0], 40, "parent a unchanged (already higher)");
    assertEqual(result.levels[1], 40, "parent b raised to tier2 cap");
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

(function availabilityRequiresTier0Cap() {
    const parent: Node = {
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
        y: 0,
    };
    const nodes: Node[] = [parent, child];
    let levels: LevelsByIndex = [1, 0];
    let available = levels[0] >= tierUpper(1, parent.maxLevel);
    assertEqual(available, false, "child locked when parent below tier0 cap");
    levels = [20, 0];
    available = levels[0] >= tierUpper(1, parent.maxLevel);
    assertEqual(available, true, "child available when parent hits tier0 cap");
})();

(function availabilityCapRespectsMax50() {
    const parent: Node = {
        skillId: "global_def",
        maxLevel: 50,
        radius: 1,
        x: 0,
        y: 0,
    };
    const child: Node = {
        skillId: "global_hp",
        parent: 0,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [parent, child];
    const needed = tierUpper(1, parent.maxLevel);
    assertEqual(5 >= needed, false, "below tier0 cap");
    assertEqual(10 >= needed, true, "at tier0 cap");
})();

(function enforceParentsWithinSameTier() {
    const parent: Node = {
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
        y: 0,
    };
    const nodes: Node[] = [parent, child];
    const levels: LevelsByIndex = [10, 25]; // child already tier2, parent below required 20
    const { levels: next } = applyLevelChange({
        nodes,
        levels,
        index: 1,
        targetLevel: 26,
    });
    assertEqual(next[0], 40, "parent raised to child's tier cap even without child tier change");
    assertEqual(next[1], 26, "child leveled");
})();

(function parentRaisedOnTier0LevelUp() {
    const parent: Node = {
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
        y: 0,
    };
    const nodes: Node[] = [parent, child];
    const { levels: next } = applyLevelChange({
        nodes,
        levels: [0, 0],
        index: 1,
        targetLevel: 1,
    });
    assertEqual(next[0], 20, "parent raised to tier0 cap on child tier0 level up");
    assertEqual(next[1], 1, "child leveled to 1");
})();

(function grandparentsRaisedToChildTier() {
    const grand: Node = {
        skillId: "defense_boost",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const parent: Node = {
        skillId: "attack_boost",
        parent: 0,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const child: Node = {
        skillId: "hp_boost",
        parent: 1,
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const nodes: Node[] = [grand, parent, child];
    const { levels: next } = applyLevelChange({
        nodes,
        levels: [0, 0, 0],
        index: 2,
        targetLevel: 21,
    });
    assertEqual(next[2], 21, "child leveled to tier1");
    assertEqual(next[1], 40, "parent raised to child tier cap (tier1 -> 40)");
    assertEqual(next[0], 40, "grandparent also raised to same tier cap");
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

(function onePointNodesUnlockAtTier1() {
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
    let levels: LevelsByIndex = [0, 0];
    let unlocked = unlockedTierForNode(nodes, levels, 1);
    assertEqual(unlocked, 0, "locked when one-point parent is unspent");
    levels = [1, 0];
    unlocked = unlockedTierForNode(nodes, levels, 1);
    assertEqual(unlocked, 1, "one-point parent counts as tier1 when leveled");
})();

(function singlePointNodeRaisesParents() {
    const parent100: Node = {
        skillId: "attack_boost",
        maxLevel: 100,
        radius: 1,
        x: 0,
        y: 0,
    };
    const parent50: Node = {
        skillId: "global_def",
        maxLevel: 50,
        radius: 1,
        x: 10,
        y: 0,
    };
    const final: Node = {
        skillId: "final_damage_boost",
        parent: [0, 1],
        maxLevel: 1,
        radius: 1,
        x: 5,
        y: 0,
    };
    const nodes: Node[] = [parent100, parent50, final];
    const levels: LevelsByIndex = [0, 0, 0];
    const { levels: next } = applyLevelChange({
        nodes,
        levels,
        index: 2,
        targetLevel: 1,
    });
    assertEqual(next[0], 20, "100-level parent raised to tier1 cap");
    assertEqual(next[1], 10, "50-level parent raised to tier1 cap");
    assertEqual(next[2], 1, "single-point node leveled");
})();

console.log("tierLeveling tests passed");
