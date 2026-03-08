import type { Component } from "svelte";
import type { SkillId } from "../types/tree";

import AttackBoost from "../assets/nodes/AttackBoost.svelte";
import CounterattackResistance from "../assets/nodes/CounterattackResistance.svelte";
import CriticalHit from "../assets/nodes/CriticalHit.svelte";
import DamageReflectionChance from "../assets/nodes/DamageReflectionChance.svelte";
import DefenseBoost from "../assets/nodes/DefenseBoost.svelte";
import Dodge from "../assets/nodes/Dodge.svelte";
import FinalDamageBoost from "../assets/nodes/FinalDamageBoost.svelte";
import GlobalAtk from "../assets/nodes/GlobalAtk.svelte";
import GlobalDef from "../assets/nodes/GlobalDef.svelte";
import GlobalHp from "../assets/nodes/GlobalHp.svelte";
import HpBoost from "../assets/nodes/HpBoost.svelte";
import IgnoreDodge from "../assets/nodes/IgnoreDodge.svelte";
import IgnoreStun from "../assets/nodes/IgnoreStun.svelte";
import PierceDamage from "../assets/nodes/PierceDamage.svelte";
import PierceResistance from "../assets/nodes/PierceResistance.svelte";
import SkillCrit from "../assets/nodes/SkillCrit.svelte";
import SkillCritResistance from "../assets/nodes/SkillCritResistance.svelte";
import Stun from "../assets/nodes/Stun.svelte";

/**
 * Map each SkillId to its node icon component (1:1 with src/assets/nodes/*.svelte).
 * Icons use fill="currentColor" so they inherit the node's --node-icon-color (border color).
 */
export const SKILL_NODE_ICONS: Record<SkillId, Component> = {
    attack_boost: AttackBoost,
    hp_boost: HpBoost,
    defense_boost: DefenseBoost,
    dodge: Dodge,
    ignore_dodge: IgnoreDodge,
    stun: Stun,
    pierce_resistance: PierceResistance,
    skill_crit: SkillCrit,
    pierce_damage: PierceDamage,
    counterattack_resistance: CounterattackResistance,
    critical_hit: CriticalHit,
    damage_reflection_chance: DamageReflectionChance,
    ignore_stun: IgnoreStun,
    skill_crit_resistance: SkillCritResistance,
    global_atk: GlobalAtk,
    global_def: GlobalDef,
    global_hp: GlobalHp,
    final_damage_boost: FinalDamageBoost,
};
