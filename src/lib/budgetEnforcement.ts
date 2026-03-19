import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";
import type { NodeLevelBehavior } from "./nodeLevelBehaviorStore";
import type { LevelDelta } from "./tierLeveling";
import { computeTotalCost } from "./nodeActionPreview";
import { getCostRange } from "../config/skillMetadata";

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

function getNodeDepth(nodes: Node[], index: number): number {
    let depth = 0;
    let current = index;
    const visited = new Set<number>();
    while (true) {
        if (visited.has(current)) break;
        visited.add(current);
        const node = nodes[current];
        if (!node) break;
        const parent = node.parent;
        if (parent === undefined) break;
        current = Array.isArray(parent) ? parent[0] : parent;
        depth++;
    }
    return depth;
}

/**
 * When the full sync lineage cost exceeds budget and the target node can't
 * be capped lower, greedily fills ancestor levels from root toward the
 * target within the available budget.
 *
 * Returns null if no nodes could be leveled (nothing affordable).
 */
export function findPartialLineageLevels(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    deltas: LevelDelta[];
    available: number;
}): { levels: LevelsByIndex; deltas: LevelDelta[] } | null {
    const { nodes, levels, deltas, available } = params;
    if (deltas.length === 0 || available <= 0) return null;

    // Sort deltas by node depth (root ancestors first, target last)
    const sortedDeltas = [...deltas]
        .filter((d) => d.delta > 0)
        .sort(
            (a, b) => getNodeDepth(nodes, a.index) - getNodeDepth(nodes, b.index),
        );

    let remainingBudget = available;
    const newLevels = new Array(Math.max(levels.length, nodes.length)).fill(0);
    for (let i = 0; i < levels.length; i++) {
        newLevels[i] = levels[i] ?? 0;
    }

    const appliedDeltas: LevelDelta[] = [];

    for (const delta of sortedDeltas) {
        if (remainingBudget <= 0) break;

        const node = nodes[delta.index];
        if (!node?.skillId) continue;

        const fromLevel = levels[delta.index] ?? 0;
        const toLevel = fromLevel + delta.delta;

        const fullCost = getCostRange(node.skillId, fromLevel, toLevel);
        if (fullCost <= remainingBudget) {
            newLevels[delta.index] = toLevel;
            remainingBudget -= fullCost;
            appliedDeltas.push(delta);
            continue;
        }

        // Find highest affordable level for this node
        for (let candidate = toLevel - 1; candidate > fromLevel; candidate--) {
            const cost = getCostRange(node.skillId, fromLevel, candidate);
            if (cost <= remainingBudget) {
                newLevels[delta.index] = candidate;
                remainingBudget -= cost;
                appliedDeltas.push({ index: delta.index, delta: candidate - fromLevel });
                break;
            }
        }
    }

    if (appliedDeltas.length === 0) return null;

    return { levels: newLevels, deltas: appliedDeltas };
}
