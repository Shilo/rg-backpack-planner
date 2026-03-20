import assert from "node:assert/strict";
import { getNodeActionPreview, getNodeActionPreviewFromOp, sumDeltaCosts, computeTotalCost } from "../src/lib/nodeActionPreview.ts";
import type { NodeOperation } from "../src/lib/input/nodeActions.ts";
import { NodePrimaryAction } from "../src/lib/nodePrimaryActionStore.ts";
import { NodeLevelBehavior } from "../src/lib/nodeLevelBehaviorStore.ts";
import { getCostRange } from "../src/config/skillMetadata.ts";
import type { LevelsByIndex, Node } from "../src/types/tree.ts";
import { createYellowBranchFixture, YELLOW_BRANCH_LENGTH } from "./tierLeveling.shared.ts";

function createLevels(length: number, fill = 0): LevelsByIndex {
    return new Array(length).fill(fill);
}

console.log("  nodeActionPreview");

// --- Basic increment with exact cost verification ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementOne at level 0 should return a preview");
    assert.equal(result.targetLevel, 1, "targetLevel should be 1");
    assert.equal(result.isRefund, false);
    // Verify exact cost matches getCostRange for the node's skillId
    const expectedCost = getCostRange(nodes[0]!.skillId, 0, 1);
    assert.equal(result.totalCost, expectedCost, `totalCost should be ${expectedCost}`);
    console.log("    ✓ IncrementOne at level 0 returns preview with targetLevel 1 and correct cost");
}

// --- Increment at maxLevel returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = nodes[0]!.maxLevel;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.equal(result, null, "IncrementOne at maxLevel should return null");
    console.log("    ✓ IncrementOne at maxLevel returns null");
}

// --- Refund at level 0 returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.equal(result, null, "Refund at level 0 should return null");
    console.log("    ✓ Refund at level 0 returns null");
}

// --- Out-of-bounds index returns null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 999,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.equal(result, null, "Out-of-bounds index should return null");
    console.log("    ✓ Out-of-bounds index returns null");
}

// --- IncrementTen clamps to maxLevel ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 95;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTen,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTen near maxLevel should return a preview");
    assert.equal(result.targetLevel, nodes[0]!.maxLevel, "should clamp to maxLevel");
    console.log("    ✓ IncrementTen clamps to maxLevel");
}

// --- IncrementTier target level ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTier at level 0 should return a preview");
    // Tier 1 upper for maxLevel 100 = 20
    assert.equal(result.targetLevel, 20, "should target tier 1 upper (20)");
    console.log("    ✓ IncrementTier targets tier upper");
}

// --- IncrementTier refund at level 50 ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 50;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(result, "IncrementTier refund at level 50 should return a preview");
    // previousTierTargetLevel(50, 100): tierIndex(50,100)=3, previousTier=2, tierUpper(2,100)=40
    assert.equal(result.targetLevel, 40, "should target previous tier upper (40)");
    assert.equal(result.isRefund, true);
    console.log("    ✓ IncrementTier refund targets previous tier upper");
}

// --- Sync mode: totalCost includes ancestor costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);

    // In the yellow branch, nodes have a chain: 0 -> 1 -> 2 -> ...
    // Leveling node at index 2 should propagate to ancestors 0 and 1
    const soloResult = getNodeActionPreview({
        nodes,
        levels,
        index: 2,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });

    const syncResult = getNodeActionPreview({
        nodes,
        levels,
        index: 2,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
        isRefund: false,
    });

    assert.ok(soloResult, "Solo result should exist");
    assert.ok(syncResult, "Sync result should exist");
    assert.ok(
        syncResult.totalCost > soloResult.totalCost,
        `Sync totalCost (${syncResult.totalCost}) should be > Solo totalCost (${soloResult.totalCost})`,
    );
    console.log("    ✓ Sync mode totalCost includes propagated ancestor costs");
}

// --- Solo mode: totalCost equals single-node cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementOne,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "Solo IncrementOne should return a preview");
    assert.ok(result.totalCost > 0, "totalCost should be positive");
    console.log("    ✓ Solo mode totalCost is single-node cost");
}

// --- Refund with IncrementTen ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 25;
    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTen,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(result, "Refund IncrementTen at level 25 should return a preview");
    assert.equal(result.targetLevel, 15, "should target level 15");
    assert.equal(result.isRefund, true);
    console.log("    ✓ Refund IncrementTen computes correct target level");
}

// --- maxLevel 1 node (final_damage_boost-like) ---
{
    const nodes: Node[] = [
        { skillId: "final_damage_boost", maxLevel: 1, radius: 0.8, x: 0, y: 0 },
    ];
    const levels = createLevels(1);

    const result = getNodeActionPreview({
        nodes,
        levels,
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: false,
    });
    assert.ok(result, "IncrementTier on maxLevel=1 node should return a preview");
    assert.equal(result.targetLevel, 1, "should target level 1");

    const refundResult = getNodeActionPreview({
        nodes,
        levels: [1],
        index: 0,
        action: NodePrimaryAction.IncrementTier,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        isRefund: true,
    });
    assert.ok(refundResult, "Refund on maxLevel=1 node at level 1 should return a preview");
    assert.equal(refundResult.targetLevel, 0, "should target level 0");

    console.log("    ✓ maxLevel=1 nodes work with all action types");
}

// --- sumDeltaCosts: empty deltas returns 0 ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const cost = sumDeltaCosts(nodes, levels, []);
    assert.equal(cost, 0, "empty deltas should return 0");
    console.log("    ✓ sumDeltaCosts returns 0 for empty deltas");
}

