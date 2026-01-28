import type { Tree, BranchNodeIds } from "../types/baseTree.types";

export const createTree = (yellowBranchNodeIds: BranchNodeIds, orangeBranchNodeIds: BranchNodeIds, blueBranchNodeIds: BranchNodeIds): Tree => [
    // Yellow Branch
    [
        // Tier 1
        {
            id: "attack_boost",
            maxLevel: 100,
            radius: 1,
            position: { x: 0, y: 73 }, // attack
        },
        // Tier 2
        {
            id: "hp_boost",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: 0, y: 153 }, // hp_1_1
        },
        {
            id: "defense_boost",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: -135, y: 75 }, // def_1_2
        },
        // Tier 3
        {
            id: yellowBranchNodeIds[0],
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 55, y: 228 }, // skill_critical_res_1_1
        },
        {
            id: "ignore_dodge",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -53, y: 228 }, // ignore_dodge_1_1
        },
        {
            id: yellowBranchNodeIds[1],
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -175, y: 158 }, // ignore_stun_1_2
        },
        {
            id: "dodge",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -228, y: 68 }, // dodge_1_2
        },
        // Tier 4
        {
            id: "global_def",
            parent: [yellowBranchNodeIds[0], "ignore_dodge"],
            maxLevel: 50,
            radius: 0.5,
            position: { x: 0, y: 310 }, // global_def_1_1
        },
        {
            id: "global_hp",
            parent: [yellowBranchNodeIds[1], "dodge"],
            maxLevel: 50,
            radius: 0.5,
            position: { x: -270, y: 150 }, // global_hp_1_2
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_def", "global_hp"],
            maxLevel: 1,
            radius: 1,
            position: { x: -190, y: 300 }, // final_1
        },
    ],
    // Orange Branch
    [
        // Tier 1
        {
            id: "defense_boost",
            maxLevel: 100,
            radius: 1,
            position: { x: -73, y: -45 }, // defense
        },
        // Tier 2
        {
            id: "hp_boost",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: -135, y: -80 }, // hp_2_1
        },
        {
            id: "attack_boost",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: 0, y: -158 }, // attack_2_2
        },
        // Tier 3
        {
            id: "dodge",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -228, y: -78 }, // dodge_2_1
        },
        {
            id: orangeBranchNodeIds[0],
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -175, y: -165 }, // skill_crit_res_2_1
        },
        {
            id: "ignore_dodge",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: -53, y: -235 }, // ignore_dodge_2_2
        },
        {
            id: orangeBranchNodeIds[1],
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 55, y: -235 }, // damage_reflection_2_2
        },
        // Tier 4
        {
            id: "global_hp",
            parent: ["dodge", orangeBranchNodeIds[0]],
            maxLevel: 50,
            radius: 0.5,
            position: { x: -270, y: -155 }, // global_hp_2_1
        },
        {
            id: "global_atk",
            parent: ["ignore_dodge", orangeBranchNodeIds[1]],
            maxLevel: 50,
            radius: 0.5,
            position: { x: 0, y: -315 }, // global_attack_2_2
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_hp", "global_atk"],
            maxLevel: 1,
            radius: 1,
            position: { x: -190, y: -318 }, // final_2
        },
    ],
    // Blue Branch
    [
        // Tier 1
        {
            id: "hp_boost",
            maxLevel: 100,
            radius: 1,
            position: { x: 68, y: -45 }, // hp
        },
        // Tier 2
        {
            id: "attack_boost",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: 133, y: -78 }, // attack_3_1
        },
        {
            id: "defense_boost",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.5,
            position: { x: 133, y: 75 }, // def_3_2
        },
        // Tier 3
        {
            id: "dodge",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 173, y: -165 }, // dodge_3_1
        },
        {
            id: blueBranchNodeIds[0],
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 225, y: -73 }, // damage_reflection_3_1
        },
        {
            id: "ignore_dodge",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 225, y: 68 }, // ignore_dodge_3_2
        },
        {
            id: blueBranchNodeIds[1],
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            position: { x: 173, y: 158 }, // ignore_stun_3_2
        },
        // Tier 4
        {
            id: "global_atk",
            parent: ["dodge", blueBranchNodeIds[0]],
            maxLevel: 50,
            radius: 0.5,
            position: { x: 268, y: -158 }, // global_attack_3_1
        },
        {
            id: "global_def",
            parent: ["ignore_dodge", blueBranchNodeIds[1]],
            maxLevel: 50,
            radius: 0.5,
            position: { x: 268, y: 150 }, // global_def_3_2
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_atk", "global_def"],
            maxLevel: 1,
            radius: 1,
            position: { x: 368, y: -3 }, // final_3
        },
    ]
];