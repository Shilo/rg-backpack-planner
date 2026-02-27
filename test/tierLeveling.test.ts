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

(function decrementToTierBoundaryKeepsChild() {
    const parent50: Node = { skillId: "global_def", maxLevel: 50, radius: 1, x: 0, y: 0 };
    const leaf: Node = { skillId: "final_damage_boost", parent: 0, maxLevel: 1, radius: 1, x: 0, y: 0 };
    const nodes: Node[] = [parent50, leaf];
    const levels: LevelsByIndex = [11, 1];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 10 });
    assertEqual(next[0], 10, "parent decremented to tier boundary");
    assertEqual(next[1], 0, "child clamped — mirrors increment behavior");
})();

(function downwardClampMultiTier() {
    const nodes: Node[] = [root, child];
    const levels: LevelsByIndex = [41, 40];
    const { levels: next } = applyLevelChange({ nodes, levels, index: 0, targetLevel: 20 });
    assertEqual(next[0], 20, "parent dropped to tier 1");
    assertEqual(next[1], 0, "child clamped to tier 0 cap");
})();

(function incrementDecrementSymmetry() {
    // Both processIncrease and clampDescendants use the same formula for the
    // child level threshold: tierUpper(parentTier - 1, childMaxLevel).
    // Verify at every tier boundary for multiple maxLevel combinations.

    const p100: Node = { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 };
    const c100: Node = { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 0, y: 0 };

    // maxLevel=100 parent + child (tierSize=20, boundaries at 20/40/60/80/100)
    // At tier T the child threshold is tierUpper(T-1, 100)
    const cases100: { tier: number; incTarget: number; decFrom: LevelsByIndex; decTarget: number; expected: number }[] = [
        { tier: 2, incTarget: 21, decFrom: [41, 40], decTarget: 21, expected: 20 },
        { tier: 3, incTarget: 41, decFrom: [61, 60], decTarget: 41, expected: 40 },
        { tier: 4, incTarget: 61, decFrom: [81, 80], decTarget: 61, expected: 60 },
    ];
    for (const { tier, incTarget, decFrom, decTarget, expected } of cases100) {
        const inc = applyLevelChange({ nodes: [p100, c100], levels: [0, 0], index: 0, targetLevel: incTarget });
        assertEqual(inc.levels[1], expected, `100/100 inc tier${tier}: child → ${expected}`);
        const dec = applyLevelChange({ nodes: [p100, c100], levels: decFrom, index: 0, targetLevel: decTarget });
        assertEqual(dec.levels[1], expected, `100/100 dec tier${tier}: child → ${expected}`);
    }

    // Tier 1 boundary: child threshold = tierUpper(0, 100) = 0
    {
        const inc = applyLevelChange({ nodes: [p100, c100], levels: [0, 0], index: 0, targetLevel: 1 });
        assertEqual(inc.levels[1], 0, "100/100 inc tier1: child stays 0");
        const dec = applyLevelChange({ nodes: [p100, c100], levels: [21, 20], index: 0, targetLevel: 20 });
        assertEqual(dec.levels[1], 0, "100/100 dec tier1: child clamped to 0");
    }

    // maxLevel=100 parent, maxLevel=1 child
    const c1: Node = { skillId: "final_damage_boost", parent: 0, maxLevel: 1, radius: 1, x: 0, y: 0 };
    {
        // Tier 2: tierUpper(1, 1) = 1
        const inc = applyLevelChange({ nodes: [p100, c1], levels: [0, 0], index: 0, targetLevel: 21 });
        assertEqual(inc.levels[1], 1, "100/1 inc tier2: child raised to 1");
        const dec = applyLevelChange({ nodes: [p100, c1], levels: [41, 1], index: 0, targetLevel: 21 });
        assertEqual(dec.levels[1], 1, "100/1 dec tier2: child stays 1");
    }
    {
        // Tier 1: tierUpper(0, 1) = 0
        const inc = applyLevelChange({ nodes: [p100, c1], levels: [0, 0], index: 0, targetLevel: 1 });
        assertEqual(inc.levels[1], 0, "100/1 inc tier1: child stays 0");
        const dec = applyLevelChange({ nodes: [p100, c1], levels: [21, 1], index: 0, targetLevel: 20 });
        assertEqual(dec.levels[1], 0, "100/1 dec tier1: child clamped to 0");
    }

    // maxLevel=50 parent, maxLevel=100 child (different tierSizes)
    const p50: Node = { skillId: "global_def", maxLevel: 50, radius: 1, x: 0, y: 0 };
    {
        // Tier 2 (parent level 11): child threshold = tierUpper(1, 100) = 20
        const inc = applyLevelChange({ nodes: [p50, c100], levels: [0, 0], index: 0, targetLevel: 11 });
        assertEqual(inc.levels[1], 20, "50/100 inc tier2: child raised to 20");
        const dec = applyLevelChange({ nodes: [p50, c100], levels: [21, 40], index: 0, targetLevel: 11 });
        assertEqual(dec.levels[1], 20, "50/100 dec tier2: child clamped to 20");
    }
})();

