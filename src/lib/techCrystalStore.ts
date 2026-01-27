import { derived, writable, get } from "svelte/store";
import type { TabConfig } from "./Tabs.svelte";
import type { LevelsById } from "./treeLevelsStore";
import { isPreviewMode } from "./previewModeStore";
import { loadTreeProgress } from "./treeProgressStore";

export const techCrystalsOwned = writable(0);

const TECH_CRYSTALS_STORAGE_KEY = "rg-backpack-planner-tech-crystals-owned";
export const techCrystalsSpentByTree = writable<number[]>([0, 0, 0]);

export const techCrystalsSpent = derived(
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
  [techCrystalsOwned, techCrystalsSpent],
  ([$owned, $spent]) => $owned - $spent,
);

export function initTechCrystalTrees(tabs: TabConfig[]) {
  techCrystalsSpentByTree.set(tabs.map(() => 0));
}

/**
 * Gets tech crystals owned from localStorage
 * @returns The saved tech crystals owned value, or null if not found/invalid
 */
export function getTechCrystalsOwnedFromStorageNullable(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TECH_CRYSTALS_STORAGE_KEY);
    if (stored === null) return null;

    const parsed = parseInt(stored, 10);
    if (isNaN(parsed) || parsed < 0) return null;

    return parsed;
  } catch (error) {
    console.error("Failed to load tech crystals owned from localStorage:", error);
    return null;
  }
}

/**
 * Saves tech crystals owned to localStorage
 * @param value The tech crystals owned value to save
 */
export function saveTechCrystalsOwnedToStorage(value: number): void {
  if (typeof window === "undefined") return;

  try {
    const nextValue = Math.max(0, Math.floor(value));
    localStorage.setItem(TECH_CRYSTALS_STORAGE_KEY, nextValue.toString());
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded, unable to save tech crystals owned");
    } else {
      console.error("Failed to save tech crystals owned to localStorage:", error);
    }
  }
}

export function setTechCrystalsOwned(value: number) {
  const nextValue = Math.max(0, Math.floor(value));
  techCrystalsOwned.set(nextValue);

  // Auto-save to localStorage in personal mode
  if (typeof window !== "undefined" && !get(isPreviewMode)) {
    saveTechCrystalsOwnedToStorage(nextValue);
  }
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

/**
 * Recalculates tech crystals spent for each tree based on current tree levels.
 * This is used when loading from persistent storage or build URL, where
 * levels are set directly without going through the normal level change callbacks.
 * @param levels Array of level records, one per tree
 */
export function recalculateTechCrystalsSpent(levels: LevelsById[]): void {
  const spent = levels.map((treeLevels) => {
    // Sum all node levels, excluding root node
    return Object.entries(treeLevels)
      .filter(([nodeId]) => nodeId !== "root")
      .reduce((sum, [, level]) => sum + (level ?? 0), 0);
  });
  techCrystalsSpentByTree.set(spent);
}

/**
 * Calculates tech crystals spent from tree levels stored in localStorage.
 * This is a non-reactive helper function that reads directly from localStorage.
 * @returns The tech crystals spent, or 0 if data is not available
 */
export function getTechCrystalsSpentFromStorage(): number {
  const levels = loadTreeProgress();
  if (!levels) return 0;

  const spent = levels.map((treeLevels) => {
    // Sum all node levels, excluding root node
    // Missing keys are treated as 0 (compressed storage omits zeros)
    return Object.entries(treeLevels)
      .filter(([nodeId]) => nodeId !== "root")
      .reduce((sum, [, level]) => sum + (level ?? 0), 0);
  });

  return spent.reduce((sum, value) => sum + value, 0);
}

/**
 * Gets tech crystals owned from localStorage (non-reactive).
 * This is a helper function for use when the button is disabled (preview mode).
 * @returns The saved tech crystals owned value, or 0 if not found/invalid
 */
export function getTechCrystalsOwnedFromStorage(): number {
  return getTechCrystalsOwnedFromStorageNullable() ?? 0;
}

/**
 * Gets tech crystals available from localStorage (non-reactive).
 * Calculates as owned - spent, where both values come from localStorage.
 * This is a helper function for use when the button is disabled (preview mode).
 * @returns The available tech crystals, or 0 if data is not available
 */
export function getTechCrystalsAvailableFromStorage(): number {
  const owned = getTechCrystalsOwnedFromStorage();
  const spent = getTechCrystalsSpentFromStorage();
  return owned - spent;
}