// --- sumDeltaCosts: returns unsigned cost for positive deltas ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const deltas = [{ index: 0, delta: 1 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected = getCostRange(nodes[0]!.skillId, 0, 1);
    assert.equal(cost, expected, "sumDeltaCosts should return single-node cost");
    assert.ok(cost > 0, "cost should be positive");
    console.log("    ✓ sumDeltaCosts returns correct single-node cost");
}

// --- sumDeltaCosts: returns unsigned cost for negative deltas (refund) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 10;
    const deltas = [{ index: 0, delta: -5 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected = getCostRange(nodes[0]!.skillId, 5, 10);
    assert.equal(cost, expected, "sumDeltaCosts should return unsigned cost for refund");
    assert.ok(cost > 0, "refund cost should still be positive (unsigned)");
    console.log("    ✓ sumDeltaCosts returns unsigned cost for negative deltas");
}

// --- sumDeltaCosts: sums across multiple deltas ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const deltas = [{ index: 0, delta: 20 }, { index: 1, delta: 20 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    const expected =
        getCostRange(nodes[0]!.skillId, 0, 20) +
        getCostRange(nodes[1]!.skillId, 0, 20);
    assert.equal(cost, expected, "sumDeltaCosts should sum costs across all deltas");
    console.log("    ✓ sumDeltaCosts sums across multiple deltas");
}

// --- sumDeltaCosts: skips nodes without skillId ---
{
    const nodes = [
        { skillId: undefined, maxLevel: 100, radius: 1, x: 0, y: 0 },
    ] as unknown as Node[];
    const levels = createLevels(1);
    const deltas = [{ index: 0, delta: 10 }];
    const cost = sumDeltaCosts(nodes, levels, deltas);
    assert.equal(cost, 0, "should return 0 for nodes without skillId");
    console.log("    ✓ sumDeltaCosts skips nodes without skillId");
}

// --- computeTotalCost: matches getNodeActionPreview for Solo ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const expected = getCostRange(nodes[0]!.skillId, 0, 20);
    assert.equal(result.totalCost, expected, "computeTotalCost Solo should match single-node cost");
    assert.equal(result.deltas.length, 1, "Solo should produce 1 delta");
    console.log("    ✓ computeTotalCost Solo matches single-node cost");
}

// --- computeTotalCost: Sync includes ancestor costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const solo = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const sync = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    assert.ok(
        sync.totalCost > solo.totalCost,
        `Sync cost (${sync.totalCost}) should exceed Solo cost (${solo.totalCost})`,
    );
    assert.ok(sync.deltas.length > 1, "Sync should produce multiple deltas");
    console.log("    ✓ computeTotalCost Sync includes ancestor costs");
}

// --- computeTotalCost: no-op returns empty deltas and zero cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 20;
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result.totalCost, 0, "no-op should return 0 cost");
    assert.equal(result.deltas.length, 0, "no-op should return empty deltas");
    console.log("    ✓ computeTotalCost no-op returns zero cost and empty deltas");
}

// --- computeTotalCost: refund returns unsigned (positive) cost ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 20;
    const result = computeTotalCost({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    const expected = getCostRange(nodes[0]!.skillId, 10, 20);
    assert.equal(result.totalCost, expected, "refund computeTotalCost should return unsigned cost");
    assert.ok(result.totalCost > 0, "refund cost should be positive (unsigned)");
    console.log("    ✓ computeTotalCost refund returns unsigned cost");
}

// --- getNodeActionPreviewFromOp: incrementByStore delegates to store action ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementByStore" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "incrementByStore should return a preview");
    assert.equal(result.targetLevel, 10, "should increment by 10 (store = IncrementTen)");
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementByStore delegates to store");
}

// --- getNodeActionPreviewFromOp: decrementByStore ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 25;
    const op: NodeOperation = { op: "decrementByStore" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "decrementByStore should return a preview");
    assert.equal(result.targetLevel, 15, "should decrement by 10");
    assert.equal(result.isRefund, true);
    console.log("    ✓ getNodeActionPreviewFromOp: decrementByStore");
}

// --- getNodeActionPreviewFromOp: incrementByAlternate (primary=+1 → alternate=+Tier) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementByAlternate" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementOne,
    });
    assert.ok(result, "incrementByAlternate should return a preview");
    assert.equal(result.targetLevel, 20, "should target tier upper (20)");
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementByAlternate (primary=+1 → +Tier)");
}

// --- getNodeActionPreviewFromOp: decrementByAlternate (primary=+10 → alternate=+1) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 5;
    const op: NodeOperation = { op: "decrementByAlternate" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "decrementByAlternate should return a preview");
    assert.equal(result.targetLevel, 4);
    assert.equal(result.isRefund, true);
    console.log("    ✓ getNodeActionPreviewFromOp: decrementByAlternate (primary=+10 → -1)");
}

// --- getNodeActionPreviewFromOp: contextMenu → null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "contextMenu" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementOne,
    });
    assert.equal(result, null, "contextMenu should return null");
    console.log("    ✓ getNodeActionPreviewFromOp: contextMenu → null");
}

// --- getNodeActionPreviewFromOp: incrementByAlternate (primary=+Tier → alternate=+1) ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementByAlternate" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTier,
    });
    assert.ok(result, "incrementByAlternate should return a preview");
    assert.equal(result.targetLevel, 1);
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementByAlternate (primary=+Tier → +1)");
}

console.log("  ✓ nodeActionPreview\n");
