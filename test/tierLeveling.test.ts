import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";
import {
    buildSeededScenarioCase,
    buildExpectedBranchLevels,
    buildRoundTripSequence,
    collectAncestors,
    createYellowBranchFixture,
    expectedTierIndex,
    expectedTierUpper,
    formatTierStateGroup,
    formatTierStepState,
    nextStableTier,
    partitionYellowBranchRoles,
    tierSweepCases,
    type ScenarioCase,
    type ScenarioExpectedStates,
    type SweepCase,
} from "./tierLeveling.shared.ts";

const TIER_LOG_FILE_LABEL = "test/tierLeveling.output.log";
const TIER_LOG_FILE_URL = new URL("./tierLeveling.output.log", import.meta.url);
const TIER_LOG_FILE_PATH = fileURLToPath(TIER_LOG_FILE_URL);
const explicitScenarioCases: Array<{
    expectedStates: ScenarioExpectedStates;
    name: string;
    operations: ScenarioCase["operations"];
}> = [
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
            [20, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [20, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        name: "Cross-branch explicit unwind",
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
            [80, 60, 80, 60, 60, 60, 61, 30, 30, 1],
            [40, 40, 20, 21, 20, 20, 20, 10, 10, 1],
        ],
        name: "Split node decrement from inherited tier-3 state uses min",
        operations: [
            { index: 6, targetLevel: 61 },
            { index: 3, targetLevel: 21 },
        ],
    },
];

const seededInvariantCases = [
    { name: "Yellow seeded invariants", seed: 11, steps: 8 },
    { name: "Yellow seeded invariants", seed: 23, steps: 8 },
    { name: "Yellow seeded invariants", seed: 37, steps: 8 },
    { name: "Yellow seeded invariants", seed: 53, steps: 8 },
];

function resetTierLogFile() {
    writeFileSync(TIER_LOG_FILE_URL, "", "utf8");
}

