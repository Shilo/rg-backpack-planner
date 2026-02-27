import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";

export type LevelDelta = { index: NodeIndex; delta: number };

const MAX_TIERS = 5;

export function tierSize(maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1) return 0;
    return maxLevel / MAX_TIERS;
}

export function tierIndex(level: number, maxLevel: Node["maxLevel"]): number {
    if (maxLevel <= 1 || level <= 0) return 0;
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
    if (size === 0) return 0;
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

    const next = levels.slice();
    const deltas: LevelDelta[] = [];
    const childrenMap = buildChildrenMap(nodes);

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const setLevel = (i: number, newLevel: number) => {
        const prev = next[i] ?? 0;
        const level = clamp(newLevel, 0, nodes[i].maxLevel);
        if (level === prev) return false;
        next[i] = level;
        deltas.push({ index: i, delta: level - prev });
        return true;
    };

    const ensureAtLeast = (i: number, minLevel: number) => {
        const prev = next[i] ?? 0;
        if (prev >= minLevel) return;
        const oldTier = tierIndex(prev, nodes[i].maxLevel);
        const newLevel = clamp(minLevel, 0, nodes[i].maxLevel);
        setLevel(i, newLevel);
        const newTier = tierIndex(newLevel, nodes[i].maxLevel);
        if (newTier > oldTier) {
            processIncrease(i, oldTier, newTier);
        }
    };

    const processIncrease = (i: number, oldTier: number, newTier: number) => {
        for (let step = oldTier + 1; step <= newTier; step += 1) {
            const prevTier = step - 1;
            const parents = parentIndices(nodes[i]);
            const children = childrenMap.get(i) ?? [];
            const prevTierCapCurrent = tierUpper(prevTier, nodes[i].maxLevel);

            parents.forEach((pi) => {
                ensureAtLeast(pi, prevTierCapCurrent);
            });

            children.forEach((ci) => {
                const childCap = tierUpper(prevTier, nodes[ci].maxLevel);
                ensureAtLeast(ci, childCap);
            });

            // Raise all nodes (even if visually locked) to the previous tier cap
            nodes.forEach((n, idx) => {
                const cap = tierUpper(prevTier, n.maxLevel);
                ensureAtLeast(idx, cap);
            });
        }
    };

    const clampDescendants = (i: number) => {
        const children = childrenMap.get(i) ?? [];
        children.forEach((ci) => {
            const parents = parentIndices(nodes[ci]);
            const parentTiers = parents.map((pi) =>
                tierIndex(next[pi] ?? 0, nodes[pi].maxLevel),
            );
            const minParentTier = Math.min(...parentTiers);
            const allowedTier = Math.max(0, minParentTier - 1);
            const allowedLevel = tierUpper(allowedTier, nodes[ci].maxLevel);
            const prev = next[ci] ?? 0;
            if (prev > allowedLevel) {
                setLevel(ci, allowedLevel);
                clampDescendants(ci);
            } else {
                clampDescendants(ci);
            }
        });
    };

    const currentLevel = next[index] ?? 0;
    const clampedTarget = clamp(params.targetLevel, 0, node.maxLevel);
    if (clampedTarget === currentLevel) {
        return { levels: next, deltas };
    }

    const oldTier = tierIndex(currentLevel, node.maxLevel);
    const newTier = tierIndex(clampedTarget, node.maxLevel);

    setLevel(index, clampedTarget);

    if (newTier > oldTier) {
        processIncrease(index, oldTier, newTier);
    } else if (newTier < oldTier) {
        clampDescendants(index);
    }

    return { levels: next, deltas };
}
