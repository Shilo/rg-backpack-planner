import assert from "node:assert/strict";
import { findBudgetCappedLevel } from "../src/lib/budgetEnforcement.ts";
import { NodeLevelBehavior } from "../src/lib/nodeLevelBehaviorStore.ts";
import { computeTotalCost } from "../src/lib/nodeActionPreview.ts";
import { getCostRange } from "../src/config/skillMetadata.ts";
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

console.log("  \u2713 budgetEnforcement\n");
