import { baseTree } from "../src/config/baseTree.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";

const MAX_TIERS = 5;

export const YELLOW_BRANCH_LENGTH = 10;

export type DirectionalRolePartition = {
    ancestors: Set<number>;
    descendants: Set<number>;
    unrelated: Set<number>;
};

export type DirectionalScenarioStep = {
    index: number;
    targetLevel: number;
    expectedLevels: number[];
};

export type DirectionalScenarioCase = {
    name: string;
    initialLevels?: number[];
    steps: DirectionalScenarioStep[];
};

export function createYellowBranchFixture(): {
    nodes: Node[];
    levels: LevelsByIndex;
} {
    return {
        nodes: baseTree.slice(0, YELLOW_BRANCH_LENGTH).map((node) => ({
            ...node,
            parent: Array.isArray(node.parent) ? [...node.parent] : node.parent,
        })),
        levels: new Array(YELLOW_BRANCH_LENGTH).fill(0),
    };
}

function parentIndices(node: Node): number[] {
    if (node.parent === undefined) return [];
    return Array.isArray(node.parent) ? [...node.parent] : [node.parent];
}

function buildChildrenList(nodes: Node[]): number[][] {
    const children = nodes.map(() => [] as number[]);
    nodes.forEach((node, index) => {
        parentIndices(node).forEach((parentIndex) => {
            if (children[parentIndex]) {
                children[parentIndex].push(index);
            }
        });
    });
    return children;
}

export function collectAncestors(nodes: Node[], start: number): Set<number> {
    const ancestors = new Set<number>();
    const startNode = nodes[start];
    if (!startNode) return ancestors;

    const stack = parentIndices(startNode);
    while (stack.length > 0) {
        const current = stack.pop()!;
        if (ancestors.has(current)) continue;
        ancestors.add(current);

        const currentNode = nodes[current];
        if (!currentNode) continue;

        parentIndices(currentNode).forEach((parentIndex) => {
            if (!ancestors.has(parentIndex)) {
                stack.push(parentIndex);
            }
        });
    }

    return ancestors;
}

export function collectDescendants(nodes: Node[], start: number): Set<number> {
    const descendants = new Set<number>();
    const children = buildChildrenList(nodes);
    const stack = [...(children[start] ?? [])];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (descendants.has(current)) continue;
        descendants.add(current);

        const childIndices = children[current] ?? [];
        childIndices.forEach((childIndex) => {
            if (!descendants.has(childIndex)) {
                stack.push(childIndex);
            }
        });
    }

    return descendants;
}

export function partitionDirectionalRoles(
    nodes: Node[],
    targetIndex: number,
): DirectionalRolePartition {
    const ancestors = collectAncestors(nodes, targetIndex);
    const descendants = collectDescendants(nodes, targetIndex);
    const unrelated = new Set<number>();

    nodes.forEach((_, index) => {
        if (index === targetIndex) return;
        if (ancestors.has(index)) return;
        if (descendants.has(index)) return;
        unrelated.add(index);
    });

    return { ancestors, descendants, unrelated };
}

function expectedTierSize(maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1) return 0;
    return maxLevel / MAX_TIERS;
}

export function expectedTierUpper(
    tier: number,
    maxLevel: Node["maxLevel"],
): number {
    if (tier <= 0) return 0;
    if (maxLevel <= 1) return maxLevel;
    const size = expectedTierSize(maxLevel);
    if (size === 0) return 0;
    return Math.min(Math.ceil(size * tier), maxLevel);
}

export function expectedTierIndex(
    level: number,
    maxLevel: Node["maxLevel"],
): number {
    if (level <= 0) return 0;
    if (maxLevel <= 1) return 1;
    const size = expectedTierSize(maxLevel);
    if (size === 0) return 0;
    return Math.min(Math.floor((level - 1) / size) + 1, MAX_TIERS);
}

function stableTierHoldFloor(
    tier: number,
    maxLevel: Node["maxLevel"],
): number {
    if (tier <= 0) return 0;
    if (tier === 1) return Math.min(1, maxLevel);
    return expectedTierUpper(tier - 1, maxLevel);
}

export function nextStableTier(params: {
    previousLevel: number;
    nextLevel: number;
    currentStableTier: number;
    maxLevel: Node["maxLevel"];
}): number {
    const { previousLevel, nextLevel, currentStableTier, maxLevel } = params;
    if (nextLevel > previousLevel) {
        return Math.max(currentStableTier, expectedTierIndex(nextLevel, maxLevel));
    }

    if (nextLevel < previousLevel) {
        let nextStable = currentStableTier;
        while (
            nextStable > 0 &&
            nextLevel < stableTierHoldFloor(nextStable, maxLevel)
        ) {
            nextStable -= 1;
        }
        return nextStable;
    }

    return currentStableTier;
}

export function propagationStableTier(params: {
    previousLevel: number;
    nextLevel: number;
    stableTier: number;
}): number {
    const { previousLevel, nextLevel, stableTier } = params;
    if (nextLevel < previousLevel && nextLevel === 0) {
        return Math.max(stableTier, 1);
    }
    return stableTier;
}

export function expectedTiersForLevels(
    nodes: Node[],
    levels: number[],
): number[] {
    return nodes.map((node, index) =>
        expectedTierIndex(levels[index] ?? 0, node.maxLevel),
    );
}

