import { derived, get, writable } from "svelte/store";
import type { Node, LevelsByIndex } from "../types/tree";
import { playSound } from "./soundEngine";

export const treeLevels = writable<LevelsByIndex[]>([]);
export const TREE_BRANCH_KEYS = ["yellow", "orange", "blue"] as const;
export type TreeBranchKey = (typeof TREE_BRANCH_KEYS)[number];

const TREE_BRANCH_BOUNDS: Record<TreeBranchKey, { start: number; end: number }> =
    {
        yellow: { start: 0, end: 10 },
        orange: { start: 10, end: 20 },
        blue: { start: 20, end: 30 },
    };

export const sumLevels = (levels: LevelsByIndex | null | undefined) =>
    (levels ?? []).reduce((total, value) => total + (value ?? 0), 0);

export const treeLevelsTotal = derived(treeLevels, ($trees) =>
    $trees.reduce((total, levels) => total + sumLevels(levels), 0),
);

export const treeLevelsGuardian = derived(treeLevels, ($trees) =>
    sumLevels($trees[0]),
);

export const treeLevelsVanguard = derived(treeLevels, ($trees) =>
    sumLevels($trees[1]),
);

export const treeLevelsCannon = derived(treeLevels, ($trees) =>
    sumLevels($trees[2]),
);

function initLevels(nodes: Node[]): LevelsByIndex {
    return Array(nodes.length).fill(0);
}

export function getTreeBranchBounds(
    levels: LevelsByIndex | null | undefined,
    branch: TreeBranchKey,
) {
    const { start, end } = TREE_BRANCH_BOUNDS[branch];
    const length = levels?.length ?? 0;
    return {
        start: Math.min(start, length),
        end: Math.min(end, length),
    };
}

export function sumTreeBranchLevels(
    levels: LevelsByIndex | null | undefined,
    branch: TreeBranchKey,
) {
    if (!levels?.length) return 0;
    const { start, end } = getTreeBranchBounds(levels, branch);
    return sumLevels(levels.slice(start, end));
}

export function withTreeBranchLevelsReset(
    levels: LevelsByIndex,
    branch: TreeBranchKey,
) {
    const next = [...levels];
    const { start, end } = getTreeBranchBounds(levels, branch);
    for (let index = start; index < end; index += 1) {
        next[index] = 0;
    }
    return next;
}

export function ensureTreeLevels(trees: { nodes: Node[] }[]) {
    treeLevels.update((current) => {
        if (trees.length === 0) return [];

        let changed = current.length !== trees.length;

        const next = trees.map((tree, index) => {
            const existing = current[index] ?? initLevels(tree.nodes);
            const nodes = tree.nodes;

            // Ensure levels array matches node count exactly
            if (existing.length !== nodes.length) {
                changed = true;
                const adjusted: LevelsByIndex = nodes.map(
                    (_, i) => existing[i] ?? 0,
                );
                return adjusted;
            }

            return existing;
        });

        if (!changed) return current;
        return next;
    });
}

export function setTreeLevels(index: number, levels: LevelsByIndex) {
    treeLevels.update((current) => {
        if (index < 0 || index >= current.length) return current;
        const next = current.slice();
        next[index] = levels;
        return next;
    });
}

export function resetTreeLevels(index: number, trees: { nodes: Node[] }[]) {
    if (index < 0 || index >= trees.length) return;
    const current = get(treeLevels);
    if (index >= 0 && index < current.length && sumLevels(current[index]) > 0) {
        playSound("reset-confirm");
    }
    const nextLevels = initLevels(trees[index].nodes);
    treeLevels.update((cur) => {
        if (index < 0 || index >= cur.length) return cur;
        const next = cur.slice();
        next[index] = nextLevels;
        return next;
    });
}

export function resetTreeBranchLevels(index: number, branch: TreeBranchKey) {
    const current = get(treeLevels);
    if (index >= 0 && index < current.length && sumTreeBranchLevels(current[index], branch) > 0) {
        playSound("reset-confirm");
    }
    treeLevels.update((cur) => {
        if (index < 0 || index >= cur.length) return cur;
        const levels = cur[index];
        if (!levels) return cur;
        const next = cur.slice();
        next[index] = withTreeBranchLevelsReset(levels, branch);
        return next;
    });
}

export function resetAllTreeLevels(trees: { nodes: Node[] }[]) {
    const current = get(treeLevels);
    const hadLevels = current.some((levels) => sumLevels(levels) > 0);
    if (hadLevels) {
        playSound("reset-confirm");
    }
    treeLevels.set(trees.map((tree) => initLevels(tree.nodes)));
}
