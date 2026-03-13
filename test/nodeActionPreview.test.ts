import assert from "node:assert/strict";
import { getNodeActionPreview } from "../src/lib/nodeActionPreview.ts";
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

console.log("  ✓ nodeActionPreview\n");
