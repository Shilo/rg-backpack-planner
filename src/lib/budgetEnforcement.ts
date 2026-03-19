import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";
import type { NodeLevelBehavior } from "./nodeLevelBehaviorStore";
import { computeTotalCost } from "./nodeActionPreview";

/**
 * Finds the highest affordable target level when the requested level exceeds
 * the available tech crystal budget.
 *
 * Returns:
 * - `null` if the original target is affordable (no cap needed)
 * - `0` if even +1 from currentLevel exceeds the budget (block entirely)
 * - A capped target level (currentLevel < result < targetLevel) otherwise
 */
export function findBudgetCappedLevel(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    currentLevel: number;
    available: number;
    nodeLevelBehavior: NodeLevelBehavior;
}): number | null {
    const {
        nodes,
        levels,
        index,
        targetLevel,
        currentLevel,
        available,
        nodeLevelBehavior,
    } = params;

    // Check if full action is affordable
    const { totalCost } = computeTotalCost({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });

    if (totalCost <= available) return null;

    // Linear search downward for highest affordable level
    for (let candidate = targetLevel - 1; candidate > currentLevel; candidate--) {
        const { totalCost: candidateCost } = computeTotalCost({
            nodes,
            levels,
            index,
            targetLevel: candidate,
            nodeLevelBehavior,
        });
        if (candidateCost <= available) return candidate;
    }

    // Even +1 exceeds budget — block entirely
    return 0;
}
