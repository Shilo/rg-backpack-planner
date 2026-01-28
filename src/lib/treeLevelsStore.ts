import { derived, writable } from "svelte/store";
import type { Tree } from "../types/baseTree.types";

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

function initLevels(tree: Tree): LevelsById {
    const entries: [string, number][] = [];
    for (const branch of tree) {
        for (const node of branch) {
            entries.push([node.id, 0]);
        }
    }
    return Object.fromEntries(entries);
}

export function ensureTreeLevels(trees: { tree: Tree }[]) {
    treeLevels.update((current) => {
        if (trees.length === 0) return [];

        let changed = current.length !== trees.length;
        const seeded = trees.map(
            (treeConfig, index) => current[index] ?? initLevels(treeConfig.tree),
        );
        const next = seeded.map((levels, index) => {
            let updated = levels;
            const tree = trees[index].tree;
            for (const branch of tree) {
                for (const node of branch) {
                    if (!(node.id in updated)) {
                        if (updated === levels) {
                            updated = { ...levels };
                        }
                        updated[node.id] = 0;
                        changed = true;
                    }
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

export function resetTreeLevels(index: number, trees: { tree: Tree }[]) {
    if (index < 0 || index >= trees.length) return;
    const nextLevels = initLevels(trees[index].tree);
    treeLevels.update((current) => {
        if (index < 0 || index >= current.length) return current;
        const next = current.slice();
        next[index] = nextLevels;
        return next;
    });
}

export function resetAllTreeLevels(trees: { tree: Tree }[]) {
    treeLevels.set(trees.map((treeConfig) => initLevels(treeConfig.tree)));
}