(function yellowBranchIncrementDecrementSymmetry() {
    // Yellow branch structure (indices 0-9):
    //   Tier 1: [0] root (maxLevel=100)
    //   Tier 2: [1] child of 0 (100), [2] child of 0 (100)
    //   Tier 3: [3] child of 1 (100), [4] child of 1 (100), [5] child of 2 (100), [6] child of 2 (100)
    //   Tier 4: [7] child of [3,4] (50), [8] child of [5,6] (50)
    //   Tier 5: [9] child of [7,8] (1)
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 0, y: 10 },
        { skillId: "defense_boost", parent: 0, maxLevel: 100, radius: 1, x: -10, y: 0 },
        { skillId: "skill_crit", parent: 1, maxLevel: 100, radius: 1, x: 5, y: 20 },
        { skillId: "ignore_dodge", parent: 1, maxLevel: 100, radius: 1, x: -5, y: 20 },
        { skillId: "pierce_resistance", parent: 2, maxLevel: 100, radius: 1, x: -15, y: 10 },
        { skillId: "dodge", parent: 2, maxLevel: 100, radius: 1, x: -20, y: 0 },
        { skillId: "global_def", parent: [3, 4], maxLevel: 50, radius: 1, x: 0, y: 30 },
        { skillId: "global_hp", parent: [5, 6], maxLevel: 50, radius: 1, x: -25, y: 10 },
        { skillId: "final_damage_boost", parent: [7, 8], maxLevel: 1, radius: 1, x: -15, y: 25 },
    ];

    // Increment root by +20 each step, recording snapshots
    const incSnapshots: LevelsByIndex[] = [];
    let levels: LevelsByIndex = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    incSnapshots.push(levels.slice());
    for (let target = 20; target <= 100; target += 20) {
        const result = applyLevelChange({ nodes, levels, index: 0, targetLevel: target });
        levels = result.levels;
        incSnapshots.push(levels.slice());
    }
    // incSnapshots[0] = root=0, [1] = root=20, ..., [5] = root=100

    // Decrement root by -20 each step from root=100, recording snapshots
    const decSnapshots: LevelsByIndex[] = [];
    decSnapshots.push(levels.slice()); // root=100
    for (let target = 80; target >= 0; target -= 20) {
        const result = applyLevelChange({ nodes, levels, index: 0, targetLevel: target });
        levels = result.levels;
        decSnapshots.push(levels.slice());
    }
    // decSnapshots[0] = root=100, [1] = root=80, ..., [5] = root=0

    // Compare: inc and dec snapshots at the same root level should match exactly
    // incSnapshots[i] corresponds to root = i*20
    // decSnapshots[j] corresponds to root = 100 - j*20 = (5-j)*20
    // So incSnapshots[i] should equal decSnapshots[5-i]
    for (let i = 0; i <= 5; i++) {
        const rootLevel = i * 20;
        const inc = incSnapshots[i];
        const dec = decSnapshots[5 - i];
        for (let n = 0; n < nodes.length; n++) {
            assertEqual(
                dec[n],
                inc[n],
                `root=${rootLevel} node[${n}]: dec=${dec[n]} should equal inc=${inc[n]}`,
            );
        }
    }
})();

