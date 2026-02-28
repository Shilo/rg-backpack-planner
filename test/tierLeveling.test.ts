import { baseTree } from "../src/config/baseTree.ts";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";

const MAX_TIERS = 5;
const YELLOW_BRANCH_LENGTH = 10;

type SweepCase = {
    name: string;
    targetIndex: number;
};

type ScenarioOperation = {
    index: number;
    targetLevel: number;
};

type ScenarioCase = {
    name: string;
    operations: ScenarioOperation[];
};

type ScenarioExpectedStates = number[][];

type SeededScenarioCase = {
    name: string;
    seed: number;
    steps: number;
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

function currentStableTierForScenarioNode(params: {
    nodes: Node[];
    levels: number[];
    targetIndex: number;
}): number {
    const { nodes, levels, targetIndex } = params;
    const targetNode = nodes[targetIndex];
    if (!targetNode) return 0;

    const ancestors = collectAncestors(nodes, targetIndex);
    const targetTier = expectedTierIndex(
        levels[targetIndex] ?? 0,
        targetNode.maxLevel,
    );

    if (ancestors.size === 0) {
        let maxWrappedTier = 0;

        nodes.forEach((node, index) => {
            if (index === targetIndex) return;
            maxWrappedTier = Math.max(
                maxWrappedTier,
                expectedTierIndex(levels[index] ?? 0, node.maxLevel),
            );
        });

        if (maxWrappedTier > 0) {
            return Math.max(targetTier, maxWrappedTier + 1);
        }

        return targetTier;
    }

    let maxAncestorTier = 0;
    ancestors.forEach((ancestorIndex) => {
        const ancestor = nodes[ancestorIndex];
        maxAncestorTier = Math.max(
            maxAncestorTier,
            expectedTierIndex(levels[ancestorIndex] ?? 0, ancestor.maxLevel),
        );
    });

    return Math.max(targetTier, maxAncestorTier);
}

function buildExpectedBranchStateForOperation(params: {
    nodes: Node[];
    currentLevels: number[];
    operation: ScenarioOperation;
}): number[] {
    const { nodes, currentLevels, operation } = params;
    const node = nodes[operation.index];
    if (!node) {
        return [...currentLevels];
    }

    const nextLevels = [...currentLevels];
    const clampedTarget = Math.min(
        Math.max(operation.targetLevel, 0),
        node.maxLevel,
    );
    const startingLevel = currentLevels[operation.index] ?? 0;

    if (clampedTarget === startingLevel) {
        return nextLevels;
    }

    const ancestors = collectAncestors(nodes, operation.index);
    const currentStableTier = currentStableTierForScenarioNode({
        nodes,
        levels: currentLevels,
        targetIndex: operation.index,
    });

    let nextStableTier = currentStableTier;
    if (clampedTarget > startingLevel) {
        nextStableTier = Math.max(
            currentStableTier,
            expectedTierIndex(clampedTarget, node.maxLevel),
        );
    } else if (node.maxLevel <= 1 && clampedTarget === 0) {
        nextStableTier = 0;
    } else {
        while (
            nextStableTier > 0 &&
            clampedTarget < expectedTierUpper(nextStableTier - 1, node.maxLevel)
        ) {
            nextStableTier -= 1;
        }
    }

    nextLevels[operation.index] = clampedTarget;

    if (nextStableTier !== currentStableTier) {
        const wrappedTier = Math.max(nextStableTier - 1, 0);

        nodes.forEach((componentNode, index) => {
            if (index === operation.index) return;

            const requiredTier = ancestors.has(index)
                ? nextStableTier
                : wrappedTier;

            nextLevels[index] = expectedTierUpper(
                requiredTier,
                componentNode.maxLevel,
            );
        });
    }

    return nextLevels;
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

function buildSeededScenarioCase(testCase: SeededScenarioCase): ScenarioCase {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    const random = createSeededRandom(testCase.seed);
    const preferredIndices = [0, 1, 2, 3, 5, 6, 7, 8, 9];
    const operations: ScenarioOperation[] = [];
    let currentLevels = [...startingLevels];
    let previousIndex =
        preferredIndices[
            Math.floor(random() * preferredIndices.length) % preferredIndices.length
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
        const currentLevel = currentLevels[index] ?? 0;

        let levelPool = candidateLevels.filter((level) => level !== currentLevel);
        if (currentLevel > 0 && random() < 0.65) {
            const decreasing = levelPool.filter((level) => level < currentLevel);
            if (decreasing.length > 0) {
                levelPool = decreasing;
            }
        } else {
            const increasing = levelPool.filter((level) => level > currentLevel);
            if (increasing.length > 0) {
                levelPool = increasing;
            }
        }

        if (levelPool.length === 0) {
            levelPool = candidateLevels;
        }

        const targetLevel =
            levelPool[Math.floor(random() * levelPool.length) % levelPool.length] ??
            currentLevel;
        const operation = { index, targetLevel };

        operations.push(operation);
        currentLevels = buildExpectedBranchStateForOperation({
            nodes,
            currentLevels,
            operation,
        });
        previousIndex = index;
    }

    return {
        name: `${testCase.name} (seed ${testCase.seed})`,
        operations,
    };
}

function buildExpectedStateForScenario(
    testCase: ScenarioCase,
): ScenarioExpectedStates {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    const expectedStates: ScenarioExpectedStates = [];
    let currentLevels = [...startingLevels];

    testCase.operations.forEach((operation) => {
        const nextLevels = buildExpectedBranchStateForOperation({
            nodes,
            currentLevels,
            operation,
        });
        expectedStates.push(nextLevels);
        currentLevels = [...nextLevels];
    });

    return expectedStates;
}

function runScenarioCase(
    testCase: ScenarioCase,
    expectedStates: ScenarioExpectedStates,
) {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    let currentLevels = startingLevels;

    if (expectedStates.length !== testCase.operations.length) {
        throw new Error(
            `${testCase.name} expected ${testCase.operations.length} states, got ${expectedStates.length}`,
        );
    }

    testCase.operations.forEach((operation, stepIndex) => {
        const previousLevel = currentLevels[operation.index] ?? 0;
        const result = applyLevelChange({
            nodes,
            levels: currentLevels,
            index: operation.index,
            targetLevel: operation.targetLevel,
        });

        assertYellowBranchState({
            caseName: testCase.name,
            nodes,
            actualLevels: result.levels,
            expectedLevels: expectedStates[stepIndex] ?? [],
            previousLevel,
            nextLevel: operation.targetLevel,
            stepIndex,
        });

        currentLevels = result.levels;
    });

    return testCase.operations.length;
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
    const scenarioCases: ScenarioCase[] = [
        {
            name: "Yellow sibling decrement handoff",
            operations: [
                { index: 1, targetLevel: 100 },
                { index: 2, targetLevel: 0 },
            ],
        },
        {
            name: "Yellow final branch decrement handoff",
            operations: [
                { index: 9, targetLevel: 1 },
                { index: 8, targetLevel: 0 },
            ],
        },
        {
            name: "Yellow merged branch unwind",
            operations: [
                { index: 7, targetLevel: 50 },
                { index: 6, targetLevel: 0 },
            ],
        },
        {
            name: "Yellow cross-branch cascading unwind",
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
            name: "Yellow partial ancestor hysteresis",
            operations: [
                { index: 0, targetLevel: 21 },
                { index: 6, targetLevel: 61 },
                { index: 2, targetLevel: 41 },
                { index: 2, targetLevel: 39 },
            ],
        },
        {
            name: "Yellow sibling partial bounce",
            operations: [
                { index: 1, targetLevel: 41 },
                { index: 2, targetLevel: 61 },
                { index: 2, targetLevel: 60 },
                { index: 2, targetLevel: 59 },
            ],
        },
        {
            name: "Yellow split branch rollback",
            operations: [
                { index: 3, targetLevel: 100 },
                { index: 4, targetLevel: 100 },
                { index: 7, targetLevel: 50 },
                { index: 4, targetLevel: 19 },
            ],
        },
        {
            name: "Yellow deep branch partial unwind",
            operations: [
                { index: 9, targetLevel: 1 },
                { index: 8, targetLevel: 11 },
                { index: 8, targetLevel: 10 },
                { index: 8, targetLevel: 9 },
            ],
        },
        {
            name: "Yellow root partial reset after deep unlock",
            operations: [
                { index: 0, targetLevel: 81 },
                { index: 9, targetLevel: 1 },
                { index: 0, targetLevel: 79 },
            ],
        },
    ];
    const seededScenarioCases: SeededScenarioCase[] = [
        { name: "Yellow seeded simulation", seed: 11, steps: 8 },
        { name: "Yellow seeded simulation", seed: 23, steps: 8 },
        { name: "Yellow seeded simulation", seed: 37, steps: 8 },
        { name: "Yellow seeded simulation", seed: 53, steps: 8 },
        { name: "Yellow seeded simulation", seed: 71, steps: 8 },
        { name: "Yellow seeded simulation", seed: 89, steps: 8 },
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

    scenarioCases.forEach((testCase, index) => {
        console.log(`Scenario Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            const expectedStates = buildExpectedStateForScenario(testCase);
            const steps = runScenarioCase(testCase, expectedStates);
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

    seededScenarioCases.forEach((testCase, index) => {
        console.log(
            `Seeded Test ${index + 1}: ${testCase.name} (seed ${testCase.seed})`,
        );
        console.log("---");

        try {
            const generatedCase = buildSeededScenarioCase(testCase);
            const expectedStates = buildExpectedStateForScenario(generatedCase);
            const steps = runScenarioCase(generatedCase, expectedStates);
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
    console.log(
        `📊 Total tests: ${
            cases.length + scenarioCases.length + seededScenarioCases.length
        }`,
    );
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log("===");

    if (failed > 0) {
        throw new Error(`${failed} tier leveling test(s) failed`);
    }

    return {
        total: cases.length + scenarioCases.length + seededScenarioCases.length,
        passed,
        failed,
    };
}

runTierLevelingTests();
