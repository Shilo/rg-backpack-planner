import assert from "node:assert/strict";
import {
    findBudgetCappedLevel,
    findPartialLineageLevels,
} from "../src/lib/budgetEnforcement.ts";
import { NodeLevelBehavior } from "../src/lib/nodeLevelBehaviorStore.ts";
import { computeTotalCost, sumDeltaCosts } from "../src/lib/nodeActionPreview.ts";
import { getCostRange } from "../src/config/skillMetadata.ts";
import { applyLevelChange } from "../src/lib/tierLeveling.ts";
import {
    createYellowBranchFixture,
    YELLOW_BRANCH_LENGTH,
} from "./tierLeveling.shared.ts";

function createLevels(length: number, fill = 0) {
    return new Array(length).fill(fill);
}

console.log("  budgetEnforcement");

// --- Returns original target when cost is within budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Cost of level 0 -> 1 for node 0
    const cost = getCostRange(nodes[0]!.skillId, 0, 1);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: cost + 100, // plenty of budget
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, null, "should return null (no cap needed) when within budget");
    console.log("    \u2713 returns null when cost is within budget");
}

// --- Returns capped level when cost exceeds budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Cost of 0->10 for node 0
    const costFor5 = getCostRange(nodes[0]!.skillId, 0, 5);
    const costFor6 = getCostRange(nodes[0]!.skillId, 0, 6);
    // Set available between cost of 5 and cost of 6
    const available = costFor5 + Math.floor((costFor6 - costFor5) / 2);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        currentLevel: 0,
        available,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 5, "should cap to level 5 (highest affordable)");
    console.log("    \u2713 caps to highest affordable level");
}

// --- Returns 0 (block) when even +1 exceeds budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: 0,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 0, "should return 0 (block) when nothing is affordable");
    console.log("    \u2713 returns 0 when even +1 exceeds budget");
}

// --- Sync mode: accounts for ancestor propagation costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Node 2 has ancestor [0]. Sync mode will level ancestors too.
    const syncCost = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    }).totalCost;

    // Give 75% of the full Sync cost — enough for some levels but not all 20
    // (Sync mode requires tier-boundary ancestor leveling which is a large fixed cost)
    const available = Math.floor(syncCost * 0.75);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        currentLevel: 0,
        available,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    assert.ok(
        result !== null && result < 20,
        `Sync should cap below 20 when budget is half sync cost (got ${result})`,
    );
    assert.ok(
        result !== null && result > 0,
        `Sync should still afford some levels (got ${result})`,
    );
    console.log("    \u2713 Sync mode accounts for ancestor propagation costs");
}

// --- Returns null for +1 increment within budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const cost = getCostRange(nodes[0]!.skillId, 0, 1);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: cost,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, null, "exact budget for +1 should return null (no cap)");
    console.log("    \u2713 exact budget for +1 returns null");
}

// --- Negative available always blocks ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: -100,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 0, "negative available should block (return 0)");
    console.log("    \u2713 negative available blocks");
}

// ═══ findPartialLineageLevels ═══

console.log("  findPartialLineageLevels");

// --- Returns null when budget is 0 ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available: 0,
    });
    assert.equal(result, null, "should return null when budget is 0");
    console.log("    \u2713 returns null when budget is 0");
}

// --- Returns null when deltas are empty ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas: [],
        available: 1000,
    });
    assert.equal(result, null, "should return null when deltas are empty");
    console.log("    \u2713 returns null when deltas are empty");
}

// --- Greedily fills root ancestor first, then intermediate ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Node 4 (parent: 1) → Node 1 (parent: 0) → Node 0 (root)
    // Sync for node 4 at level 1 requires: node 0 → 20, node 1 → 20, node 4 → 1
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: enough for node 0 (0→20) + node 1 partially, but not full lineage
    const costNode0Full = getCostRange(nodes[0]!.skillId, 0, 20);
    const costNode1Partial = getCostRange(nodes[1]!.skillId, 0, 5);
    const available = costNode0Full + costNode1Partial;

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result");
    assert.equal(result!.levels[0], 20, "root node 0 should be fully leveled to 20");
    assert.ok(
        result!.levels[1]! >= 5,
        `node 1 should be at least 5 (got ${result!.levels[1]})`,
    );
    assert.ok(
        result!.levels[1]! < 20,
        `node 1 should be less than 20 (got ${result!.levels[1]})`,
    );
    assert.equal(result!.levels[4], 0, "target node 4 should stay at 0");
    console.log("    \u2713 greedily fills root first, then intermediate");
}

// --- Total cost of applied deltas fits within budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    const available = 200;
    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    if (result) {
        const totalCost = sumDeltaCosts(nodes, levels, result.deltas);
        assert.ok(
            totalCost <= available,
            `applied cost ${totalCost} should not exceed available ${available}`,
        );
    }
    console.log("    \u2713 total cost of applied deltas fits within budget");
}

