import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";
import {
    buildExpectedBranchLevels,
    buildExpectedStateForScenario,
    buildRoundTripSequence,
    buildSeededScenarioCase,
    collectAncestors,
    createYellowBranchFixture,
    expectedTierIndex,
    formatTierStateGroup,
    formatTierStepState,
    nextStableTier,
    tierScenarioCases,
    tierSeededScenarioCases,
    tierSweepCases,
    type ScenarioCase,
    type ScenarioExpectedStates,
    type SweepCase,
} from "./tierLeveling.shared.ts";

const TIER_LOG_FILE_LABEL = "test/tierLeveling.output.log";
const TIER_LOG_FILE_URL = new URL("./tierLeveling.output.log", import.meta.url);
const TIER_LOG_FILE_PATH = fileURLToPath(TIER_LOG_FILE_URL);

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

export function runTierLevelingTests() {
    resetTierLogFile();
    logTierLine("===");
    logTierLine("Tier Leveling Tests");
    logTierLine(`Log file: ${TIER_LOG_FILE_LABEL}`);
    logTierLine("===");
    logTierLine();

    const cases = tierSweepCases;
    const scenarioCases = tierScenarioCases;
    const seededScenarioCases = tierSeededScenarioCases;

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

    scenarioCases.forEach((testCase, index) => {
        logTierLine(`Scenario Test ${index + 1}: ${testCase.name}`);
        logTierLine("---");

        try {
            const expectedStates = buildExpectedStateForScenario(testCase);
            const steps = runScenarioCase(testCase, expectedStates);
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

    seededScenarioCases.forEach((testCase, index) => {
        logTierLine(
            `Seeded Test ${index + 1}: ${testCase.name} (seed ${testCase.seed})`,
        );
        logTierLine("---");

        try {
            const generatedCase = buildSeededScenarioCase(testCase);
            const expectedStates = buildExpectedStateForScenario(generatedCase);
            const steps = runScenarioCase(generatedCase, expectedStates);
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
            cases.length + scenarioCases.length + seededScenarioCases.length
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
        total: cases.length + scenarioCases.length + seededScenarioCases.length,
        passed,
        failed,
    };
}

runTierLevelingTests();
