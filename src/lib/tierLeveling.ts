import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";

export type LevelDelta = { index: NodeIndex; delta: number };

const MAX_TIERS = 5;
const SYNC_NODE_LEVEL_BEHAVIOR = 1;

export function tierSize(maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1) return 0;
    return maxLevel / MAX_TIERS;
}

export function tierIndex(level: number, maxLevel: Node["maxLevel"]): number {
    if (level <= 0) return 0;
    if (maxLevel <= 1) return 1;
    const size = tierSize(maxLevel);
    if (size === 0) return 0;
    const tier = Math.floor((level - 1) / size) + 1;
    return Math.min(tier, MAX_TIERS);
}

export function tierUpper(tier: number, maxLevel: Node["maxLevel"]): number {
    if (tier <= 0) return 0;
    const size = tierSize(maxLevel);
    if (size === 0) return maxLevel;
    return Math.min(Math.ceil(size * tier), maxLevel);
}

export function nextTierTargetLevel(
    level: number,
    maxLevel: Node["maxLevel"],
): number {
    if (maxLevel <= 1) return maxLevel;
    if (level <= 0) return tierUpper(1, maxLevel);
    if (level >= maxLevel) return maxLevel;

    const currentTier = tierIndex(level, maxLevel);
    const currentTierUpper = tierUpper(currentTier, maxLevel);
    const nextTier = Math.min(
        level >= currentTierUpper ? currentTier + 1 : currentTier,
        MAX_TIERS,
    );

    return Math.min(tierUpper(nextTier, maxLevel), maxLevel);
}

export function previousTierTargetLevel(
    level: number,
    maxLevel: Node["maxLevel"],
): number {
    if (level <= 0) return 0;
    if (maxLevel <= 1) return 0;

    const currentTier = tierIndex(level, maxLevel);
    const previousTier = Math.max(currentTier - 1, 0);
    return tierUpper(previousTier, maxLevel);
}

function parentIndices(node: Node): number[] {
    if (node.parent === undefined) return [];
    return Array.isArray(node.parent) ? [...node.parent] : [node.parent];
}

function buildChildrenList(nodes: Node[]): number[][] {
    const children = nodes.map(() => [] as number[]);
    nodes.forEach((node, index) => {
        parentIndices(node).forEach((parentIndex) => {
            if (children[parentIndex]) {
                children[parentIndex].push(index);
            }
        });
    });
    return children;
}

function collectAncestors(nodes: Node[], start: number): Set<number> {
    const ancestors = new Set<number>();
    const startNode = nodes[start];
    if (!startNode) return ancestors;

    const stack = [...parentIndices(startNode)];
    while (stack.length > 0) {
        const current = stack.pop()!;
        if (ancestors.has(current)) continue;
        ancestors.add(current);

        const currentNode = nodes[current];
        if (!currentNode) continue;

        parentIndices(currentNode).forEach((parentIndex) => {
            if (!ancestors.has(parentIndex)) {
                stack.push(parentIndex);
            }
        });
    }

    return ancestors;
}

function collectDescendants(nodes: Node[], start: number): Set<number> {
    const descendants = new Set<number>();
    const children = buildChildrenList(nodes);
    const stack = [...(children[start] ?? [])];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (descendants.has(current)) continue;
        descendants.add(current);

        (children[current] ?? []).forEach((childIndex) => {
            if (!descendants.has(childIndex)) {
                stack.push(childIndex);
            }
        });
    }

    return descendants;
}

function cloneLevels(levels: LevelsByIndex, size: number): LevelsByIndex {
    const copy = new Array(Math.max(levels.length, size)).fill(0);
    for (let i = 0; i < levels.length; i += 1) {
        copy[i] = levels[i] ?? 0;
    }
    return copy;
}

function stableTierHoldFloor(
    tier: number,
    maxLevel: Node["maxLevel"],
): number {
    if (tier <= 0) return 0;
    if (tier === 1) return Math.min(1, maxLevel);
    return tierUpper(tier - 1, maxLevel);
}

function targetMeetsStableTierFloor(
    level: number,
    tier: number,
    maxLevel: Node["maxLevel"],
): boolean {
    if (tier <= 0) return true;
    if (level <= 0) return false;
    if (tier === 1) return true;
    if (maxLevel <= 1) return tier === 1;
    return level >= tierUpper(tier - 1, maxLevel);
}

function levelMeetsRequiredTier(
    level: number,
    tier: number,
    maxLevel: Node["maxLevel"],
): boolean {
    return level >= tierUpper(tier, maxLevel);
}

