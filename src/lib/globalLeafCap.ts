import type { LevelsByIndex } from "../types/tree";

type NodeWithParent = {
    parent?: number | number[];
};

type TreeTabWithNodes = {
    nodes: NodeWithParent[];
};

export const GLOBAL_LEVELED_LEAF_NODE_CAP = 3;

function parentIndices(node: NodeWithParent): number[] {
    const parent = node.parent;
    if (parent === undefined) return [];
    return Array.isArray(parent) ? parent : [parent];
}

export function buildLeafNodeFlags(nodes: NodeWithParent[]): boolean[] {
    if (nodes.length === 0) return [];

    const parentIndicesByNode = nodes.map((node) => parentIndices(node));
    const hasChildByIndex = nodes.map(() => false);

    parentIndicesByNode.forEach((parents) => {
        parents.forEach((parentIndex) => {
            if (parentIndex >= 0 && parentIndex < hasChildByIndex.length) {
                hasChildByIndex[parentIndex] = true;
            }
        });
    });

    return nodes.map(
        (_, index) =>
            parentIndicesByNode[index].length > 0 && !hasChildByIndex[index],
    );
}

export function countGlobalLeveledLeafNodesInTree(
    nodes: NodeWithParent[],
    levels: LevelsByIndex | null | undefined,
): number {
    const leafNodeFlags = buildLeafNodeFlags(nodes);
    return leafNodeFlags.reduce((total, isLeafNode, index) => {
        if (!isLeafNode) return total;
        return total + ((levels?.[index] ?? 0) > 0 ? 1 : 0);
    }, 0);
}

export function countGlobalLeveledLeafNodesOutsideActiveTree(
    tabs: TreeTabWithNodes[],
    treeLevels: LevelsByIndex[],
    activeIndex: number,
): number {
    return tabs.reduce((total, tab, tabIndex) => {
        if (tabIndex === activeIndex) return total;
        return (
            total +
            countGlobalLeveledLeafNodesInTree(tab.nodes, treeLevels[tabIndex])
        );
    }, 0);
}

export function isGlobalLeafNodeIncrementLocked(params: {
    isLeafNode: boolean;
    currentLevel: number;
    globalLeveledLeafNodeCount: number;
    globalLeveledLeafNodeCap?: number;
}): boolean {
    const {
        isLeafNode,
        currentLevel,
        globalLeveledLeafNodeCount,
        globalLeveledLeafNodeCap = GLOBAL_LEVELED_LEAF_NODE_CAP,
    } = params;

    if (!isLeafNode) return false;
    if (currentLevel > 0) return false;
    return globalLeveledLeafNodeCount >= globalLeveledLeafNodeCap;
}

export function shouldBlockIncrementForGlobalLeafCap(params: {
    currentGlobalLeveledLeafNodeCount: number;
    nextGlobalLeveledLeafNodeCount: number;
    globalLeveledLeafNodeCap?: number;
}): boolean {
    const {
        currentGlobalLeveledLeafNodeCount,
        nextGlobalLeveledLeafNodeCount,
        globalLeveledLeafNodeCap = GLOBAL_LEVELED_LEAF_NODE_CAP,
    } = params;

    if (nextGlobalLeveledLeafNodeCount <= globalLeveledLeafNodeCap) return false;

    return (
        nextGlobalLeveledLeafNodeCount >
        currentGlobalLeveledLeafNodeCount
    );
}
