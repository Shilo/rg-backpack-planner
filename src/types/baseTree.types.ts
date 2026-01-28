export type Tree = [Branch, Branch, Branch];

export type Branch = [Node, Node, Node, Node, Node, Node, Node, Node, Node, Node];

export type BranchNodeIds = [NodeId, NodeId];

export type Node = {
    id: NodeId;
    parent?: NodeId | NodeId[];
    maxLevel: NodeMaxLevel;
    radius: NodeRadius;
    position: NodePosition;
};

export type NodeId =
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

export type NodePosition = {
    x: number;
    y: number;
};


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