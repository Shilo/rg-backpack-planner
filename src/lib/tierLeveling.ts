import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";

export type LevelDelta = { index: NodeIndex; delta: number };

type TraversalMeta = {
    componentIndices: number[];
    ancestorFlags: boolean[];
};

const MAX_TIERS = 5;
const traversalMetaCache = new Map<string, TraversalMeta[]>();
const BRANCH_SIZE = 10;
const KNOWN_BRANCH_COMPONENT_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const KNOWN_BRANCH_ANCESTOR_FLAGS = [
    [false, false, false, false, false, false, false, false, false, false],
    [true, false, false, false, false, false, false, false, false, false],
    [true, false, false, false, false, false, false, false, false, false],
    [true, true, false, false, false, false, false, false, false, false],
    [true, true, false, false, false, false, false, false, false, false],
    [true, false, true, false, false, false, false, false, false, false],
    [true, false, true, false, false, false, false, false, false, false],
    [true, true, false, true, true, false, false, false, false, false],
    [true, false, true, false, false, true, true, false, false, false],
    [true, true, true, true, true, true, true, true, true, false],
];
const TOTAL_TREE_NODES = 30;

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
    return Array.isArray(node.parent) ? [...node.parent] : [node.parent];
}

function buildChildrenList(nodes: Node[]): number[][] {
    const children = nodes.map(() => [] as number[]);
    nodes.forEach((node, idx) => {
        parentIndices(node).forEach((parentIndex) => {
            if (children[parentIndex]) {
                children[parentIndex].push(idx);
            }
        });
    });
    return children;
}

function buildComponentIndices(nodes: Node[], start: number): number[] {
    const children = buildChildrenList(nodes);
    const visited = new Array(nodes.length).fill(false);
    const stack = [start];
    const component: number[] = [];

    while (stack.length) {
        const current = stack.pop()!;
        if (visited[current]) continue;
        visited[current] = true;
        component.push(current);

        const currentNode = nodes[current];
        if (!currentNode) continue;

        const parents = parentIndices(currentNode);
        parents.forEach((p) => {
            if (!visited[p]) stack.push(p);
        });

        const childIndices = children[current] ?? [];
        childIndices.forEach((childIndex) => {
            if (!visited[childIndex]) stack.push(childIndex);
        });
    }

    return component;
}

function buildAncestorFlags(nodes: Node[], start: number): boolean[] {
    const visited = new Array(nodes.length).fill(false);
    const startNode = nodes[start];
    if (!startNode) return visited;

    const stack = parentIndices(startNode);
    while (stack.length) {
        const current = stack.pop()!;
        if (visited[current]) continue;
        visited[current] = true;

        const currentNode = nodes[current];
        if (!currentNode) continue;

        parentIndices(currentNode).forEach((parentIndex) => {
            if (!visited[parentIndex]) {
                stack.push(parentIndex);
            }
        });
    }

    return visited;
}

function knownTraversalMeta(nodes: Node[], index: number): TraversalMeta | null {
    if (nodes.length !== BRANCH_SIZE && nodes.length !== TOTAL_TREE_NODES) {
        return null;
    }

    const branchStart =
        nodes.length === BRANCH_SIZE
            ? 0
            : Math.floor(index / BRANCH_SIZE) * BRANCH_SIZE;
    if (branchStart < 0 || branchStart + BRANCH_SIZE > nodes.length) {
        return null;
    }

    const localIndex = index - branchStart;
    if (localIndex < 0 || localIndex >= BRANCH_SIZE) {
        return null;
    }

    if (branchStart === 0 && nodes.length === BRANCH_SIZE) {
        return {
            componentIndices: KNOWN_BRANCH_COMPONENT_INDICES,
            ancestorFlags: KNOWN_BRANCH_ANCESTOR_FLAGS[localIndex],
        };
    }

    const componentIndices = KNOWN_BRANCH_COMPONENT_INDICES.map(
        (componentIndex) => componentIndex + branchStart,
    );

    const ancestorFlags = new Array(nodes.length).fill(false);
    const localFlags = KNOWN_BRANCH_ANCESTOR_FLAGS[localIndex];
    for (let i = 0; i < localFlags.length; i += 1) {
        if (localFlags[i]) {
            ancestorFlags[branchStart + i] = true;
        }
    }

    return { componentIndices, ancestorFlags };
}

function traversalSignature(nodes: Node[]): string {
    return nodes
        .map((node) => {
            const parents = parentIndices(node);
            return parents.length > 0 ? parents.join(",") : "_";
        })
        .join("|");
}

function getTraversalMeta(nodes: Node[], index: number): TraversalMeta {
    const knownMeta = knownTraversalMeta(nodes, index);
    if (knownMeta) return knownMeta;

    const signature = traversalSignature(nodes);
    let cached = traversalMetaCache.get(signature);
    if (!cached) {
        cached = nodes.map((_, nodeIndex) => ({
            componentIndices: buildComponentIndices(nodes, nodeIndex),
            ancestorFlags: buildAncestorFlags(nodes, nodeIndex),
        }));
        traversalMetaCache.set(signature, cached);
    }

    const entry = cached[index];
    if (entry) return entry;

    return {
        componentIndices: [index],
        ancestorFlags: new Array(nodes.length).fill(false),
    };
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
    componentIndices: number[];
    ancestorFlags: boolean[];
}): number {
    const { nodes, levels, index, componentIndices, ancestorFlags } = params;
    const node = nodes[index];
    if (!node) return 0;

    const targetLevel = levels[index] ?? 0;
    let currentStableTier = 0;

    for (let candidateTier = 1; candidateTier <= MAX_TIERS; candidateTier += 1) {
        if (!targetMeetsStableTierFloor(targetLevel, candidateTier, node.maxLevel)) {
            continue;
        }

        const wrappedTier = Math.max(candidateTier - 1, 0);
        let satisfiesCandidateTier = true;

        for (const componentIndex of componentIndices) {
            if (componentIndex === index) continue;

            const componentNode = nodes[componentIndex];
            if (!componentNode) continue;

            const requiredTier = ancestorFlags[componentIndex]
                ? candidateTier
                : wrappedTier;
            if (
                !levelMeetsRequiredTier(
                    levels[componentIndex] ?? 0,
                    requiredTier,
                    componentNode.maxLevel,
                )
            ) {
                satisfiesCandidateTier = false;
                break;
            }
        }

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
    if (!node) return { levels: cloneLevels(levels, nodes.length), deltas: [] };

    const current = cloneLevels(levels, nodes.length);
    const next = cloneLevels(levels, nodes.length);

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const startingLevel = current[index] ?? 0;
    const clampedTarget = clamp(targetLevel, 0, node.maxLevel);
    if (clampedTarget === startingLevel) {
        return { levels: next, deltas: [] };
    }

    const { componentIndices, ancestorFlags } = getTraversalMeta(nodes, index);
    const currentStableTier = currentStableTierForNode({
        nodes,
        levels: current,
        index,
        componentIndices,
        ancestorFlags,
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
    }

    next[index] = clampedTarget;

    const wrappedTier = Math.max(nextStableTier - 1, 0);
    const isIncrement = clampedTarget > startingLevel;

    for (const componentIndex of componentIndices) {
        if (componentIndex === index) continue;

        const componentNode = nodes[componentIndex];
        if (!componentNode) continue;

        const requiredTier = ancestorFlags[componentIndex]
            ? nextStableTier
            : wrappedTier;
        const requiredLevel = tierUpper(requiredTier, componentNode.maxLevel);
        const currentLevel = current[componentIndex] ?? 0;

        next[componentIndex] = isIncrement
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
