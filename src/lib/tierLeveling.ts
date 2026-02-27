import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";

export type LevelDelta = { index: NodeIndex; delta: number };

const MAX_TIERS = 5;
const DEBUG_TIER_LEVELING = true;
const DEBUG_TIER_LEVELING_VERSION = "neighbor-first-v3";
(globalThis as Record<string, unknown>).__TIER_LEVELING_VERSION =
    DEBUG_TIER_LEVELING_VERSION;
if (DEBUG_TIER_LEVELING) {
    console.log(
        `[tierLeveling:${DEBUG_TIER_LEVELING_VERSION}] module:init`,
    );
}

function debugTier(...args: unknown[]) {
    if (!DEBUG_TIER_LEVELING) return;
    console.log(`[tierLeveling:${DEBUG_TIER_LEVELING_VERSION}]`, ...args);
}

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

export function tierUpper(
    tier: number,
    maxLevel: Node["maxLevel"],
): number {
    if (tier <= 0) return 0;
    const size = tierSize(maxLevel);
    if (size === 0) {
        // maxLevel <= 1: treat any positive tier as fully maxed
        return maxLevel;
    }
    return Math.min(Math.ceil(size * tier), maxLevel);
}

function parentIndices(node: Node): NodeIndex[] {
    if (node.parent === undefined) return [];
    return Array.isArray(node.parent) ? node.parent : [node.parent];
}

function buildChildrenMap(nodes: Node[]): Map<NodeIndex, NodeIndex[]> {
    const map = new Map<NodeIndex, NodeIndex[]>();
    nodes.forEach((_, i) => map.set(i, []));
    nodes.forEach((node, idx) => {
        parentIndices(node).forEach((pi) => {
            const arr = map.get(pi);
            if (arr) arr.push(idx);
        });
    });
    return map;
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
    const { nodes, levels, index } = params;
    const node = nodes[index];
    if (!node) return { levels: levels.slice(), deltas: [] };

    debugTier("apply:start", {
        index,
        targetLevel: params.targetLevel,
        currentLevel: levels[index] ?? 0,
    });

    const next = levels.slice();
    const deltaByIndex = new Map<NodeIndex, number>();
    const childrenMap = buildChildrenMap(nodes);

    const clampLevel = (value: number, max: number) =>
        Math.min(Math.max(value, 0), max);

    const setLevel = (i: number, newLevel: number) => {
        const targetNode = nodes[i];
        if (!targetNode) return false;
        const prev = next[i] ?? 0;
        const level = clampLevel(newLevel, targetNode.maxLevel);
        if (level === prev) return false;
        next[i] = level;
        const delta = level - prev;
        const existingDelta = deltaByIndex.get(i) ?? 0;
        deltaByIndex.set(i, existingDelta + delta);
        debugTier("setLevel", { index: i, prev, next: level, delta });
        return true;
    };

    type CascadeDirection = "increment" | "decrement";

    const clampedTarget = clampLevel(params.targetLevel, node.maxLevel);
    const startLevel = next[index] ?? 0;
    const startTier = tierIndex(startLevel, node.maxLevel);
    const triggerTier = tierIndex(clampedTarget, node.maxLevel);

    if (clampedTarget === startLevel) {
        debugTier("apply:no-op", { index, level: startLevel });
        return { levels: next, deltas: [] };
    }

    const direction: CascadeDirection =
        clampedTarget > startLevel ? "increment" : "decrement";

    debugTier("apply:direction", {
        index,
        startLevel,
        startTier,
        clampedTarget,
        triggerTier,
        startDirection: direction,
    });

    const cascadeNode = (
        currentIndex: NodeIndex,
        targetLevel: number,
        ignoredNodes: NodeIndex[] | null = null,
    ) => {
        if (!nodes[currentIndex]) return;

        const ignored = ignoredNodes ?? [];
        if (ignored.includes(currentIndex)) return;
        ignored.push(currentIndex);

        const currentNode = nodes[currentIndex];
        const previousLevel = next[currentIndex] ?? 0;
        const previousTier = tierIndex(previousLevel, currentNode.maxLevel);
        setLevel(currentIndex, targetLevel);
        const currentLevel = next[currentIndex] ?? 0;
        const currentTier = tierIndex(currentLevel, currentNode.maxLevel);
        debugTier("cascade:visit", {
            currentIndex,
            targetLevel,
            previousLevel,
            currentLevel,
            previousTier,
            currentTier,
            direction,
            triggerTier,
            ignoredNodes: ignored.slice(),
        });

        const toRecurse: NodeIndex[] = [];

        const parents = parentIndices(currentNode);
        for (const parentIndex of parents) {
            if (!nodes[parentIndex] || ignored.includes(parentIndex)) continue;
            const parent = nodes[parentIndex];
            const parentLevel = next[parentIndex] ?? 0;
            const parentCap = tierUpper(triggerTier, parent.maxLevel);
            const desiredParentLevel = direction === "increment"
                ? Math.max(parentLevel, parentCap)
                : Math.min(parentLevel, parentCap);
            debugTier("cascade:parent", {
                from: currentIndex,
                to: parentIndex,
                direction,
                currentTier,
                triggerTier,
                parentLevel,
                parentCap,
                desiredParentLevel,
            });
            setLevel(parentIndex, desiredParentLevel);
            toRecurse.push(parentIndex);
        }

        const childTier = Math.max(0, triggerTier - 1);
        const children = childrenMap.get(currentIndex) ?? [];
        for (const childIndex of children) {
            if (!nodes[childIndex] || ignored.includes(childIndex)) continue;
            const child = nodes[childIndex];
            const childLevel = next[childIndex] ?? 0;
            const childCap = tierUpper(childTier, child.maxLevel);
            const desiredChildLevel = direction === "increment"
                ? Math.max(childLevel, childCap)
                : Math.min(childLevel, childCap);
            debugTier("cascade:child", {
                from: currentIndex,
                to: childIndex,
                direction,
                currentTier,
                triggerTier,
                childTier,
                childLevel,
                childCap,
                desiredChildLevel,
            });
            setLevel(childIndex, desiredChildLevel);
            toRecurse.push(childIndex);
        }

        for (const nextIndex of toRecurse) {
            cascadeNode(nextIndex, next[nextIndex] ?? 0, ignored);
        }
    };

    cascadeNode(index, clampedTarget, null);
    const deltas: LevelDelta[] = Array.from(deltaByIndex.entries()).map(
        ([deltaIndex, delta]) => ({
            index: deltaIndex,
            delta,
        }),
    );
    debugTier("apply:end", { index, levels: next.slice(), deltas: deltas.slice() });
    return { levels: next, deltas };
}
