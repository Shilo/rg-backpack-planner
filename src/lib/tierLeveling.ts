import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";

export type LevelDelta = { index: NodeIndex; delta: number };

const MAX_TIERS = 5;

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
    if (size === 0) {
        // maxLevel <= 1: treat any positive tier as fully maxed
        return maxLevel;
    }
    return Math.min(Math.ceil(size * tier), maxLevel);
}

function parentIndices(node: Node): number[] {
    if (node.parent === undefined) return [];
    return Array.isArray(node.parent) ? node.parent : [node.parent];
}

function buildChildrenMap(nodes: Node[]): Map<number, number[]> {
    const map = new Map<number, number[]>();
    nodes.forEach((_, i) => map.set(i, []));
    nodes.forEach((node, idx) => {
        parentIndices(node).forEach((pi) => {
            const arr = map.get(pi);
            if (arr) arr.push(idx);
        });
    });
    return map;
}

function buildComponent(nodes: Node[], start: number): Set<number> {
    const childrenMap = buildChildrenMap(nodes);
    const visited = new Set<number>();
    const stack = [start];
    while (stack.length) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const parents = parentIndices(nodes[current]);
        parents.forEach((p) => {
            if (!visited.has(p)) stack.push(p);
        });
        const children = childrenMap.get(current) ?? [];
        children.forEach((c) => {
            if (!visited.has(c)) stack.push(c);
        });
    }
    return visited;
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
    const parentTiers = parents.map((pi) => {
        const parent = nodes[pi];
        const level = levels[pi] ?? 0;
        return parent ? tierIndex(level, parent.maxLevel) : 0;
    });
    return Math.min(...parentTiers);
}

export function applyLevelChange(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
}): { levels: LevelsByIndex; deltas: LevelDelta[] } {
    const { nodes, levels, index, targetLevel } = params;
    const node = nodes[index];
    if (!node) return { levels: levels.slice(), deltas: [] };

    const next = levels.slice();
    const deltas: LevelDelta[] = [];

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const childrenMap = buildChildrenMap(nodes);

    const getUpperLevelOfTier = (nodeIndex: number, tier: number) =>
        tierUpper(tier, nodes[nodeIndex].maxLevel);

    const getCompletedTier = (level: number, maxLevel: Node["maxLevel"]) => {
        if (level <= 0) return 0;
        if (maxLevel <= 1) return 1;
        const size = tierSize(maxLevel);
        if (size === 0) return 0;
        return Math.min(Math.floor(level / size), MAX_TIERS);
    };

    const getDirectParents = (nodeIndex: number) =>
        parentIndices(nodes[nodeIndex]);

    const getDirectChildren = (nodeIndex: number) =>
        childrenMap.get(nodeIndex) ?? [];

    const getDirectNeighbors = (tierDelta: number) => {
        if (tierDelta === 0) return null;
        if (tierDelta < 0) return getDirectChildren;
        return getDirectParents;
    };

    const getRequiredParentTier = (targetTier: number) => targetTier;

    const getRequiredChildTier = (targetCompletedTier: number) =>
        targetCompletedTier;

    const getRequiredNeighborTier = (
        targetTier: number,
        targetCompletedTier: number,
        propagationDelta: number,
    ) => {
        if (propagationDelta === 0) return 0;
        if (propagationDelta < 0) {
            return getRequiredChildTier(targetCompletedTier);
        }
        return getRequiredParentTier(targetTier);
    };

    const nodeSatisfiesTier = (
        currentLevel: number,
        requiredLevel: number,
        propagationDelta: number,
    ) => {
        if (propagationDelta === 0) return true;
        if (propagationDelta > 0) return currentLevel >= requiredLevel;
        return currentLevel <= requiredLevel;
    };

    const setNodeLevel = (nodeIndex: number, requestedLevel: number) => {
        const currentNode = nodes[nodeIndex];
        if (!currentNode) return;

        const currentLevel = next[nodeIndex] ?? 0;
        const clampedTarget = clamp(requestedLevel, 0, currentNode.maxLevel);
        if (clampedTarget === currentLevel) return;

        const currentTier = tierIndex(currentLevel, currentNode.maxLevel);
        const targetTier = tierIndex(clampedTarget, currentNode.maxLevel);
        const currentCompletedTier = getCompletedTier(
            currentLevel,
            currentNode.maxLevel,
        );
        const targetCompletedTier = getCompletedTier(
            clampedTarget,
            currentNode.maxLevel,
        );
        const tierDelta = targetTier - currentTier;
        const propagationDelta =
            tierDelta > 0
                ? 1
                : targetCompletedTier < currentCompletedTier
                  ? -1
                  : 0;

        next[nodeIndex] = clampedTarget;
        deltas.push({ index: nodeIndex, delta: clampedTarget - currentLevel });

        const neighborGetter = getDirectNeighbors(propagationDelta);
        if (neighborGetter === null) return;

        const rawRequiredTier = getRequiredNeighborTier(
            targetTier,
            targetCompletedTier,
            propagationDelta,
        );
        const requiredTier = Math.max(rawRequiredTier, 0);

        neighborGetter(nodeIndex).forEach((neighborIndex) => {
            const neighbor = nodes[neighborIndex];
            if (!neighbor) return;

            const neighborLevel = next[neighborIndex] ?? 0;
            const requiredLevel = getUpperLevelOfTier(
                neighborIndex,
                requiredTier,
            );
            if (
                nodeSatisfiesTier(
                    neighborLevel,
                    requiredLevel,
                    propagationDelta,
                )
            ) {
                return;
            }

            setNodeLevel(neighborIndex, requiredLevel);
        });
    };

    const initialTarget = clamp(targetLevel, 0, node.maxLevel);
    setNodeLevel(index, initialTarget);

    return { levels: next, deltas };
}