(function yellowLeafParentConsistency() {
    // Focus on the second-to-last yellow node (index 8) and its leaf (index 9).
    const nodes: Node[] = [
        { skillId: "attack_boost", maxLevel: 100, radius: 1, x: 0, y: 0 },
        { skillId: "hp_boost", parent: 0, maxLevel: 100, radius: 1, x: 0, y: 10 },
        { skillId: "defense_boost", parent: 0, maxLevel: 100, radius: 1, x: -10, y: 0 },
        { skillId: "skill_crit", parent: 1, maxLevel: 100, radius: 1, x: 5, y: 20 },
        { skillId: "ignore_dodge", parent: 1, maxLevel: 100, radius: 1, x: -5, y: 20 },
        { skillId: "pierce_resistance", parent: 2, maxLevel: 100, radius: 1, x: -15, y: 10 },
        { skillId: "dodge", parent: 2, maxLevel: 100, radius: 1, x: -20, y: 0 },
        { skillId: "global_def", parent: [3, 4], maxLevel: 50, radius: 1, x: 0, y: 30 },
        { skillId: "global_hp", parent: [5, 6], maxLevel: 50, radius: 1, x: -25, y: 10 }, // target node
        { skillId: "final_damage_boost", parent: [7, 8], maxLevel: 1, radius: 1, x: -15, y: 25 }, // leaf
    ];

    const targetIndex = 8;
    const leafIndex = 9;

    const assertState = (levels: LevelsByIndex) => {
        // Leaf stays in its domain (0 or 1).
        const leafLevel = levels[leafIndex] ?? 0;
        assert(leafLevel === 0 || leafLevel === 1, "leaf level must be 0 or 1");

        // Target node may not exceed its unlocked tier.
        const targetTier = tierIndex(levels[targetIndex] ?? 0, nodes[targetIndex].maxLevel);
        const unlockedTarget = unlockedTierForNode(nodes, levels, targetIndex);
        assert(
            targetTier <= unlockedTarget,
            `node 8 tier ${targetTier} exceeds unlocked ${unlockedTarget}`,
        );

        // Every parent of node 8 must be at least the same tier as node 8.
        const parents = [5, 6];
        parents.forEach((pi) => {
            const parentTier = tierIndex(levels[pi] ?? 0, nodes[pi].maxLevel);
            assert(
                parentTier >= targetTier,
                `parent ${pi} tier ${parentTier} below node8 tier ${targetTier}`,
            );
        });

        // Leaf must not exceed its unlocked tier (min of parents 7 and 8).
        const leafTier = tierIndex(leafLevel, nodes[leafIndex].maxLevel);
        const unlockedLeaf = unlockedTierForNode(nodes, levels, leafIndex);
        assert(
            leafTier <= unlockedLeaf,
            `leaf tier ${leafTier} exceeds unlocked ${unlockedLeaf}`,
        );
    };

    let levels: LevelsByIndex = Array(nodes.length).fill(0);

    // Increment node 8 by +20 until max (50).
    for (const target of [20, 40, 50]) {
        levels = applyLevelChange({ nodes, levels, index: targetIndex, targetLevel: target }).levels;
        assertState(levels);
    }

    // Decrement node 8 by -20 until 0.
    for (const target of [30, 10, 0]) {
        levels = applyLevelChange({ nodes, levels, index: targetIndex, targetLevel: target }).levels;
        assertState(levels);
    }
})();

console.log("tierLeveling tests passed");
