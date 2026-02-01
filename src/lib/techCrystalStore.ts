import { derived, writable } from "svelte/store";
import type { TabConfig, LevelsByIndex } from "../types/tree";
import { buildPresetsStore } from "./buildPresetsStore";
import { decodeBuildData } from "./buildData/encoder";

export const techCrystalsOwned = writable(0);
export const techCrystalsSpentByTree = writable<number[]>([0, 0, 0]);

export const techCrystalsSpent = derived(techCrystalsSpentByTree, ($trees) =>
    $trees.reduce((sum, value) => sum + value, 0),
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

/**
 * Cached derived store that reads tech crystals from the active preset's buildCode.
 * Only recalculates when the active preset or its buildCode changes.
 * Used for displaying values in preview/disabled mode.
 */
export const techCrystalsFromActivePreset = derived(
    buildPresetsStore,
    ($presets) => {
        const activePreset = $presets.presets.find(
            (p) => p.id === $presets.active,
        );
        if (!activePreset) {
            return { owned: 0, spent: 0 };
        }

        const buildData = decodeBuildData(activePreset.buildCode);
        if (!buildData) {
            return { owned: 0, spent: 0 };
        }

        const owned = buildData.owned ?? 0;
        const spent = buildData.trees.reduce(
            (total, treeLevels) =>
                total +
                treeLevels.reduce((sum, level) => sum + (level ?? 0), 0),
            0,
        );

        return { owned, spent };
    },
);

export function initTechCrystalTrees(tabs: TabConfig[]) {
    techCrystalsSpentByTree.set(tabs.map(() => 0));
}

/**
 * Sets tech crystals owned. Persistence is handled by build presets store in personal mode.
 */
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

/**
 * Recalculates tech crystals spent for each tree based on current tree levels.
 * This is used when loading from persistent storage or build URL, where
 * levels are set directly without going through the normal level change callbacks.
 * @param levels Array of level arrays, one per tree
 */
export function recalculateTechCrystalsSpent(levels: LevelsByIndex[]): void {
    const spent = levels.map((treeLevels) =>
        treeLevels.reduce((sum, level) => sum + (level ?? 0), 0),
    );
    techCrystalsSpentByTree.set(spent);
}