function currentStableTierForNode(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: number;
    ancestors: Set<number>;
}): number {
    const { nodes, levels, index, ancestors } = params;
    const node = nodes[index];
    if (!node) return 0;

    const targetLevel = levels[index] ?? 0;
    let currentStableTier = 0;

    for (let candidateTier = 1; candidateTier <= MAX_TIERS; candidateTier += 1) {
        if (!targetMeetsStableTierFloor(targetLevel, candidateTier, node.maxLevel)) {
            continue;
        }

        let satisfiesCandidateTier = true;

        for (const ancestorIndex of ancestors) {
            const ancestorNode = nodes[ancestorIndex];
            if (!ancestorNode) continue;

            if (
                !levelMeetsRequiredTier(
                    levels[ancestorIndex] ?? 0,
                    candidateTier,
                    ancestorNode.maxLevel,
                )
            ) {
                satisfiesCandidateTier = false;
                break;
            }
        }

        if (!satisfiesCandidateTier) continue;

        if (satisfiesCandidateTier) {
            currentStableTier = candidateTier;
        }
    }

    return currentStableTier;
}

export function unlockedTierForNode(
    nodes: Node[],
    levels: LevelsByIndex,
    index: NodeIndex,
): number {
    const node = nodes[index];
    if (!node) return 0;
    const parents = parentIndices(node);
    if (parents.length === 0) return Infinity;

    const parentTiers = parents.map((parentIndex) => {
        const parent = nodes[parentIndex];
        const level = levels[parentIndex] ?? 0;
        return parent ? tierIndex(level, parent.maxLevel) : 0;
    });

    return Math.min(...parentTiers);
}

export function applyLevelChange(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    nodeLevelBehavior?: number;
}): { levels: LevelsByIndex; deltas: LevelDelta[] } {
    const { nodes, levels, index, targetLevel, nodeLevelBehavior } = params;
    const node = nodes[index];
    if (!node) return { levels: cloneLevels(levels, nodes.length), deltas: [] };

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const startingLevel = levels[index] ?? 0;
    const clampedTarget = clamp(targetLevel, 0, node.maxLevel);
    if (clampedTarget === startingLevel) {
        return { levels, deltas: [] };
    }

    const current = cloneLevels(levels, nodes.length);
    const next = cloneLevels(levels, nodes.length);
    next[index] = clampedTarget;

    const isSyncNodeLevelBehavior =
        (nodeLevelBehavior ?? SYNC_NODE_LEVEL_BEHAVIOR) ===
        SYNC_NODE_LEVEL_BEHAVIOR;

    if (!isSyncNodeLevelBehavior) {
        const deltas: LevelDelta[] = [{ index, delta: clampedTarget - startingLevel }];
        return { levels: next, deltas };
    }

    const ancestors = collectAncestors(nodes, index);
    const descendants = collectDescendants(nodes, index);

    const currentStableTier = currentStableTierForNode({
        nodes,
        levels: current,
        index,
        ancestors,
    });

    let nextStableTier = currentStableTier;
    if (clampedTarget > startingLevel) {
        nextStableTier = Math.max(
            currentStableTier,
            tierIndex(clampedTarget, node.maxLevel),
        );
    } else {
        while (
            nextStableTier > 0 &&
            clampedTarget < stableTierHoldFloor(nextStableTier, node.maxLevel)
        ) {
            nextStableTier -= 1;
        }
        // A decrement should never resolve to a propagation tier below the
        // target's own current tier; otherwise ancestor clamping can collapse
        // from same-tier decrements (e.g. 100 -> 99) when descendants are low.
        nextStableTier = Math.max(
            nextStableTier,
            tierIndex(clampedTarget, node.maxLevel),
        );
    }

    const isIncrement = clampedTarget > startingLevel;
    const propagationStableTier =
        !isIncrement && clampedTarget === 0
            ? Math.max(nextStableTier, 1)
            : nextStableTier;
    const descendantTier = Math.max(propagationStableTier - 1, 0);

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        if (nodeIndex === index) continue;

        const reactiveNode = nodes[nodeIndex];
        if (!reactiveNode) continue;

        let requiredTier: number | null = null;
        if (ancestors.has(nodeIndex)) {
            requiredTier = propagationStableTier;
        } else if (!isIncrement && descendants.has(nodeIndex)) {
            requiredTier = descendantTier;
        }

        if (requiredTier === null) continue;

        const requiredLevel = tierUpper(requiredTier, reactiveNode.maxLevel);
        const currentLevel = current[nodeIndex] ?? 0;

        next[nodeIndex] = isIncrement
            ? Math.max(currentLevel, requiredLevel)
            : Math.min(currentLevel, requiredLevel);
    }

    const deltas: LevelDelta[] = [];
    for (let i = 0; i < next.length; i += 1) {
        const before = current[i] ?? 0;
        const after = next[i] ?? 0;
        if (before === after) continue;
        deltas.push({ index: i, delta: after - before });
    }

    return { levels: next, deltas };
}
