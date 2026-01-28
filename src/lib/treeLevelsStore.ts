import { derived, writable } from "svelte/store";
import type { Node } from "../types/baseTree.types";
import type { LevelsByIndex } from "./treeRuntime.types";

export const treeLevels = writable<LevelsByIndex[]>([]);

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
        const adjusted: LevelsByIndex = nodes.map((_, i) => existing[i] ?? 0);
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
  const nextLevels = initLevels(trees[index].nodes);
  treeLevels.update((current) => {
    if (index < 0 || index >= current.length) return current;
    const next = current.slice();
    next[index] = nextLevels;
    return next;
  });
}

export function resetAllTreeLevels(trees: { nodes: Node[] }[]) {
  treeLevels.set(trees.map((tree) => initLevels(tree.nodes)));
}

