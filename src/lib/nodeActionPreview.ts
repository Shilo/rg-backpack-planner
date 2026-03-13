import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";
import { NodePrimaryAction } from "./nodePrimaryActionStore";
import { NodeLevelBehavior } from "./nodeLevelBehaviorStore";
import type { LevelDelta } from "./tierLeveling";
import {
    applyLevelChange,
    nextTierTargetLevel,
    previousTierTargetLevel,
} from "./tierLeveling";
import { getCostRange } from "../config/skillMetadata";

export type NodeActionPreview = {
    targetLevel: number;
    totalCost: number;
    isRefund: boolean;
};

export function sumDeltaCosts(
    nodes: Node[],
    levels: LevelsByIndex,
    deltas: LevelDelta[],
): number {
    let total = 0;
    for (const delta of deltas) {
        const node = nodes[delta.index];
        if (!node?.skillId) continue;
        const fromLevel = levels[delta.index] ?? 0;
        const toLevel = fromLevel + delta.delta;
        total += getCostRange(
            node.skillId,
            Math.min(fromLevel, toLevel),
            Math.max(fromLevel, toLevel),
        );
    }
    return total;
}

export function computeTotalCost(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    nodeLevelBehavior: NodeLevelBehavior;
}): { totalCost: number; deltas: LevelDelta[] } {
    const { nodes, levels, index, targetLevel, nodeLevelBehavior } = params;
    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });
    const totalCost = sumDeltaCosts(nodes, levels, deltas);
    return { totalCost, deltas };
}

export function getNodeActionPreview(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    action: NodePrimaryAction;
    nodeLevelBehavior: NodeLevelBehavior;
    isRefund: boolean;
}): NodeActionPreview | null {
    const { nodes, levels, index, action, nodeLevelBehavior, isRefund } = params;
    const node = nodes[index];
    if (!node) return null;

    const currentLevel = levels[index] ?? 0;
    const maxLevel = node.maxLevel;

    let targetLevel: number;

    if (isRefund) {
        if (currentLevel <= 0) return null;
        if (action === NodePrimaryAction.IncrementOne) {
            targetLevel = Math.max(0, currentLevel - 1);
        } else if (action === NodePrimaryAction.IncrementTen) {
            targetLevel = Math.max(0, currentLevel - 10);
        } else {
            targetLevel = previousTierTargetLevel(currentLevel, maxLevel);
        }
    } else {
        if (currentLevel >= maxLevel) return null;
        if (action === NodePrimaryAction.IncrementOne) {
            targetLevel = Math.min(currentLevel + 1, maxLevel);
        } else if (action === NodePrimaryAction.IncrementTen) {
            targetLevel = Math.min(currentLevel + 10, maxLevel);
        } else {
            targetLevel = nextTierTargetLevel(currentLevel, maxLevel);
        }
    }

    if (targetLevel === currentLevel) return null;

    const { deltas } = applyLevelChange({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });

    if (deltas.length === 0) return null;

    let totalCost = 0;
    for (const delta of deltas) {
        const deltaNode = nodes[delta.index];
        if (!deltaNode?.skillId) continue;
        const fromLevel = levels[delta.index] ?? 0;
        const toLevel = fromLevel + delta.delta;
        totalCost += getCostRange(
            deltaNode.skillId,
            Math.min(fromLevel, toLevel),
            Math.max(fromLevel, toLevel),
        );
    }

    return { targetLevel, totalCost, isRefund };
}
