/**
 * Bonus-value computation functions for skill nodes.
 * Each function accepts a level and returns the cumulative bonus at that level.
 * Level 0 always returns 0 (skill not yet purchased).
 *
 * Values sourced from SkillDetails.json in mdnpascual/rgbackpacktree.
 */

// ---------------------------------------------------------------------------
// Stat skill tier constants  (hp_boost, attack_boost, defense_boost)
// 5 tiers of 20 levels each; per-level bonus doubles each tier.
// ---------------------------------------------------------------------------

const STAT_TIER_SIZE = 20;
const STAT_TIER_BASES = [0, 100, 300, 600, 1000] as const;
const STAT_TIER_INCREMENTS = [5, 10, 15, 20, 25] as const;

// ---------------------------------------------------------------------------
// Global skill tier constants  (global_atk, global_def, global_hp)
// 5 tiers of 10 levels each; per-level bonus doubles each tier.
// ---------------------------------------------------------------------------

const GLOBAL_TIER_SIZE = 10;
const GLOBAL_TIER_BASES = [0, 2, 6, 12, 20] as const;
const GLOBAL_TIER_INCREMENTS = [0.2, 0.4, 0.6, 0.8, 1.0] as const;

// ---------------------------------------------------------------------------
// Per-level bonus increments for utility and class-specific skills
// ---------------------------------------------------------------------------

const DODGE_VALUE_PER_LEVEL = 0.001;
const SKILL_TYPE_VALUE_PER_LEVEL = 0.04;
const FINAL_DAMAGE_BOOST_UNLOCKED_VALUE = 0.2;

// ---------------------------------------------------------------------------
// Exported value functions
// ---------------------------------------------------------------------------

/**
 * Cumulative bonus for hp_boost, attack_boost, defense_boost.
 * Tier boundaries: 1–20, 21–40, 41–60, 61–80, 81–100.
 */
export function statTotalValue(level: number): number {
    if (level <= 0) return 0;
    const tier = Math.min(
        Math.floor((level - 1) / STAT_TIER_SIZE),
        STAT_TIER_BASES.length - 1,
    );
    return STAT_TIER_BASES[tier] + (level - tier * STAT_TIER_SIZE) * STAT_TIER_INCREMENTS[tier];
}

/**
 * Cumulative bonus for global_atk, global_def, global_hp.
 * Tier boundaries: 1–10, 11–20, 21–30, 31–40, 41–50.
 */
export function globalTotalValue(level: number): number {
    if (level <= 0) return 0;
    const tier = Math.min(
        Math.floor((level - 1) / GLOBAL_TIER_SIZE),
        GLOBAL_TIER_BASES.length - 1,
    );
    return GLOBAL_TIER_BASES[tier] + (level - tier * GLOBAL_TIER_SIZE) * GLOBAL_TIER_INCREMENTS[tier];
}

/** Cumulative bonus for dodge and ignore_dodge. */
export function dodgeTotalValue(level: number): number {
    return level * DODGE_VALUE_PER_LEVEL;
}

/**
 * Cumulative bonus for stun, pierce_resistance, skill_crit, pierce_damage,
 * counterattack_resistance, critical_hit, damage_reflection_chance,
 * ignore_stun, skill_crit_resistance.
 */
export function skillTypeTotalValue(level: number): number {
    return level * SKILL_TYPE_VALUE_PER_LEVEL;
}

/** Bonus for final_damage_boost (maxLevel 1, one-time unlock). */
export function finalDamageTotalValue(level: number): number {
    return level > 0 ? FINAL_DAMAGE_BOOST_UNLOCKED_VALUE : 0;
}
