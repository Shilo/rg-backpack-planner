import type { SkillId } from "../types/tree";

export type SkillMetadata = {
    name: string;
    description: string;
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

// ---------------------------------------------------------------------------
// Value computation helpers
// ---------------------------------------------------------------------------

/**
 * Cumulative bonus value for hp_boost / attack_boost / defense_boost.
 * 5 tiers of 20 levels each; bonus per level: +5, +10, +15, +20, +25.
 */
function statTotalValue(level: number): number {
    if (level <= 0) return 0;
    const tier = Math.min(Math.floor((level - 1) / 20), 4);
    const tierBases = [0, 100, 300, 600, 1000] as const;
    const tierIncrements = [5, 10, 15, 20, 25] as const;
    return tierBases[tier] + (level - tier * 20) * tierIncrements[tier];
}

/**
 * Cumulative bonus value for global_atk / global_def / global_hp.
 * 5 tiers of 10 levels each; bonus per level: +0.2, +0.4, +0.6, +0.8, +1.0.
 */
function globalTotalValue(level: number): number {
    if (level <= 0) return 0;
    const tier = Math.min(Math.floor((level - 1) / 10), 4);
    const tierBases = [0, 2, 6, 12, 20] as const;
    const tierIncrements = [0.2, 0.4, 0.6, 0.8, 1.0] as const;
    return tierBases[tier] + (level - tier * 10) * tierIncrements[tier];
}

// ---------------------------------------------------------------------------
// Skill metadata registry
// ---------------------------------------------------------------------------

export const SKILL_METADATA: Record<SkillId, SkillMetadata> = {
    // --- Shared stat nodes (identical cost curve, tiered value) ---
    hp_boost: {
        name: "HP Boost",
        description: "",
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },
    attack_boost: {
        name: "Attack Boost",
        description: "",
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },
    defense_boost: {
        name: "Defense Boost",
        description: "",
        costs: COSTS_100_STAT,
        getTotalValue: statTotalValue,
    },

    // --- Utility skill nodes (dodge-type, value = level × 0.001) ---
    dodge: {
        name: "Dodge",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.001,
    },
    ignore_dodge: {
        name: "Ignore Dodge",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.001,
    },

    // --- Class-specific skill nodes (value = level × 0.04) ---
    stun: {
        name: "Stun",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    pierce_resistance: {
        name: "Pierce Resistance",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    skill_crit: {
        name: "Skill Crit",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    pierce_damage: {
        name: "Pierce Damage",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    counterattack_resistance: {
        name: "Counterattack Resistance",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    critical_hit: {
        name: "Critical Hit",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    damage_reflection_chance: {
        name: "Damage Reflection Chance",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    ignore_stun: {
        name: "Ignore Stun",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },
    skill_crit_resistance: {
        name: "Skill Crit Resistance",
        description: "",
        costs: COSTS_100_SKILL,
        getTotalValue: (level) => level * 0.04,
    },

    // --- Global bonus nodes (tiered value, maxLevel 50) ---
    global_atk: {
        name: "Global ATK",
        description: "",
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },
    global_def: {
        name: "Global DEF",
        description: "",
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },
    global_hp: {
        name: "Global HP",
        description: "",
        costs: COSTS_50,
        getTotalValue: globalTotalValue,
    },

    // --- Ultimate node (maxLevel 1, one-time unlock) ---
    final_damage_boost: {
        name: "Final Damage Boost",
        description: "",
        costs: [1000],
        getTotalValue: (level) => (level > 0 ? 0.2 : 0),
    },
};

// ---------------------------------------------------------------------------
// Public lookup utility
// ---------------------------------------------------------------------------

/**
 * Returns cost and value information for a skill at its current level.
 *
 * @param skillId    The skill to look up.
 * @param currentLevel  The node's current level (0 = not yet purchased).
 * @param maxLevel   The node's maximum level cap.
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
