import { derived } from "svelte/store";
import type { SkillId } from "../types/tree";
import { SKILL_METADATA } from "../config/skillMetadata";
import { treeLevels } from "./treeLevelsStore";
import { activeTabs } from "./techCrystalStore";

/**
 * Fixed display order for skills in the Backpack Bonus section.
 * Ordered from leaf nodes (tier 5) to root nodes (tier 1).
 * Also briefly ordered by effectiveness.
 */
export const SKILL_DISPLAY_ORDER: readonly SkillId[] = [
    // Ultimate - leaf
    "final_damage_boost",
    // Global
    "global_atk",
    "global_hp",
    "global_def",
    // Class-specific + utility
    "critical_hit",
    "skill_crit",
    "pierce_damage",
    "stun",
    "dodge",
    "ignore_dodge",
    "skill_crit_resistance",
    "pierce_resistance",
    "ignore_stun",
    "damage_reflection_chance",
    "counterattack_resistance", // Potentially useless (no benefit)
    // Basic stats
    "attack_boost",
    "hp_boost",
    "defense_boost",
];

/**
 * Sorts an array of skill IDs according to SKILL_DISPLAY_ORDER.
 * Skills not present in the order list are placed at the end.
 */
export function sortByDisplayOrder(skillIds: SkillId[]): SkillId[] {
    const orderIndex = new Map(SKILL_DISPLAY_ORDER.map((id, i) => [id, i]));
    return [...skillIds].sort(
        (a, b) =>
            (orderIndex.get(a) ?? Infinity) - (orderIndex.get(b) ?? Infinity),
    );
}

/**
 * Computes aggregated skill bonuses across all trees.
 * Iterates all nodes, calls getTotalValue(level) per node,
 * and sums results by skillId.
 *
 * @returns Map of skillId to total bonus value (decimal).
 *          Only includes skills with bonus > 0.
 */
export function computeSkillBonuses(
    levels: number[][],
    tabs: { nodes: { skillId: SkillId; maxLevel: number }[] }[],
): Map<SkillId, number> {
    const bonuses = new Map<SkillId, number>();

    for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
        const tab = tabs[tabIndex];
        const treeLvls = levels[tabIndex];
        if (!tab || !treeLvls) continue;

        for (let nodeIndex = 0; nodeIndex < tab.nodes.length; nodeIndex++) {
            const node = tab.nodes[nodeIndex];
            const level = treeLvls[nodeIndex] ?? 0;
            if (!node || level <= 0) continue;

            const value = SKILL_METADATA[node.skillId].getTotalValue(level);
            if (value > 0) {
                bonuses.set(
                    node.skillId,
                    (bonuses.get(node.skillId) ?? 0) + value,
                );
            }
        }
    }

    return bonuses;
}

/**
 * Derived store: Map<SkillId, number> of aggregated bonus values.
 * Reactively updates when tree levels or active tabs change.
 */
export const skillBonuses = derived(
    [treeLevels, activeTabs],
    ([$treeLevels, $activeTabs]) => {
        if (!$activeTabs || !$activeTabs.length) return new Map<SkillId, number>();
        return computeSkillBonuses($treeLevels, $activeTabs);
    },
);