function logTierLine(line = "") {
    console.log(line);
    appendFileSync(TIER_LOG_FILE_URL, `${line}\n`, "utf8");
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

function logActualTierStepState(nodes: Node[], actualLevels: LevelsByIndex): void {
    const levels = nodes.map((_, index) => actualLevels[index] ?? 0);
    const tiers = nodes.map((node, index) =>
        expectedTierIndex(levels[index] ?? 0, node.maxLevel),
    );

    formatTierStateGroup({
        groupLabel: "actual",
        levels,
        tiers,
    }).forEach((line) => {
        logTierLine(line);
    });
    logTierLine();
}

function assertYellowBranchRolePartitioning() {
    const { nodes } = createYellowBranchFixture();
    const roles = partitionYellowBranchRoles(nodes, 3);

    if (!roles.ancestors.has(0) || !roles.ancestors.has(1)) {
        throw new Error("Expected node 3 ancestors to include 0 and 1");
    }

    if (!roles.wrapped.has(2) || !roles.wrapped.has(9)) {
        throw new Error(
            "Expected wrapped nodes to include non-ancestors in the branch",
        );
    }
}

function assertSplitNodeBoundaryContracts() {
    assertTargetBoundaryContracts({
        boundaryCases: [
            { from: 0, to: 1, event: "up", stableTier: 1 },
            { from: 1, to: 20, event: "none", stableTier: 1 },
            { from: 20, to: 21, event: "up", stableTier: 2 },
            { from: 21, to: 20, event: "none", stableTier: 2 },
            { from: 20, to: 19, event: "down", stableTier: 1 },
        ],
        caseName: "Split node boundary contract",
        targetIndex: 3,
    });
}

function assertExtendedBoundaryContracts() {
    assertTargetBoundaryContracts({
        boundaryCases: [
            { from: 0, to: 1, event: "up", stableTier: 1 },
            { from: 1, to: 20, event: "none", stableTier: 1 },
            { from: 20, to: 21, event: "up", stableTier: 2 },
            { from: 21, to: 20, event: "none", stableTier: 2 },
            { from: 20, to: 19, event: "down", stableTier: 1 },
        ],
        caseName: "Root node boundary contract",
        targetIndex: 0,
    });

    assertTargetBoundaryContracts({
        boundaryCases: [
            { from: 0, to: 1, event: "up", stableTier: 1 },
            { from: 1, to: 10, event: "none", stableTier: 1 },
            { from: 10, to: 11, event: "up", stableTier: 2 },
            { from: 11, to: 10, event: "none", stableTier: 2 },
            { from: 10, to: 9, event: "down", stableTier: 1 },
        ],
        caseName: "Merged node boundary contract",
        targetIndex: 7,
    });

    assertTargetBoundaryContracts({
        boundaryCases: [
            { from: 0, to: 1, event: "up", stableTier: 1 },
            { from: 1, to: 0, event: "down", stableTier: 0 },
        ],
        caseName: "Final node boundary contract",
        targetIndex: 9,
    });
}

function assertBoundaryContract(params: {
    caseName: string;
    currentLevels: LevelsByIndex;
    event: "up" | "down" | "none";
    from: number;
    nodes: Node[];
    stableTier: number;
    stepIndex: number;
    targetIndex: number;
    to: number;
}): LevelsByIndex {
    const {
        caseName,
        currentLevels,
        event,
        from,
        nodes,
        stableTier,
        stepIndex,
        targetIndex,
        to,
    } = params;
    const currentLevel = currentLevels[targetIndex] ?? 0;
    if (currentLevel !== from) {
        throw new Error(
            `${caseName} step ${stepIndex} expected target ${targetIndex} to start at ${from}, got ${currentLevel}`,
        );
    }

    const result = applyLevelChange({
        index: targetIndex,
        levels: currentLevels,
        nodes,
        targetLevel: to,
    });

    const roles = partitionYellowBranchRoles(nodes, targetIndex);
    const wrappedTier = Math.max(stableTier - 1, 0);

    if ((result.levels[targetIndex] ?? 0) !== to) {
        throw new Error(
            `${caseName} step ${stepIndex} target ${targetIndex} expected level ${to}, got ${
                result.levels[targetIndex] ?? 0
            }`,
        );
    }

    nodes.forEach((node, index) => {
        if (index === targetIndex) return;

        const previousLevel = currentLevels[index] ?? 0;
        const assignedTier = roles.ancestors.has(index) ? stableTier : wrappedTier;
        const assignedLevel = expectedTierUpper(assignedTier, node.maxLevel);

        let expectedLevel = previousLevel;
        if (event === "up") {
            expectedLevel = Math.max(previousLevel, assignedLevel);
        } else if (event === "down") {
            expectedLevel = Math.min(previousLevel, assignedLevel);
        }

        const actualLevel = result.levels[index] ?? 0;
        if (actualLevel !== expectedLevel) {
            throw new Error(
                `${caseName} step ${stepIndex} node ${index} expected level ${expectedLevel}, got ${actualLevel}`,
            );
        }
    });

    return result.levels;
}

function assertTargetBoundaryContracts(params: {
    boundaryCases: ReadonlyArray<{
        from: number;
        to: number;
        event: "up" | "down" | "none";
        stableTier: number;
    }>;
    caseName: string;
    targetIndex: number;
}) {
    const { boundaryCases, caseName, targetIndex } = params;
    const { nodes, levels } = createYellowBranchFixture();
    let currentLevels = levels;

    boundaryCases.forEach((testCase, stepIndex) => {
        currentLevels = assertBoundaryContract({
            caseName,
            currentLevels,
            event: testCase.event,
            from: testCase.from,
            nodes,
            stableTier: testCase.stableTier,
            stepIndex,
            targetIndex,
            to: testCase.to,
        });
    });
}

function meetsStableTierHoldFloor(params: {
    level: number;
    maxLevel: number;
    tier: number;
}): boolean {
    const { level, maxLevel, tier } = params;

    if (tier <= 0) return true;
    if (level <= 0) return false;
    if (maxLevel <= 1) return true;
    if (tier === 1) return true;

    return level >= expectedTierUpper(tier - 1, maxLevel);
}

function inferStableTierFromObservedState(params: {
    levels: LevelsByIndex;
    nodes: Node[];
    targetIndex: number;
}): number {
    const { levels, nodes, targetIndex } = params;
    const targetNode = nodes[targetIndex];
    if (!targetNode) return 0;

    const roles = partitionYellowBranchRoles(nodes, targetIndex);
    const targetLevel = levels[targetIndex] ?? 0;

    for (let candidateTier = 5; candidateTier > 0; candidateTier -= 1) {
        if (
            !meetsStableTierHoldFloor({
                level: targetLevel,
                maxLevel: targetNode.maxLevel,
                tier: candidateTier,
            })
        ) {
            continue;
        }

        const wrappedTier = Math.max(candidateTier - 1, 0);
        let satisfiesContract = true;

        nodes.forEach((node, index) => {
            if (!satisfiesContract || index === targetIndex) return;

            const requiredTier = roles.ancestors.has(index)
                ? candidateTier
                : wrappedTier;
            const requiredLevel = expectedTierUpper(requiredTier, node.maxLevel);
            if ((levels[index] ?? 0) < requiredLevel) {
                satisfiesContract = false;
            }
        });

        if (satisfiesContract) {
            return candidateTier;
        }
    }

    return 0;
}

function runSeededInvariantCase(testCase: ScenarioCase) {
    const { nodes, levels: startingLevels } = createYellowBranchFixture();
    let currentLevels = startingLevels;

    testCase.operations.forEach((operation, stepIndex) => {
        const node = nodes[operation.index];
        if (!node) {
            throw new Error(
                `${testCase.name} step ${stepIndex} targets missing node ${operation.index}`,
            );
        }

        const previousLevel = currentLevels[operation.index] ?? 0;
        const clampedTarget = Math.min(
            Math.max(operation.targetLevel, 0),
            node.maxLevel,
        );
        const currentStableTier = inferStableTierFromObservedState({
            levels: currentLevels,
            nodes,
            targetIndex: operation.index,
        });
        const result = applyLevelChange({
            nodes,
            levels: currentLevels,
            index: operation.index,
            targetLevel: operation.targetLevel,
        });
        const actualStableTier = inferStableTierFromObservedState({
            levels: result.levels,
            nodes,
            targetIndex: operation.index,
        });
        const roles = partitionYellowBranchRoles(nodes, operation.index);

        logTierLine(
            `step ${stepIndex + 1} [index ${operation.index}] (${previousLevel} -> ${clampedTarget})`,
        );
        logActualTierStepState(nodes, result.levels);

        if ((result.levels[operation.index] ?? 0) !== clampedTarget) {
            throw new Error(
                `${testCase.name} step ${stepIndex} target ${operation.index} expected level ${clampedTarget}, got ${
                    result.levels[operation.index] ?? 0
                }`,
            );
        }

        if (clampedTarget > previousLevel && actualStableTier < currentStableTier) {
            throw new Error(
                `${testCase.name} step ${stepIndex} target ${operation.index} stable tier decreased during increment (${currentStableTier} -> ${actualStableTier})`,
            );
        }

        if (clampedTarget < previousLevel && actualStableTier > currentStableTier) {
            throw new Error(
                `${testCase.name} step ${stepIndex} target ${operation.index} stable tier increased during decrement (${currentStableTier} -> ${actualStableTier})`,
            );
        }

        if (clampedTarget === previousLevel && actualStableTier !== currentStableTier) {
            throw new Error(
                `${testCase.name} step ${stepIndex} target ${operation.index} stable tier changed without a level change (${currentStableTier} -> ${actualStableTier})`,
            );
        }

        nodes.forEach((branchNode, index) => {
            const actualLevel = result.levels[index] ?? 0;

            if (actualLevel < 0 || actualLevel > branchNode.maxLevel) {
                throw new Error(
                    `${testCase.name} step ${stepIndex} node ${index} exceeded bounds: ${actualLevel}`,
                );
            }

            if (index === operation.index) return;

            const previousNodeLevel = currentLevels[index] ?? 0;
            const assignedTier = roles.ancestors.has(index)
                ? actualStableTier
                : Math.max(actualStableTier - 1, 0);
            const assignedLevel = expectedTierUpper(
                assignedTier,
                branchNode.maxLevel,
            );

            let expectedLevel = previousNodeLevel;
            if (actualStableTier > currentStableTier) {
                expectedLevel = Math.max(previousNodeLevel, assignedLevel);
                if (actualLevel !== expectedLevel) {
                    throw new Error(
                        `${testCase.name} step ${stepIndex} node ${index} expected level ${expectedLevel}, got ${actualLevel}`,
                    );
                }

                return;
            }

            if (actualStableTier === currentStableTier) {
                if (actualLevel !== expectedLevel) {
                    throw new Error(
                        `${testCase.name} step ${stepIndex} node ${index} expected level ${expectedLevel}, got ${actualLevel}`,
                    );
                }

                return;
            }

            if (actualLevel > previousNodeLevel) {
                throw new Error(
                    `${testCase.name} step ${stepIndex} node ${index} increased during decrement (${previousNodeLevel} -> ${actualLevel})`,
                );
            }

            if (actualLevel < assignedLevel) {
                throw new Error(
                    `${testCase.name} step ${stepIndex} node ${index} dropped below floor ${assignedLevel}, got ${actualLevel}`,
                );
            }
        });

        currentLevels = result.levels;
    });

    return testCase.operations.length;
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
        formatTierStepState({
            nodes,
            expectedLevels,
            previousLevel,
            nextLevel: targetLevel,
            stepIndex,
            targetIndex: testCase.targetIndex,
        })
            .slice(0, -1)
            .forEach((line) => {
                logTierLine(line);
            });
        logActualTierStepState(nodes, result.levels);

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
        const expectedLevels = expectedStates[stepIndex] ?? [];
        formatTierStepState({
            nodes,
            expectedLevels,
            previousLevel,
            nextLevel: operation.targetLevel,
            stepIndex,
            targetIndex: operation.index,
        })
            .slice(0, -1)
            .forEach((line) => {
                logTierLine(line);
            });
        logActualTierStepState(nodes, result.levels);

        assertYellowBranchState({
            caseName: testCase.name,
            nodes,
            actualLevels: result.levels,
            expectedLevels,
            previousLevel,
            nextLevel: operation.targetLevel,
            stepIndex,
        });

        currentLevels = result.levels;
    });

    return testCase.operations.length;
}

