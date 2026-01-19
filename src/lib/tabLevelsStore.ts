import { writable } from "svelte/store";
import type { TreeNode } from "./Tree.svelte";

export type LevelsById = Record<string, number>;

export const tabLevels = writable<LevelsById[]>([]);

function initLevels(nodes: TreeNode[]): LevelsById {
  return Object.fromEntries(nodes.map((node) => [node.id, 0]));
}

export function ensureTabLevels(tabs: { nodes: TreeNode[] }[]) {
  tabLevels.update((current) => {
    if (tabs.length === 0) return [];

    let changed = current.length !== tabs.length;
    const seeded = tabs.map(
      (tab, index) => current[index] ?? initLevels(tab.nodes),
    );
    const next = seeded.map((levels, index) => {
      let updated = levels;
      for (const node of tabs[index].nodes) {
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

export function setTabLevels(index: number, levels: LevelsById) {
  tabLevels.update((current) => {
    if (index < 0 || index >= current.length) return current;
    const next = current.slice();
    next[index] = levels;
    return next;
  });
}

export function resetTabLevels(index: number, tabs: { nodes: TreeNode[] }[]) {
  if (index < 0 || index >= tabs.length) return;
  const nextLevels = initLevels(tabs[index].nodes);
  tabLevels.update((current) => {
    if (index < 0 || index >= current.length) return current;
    const next = current.slice();
    next[index] = nextLevels;
    return next;
  });
}

export function resetAllTabLevels(tabs: { nodes: TreeNode[] }[]) {
  tabLevels.set(tabs.map((tab) => initLevels(tab.nodes)));
}
