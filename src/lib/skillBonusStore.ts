import { derived } from "svelte/store";
import type { SkillId } from "../types/tree";
import { SKILL_METADATA } from "../config/skillMetadata";
import { treeLevels } from "./treeLevelsStore";
import { activeTabs } from "./techCrystalStore";

/**
 * Fixed display order for skills in the Backpack Bonus section.
 * Ordered from leaf nodes (tier 5) to root nodes (tier 1).
 */
export const SKILL_DISPLAY_ORDER: readonly SkillId[] = [
    // Tier 5 - leaf
    "final_damage_boost",
    // Tier 4 - globals
    "global_atk",
    "global_def",
    "global_hp",
    // Tier 3 - class-specific + utility
    "skill_crit",
    "pierce_resistance",
    "stun",
    "pierce_damage",
    "counterattack_resistance",
    "critical_hit",
    "skill_crit_resistance",
    "ignore_stun",
    "damage_reflection_chance",
    "dodge",
    "ignore_dodge",
    // Tiers 1-2 - stat nodes
    "attack_boost",
    "hp_boost",
    "defense_boost",
];

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
