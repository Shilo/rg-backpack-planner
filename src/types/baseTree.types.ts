export type Tree = Node[];

export type TabConfig = {
    id: string;
    label: string;
    nodes: Node[];
};

export type BranchSkillIds = [SkillId, SkillId];

export type Node = {
    skillId: SkillId;
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

/** Synthetic root node (always at 0,0). Not a tree Node. */
export type RootNodeConfig = {
    id: "root";
    x: number;
    y: number;
    maxLevel: number;
    radius: number;
};