function runExplicitScenarioCase(testCase: {
    expectedStates: ScenarioExpectedStates;
    name: string;
    operations: ScenarioCase["operations"];
}) {
    return runScenarioCase(testCase, testCase.expectedStates);
}

export function runTierLevelingTests() {
    assertYellowBranchRolePartitioning();
    assertSplitNodeBoundaryContracts();
    assertExtendedBoundaryContracts();
    resetTierLogFile();
    logTierLine("===");
    logTierLine("Tier Leveling Tests");
    logTierLine(`Log file: ${TIER_LOG_FILE_LABEL}`);
    logTierLine("===");
    logTierLine();

    const cases = tierSweepCases;

    let passed = 0;
    let failed = 0;

    cases.forEach((testCase, index) => {
        logTierLine(`Tier Test ${index + 1}: ${testCase.name}`);
        logTierLine("---");

        try {
            const steps = runSweepCase(testCase);
            logTierLine(`✅ PASSED (${steps} steps)`);
            passed++;
        } catch (error) {
            logTierLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed++;
        }

        logTierLine();
    });

    explicitScenarioCases.forEach((testCase, index) => {
        logTierLine(`Explicit Scenario Test ${index + 1}: ${testCase.name}`);
        logTierLine("---");

        try {
            const steps = runExplicitScenarioCase(testCase);
            logTierLine(`✅ PASSED (${steps} steps)`);
            passed++;
        } catch (error) {
            logTierLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed++;
        }

        logTierLine();
    });

    seededInvariantCases.forEach((testCase, index) => {
        const seededCase = buildSeededScenarioCase(testCase);
        logTierLine(`Seeded Invariant Test ${index + 1}: ${seededCase.name}`);
        logTierLine("---");

        try {
            const steps = runSeededInvariantCase(seededCase);
            logTierLine(`✅ PASSED (${steps} steps)`);
            passed++;
        } catch (error) {
            logTierLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed++;
        }

        logTierLine();
    });

    logTierLine("===");
    logTierLine("Tier Leveling Summary");
    logTierLine("===");
    logTierLine(
        `📊 Total tests: ${
            cases.length + explicitScenarioCases.length + seededInvariantCases.length
        }`,
    );
    logTierLine(`✅ Passed: ${passed}`);
    logTierLine(`❌ Failed: ${failed}`);
    logTierLine(`Log file: ${TIER_LOG_FILE_PATH}:1`);
    logTierLine("===");

    if (failed > 0) {
        throw new Error(`${failed} tier leveling test(s) failed`);
    }

    return {
        total: cases.length + explicitScenarioCases.length + seededInvariantCases.length,
        passed,
        failed,
    };
}

runTierLevelingTests();
