import { baseTree } from "../src/config/baseTree.ts";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";

const MAX_TIERS = 5;
const YELLOW_BRANCH_LENGTH = 10;

type SweepCase = {
    name: string;
    targetIndex: number;
};

function createYellowBranchFixture(): {
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

function collectAncestors(nodes: Node[], start: number): Set<number> {
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

function expectedTierSize(maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1) return 0;
    return maxLevel / MAX_TIERS;
}

function expectedTierIndex(level: number, maxLevel: Node["maxLevel"]): number {
    if (level <= 0) return 0;
    if (maxLevel <= 1) return 1;
    const size = expectedTierSize(maxLevel);
    if (size === 0) return 0;
    return Math.min(Math.floor((level - 1) / size) + 1, MAX_TIERS);
}

function expectedCompletedTier(
    level: number,
    maxLevel: Node["maxLevel"],
): number {
    if (level <= 0) return 0;
    if (maxLevel <= 1) return 1;
    const size = expectedTierSize(maxLevel);
    if (size === 0) return 0;
    return Math.min(Math.floor(level / size), MAX_TIERS);
}

function expectedTierUpper(tier: number, maxLevel: Node["maxLevel"]): number {
    if (tier <= 0) return 0;
    if (maxLevel <= 1) return maxLevel;
    const size = expectedTierSize(maxLevel);
    if (size === 0) return 0;
    return Math.min(Math.ceil(size * tier), maxLevel);
}

function buildRoundTripSequence(maxLevel: number): number[] {
    const ascending = Array.from({ length: maxLevel + 1 }, (_, level) => level);
    const descending = Array.from(
        { length: maxLevel + 1 },
        (_, offset) => maxLevel - offset,
    );
    return [...ascending, ...descending];
}

function nextStableTier(params: {
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
        const previousCompleted = expectedCompletedTier(previousLevel, maxLevel);
        const nextCompleted = expectedCompletedTier(nextLevel, maxLevel);
        if (nextCompleted < previousCompleted) {
            return expectedTierIndex(nextLevel, maxLevel);
        }
    }

    return currentStableTier;
}

function buildExpectedBranchLevels(params: {
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

function assertYellowBranchState(params: {
    caseName: string;
    nodes: Node[];
    actualLevels: LevelsByIndex;
    expectedLevels: number[];
    previousLevel: number;
    nextLevel: number;
    stepIndex: number;
}) {
    const {
        caseName,
        nodes,
        actualLevels,
        expectedLevels,
        previousLevel,
        nextLevel,
        stepIndex,
    } = params;
    const direction = Math.sign(nextLevel - previousLevel);

    nodes.forEach((node, index) => {
        const actualLevel = actualLevels[index] ?? 0;
        const expectedLevel = expectedLevels[index] ?? 0;

        if (actualLevel !== expectedLevel) {
            throw new Error(
                `${caseName} step ${stepIndex} (${previousLevel} -> ${nextLevel}, direction ${direction}) node ${index} level expected ${expectedLevel}, got ${actualLevel}`,
            );
        }

        const actualTier = expectedTierIndex(actualLevel, node.maxLevel);
        const expectedTier = expectedTierIndex(expectedLevel, node.maxLevel);
        if (actualTier !== expectedTier) {
            throw new Error(
                `${caseName} step ${stepIndex} (${previousLevel} -> ${nextLevel}, direction ${direction}) node ${index} tier expected ${expectedTier}, got ${actualTier}`,
            );
        }
    });
}

function runSweepCase(testCase: SweepCase) {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    let currentLevels = startingLevels;
    const targetNode = nodes[testCase.targetIndex];
    const sequence = buildRoundTripSequence(targetNode.maxLevel);
    const ancestors = collectAncestors(nodes, testCase.targetIndex);

    let previousLevel = 0;
    let stableTier = 0;

    sequence.forEach((targetLevel, stepIndex) => {
        const result = applyLevelChange({
            nodes,
            levels: currentLevels,
            index: testCase.targetIndex,
            targetLevel,
        });

        stableTier = nextStableTier({
            previousLevel,
            nextLevel: targetLevel,
            currentStableTier: stableTier,
            maxLevel: targetNode.maxLevel,
        });

        const expectedLevels = buildExpectedBranchLevels({
            nodes,
            targetIndex: testCase.targetIndex,
            targetLevel,
            stableTier,
            ancestors,
        });

        assertYellowBranchState({
            caseName: testCase.name,
            nodes,
            actualLevels: result.levels,
            expectedLevels,
            previousLevel,
            nextLevel: targetLevel,
            stepIndex,
        });

        currentLevels = result.levels;
        previousLevel = targetLevel;
    });

    return sequence.length;
}

export function runTierLevelingTests() {
    console.log("===");
    console.log("Tier Leveling Tests");
    console.log("===");
    console.log();

    const cases: SweepCase[] = [
        { name: "Yellow root node round trip", targetIndex: 0 },
        { name: "Yellow second node round trip", targetIndex: 1 },
        { name: "Yellow tier-3 split node round trip", targetIndex: 3 },
        { name: "Yellow tier-4 merged node round trip", targetIndex: 7 },
        { name: "Yellow final node round trip", targetIndex: 9 },
    ];

    let passed = 0;
    let failed = 0;

    cases.forEach((testCase, index) => {
        console.log(`Tier Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            const steps = runSweepCase(testCase);
            console.log(`✅ PASSED (${steps} steps)`);
            passed++;
        } catch (error) {
            console.log(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed++;
        }

        console.log();
    });

    console.log("===");
    console.log("Tier Leveling Summary");
    console.log("===");
    console.log(`📊 Total tests: ${cases.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("===");

    if (failed > 0) {
        throw new Error(`${failed} tier leveling test(s) failed`);
    }

    return { total: cases.length, passed, failed };
}

runTierLevelingTests();
