import { derived, writable } from "svelte/store";
import type { TreeNode } from "./Tree.svelte";

export type LevelsById = Record<string, number>;

export const treeLevels = writable<LevelsById[]>([]);

export const sumLevels = (levels: LevelsById | null | undefined) =>
    Object.values(levels ?? {}).reduce((total, value) => total + value, 0);

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

function initLevels(nodes: TreeNode[]): LevelsById {
    return Object.fromEntries(nodes.map((node) => [node.id, 0]));
}

export function ensureTreeLevels(trees: { nodes: TreeNode[] }[]) {
    treeLevels.update((current) => {
        if (trees.length === 0) return [];

        let changed = current.length !== trees.length;
        const seeded = trees.map(
            (tree, index) => current[index] ?? initLevels(tree.nodes),
        );
        const next = seeded.map((levels, index) => {
            let updated = levels;
            for (const node of trees[index].nodes) {
                if (!(node.id in updated)) {
                    if (updated === levels) {
                        updated = { ...levels };
                    }
                    updated[node.id] = 0;
                    changed = true;
                }
            }
            return updated;
        });

        if (!changed) return current;
        return next;
    });
}

export function setTreeLevels(index: number, levels: LevelsById) {
    treeLevels.update((current) => {
        if (index < 0 || index >= current.length) return current;
        const next = current.slice();
        next[index] = levels;
        return next;
    });
}

export function resetTreeLevels(index: number, trees: { nodes: TreeNode[] }[]) {
    if (index < 0 || index >= trees.length) return;
    const nextLevels = initLevels(trees[index].nodes);
    treeLevels.update((current) => {
        if (index < 0 || index >= current.length) return current;
        const next = current.slice();
        next[index] = nextLevels;
        return next;
    });
}

export function resetAllTreeLevels(trees: { nodes: TreeNode[] }[]) {
    treeLevels.set(trees.map((tree) => initLevels(tree.nodes)));
}
