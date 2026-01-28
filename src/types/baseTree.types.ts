export type Tree = Node[];

export type BranchSkillIds = [SkillId, SkillId];

export type Node = {
    id: SkillId;
    parent?: number | number[];
    maxLevel: NodeMaxLevel;
    radius: NodeRadius;
    x: number;
    y: number;
};

export type SkillId =
    "attack_boost"
    | "hp_boost"
    | "defense_boost"
    | "ignore_dodge"
    | "dodge"
    | "global_def"
    | "global_hp"
    | "final_damage_boost"
    | "global_atk"
    // Guardian
    | "skill_crit"
    | "pierce_resistance"
    | "stun"
    // Vanguard
    | "pierce_damage"
    | "counterattack_resistance"
    | "critical_hit"
    // Cannon
    | "skill_crit_resistance"
    | "ignore_stun"
    | "damage_reflection_chance";

export type NodeMaxLevel = 100 | 50 | 1;

export type NodeRadius = 1 | 0.75 | 0.5;


// TODO: Remove this type
export type BaseTreeNode = {
    id: string;
    x: number;
    y: number;
    maxLevel: number;
    label: string;
    radius: number;
    parentIds?: string[];
};