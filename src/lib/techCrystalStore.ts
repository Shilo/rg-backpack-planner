import { derived, writable } from "svelte/store";
import type { TabConfig } from "../types/tree";
import { buildPresetsStore } from "./buildPresetsStore";
import { decodeBuildData } from "./buildData/encoder";
import { getSkillLevelInfo } from "../config/skillMetadata";
import { treeLevels } from "./treeLevelsStore";

export const techCrystalsOwned = writable(0);
export const activeTabs = writable<TabConfig[]>([]);

export const techCrystalsSpentByTree = derived(
    [treeLevels, activeTabs],
    ([$treeLevels, $activeTabs]) => {
        if (!$activeTabs || !$activeTabs.length) return [0, 0, 0];
        return $treeLevels.map((levels, tabIndex) => {
            const tab = $activeTabs[tabIndex];
            if (!tab || !levels) return 0;
            return levels.reduce((sum, level, nodeIndex) => {
                const node = tab.nodes[nodeIndex];
                if (!node) return sum;
                const info = getSkillLevelInfo(node.skillId, level, node.maxLevel);
                return sum + info.totalCostSpent;
            }, 0);
        });
    }
);

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
    [buildPresetsStore, activeTabs],
    ([$presets, $activeTabs]) => {
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
            (total, levels, tabIndex) => {
                const tab = $activeTabs[tabIndex];
                if (!tab) return total;
                return total + levels.reduce((sum, level, nodeIndex) => {
                    const node = tab.nodes[nodeIndex];
                    if (!node || !level) return sum;
                    const info = getSkillLevelInfo(node.skillId, level, node.maxLevel);
                    return sum + info.totalCostSpent;
                }, 0);
            },
            0,
        );

        return { owned, spent };
    },
);

export function initTechCrystalTrees(tabs: TabConfig[]) {
    activeTabs.set(tabs);
}

/**
 * Sets tech crystals owned. Persistence is handled by build presets store in personal mode.
 */
export function setTechCrystalsOwned(value: number) {
    const nextValue = Math.max(0, Math.floor(value));
    techCrystalsOwned.set(nextValue);
}
