import type { SkillId } from "../types/tree";
import attack_boost from "../assets/nodes/attack_boost.svg?url";
import counterattack_resistance from "../assets/nodes/counterattack_resistance.svg?url";
import critical_hit from "../assets/nodes/critical_hit.svg?url";
import damage_reflection_chance from "../assets/nodes/damage_reflection_chance.svg?url";
import defense_boost from "../assets/nodes/defense_boost.svg?url";
import dodge from "../assets/nodes/dodge.svg?url";
import final_damage_boost from "../assets/nodes/final_damage_boost.svg?url";
import global_atk from "../assets/nodes/global_atk.svg?url";
import global_def from "../assets/nodes/global_def.svg?url";
import global_hp from "../assets/nodes/global_hp.svg?url";
import hp_boost from "../assets/nodes/hp_boost.svg?url";
import ignore_dodge from "../assets/nodes/ignore_dodge.svg?url";
import ignore_stun from "../assets/nodes/ignore_stun.svg?url";
import pierce_damage from "../assets/nodes/pierce_damage.svg?url";
import pierce_resistance from "../assets/nodes/pierce_resistance.svg?url";
import skill_crit from "../assets/nodes/skill_crit.svg?url";
import skill_crit_resistance from "../assets/nodes/skill_crit_resistance.svg?url";
import stun from "../assets/nodes/stun.svg?url";

/** Context key for passing skillId into SkillNodeIcon (used by Node.svelte). */
export const NODE_SKILL_ID_KEY = Symbol("nodeSkillId");

/** Map each SkillId to its node icon URL (1:1 with assets in src/assets/nodes/). */
export const SKILL_NODE_ICON_URLS: Record<SkillId, string> = {
    attack_boost,
    hp_boost,
    defense_boost,
    dodge,
    ignore_dodge,
    stun,
    pierce_resistance,
    skill_crit,
    pierce_damage,
    counterattack_resistance,
    critical_hit,
    damage_reflection_chance,
    ignore_stun,
    skill_crit_resistance,
    global_atk,
    global_def,
    global_hp,
    final_damage_boost,
};