// --- Works for deep chain (node 7, 4 ancestors) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Node 7 (parent: [3, 4]) → Nodes 3, 4 (parent: 1) → Node 1 (parent: 0) → Node 0
    // Sync for node 7 at level 1 requires 4 ancestors at tier 1
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 7,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: enough for root (node 0: 0→20) only
    const costNode0Full = getCostRange(nodes[0]!.skillId, 0, 20);
    const available = costNode0Full + 1; // just barely more than node 0

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result for deep chain");
    assert.equal(result!.levels[0], 20, "root node 0 should be fully leveled");
    assert.ok(
        result!.levels[7] === 0,
        "target node 7 should stay at 0",
    );
    const totalCost = sumDeltaCosts(nodes, levels, result!.deltas);
    assert.ok(
        totalCost <= available,
        `deep chain cost ${totalCost} should not exceed ${available}`,
    );
    console.log("    \u2713 works for deep chain (node 7, 4 ancestors)");
}

// --- Respects existing partial levels ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 20; // Node 0 already at tier 1
    // Node 4 sync at level 1: node 0 already at 20 (no delta), node 1 needs 20, node 4 needs 1
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: enough for node 1 partially
    const costNode1Partial = getCostRange(nodes[1]!.skillId, 0, 10);
    const available = costNode1Partial;

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result with existing levels");
    assert.equal(result!.levels[0], 20, "node 0 should stay at 20 (already leveled)");
    assert.ok(
        result!.levels[1]! >= 10,
        `node 1 should be at least 10 (got ${result!.levels[1]})`,
    );
    assert.equal(result!.levels[4], 0, "target node 4 should stay at 0");
    console.log("    \u2713 respects existing partial levels");
}

// --- Partial root: budget only covers a fraction of the root node ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: only enough for root node 0 partially (levels 0→10)
    const costNode0Partial = getCostRange(nodes[0]!.skillId, 0, 10);
    const available = costNode0Partial;

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result even with partial root");
    assert.ok(
        result!.levels[0]! >= 10,
        `root node should be at least 10 (got ${result!.levels[0]})`,
    );
    assert.ok(
        result!.levels[0]! < 20,
        `root node should be less than 20 (got ${result!.levels[0]})`,
    );
    assert.equal(result!.levels[1], 0, "node 1 should stay at 0");
    assert.equal(result!.levels[4], 0, "target node 4 should stay at 0");
    const totalCost = sumDeltaCosts(nodes, levels, result!.deltas);
    assert.ok(totalCost <= available, `cost ${totalCost} should not exceed ${available}`);
    console.log("    \u2713 partial root when budget only covers a fraction");
}

// --- Multi-parent node: both parents of node 7 get leveled ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Node 7 has parent: [3, 4]. Sync requires nodes 0, 1, 3, 4 at tier 1 (level 20)
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 7,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: enough for all 4 ancestors fully but not the target
    const costAll4 =
        getCostRange(nodes[0]!.skillId, 0, 20) +
        getCostRange(nodes[1]!.skillId, 0, 20) +
        getCostRange(nodes[3]!.skillId, 0, 20) +
        getCostRange(nodes[4]!.skillId, 0, 20);
    const available = costAll4;

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result");
    assert.equal(result!.levels[0], 20, "node 0 should be at 20");
    assert.equal(result!.levels[1], 20, "node 1 should be at 20");
    assert.equal(result!.levels[3], 20, "node 3 (parent of 7) should be at 20");
    assert.equal(result!.levels[4], 20, "node 4 (parent of 7) should be at 20");
    assert.equal(result!.levels[7], 0, "target node 7 should stay at 0 (no budget left)");
    console.log("    \u2713 multi-parent node: both parents get leveled");
}

// --- Target gets partially leveled when ancestors are fully covered ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Sync for node 4 at level 20: node 0 → 20, node 1 → 20, node 4 → 20
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    // Budget: covers ancestors fully + some of node 4
    const costAncestors =
        getCostRange(nodes[0]!.skillId, 0, 20) +
        getCostRange(nodes[1]!.skillId, 0, 20);
    const costNode4Partial = getCostRange(nodes[4]!.skillId, 0, 10);
    const available = costAncestors + costNode4Partial;

    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available,
    });
    assert.ok(result !== null, "should return a result");
    assert.equal(result!.levels[0], 20, "node 0 fully leveled");
    assert.equal(result!.levels[1], 20, "node 1 fully leveled");
    assert.ok(
        result!.levels[4]! >= 10,
        `target node 4 should be at least 10 (got ${result!.levels[4]})`,
    );
    assert.ok(
        result!.levels[4]! < 20,
        `target node 4 should be less than 20 (got ${result!.levels[4]})`,
    );
    const totalCost = sumDeltaCosts(nodes, levels, result!.deltas);
    assert.ok(totalCost <= available, `cost ${totalCost} should not exceed ${available}`);
    console.log("    \u2713 target gets partially leveled when ancestors fully covered");
}

// --- Returns full lineage when budget covers everything ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const { deltas, levels: fullLevels } = applyLevelChange({
        nodes,
        levels,
        index: 4,
        targetLevel: 1,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    const fullCost = sumDeltaCosts(nodes, levels, deltas);
    const result = findPartialLineageLevels({
        nodes,
        levels,
        deltas,
        available: fullCost,
    });
    assert.ok(result !== null, "should return a result");
    assert.equal(result!.levels[0], fullLevels[0], "node 0 should match full sync");
    assert.equal(result!.levels[1], fullLevels[1], "node 1 should match full sync");
    assert.equal(result!.levels[4], fullLevels[4], "node 4 should match full sync");
    console.log("    \u2713 returns full lineage when budget covers everything");
}

console.log("  \u2713 budgetEnforcement\n");
