import { baseTree } from "../src/config/baseTree.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";

const MAX_TIERS = 5;
export const YELLOW_BRANCH_LENGTH = 10;

export type SweepCase = {
    name: string;
    targetIndex: number;
};

export type ScenarioOperation = {
    index: number;
    targetLevel: number;
};

export type ScenarioCase = {
    name: string;
    operations: ScenarioOperation[];
};

export type ScenarioExpectedStates = number[][];

export type SeededScenarioCase = {
    name: string;
    seed: number;
    steps: number;
};

export type ExplicitScenarioCase = {
    expectedStates: ScenarioExpectedStates;
    name: string;
    operations: ScenarioOperation[];
};

export const tierExplicitScenarioCases: ExplicitScenarioCase[] = [
    {
        expectedStates: [[40, 40, 20, 21, 20, 20, 20, 10, 10, 1]],
        name: "Split node explicit tier-2 unlock",
        operations: [{ index: 3, targetLevel: 21 }],
    },
    {
        expectedStates: [
            [40, 40, 20, 21, 20, 20, 20, 10, 10, 1],
            [40, 40, 20, 20, 20, 20, 20, 10, 10, 1],
            [20, 20, 0, 19, 0, 0, 0, 0, 0, 0],
        ],
        name: "Split node explicit hysteresis",
        operations: [
            { index: 3, targetLevel: 21 },
            { index: 3, targetLevel: 20 },
            { index: 3, targetLevel: 19 },
        ],
    },
    {
        expectedStates: [
            [20, 20, 0, 1, 0, 0, 0, 0, 0, 0],
            [20, 20, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Split tier-1 decrement to zero keeps ancestor support",
        operations: [
            { index: 3, targetLevel: 1 },
            { index: 3, targetLevel: 0 },
        ],
    },
    {
        expectedStates: [
            [20, 20, 0, 20, 20, 0, 0, 10, 0, 0],
            [40, 40, 20, 40, 40, 20, 20, 20, 10, 1],
        ],
        name: "Merged node explicit step-up",
        operations: [
            { index: 7, targetLevel: 10 },
            { index: 7, targetLevel: 20 },
        ],
    },
    {
        expectedStates: [
            [100, 100, 80, 100, 100, 80, 80, 50, 40, 1],
            [100, 100, 100, 100, 100, 80, 100, 50, 40, 1],
            [100, 100, 100, 100, 100, 100, 100, 50, 50, 1],
            [20, 0, 20, 0, 0, 20, 20, 0, 10, 0],
            [20, 0, 20, 0, 0, 0, 20, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Cross-branch explicit unwind clears after the root reset",
        operations: [
            { index: 7, targetLevel: 50 },
            { index: 6, targetLevel: 100 },
            { index: 8, targetLevel: 50 },
            { index: 1, targetLevel: 0 },
            { index: 5, targetLevel: 0 },
            { index: 0, targetLevel: 0 },
        ],
    },
    {
        expectedStates: [
            [20, 0, 20, 0, 0, 0, 10, 0, 0, 0],
            [20, 20, 20, 0, 10, 0, 10, 0, 0, 0],
        ],
        name: "Sibling tier-1 unlock preserves existing wrapped progress",
        operations: [
            { index: 6, targetLevel: 10 },
            { index: 4, targetLevel: 10 },
        ],
    },
    {
        expectedStates: [
            [20, 0, 20, 0, 0, 20, 20, 0, 10, 0],
            [20, 0, 20, 0, 0, 0, 19, 0, 0, 0],
        ],
        name: "Wrapped tier-1 decrement rebases inherited support",
        operations: [
            { index: 8, targetLevel: 10 },
            { index: 6, targetLevel: 19 },
        ],
    },
    {
        expectedStates: [
            [20, 0, 20, 0, 0, 0, 10, 0, 0, 0],
            [20, 20, 20, 0, 19, 0, 10, 0, 0, 0],
            [20, 0, 20, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Sibling support reset preserves target ancestors",
        operations: [
            { index: 6, targetLevel: 10 },
            { index: 4, targetLevel: 19 },
            { index: 6, targetLevel: 0 },
        ],
    },
    {
        expectedStates: [
            [40, 40, 20, 20, 21, 20, 20, 10, 10, 1],
            [40, 40, 20, 39, 21, 20, 20, 10, 10, 1],
            [20, 20, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Split tier-2 reset preserves target ancestors",
        operations: [
            { index: 4, targetLevel: 21 },
            { index: 3, targetLevel: 39 },
            { index: 4, targetLevel: 0 },
        ],
    },
    {
        expectedStates: [
            [80, 60, 80, 60, 60, 60, 61, 30, 30, 1],
            [40, 40, 20, 21, 20, 20, 20, 10, 10, 1],
        ],
        name: "Split node decrement from inherited tier-3 state uses min",
        operations: [
            { index: 6, targetLevel: 61 },
            { index: 3, targetLevel: 21 },
        ],
    },
    {
        expectedStates: [
            [20, 0, 20, 0, 0, 20, 20, 0, 10, 0],
            [40, 20, 40, 20, 20, 40, 40, 10, 11, 1],
            [40, 40, 40, 40, 40, 40, 40, 11, 11, 1],
            [40, 20, 40, 20, 20, 40, 40, 10, 10, 1],
            [20, 20, 20, 20, 20, 20, 20, 10, 9, 0],
        ],
        name: "Decrement below tier boundary with mixed ancestors",
        operations: [
            { index: 8, targetLevel: 10 },
            { index: 8, targetLevel: 11 },
            { index: 7, targetLevel: 11 },
            { index: 8, targetLevel: 10 },
            { index: 8, targetLevel: 9 },
        ],
    },
    {
        expectedStates: [
            [20, 20, 0, 1, 0, 0, 0, 0, 0, 0],
            [20, 20, 20, 1, 0, 0, 1, 0, 0, 0],
            [20, 20, 20, 0, 0, 0, 1, 0, 0, 0],
        ],
        name: "Decrement zeroing target preserves independent wrapped node",
        operations: [
            { index: 3, targetLevel: 1 },
            { index: 6, targetLevel: 1 },
            { index: 3, targetLevel: 0 },
        ],
    },
    {
        expectedStates: [
            [20, 0, 2, 0, 0, 0, 0, 0, 0, 0],
            [20, 2, 2, 0, 0, 0, 0, 0, 0, 0],
            [20, 2, 1, 0, 0, 0, 0, 0, 0, 0],
            [20, 2, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Sibling decrement preserves non-target sibling levels",
        operations: [
            { index: 2, targetLevel: 2 },
            { index: 1, targetLevel: 2 },
            { index: 2, targetLevel: 1 },
            { index: 2, targetLevel: 0 },
        ],
    },
];

export const tierSeededInvariantCases: SeededScenarioCase[] = [
    { name: "Yellow seeded invariants", seed: 11, steps: 8 },
    { name: "Yellow seeded invariants", seed: 23, steps: 8 },
    { name: "Yellow seeded invariants", seed: 37, steps: 8 },
    { name: "Yellow seeded invariants", seed: 53, steps: 8 },
];

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

export function collectAncestors(nodes: Node[], start: number): Set<number> {
    const ancestors = new Set<number>();
    const startNode = nodes[start];
    if (!startNode) {
        return ancestors;
    }
    const stack = parentIndices(startNode);

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (ancestors.has(current)) continue;
        ancestors.add(current);
        parentIndices(nodes[current]).forEach((parentIndex) => {
            if (!ancestors.has(parentIndex)) {
                stack.push(parentIndex);
            }
        });
    }

    return ancestors;
}

export function partitionYellowBranchRoles(nodes: Node[], targetIndex: number): {
    ancestors: Set<number>;
    wrapped: Set<number>;
} {
    const ancestors = collectAncestors(nodes, targetIndex);
    const wrapped = new Set<number>();

    nodes.forEach((_, index) => {
        if (index === targetIndex) return;
        if (ancestors.has(index)) return;
        wrapped.add(index);
    });

    return { ancestors, wrapped };
}

function expectedTierSize(maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1) return 0;
    return maxLevel / MAX_TIERS;
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

export function buildRoundTripSequence(maxLevel: Node["maxLevel"]): number[] {
    const ascending =
        maxLevel <= MAX_TIERS
            ? Array.from({ length: maxLevel + 1 }, (_, level) => level)
            : (() => {
                  const checkpoints = new Set<number>([0, 1, maxLevel]);
                  const tierSize = expectedTierSize(maxLevel);

                  for (let tier = 1; tier <= MAX_TIERS; tier += 1) {
                      const boundary = Math.min(tier * tierSize, maxLevel);

                      [boundary - 1, boundary, boundary + 1].forEach((level) => {
                          if (level >= 0 && level <= maxLevel) {
                              checkpoints.add(level);
                          }
                      });
                  }

                  return [...checkpoints].sort((left, right) => left - right);
              })();
    const forward = ascending.length > 1 ? ascending.slice(1) : ascending;
    const descending = ascending.slice(0, -1).reverse();

    return [...forward, ...descending];
}

export function uniqueBoundaryLevels(maxLevel: Node["maxLevel"]): number[] {
    return [...new Set(buildRoundTripSequence(maxLevel))];
}

export function nextStableTier(params: {
    previousLevel: number;
    nextLevel: number;
    currentStableTier: number;
    maxLevel: Node["maxLevel"];
}): number {
    const { previousLevel, nextLevel, currentStableTier, maxLevel } = params;

    if (nextLevel > previousLevel) {
        const previousTier = expectedTierIndex(previousLevel, maxLevel);
        const nextTier = expectedTierIndex(nextLevel, maxLevel);
        if (nextTier > previousTier) {
            return nextTier;
        }
        return currentStableTier;
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

export function buildExpectedBranchLevels(params: {
    nodes: Node[];
    targetIndex: number;
    targetLevel: number;
    stableTier: number;
    ancestors: Set<number>;
}): number[] {
    const { nodes, targetIndex, targetLevel, stableTier, ancestors } = params;
    const wrappedTier = Math.max(stableTier - 1, 0);

    return nodes.map((node, index) => {
        if (index === targetIndex) return targetLevel;
        const requiredTier = ancestors.has(index) ? stableTier : wrappedTier;
        return expectedTierUpper(requiredTier, node.maxLevel);
    });
}

export function applyExpectedTargetTransition(params: {
    currentLevels: number[];
    nodes: Node[];
    previousLevel: number;
    nextLevel: number;
    stableTier: number;
    targetIndex: number;
}): number[] {
    const {
        currentLevels,
        nodes,
        previousLevel,
        nextLevel,
        stableTier,
        targetIndex,
    } = params;
    const nextLevels = [...currentLevels];
    const roles = partitionYellowBranchRoles(nodes, targetIndex);
    const reactiveTier = propagationStableTier({
        previousLevel,
        nextLevel,
        stableTier,
    });
    const wrappedTier = Math.max(reactiveTier - 1, 0);

    nextLevels[targetIndex] = nextLevel;
    if (nextLevel === previousLevel) {
        return nextLevels;
    }

    const isIncrement = nextLevel > previousLevel;

    for (let idx = 0; idx < nodes.length; idx += 1) {
        if (idx === targetIndex) continue;

        const node = nodes[idx];
        if (!node) continue;

        const assignedTier = roles.ancestors.has(idx)
            ? reactiveTier
            : wrappedTier;
        const assignedLevel = expectedTierUpper(assignedTier, node.maxLevel);
        const currentLevel = currentLevels[idx] ?? 0;

        if (isIncrement) {
            nextLevels[idx] = Math.max(currentLevel, assignedLevel);
        } else {
            const candidate = Math.min(currentLevel, assignedLevel);
            if (roles.ancestors.has(idx)) {
                nextLevels[idx] = candidate;
            } else {
                const nodeLevel = nextLevels[idx] ?? 0;
                if (nodeLevel <= 0) {
                    nextLevels[idx] = candidate;
                    continue;
                }
                const nodeTier = expectedTierIndex(nodeLevel, node.maxLevel);
                if (nodeTier <= 0) {
                    nextLevels[idx] = candidate;
                    continue;
                }
                const nodeAncestors = collectAncestors(nodes, idx);
                let maxSupported = nodeTier;
                nodeAncestors.forEach((ai) => {
                    const an = nodes[ai];
                    if (!an) return;
                    const at = expectedTierIndex(
                        nextLevels[ai] ?? 0,
                        an.maxLevel,
                    );
                    maxSupported = Math.min(maxSupported, at);
                });
                const floor = expectedTierUpper(maxSupported, node.maxLevel);
                nextLevels[idx] = Math.max(candidate, floor);
            }
        }
    }

    return nextLevels;
}

export function formatTierStateGroup(params: {
    groupLabel: string;
    levels: number[];
    tiers: number[];
}): string[] {
    const { groupLabel, levels, tiers } = params;
    const levelTokens = levels.map((level) => String(level));
    const tierTokens = tiers.map((tier, index) =>
        String(tier).padStart(levelTokens[index]?.length ?? 1, " "),
    );

    return [
        `- ${groupLabel}:`,
        `  - levels: [${levelTokens.join(", ")}]`,
        `  - tiers:  [${tierTokens.join(", ")}]`,
    ];
}

export function formatTierStepState(params: {
    nodes: Node[];
    expectedLevels: number[];
    previousLevel: number;
    nextLevel: number;
    stepIndex: number;
    targetIndex: number;
}): string[] {
    const {
        nodes,
        expectedLevels,
        previousLevel,
        nextLevel,
        stepIndex,
        targetIndex,
    } = params;
    const expectedTiers = nodes.map((node, index) =>
        expectedTierIndex(expectedLevels[index] ?? 0, node.maxLevel),
    );

    return [
        `step ${stepIndex + 1} [index ${targetIndex}] (${previousLevel} -> ${nextLevel})`,
        ...formatTierStateGroup({
            groupLabel: "expected",
            levels: expectedLevels,
            tiers: expectedTiers,
        }),
        "",
    ];
}

function collectDescendants(nodes: Node[], start: number): Set<number> {
    const descendants = new Set<number>();
    const stack = [start];

    while (stack.length > 0) {
        const current = stack.pop()!;

        nodes.forEach((node, index) => {
            if (index === start || descendants.has(index)) return;
            if (!parentIndices(node).includes(current)) return;

            descendants.add(index);
            stack.push(index);
        });
    }

    return descendants;
}

function edgeBiasedLevelsForNode(node: Node): number[] {
    if (node.maxLevel <= 1) {
        return [0, 1];
    }

    if (node.maxLevel === 50) {
        return [0, 1, 9, 10, 11, 19, 20, 21, 29, 30, 31, 39, 40, 41, 49, 50];
    }

    return [0, 1, 19, 20, 21, 39, 40, 41, 59, 60, 61, 79, 80, 81, 99, 100];
}

function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function relatedIndicesForScenarioNode(nodes: Node[], start: number): number[] {
    const related = new Set<number>([start]);
    const ancestors = collectAncestors(nodes, start);
    const descendants = collectDescendants(nodes, start);

    ancestors.forEach((index) => {
        related.add(index);
        collectDescendants(nodes, index).forEach((descendantIndex) => {
            related.add(descendantIndex);
        });
    });

    descendants.forEach((index) => {
        related.add(index);
    });

    return [...related];
}

export function buildSeededScenarioCase(
    testCase: SeededScenarioCase,
): ScenarioCase {
    const { nodes, levels } = createYellowBranchFixture();
    const random = createSeededRandom(testCase.seed);
    const preferredIndices = [0, 1, 2, 3, 5, 6, 7, 8, 9];
    const operations: ScenarioOperation[] = [];
    let trackedLevels = [...levels];
    let previousIndex =
        preferredIndices[
            Math.floor(random() * preferredIndices.length) %
                preferredIndices.length
        ] ?? 0;

    for (let stepIndex = 0; stepIndex < testCase.steps; stepIndex += 1) {
        let candidateIndices = preferredIndices;
        if (stepIndex > 0 && random() < 0.75) {
            const relatedIndices = relatedIndicesForScenarioNode(
                nodes,
                previousIndex,
            ).filter((index) => preferredIndices.includes(index));

            if (relatedIndices.length > 0) {
                candidateIndices = relatedIndices;
            }
        }

        const index =
            candidateIndices[
                Math.floor(random() * candidateIndices.length) %
                    candidateIndices.length
            ] ?? 0;
        const candidateLevels = edgeBiasedLevelsForNode(nodes[index]);
        const currentLevel = trackedLevels[index] ?? 0;

        let levelPool = candidateLevels.filter(
            (level) => level !== currentLevel,
        );
        if (currentLevel > 0 && random() < 0.65) {
            const decreasing = levelPool.filter(
                (level) => level < currentLevel,
            );
            if (decreasing.length > 0) {
                levelPool = decreasing;
            }
        } else {
            const increasing = levelPool.filter(
                (level) => level > currentLevel,
            );
            if (increasing.length > 0) {
                levelPool = increasing;
            }
        }

        if (levelPool.length === 0) {
            levelPool = candidateLevels;
        }

        const targetLevel =
            levelPool[
                Math.floor(random() * levelPool.length) % levelPool.length
            ] ?? currentLevel;
        const operation = { index, targetLevel };

        operations.push(operation);
        trackedLevels[index] = Math.min(
            Math.max(targetLevel, 0),
            nodes[index]?.maxLevel ?? 0,
        );
        previousIndex = index;
    }

    return {
        name: `${testCase.name} (seed ${testCase.seed})`,
        operations,
    };
}

export const tierSweepCases: SweepCase[] = [
    { name: "Yellow root node round trip", targetIndex: 0 },
    { name: "Yellow second node round trip", targetIndex: 1 },
    { name: "Yellow tier-3 split node round trip", targetIndex: 3 },
    { name: "Yellow tier-4 merged node round trip", targetIndex: 7 },
    { name: "Yellow final node round trip", targetIndex: 9 },
];
