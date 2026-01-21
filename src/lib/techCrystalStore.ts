import { derived, writable } from "svelte/store";
import type { TabConfig } from "./Tabs.svelte";

export const techCrystalsOwned = writable(0);
export const techCrystalsSpentByTree = writable<number[]>([0, 0, 0]);

export const techCrystalsSpentTotal = derived(
  techCrystalsSpentByTree,
  ($trees) => $trees.reduce((sum, value) => sum + value, 0),
);

export const techCrystalsSpentGuardian = derived(
  techCrystalsSpentByTree,
  ($trees) => $trees[0] ?? 0,
);

export const techCrystalsSpentVanguard = derived(
  techCrystalsSpentByTree,
  ($trees) => $trees[1] ?? 0,
);

export const techCrystalsSpentCannon = derived(
  techCrystalsSpentByTree,
  ($trees) => $trees[2] ?? 0,
);

export const techCrystalsAvailable = derived(
  [techCrystalsOwned, techCrystalsSpentTotal],
  ([$owned, $spentTotal]) => $owned - $spentTotal,
);

export function initTechCrystalTrees(tabs: TabConfig[]) {
  techCrystalsSpentByTree.set(tabs.map(() => 0));
}

export function setTechCrystalsOwned(value: number) {
  const nextValue = Math.max(0, Math.floor(value));
  techCrystalsOwned.set(nextValue);
}

export function applyTechCrystalDeltaForTree(
  tabIndex: number,
  techCrystalDelta: number,
) {
  techCrystalsSpentByTree.update((current) => {
    if (tabIndex < 0 || tabIndex >= current.length) return current;

    const next = Math.max(0, (current[tabIndex] ?? 0) + techCrystalDelta);
    return current.map((value, index) =>
      index === tabIndex ? next : value,
    );
  });
}
