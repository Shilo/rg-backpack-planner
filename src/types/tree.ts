export type Tree = Node[];

export type BranchSkillIds = [SkillId, SkillId];

export type Node = {
    skillId: SkillId;
    parent?: number | number[];
    maxLevel: 100 | 50 | 1;
    radius: 1.2 | 1 | 0.8;
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

// Runtime types (index-based)
export type NodeIndex = number;

export type LevelsByIndex = number[];

export type TreeLevels = LevelsByIndex[];

export type Link = {
    from?: NodeIndex;
    to: NodeIndex;
};

// UI Types
export type TabConfig = {
    id: string;
    label: string;
    nodes: Node[];
};