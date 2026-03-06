import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { baseTree } from "../src/config/baseTree.ts";
import { applyLevelChange, unlockedTierForNode } from "../src/lib/tierLeveling.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";
import {
    collectAncestors,
    collectDescendants,
    createYellowBranchFixture,
    directionalScenarioCases,
    expectedTiersForLevels,
    partitionDirectionalRoles,
    YELLOW_BRANCH_LENGTH,
    type DirectionalScenarioCase,
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

function sorted(values: Iterable<number>): number[] {
    return [...values].sort((left, right) => left - right);
}

function expectedDeltas(before: number[], after: number[]) {
    const deltas: Array<{ index: number; delta: number }> = [];
    const length = Math.max(before.length, after.length);

    for (let index = 0; index < length; index += 1) {
        const previous = before[index] ?? 0;
        const next = after[index] ?? 0;
        if (previous === next) continue;
        deltas.push({ index, delta: next - previous });
    }

    return deltas;
}

function assertRolePartitioning(nodes: Node[]) {
    const splitRoles = partitionDirectionalRoles(nodes, 3);
    assert.deepStrictEqual(sorted(splitRoles.ancestors), [0, 1]);
    assert.deepStrictEqual(sorted(splitRoles.descendants), [7, 9]);
    assert.deepStrictEqual(sorted(splitRoles.unrelated), [2, 4, 5, 6, 8]);

    const rootRoles = partitionDirectionalRoles(nodes, 0);
    assert.deepStrictEqual(sorted(rootRoles.ancestors), []);
    assert.deepStrictEqual(sorted(rootRoles.descendants), [
        1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    assert.deepStrictEqual(sorted(rootRoles.unrelated), []);

    const leafRoles = partitionDirectionalRoles(nodes, 9);
    assert.deepStrictEqual(sorted(leafRoles.ancestors), [
        0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    assert.deepStrictEqual(sorted(leafRoles.descendants), []);
    assert.deepStrictEqual(sorted(leafRoles.unrelated), []);
}

function assertRolePartitionCoverage(nodes: Node[]) {
    nodes.forEach((_, targetIndex) => {
        const roles = partitionDirectionalRoles(nodes, targetIndex);
        const ancestorList = sorted(roles.ancestors);
        const descendantList = sorted(roles.descendants);
        const unrelatedList = sorted(roles.unrelated);

        ancestorList.forEach((index) => {
            assert.ok(
                !roles.descendants.has(index),
                `target ${targetIndex}: node ${index} is both ancestor and descendant`,
            );
            assert.ok(
                !roles.unrelated.has(index),
                `target ${targetIndex}: node ${index} is both ancestor and unrelated`,
            );
        });

        descendantList.forEach((index) => {
            assert.ok(
                !roles.unrelated.has(index),
                `target ${targetIndex}: node ${index} is both descendant and unrelated`,
            );
        });

        const covered = new Set<number>([
            ...ancestorList,
            ...descendantList,
            ...unrelatedList,
            targetIndex,
        ]);
        assert.equal(
            covered.size,
            nodes.length,
            `target ${targetIndex}: role partition does not cover every node`,
        );
    });
}

function assertRootLeafTopology(nodes: Node[]) {
    assert.equal(nodes[0]?.parent, undefined);
    assert.deepStrictEqual(sorted(collectAncestors(nodes, 0)), []);
    assert.deepStrictEqual(sorted(collectDescendants(nodes, 9)), []);
}

function assertNoopChange(nodes: Node[], levels: LevelsByIndex) {
    const result = applyLevelChange({
        nodes,
        levels,
        index: 3,
        targetLevel: 0,
    });

    assert.strictEqual(result.levels, levels);
    assert.deepStrictEqual(result.deltas, []);
}

function assertClampedNoopChange(nodes: Node[]) {
    const maxedLevels = new Array(nodes.length).fill(0);
    maxedLevels[3] = 100;

    const aboveMax = applyLevelChange({
        nodes,
        levels: maxedLevels,
        index: 3,
        targetLevel: 999,
    });
    assert.strictEqual(aboveMax.levels, maxedLevels);
    assert.deepStrictEqual(aboveMax.deltas, []);

    const zeroLevels = new Array(nodes.length).fill(0);
    const belowZero = applyLevelChange({
        nodes,
        levels: zeroLevels,
        index: 3,
        targetLevel: -25,
    });
    assert.strictEqual(belowZero.levels, zeroLevels);
    assert.deepStrictEqual(belowZero.deltas, []);
}

function assertInvalidIndexChange(nodes: Node[]) {
    const levels = new Array(nodes.length).fill(0);
    levels[1] = 32;
    levels[9] = 1;

    const invalidPositive = applyLevelChange({
        nodes,
        levels,
        index: 999,
        targetLevel: 21,
    });
    assert.deepStrictEqual(invalidPositive.levels, levels);
    assert.notStrictEqual(invalidPositive.levels, levels);
    assert.deepStrictEqual(invalidPositive.deltas, []);

    const invalidNegative = applyLevelChange({
        nodes,
        levels,
        index: -1,
        targetLevel: 21,
    });
    assert.deepStrictEqual(invalidNegative.levels, levels);
    assert.notStrictEqual(invalidNegative.levels, levels);
    assert.deepStrictEqual(invalidNegative.deltas, []);
}

function assertUnlockedTierContracts(nodes: Node[]) {
    const levels = new Array(nodes.length).fill(0);

    assert.equal(unlockedTierForNode(nodes, levels, 0), Infinity);
    assert.equal(unlockedTierForNode(nodes, levels, 3), 0);
    assert.equal(unlockedTierForNode(nodes, levels, 999), 0);

    levels[3] = 40;
    levels[4] = 20;
    assert.equal(unlockedTierForNode(nodes, levels, 7), 1);

    levels[4] = 40;
    assert.equal(unlockedTierForNode(nodes, levels, 7), 2);

    levels[7] = 20;
    levels[8] = 10;
    assert.equal(unlockedTierForNode(nodes, levels, 9), 1);

    levels[8] = 20;
    assert.equal(unlockedTierForNode(nodes, levels, 9), 2);
}

function assertSameTierDecrementRebase(nodes: Node[]) {
    const levels = [100, 100, 0, 21, 0, 0, 0, 50, 0, 1];
    const result = applyLevelChange({
        nodes,
        levels,
        index: 3,
        targetLevel: 20,
    });

    assert.deepStrictEqual(result.levels, [40, 40, 0, 20, 0, 0, 0, 10, 0, 1]);
    assert.deepStrictEqual(result.deltas, [
        { index: 0, delta: -60 },
        { index: 1, delta: -60 },
        { index: 3, delta: -1 },
        { index: 7, delta: -40 },
    ]);
}

function assertIndividualNodeLevelingNoSync(nodes: Node[]) {
    const levels = new Array(nodes.length).fill(0);
    levels[0] = 20;
    levels[1] = 20;
    levels[3] = 20;

    const result = applyLevelChange({
        nodes,
        levels,
        index: 3,
        targetLevel: 21,
        nodeLevelBehavior: 0,
    });

    assert.deepStrictEqual(result.levels, [20, 20, 0, 21, 0, 0, 0, 0, 0, 0]);
    assert.deepStrictEqual(result.deltas, [{ index: 3, delta: 1 }]);
}

function assertCrossBranchIsolation() {
    const levels = new Array(baseTree.length).fill(0);
    levels[10] = 55;
    levels[11] = 20;
    levels[17] = 15;
    levels[20] = 41;
    levels[29] = 1;

    const result = applyLevelChange({
        nodes: baseTree,
        levels,
        index: 3,
        targetLevel: 21,
    });

    assert.deepStrictEqual(result.levels.slice(0, YELLOW_BRANCH_LENGTH), [
        40, 40, 0, 21, 0, 0, 0, 0, 0, 0,
    ]);

    [10, 11, 17, 20, 29].forEach((index) => {
        assert.equal(
            result.levels[index] ?? 0,
            levels[index] ?? 0,
            `cross-branch index ${index} changed unexpectedly`,
        );
    });

    result.deltas.forEach(({ index }) => {
        assert.ok(index < YELLOW_BRANCH_LENGTH, `delta leaked to branch index ${index}`);
    });
}

function runScenarioCase(testCase: DirectionalScenarioCase): number {
    const { nodes, levels } = createYellowBranchFixture();
    let current = [...levels];
    if (testCase.initialLevels) {
        current = nodes.map((_, index) => testCase.initialLevels?.[index] ?? 0);
    }

    testCase.steps.forEach((step, stepIndex) => {
        const previous = [...current];
        const result = applyLevelChange({
            nodes,
            levels: current,
            index: step.index,
            targetLevel: step.targetLevel,
        });
        const actual = nodes.map((_, index) => result.levels[index] ?? 0);
        const expected = step.expectedLevels;
        const targetNode = nodes[step.index];

        logTierLine(
            `step ${stepIndex + 1} [index ${step.index}] (${previous[step.index] ?? 0} -> ${step.targetLevel})`,
        );
        logTierLine(`- expected levels: [${expected.join(", ")}]`);
        logTierLine(`- actual levels:   [${actual.join(", ")}]`);
        logTierLine();

        assert.deepStrictEqual(
            actual,
            expected,
            `${testCase.name} step ${stepIndex + 1} levels mismatch`,
        );

        const roles = partitionDirectionalRoles(nodes, step.index);
        sorted(roles.unrelated).forEach((unrelatedIndex) => {
            assert.equal(
                actual[unrelatedIndex] ?? 0,
                previous[unrelatedIndex] ?? 0,
                `${testCase.name} step ${
                    stepIndex + 1
                } unrelated node ${unrelatedIndex} changed`,
            );
        });

        assert.deepStrictEqual(
            result.deltas,
            expectedDeltas(previous, expected),
            `${testCase.name} step ${stepIndex + 1} deltas mismatch`,
        );

        const expectedTiers = expectedTiersForLevels(nodes, expected);
        const actualTiers = expectedTiersForLevels(nodes, actual);
        assert.deepStrictEqual(
            actualTiers,
            expectedTiers,
            `${testCase.name} step ${stepIndex + 1} tier mismatch`,
        );

        nodes.forEach((scenarioNode, nodeIndex) => {
            const value = actual[nodeIndex] ?? 0;
            assert.ok(
                value >= 0 && value <= scenarioNode.maxLevel,
                `${testCase.name} step ${
                    stepIndex + 1
                } node ${nodeIndex} out of bounds: ${value}`,
            );
        });

        if (targetNode) {
            const clampedTarget = Math.min(
                Math.max(step.targetLevel, 0),
                targetNode.maxLevel,
            );
            assert.equal(
                actual[step.index] ?? 0,
                clampedTarget,
                `${testCase.name} step ${
                    stepIndex + 1
                } target level did not clamp to expected value`,
            );
        }

        current = [...actual];
    });

    return testCase.steps.length;
}

export function runTierLevelingTests() {
    resetTierLogFile();
    logTierLine("===");
    logTierLine("Tier Leveling Tests");
    logTierLine(`Log file: ${TIER_LOG_FILE_LABEL}`);
    logTierLine("===");
    logTierLine();

    const { nodes, levels } = createYellowBranchFixture();
    assertRootLeafTopology(nodes);
    assertRolePartitioning(nodes);
    assertRolePartitionCoverage(nodes);
    assertNoopChange(nodes, levels);
    assertClampedNoopChange(nodes);
    assertInvalidIndexChange(nodes);
    assertUnlockedTierContracts(nodes);
    assertSameTierDecrementRebase(nodes);
    assertIndividualNodeLevelingNoSync(nodes);
    assertCrossBranchIsolation();

    let passed = 0;
    let failed = 0;

    directionalScenarioCases.forEach((testCase, index) => {
        logTierLine(`Scenario ${index + 1}: ${testCase.name}`);
        logTierLine("---");
        try {
            const steps = runScenarioCase(testCase);
            logTierLine(`✅ PASSED (${steps} steps)`);
            passed += 1;
        } catch (error) {
            logTierLine(
                `❌ FAILED: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            failed += 1;
        }
        logTierLine();
    });

    logTierLine("===");
    logTierLine("Tier Leveling Summary");
    logTierLine("===");
    logTierLine(`📊 Total tests: ${directionalScenarioCases.length}`);
    logTierLine(`✅ Passed: ${passed}`);
    logTierLine(`❌ Failed: ${failed}`);
    logTierLine(`Log file: ${TIER_LOG_FILE_PATH}:1`);
    logTierLine("===");

    if (failed > 0) {
        throw new Error(`${failed} tier leveling test(s) failed`);
    }

    return {
        total: directionalScenarioCases.length,
        passed,
        failed,
    };
}

runTierLevelingTests();
