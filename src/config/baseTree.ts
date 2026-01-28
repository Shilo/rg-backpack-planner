import type { Tree, BranchSkillIds } from "../types/baseTree.types";

export const createTree = (
    yellowBranchSkillIds: BranchSkillIds,
    orangeBranchSkillIds: BranchSkillIds,
    blueBranchSkillIds: BranchSkillIds,
): Tree => [
        // Yellow Branch
        // Tier 1
        // Index 0
        {
            skillId: "attack_boost",
            maxLevel: 100,
            radius: 1,
            x: 0,
            y: 73,
        },
        // Tier 2
        // Index 1
        {
            skillId: "hp_boost",
            parent: 0,
            maxLevel: 100,
            radius: 0.5,
            x: 0,
            y: 153,
        },
        // Index 2
        {
            skillId: "defense_boost",
            parent: 0,
            maxLevel: 100,
            radius: 0.5,
            x: -135,
            y: 75,
        },
        // Tier 3
        // Index 3
        {
            skillId: yellowBranchSkillIds[0],
            parent: 1,
            maxLevel: 100,
            radius: 0.75,
            x: 55,
            y: 228,
        },
        // Index 4
        {
            skillId: "ignore_dodge",
            parent: 1,
            maxLevel: 100,
            radius: 0.75,
            x: -53,
            y: 228,
        },
        // Index 5
        {
            skillId: yellowBranchSkillIds[1],
            parent: 2,
            maxLevel: 100,
            radius: 0.75,
            x: -175,
            y: 158,
        },
        // Index 6
        {
            skillId: "dodge",
            parent: 2,
            maxLevel: 100,
            radius: 0.75,
            x: -228,
            y: 68,
        },
        // Tier 4
        // Index 7
        {
            skillId: "global_def",
            parent: [3, 4],
            maxLevel: 50,
            radius: 0.5,
            x: 0,
            y: 310,
        },
        // Index 8
        {
            skillId: "global_hp",
            parent: [5, 6],
            maxLevel: 50,
            radius: 0.5,
            x: -270,
            y: 150,
        },
        // Tier 5
        // Index 9
        {
            skillId: "final_damage_boost",
            parent: [7, 8],
            maxLevel: 1,
            radius: 1,
            x: -190,
            y: 300,
        },
        // Orange Branch
        // Tier 1
        // Index 10
        {
            skillId: "defense_boost",
            maxLevel: 100,
            radius: 1,
            x: -73,
            y: -45,
        },
        // Tier 2
        // Index 11
        {
            skillId: "hp_boost",
            parent: 10,
            maxLevel: 100,
            radius: 0.5,
            x: -135,
            y: -80,
        },
        // Index 12
        {
            skillId: "attack_boost",
            parent: 10,
            maxLevel: 100,
            radius: 0.5,
            x: 0,
            y: -158,
        },
        // Tier 3
        // Index 13
        {
            skillId: "dodge",
            parent: 11,
            maxLevel: 100,
            radius: 0.75,
            x: -228,
            y: -78,
        },
        // Index 14
        {
            skillId: orangeBranchSkillIds[0],
            parent: 11,
            maxLevel: 100,
            radius: 0.75,
            x: -175,
            y: -165,
        },
        // Index 15
        {
            skillId: "ignore_dodge",
            parent: 12,
            maxLevel: 100,
            radius: 0.75,
            x: -53,
            y: -235,
        },
        // Index 16
        {
            skillId: orangeBranchSkillIds[1],
            parent: 12,
            maxLevel: 100,
            radius: 0.75,
            x: 55,
            y: -235,
        },
        // Tier 4
        // Index 17
        {
            skillId: "global_hp",
            parent: [13, 14],
            maxLevel: 50,
            radius: 0.5,
            x: -270,
            y: -155,
        },
        // Index 18
        {
            skillId: "global_atk",
            parent: [15, 16],
            maxLevel: 50,
            radius: 0.5,
            x: 0,
            y: -315,
        },
        // Tier 5
        // Index 19
        {
            skillId: "final_damage_boost",
            parent: [17, 18],
            maxLevel: 1,
            radius: 1,
            x: -190,
            y: -318,
        },
        // Blue Branch
        // Tier 1
        // Index 20
        {
            skillId: "hp_boost",
            maxLevel: 100,
            radius: 1,
            x: 68,
            y: -45,
        },
        // Tier 2
        // Index 21
        {
            skillId: "attack_boost",
            parent: 20,
            maxLevel: 100,
            radius: 0.5,
            x: 133,
            y: -78,
        },
        // Index 22
        {
            skillId: "defense_boost",
            parent: 20,
            maxLevel: 100,
            radius: 0.5,
            x: 133,
            y: 75,
        },
        // Tier 3
        // Index 23
        {
            skillId: "dodge",
            parent: 21,
            maxLevel: 100,
            radius: 0.75,
            x: 173,
            y: -165,
        },
        // Index 24
        {
            skillId: blueBranchSkillIds[0],
            parent: 21,
            maxLevel: 100,
            radius: 0.75,
            x: 225,
            y: -73,
        },
        // Index 25
        {
            skillId: "ignore_dodge",
            parent: 22,
            maxLevel: 100,
            radius: 0.75,
            x: 225,
            y: 68,
        },
        // Index 26
        {
            skillId: blueBranchSkillIds[1],
            parent: 22,
            maxLevel: 100,
            radius: 0.75,
            x: 173,
            y: 158,
        },
        // Tier 4
        // Index 27
        {
            skillId: "global_atk",
            parent: [23, 24],
            maxLevel: 50,
            radius: 0.5,
            x: 268,
            y: -158,
        },
        // Index 28
        {
            skillId: "global_def",
            parent: [25, 26],
            maxLevel: 50,
            radius: 0.5,
            x: 268,
            y: 150,
        },
        // Tier 5
        // Index 29
        {
            skillId: "final_damage_boost",
            parent: [27, 28],
            maxLevel: 1,
            radius: 1,
            x: 368,
            y: -3,
        },
    ];

/** Base tree structure used by encoder (same layout as all trees; branch IDs arbitrary). */
export const baseTree: Tree = createTree(
    ["skill_crit", "pierce_resistance"],
    ["stun", "skill_crit"],
    ["stun", "pierce_resistance"],
);