export const directionalScenarioCases: DirectionalScenarioCase[] = [
    {
        name: "Split node boundary hysteresis (19/20/21) with zero rebase",
        steps: [
            {
                index: 3,
                targetLevel: 19,
                expectedLevels: [20, 20, 0, 19, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 20,
                expectedLevels: [20, 20, 0, 20, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 21,
                expectedLevels: [40, 40, 0, 21, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 20,
                expectedLevels: [40, 40, 0, 20, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 19,
                expectedLevels: [20, 20, 0, 19, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 0,
                expectedLevels: [20, 20, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Merged node boundary hysteresis (9/10/11) with zero rebase",
        steps: [
            {
                index: 7,
                targetLevel: 9,
                expectedLevels: [20, 20, 0, 20, 20, 0, 0, 9, 0, 0],
            },
            {
                index: 7,
                targetLevel: 10,
                expectedLevels: [20, 20, 0, 20, 20, 0, 0, 10, 0, 0],
            },
            {
                index: 7,
                targetLevel: 11,
                expectedLevels: [40, 40, 0, 40, 40, 0, 0, 11, 0, 0],
            },
            {
                index: 7,
                targetLevel: 10,
                expectedLevels: [40, 40, 0, 40, 40, 0, 0, 10, 0, 0],
            },
            {
                index: 7,
                targetLevel: 9,
                expectedLevels: [20, 20, 0, 20, 20, 0, 0, 9, 0, 0],
            },
            {
                index: 7,
                targetLevel: 0,
                expectedLevels: [20, 20, 0, 20, 20, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Root node boundary hysteresis (19/20/21) affects only target on level-up",
        steps: [
            {
                index: 0,
                targetLevel: 19,
                expectedLevels: [19, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 0,
                targetLevel: 20,
                expectedLevels: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 0,
                targetLevel: 21,
                expectedLevels: [21, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 0,
                targetLevel: 20,
                expectedLevels: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 0,
                targetLevel: 19,
                expectedLevels: [19, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 0,
                targetLevel: 0,
                expectedLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Index 2 level-up affects ancestors only (no descendant propagation)",
        steps: [
            {
                index: 2,
                targetLevel: 20,
                expectedLevels: [20, 0, 20, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 2,
                targetLevel: 21,
                expectedLevels: [40, 0, 21, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Index 1 same-tier decrement keeps ancestor upper bound",
        steps: [
            {
                index: 1,
                targetLevel: 100,
                expectedLevels: [100, 100, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 1,
                targetLevel: 99,
                expectedLevels: [100, 99, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 1,
                targetLevel: 50,
                expectedLevels: [60, 50, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 1,
                targetLevel: 49,
                expectedLevels: [60, 49, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Leaf-at-zero does not cap ancestor-side increments through higher tiers",
        steps: [
            {
                index: 7,
                targetLevel: 20,
                expectedLevels: [40, 40, 0, 40, 40, 0, 0, 20, 0, 0],
            },
            {
                index: 7,
                targetLevel: 21,
                expectedLevels: [60, 60, 0, 60, 60, 0, 0, 21, 0, 0],
            },
            {
                index: 7,
                targetLevel: 31,
                expectedLevels: [80, 80, 0, 80, 80, 0, 0, 31, 0, 0],
            },
            {
                index: 7,
                targetLevel: 41,
                expectedLevels: [100, 100, 0, 100, 100, 0, 0, 41, 0, 0],
            },
        ],
    },
    {
        name: "Leaf node boundary toggle (0/1) preserves ancestor support at zero",
        steps: [
            {
                index: 9,
                targetLevel: 1,
                expectedLevels: [20, 20, 20, 20, 20, 20, 20, 10, 10, 1],
            },
            {
                index: 9,
                targetLevel: 0,
                expectedLevels: [20, 20, 20, 20, 20, 20, 20, 10, 10, 0],
            },
        ],
    },
    {
        name: "Last node decrement rebases pre-leveled ancestors to tier-1 support",
        initialLevels: [100, 100, 100, 100, 100, 100, 100, 50, 50, 1],
        steps: [
            {
                index: 9,
                targetLevel: 0,
                expectedLevels: [20, 20, 20, 20, 20, 20, 20, 10, 10, 0],
            },
        ],
    },
    {
        name: "Both branch sides active stay isolated except shared ancestors",
        steps: [
            {
                index: 3,
                targetLevel: 21,
                expectedLevels: [40, 40, 0, 21, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 5,
                targetLevel: 21,
                expectedLevels: [40, 40, 40, 21, 0, 21, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: 19,
                expectedLevels: [20, 20, 40, 19, 0, 21, 0, 0, 0, 0],
            },
            {
                index: 5,
                targetLevel: 19,
                expectedLevels: [20, 20, 20, 19, 0, 19, 0, 0, 0, 0],
            },
            {
                index: 5,
                targetLevel: 21,
                expectedLevels: [40, 20, 40, 19, 0, 21, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Target level clamps before applying propagation rules",
        steps: [
            {
                index: 3,
                targetLevel: 999,
                expectedLevels: [100, 100, 0, 100, 0, 0, 0, 0, 0, 0],
            },
            {
                index: 3,
                targetLevel: -5,
                expectedLevels: [20, 20, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
    {
        name: "Same-tier decrement rebases elevated reactive nodes downward",
        initialLevels: [100, 100, 0, 21, 0, 0, 0, 50, 0, 1],
        steps: [
            {
                index: 3,
                targetLevel: 20,
                expectedLevels: [40, 40, 0, 20, 0, 0, 0, 10, 0, 1],
            },
        ],
    },
    {
        name: "High-tier decrement (81/80/79) affects descendants and keeps hysteresis",
        initialLevels: [81, 80, 80, 80, 80, 80, 80, 40, 40, 1],
        steps: [
            {
                index: 0,
                targetLevel: 80,
                expectedLevels: [80, 80, 80, 80, 80, 80, 80, 40, 40, 1],
            },
            {
                index: 0,
                targetLevel: 79,
                expectedLevels: [79, 60, 60, 60, 60, 60, 60, 30, 30, 1],
            },
            {
                index: 0,
                targetLevel: 0,
                expectedLevels: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        ],
    },
];
