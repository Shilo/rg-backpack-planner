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
    const component = buildComponent(nodes, index);
    let branchRootIndex: number | null = null;
    let branchLeafIndex: number | null = null;

    component.forEach((componentIndex) => {
        const componentNode = nodes[componentIndex];
        if (!componentNode) return;

        const hasParents = parentIndices(componentNode).length > 0;
        const hasChildren = (childrenMap.get(componentIndex)?.length ?? 0) > 0;

        if (!hasParents) {
            if (branchRootIndex === null || componentIndex < branchRootIndex) {
                branchRootIndex = componentIndex;
            }
        }

        if (!hasChildren) {
            if (branchLeafIndex === null || componentIndex > branchLeafIndex) {
                branchLeafIndex = componentIndex;
            }
        }
    });

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

    const getWrappedParentStep = (nodeIndex: number) => {
        const parents = getDirectParents(nodeIndex);
        if (parents.length > 0) {
            return { neighborIndices: parents, wrapped: false };
        }
        if (branchLeafIndex === null || branchLeafIndex === nodeIndex) {
            return { neighborIndices: [], wrapped: false };
        }
        return { neighborIndices: [branchLeafIndex], wrapped: true };
    };

    const getWrappedBranchStep = (
        nodeIndex: number,
        propagationDirection: number,
    ) => {
        if (propagationDirection === 0) return null;
        return getWrappedParentStep(nodeIndex);
    };

    const getRequiredParentTier = (targetTier: number) => targetTier;

    const getRequiredChildTier = (targetTier: number) => targetTier - 1;

    const getRequiredWrappedParentTier = (
        nodeIndex: number,
        requiredTier: number,
    ) => {
        if (requiredTier <= 0) return 0;
        if (requiredTier > 1) return getRequiredChildTier(requiredTier);

        const currentLevel = next[nodeIndex] ?? 0;
        const requiredLevel = getUpperLevelOfTier(nodeIndex, requiredTier);
        return currentLevel >= requiredLevel ? requiredTier : 0;
    };

    const getRequiredNeighborTier = (targetTier: number, propagationDelta: number) => {
        if (propagationDelta === 0) return 0;
        return getRequiredParentTier(targetTier);
    };

    const getWrappedRequiredTier = (
        nodeIndex: number,
        requiredTier: number,
        wrapped: boolean,
    ) => {
        if (!wrapped) return requiredTier;
        return getRequiredWrappedParentTier(nodeIndex, requiredTier);
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

    const getPropagationDirection = (
        currentTier: number,
        targetTier: number,
        currentCompletedTier: number,
        targetCompletedTier: number,
    ) => {
        if (targetTier > currentTier) {
            return 1;
        }
        if (
            targetTier < currentTier ||
            targetCompletedTier < currentCompletedTier
        ) {
            return -1;
        }
        return 0;
    };

    const applyNodeLevel = (nodeIndex: number, requestedLevel: number) => {
        const currentNode = nodes[nodeIndex];
        if (!currentNode) return;

        const currentLevel = next[nodeIndex] ?? 0;
        const clampedTarget = clamp(requestedLevel, 0, currentNode.maxLevel);
        if (clampedTarget === currentLevel) return;

        next[nodeIndex] = clampedTarget;
        deltas.push({ index: nodeIndex, delta: clampedTarget - currentLevel });
    };

    const propagateTier = (
        nodeIndex: number,
        requiredTier: number,
        propagationDirection: number,
        visited: Set<number>,
    ) => {
        const traversalStep = getWrappedBranchStep(
            nodeIndex,
            propagationDirection,
        );
        if (traversalStep === null) return;

        const stepRequiredTier = Math.max(
            getWrappedRequiredTier(nodeIndex, requiredTier, traversalStep.wrapped),
            0,
        );

        traversalStep.neighborIndices.forEach((neighborIndex) => {
            if (visited.has(neighborIndex)) return;
            visited.add(neighborIndex);

            const neighbor = nodes[neighborIndex];
            if (!neighbor) return;

            const neighborLevel = next[neighborIndex] ?? 0;
            const requiredLevel = getUpperLevelOfTier(
                neighborIndex,
                stepRequiredTier,
            );
            if (
                !nodeSatisfiesTier(
                    neighborLevel,
                    requiredLevel,
                    propagationDirection,
                )
            ) {
                applyNodeLevel(neighborIndex, requiredLevel);
            }

            propagateTier(
                neighborIndex,
                stepRequiredTier,
                propagationDirection,
                visited,
            );
        });
    };

    const currentLevel = next[index] ?? 0;
    const initialTarget = clamp(targetLevel, 0, node.maxLevel);
    if (initialTarget === currentLevel) {
        return { levels: next, deltas };
    }

    const currentTier = tierIndex(currentLevel, node.maxLevel);
    const targetTier = tierIndex(initialTarget, node.maxLevel);
    const currentCompletedTier = getCompletedTier(currentLevel, node.maxLevel);
    const targetCompletedTier = getCompletedTier(initialTarget, node.maxLevel);
    const propagationDirection = getPropagationDirection(
        currentTier,
        targetTier,
        currentCompletedTier,
        targetCompletedTier,
    );

    applyNodeLevel(index, initialTarget);

    if (propagationDirection === 0) {
        return { levels: next, deltas };
    }

    const rawRequiredTier = getRequiredNeighborTier(
        targetTier,
        propagationDirection,
    );
    const requiredTier = Math.max(rawRequiredTier, 0);

    propagateTier(index, requiredTier, propagationDirection, new Set([index]));

    return { levels: next, deltas };
}
