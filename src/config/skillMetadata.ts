import type { SkillId } from "../types/tree";
import {
    statTotalValue,
    globalTotalValue,
    dodgeTotalValue,
    skillTypeTotalValue,
    finalDamageTotalValue,
} from "./skillValueFns";

export type SkillMetadata = {
    /** Cost to upgrade from level i to i+1; costs[0] = cost to reach level 1. */
    costs: readonly number[];
    /** Cumulative bonus value at the given level (level 0 returns 0). */
    getTotalValue: (level: number) => number;
};

export type SkillLevelInfo = {
    /** Sum of all upgrade costs from level 0 to the current level. */
    totalCostSpent: number;
    /** Cost to advance from the current level to the next; null if already at max. */
    costToNextLevel: number | null;
    /** Cumulative bonus value at the current level. */
    totalValue: number;
    /** Cumulative bonus value after leveling up once; null if already at max. */
    nextTotalValue: number | null;
};

// ---------------------------------------------------------------------------
// Shared cost arrays (indexed 0..maxLevel-1; entry i = cost to go level i→i+1)
// Values sourced from SkillDetails.json in mdnpascual/rgbackpacktree.
// ---------------------------------------------------------------------------

/** Cost curve for hp_boost, attack_boost, defense_boost (maxLevel 100). */
const COSTS_100_STAT: readonly number[] = [
    5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25,
    26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 44, 46, 48, 50,
    52, 54, 56, 58, 60, 63, 66, 69, 72, 75, 78, 81, 85, 89, 93, 97, 101, 106, 111, 116,
    121, 127, 133, 139, 145, 152, 159, 166, 174, 182, 191, 200, 210, 220, 231, 242, 254, 266, 279, 292,
    306, 321, 337, 353, 370, 388, 407, 427, 448, 470, 493, 517, 542, 569, 597, 626, 657, 689, 723, 759,
];

/**
 * Cost curve for all class-specific and utility skills with maxLevel 100
 * (dodge, ignore_dodge, stun, pierce_resistance, skill_crit, pierce_damage,
 * counterattack_resistance, critical_hit, damage_reflection_chance,
 * ignore_stun, skill_crit_resistance).
 */
const COSTS_100_SKILL: readonly number[] = [
    20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 75, 78, 81, 85, 89,
    93, 97, 101, 106, 111, 116, 121, 127, 133, 139, 145, 152, 159, 166, 174, 182, 191, 200, 210, 220,
    231, 242, 254, 266, 279, 292, 306, 321, 337, 353, 370, 388, 407, 427, 448, 470, 493, 517, 542, 569,
    597, 626, 657, 689, 723, 759, 796, 835, 876, 919, 964, 1012, 1062, 1115, 1170, 1228, 1289, 1353, 1420, 1491,
];

/** Cost curve for global_atk, global_def, global_hp (maxLevel 50). */
const COSTS_50: readonly number[] = [
    150, 163, 177, 192, 209, 227, 247, 269, 293, 319,
    347, 378, 412, 449, 489, 533, 580, 632, 688, 749,
    816, 889, 969, 1056, 1151, 1254, 1366, 1488, 1621, 1766,
    1924, 2097, 2285, 2490, 2714, 2958, 3224, 3514, 3830, 4174,
    4549, 4958, 5404, 5890, 6420, 6997, 7626, 8312, 9060, 9875,
];

/** Cost for final_damage_boost (maxLevel 1, one-time unlock). */
const COSTS_FINAL: readonly number[] = [1000];

// ---------------------------------------------------------------------------
// Skill metadata registry
// ---------------------------------------------------------------------------

export const SKILL_METADATA: Record<SkillId, SkillMetadata> = {
    // --- Shared stat nodes (identical cost curve, tiered value) ---
    hp_boost: {
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },
    attack_boost: {
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },
    defense_boost: {
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },

    // --- Utility skill nodes (dodge-type) ---
    dodge: {
        costs: COSTS_100_SKILL,
        getTotalValue: dodgeTotalValue,
    },
    ignore_dodge: {
        costs: COSTS_100_SKILL,
        getTotalValue: dodgeTotalValue,
    },

    // --- Class-specific skill nodes ---
    stun: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    pierce_resistance: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    skill_crit: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    pierce_damage: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    counterattack_resistance: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    critical_hit: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    damage_reflection_chance: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    ignore_stun: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },
    skill_crit_resistance: {
        costs: COSTS_100_SKILL,
        getTotalValue: skillTypeTotalValue,
    },

    // --- Global bonus nodes (tiered value, maxLevel 50) ---
    global_atk: {
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },
    global_def: {
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },
    global_hp: {
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },

    // --- Ultimate node (maxLevel 1, one-time unlock) ---
    final_damage_boost: {
        costs: COSTS_FINAL,
        getTotalValue: finalDamageTotalValue,
    },
};

// ---------------------------------------------------------------------------
// Localization key helpers
// ---------------------------------------------------------------------------

export const SKILL_DESC_SUFFIX = "_DESC" as const;

/** Returns the localization key for a skill's description. */
export function getSkillDescKey(skillId: SkillId): string {
    return skillId + SKILL_DESC_SUFFIX;
}

// ---------------------------------------------------------------------------
// Public lookup utility
// ---------------------------------------------------------------------------

/**
 * Returns cost and value information for a skill at its current level.
 *
 * @param skillId      The skill to look up.
 * @param currentLevel The node's current level (0 = not yet purchased).
 * @param maxLevel     The node's maximum level cap.
 */
export function getSkillLevelInfo(
    skillId: SkillId,
    currentLevel: number,
    maxLevel: number,
): SkillLevelInfo {
    const { costs, getTotalValue } = SKILL_METADATA[skillId];

    let totalCostSpent = 0;
    for (let i = 0; i < currentLevel && i < costs.length; i++) {
        totalCostSpent += costs[i]!;
    }

    const costToNextLevel =
        currentLevel < maxLevel && currentLevel < costs.length
            ? (costs[currentLevel] ?? null)
            : null;

    const totalValue = getTotalValue(currentLevel);
    const nextTotalValue =
        currentLevel < maxLevel ? getTotalValue(currentLevel + 1) : null;

    return { totalCostSpent, costToNextLevel, totalValue, nextTotalValue };
}
