import type { Tree, BranchNodeIds } from "../types/baseTree.types";

export const createTree = (yellowBranchNodeIds: BranchNodeIds, orangeBranchNodeIds: BranchNodeIds, blueBranchNodeIds: BranchNodeIds): Tree => [
    // Yellow Branch
    [
        // Tier 1
        {
            id: "attack_boost",
            maxLevel: 100,
            radius: 1,
            x: 0,
            y: 73,
        },
        // Tier 2
        {
            id: "hp_boost",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.5,
            x: 0,
            y: 153,
        },
        {
            id: "defense_boost",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.5,
            x: -135,
            y: 75,
        },
        // Tier 3
        {
            id: yellowBranchNodeIds[0],
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 55,
            y: 228,
        },
        {
            id: "ignore_dodge",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -53,
            y: 228,
        },
        {
            id: yellowBranchNodeIds[1],
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -175,
            y: 158,
        },
        {
            id: "dodge",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -228,
            y: 68,
        },
        // Tier 4
        {
            id: "global_def",
            parent: [yellowBranchNodeIds[0], "ignore_dodge"],
            maxLevel: 50,
            radius: 0.5,
            x: 0,
            y: 310,
        },
        {
            id: "global_hp",
            parent: [yellowBranchNodeIds[1], "dodge"],
            maxLevel: 50,
            radius: 0.5,
            x: -270,
            y: 150,
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_def", "global_hp"],
            maxLevel: 1,
            radius: 1,
            x: -190,
            y: 300,
        },
    ],
    // Orange Branch
    [
        // Tier 1
        {
            id: "defense_boost",
            maxLevel: 100,
            radius: 1,
            x: -73,
            y: -45,
        },
        // Tier 2
        {
            id: "hp_boost",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.5,
            x: -135,
            y: -80,
        },
        {
            id: "attack_boost",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.5,
            x: 0,
            y: -158,
        },
        // Tier 3
        {
            id: "dodge",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -228,
            y: -78,
        },
        {
            id: orangeBranchNodeIds[0],
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -175,
            y: -165,
        },
        {
            id: "ignore_dodge",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            x: -53,
            y: -235,
        },
        {
            id: orangeBranchNodeIds[1],
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 55,
            y: -235,
        },
        // Tier 4
        {
            id: "global_hp",
            parent: ["dodge", orangeBranchNodeIds[0]],
            maxLevel: 50,
            radius: 0.5,
            x: -270,
            y: -155,
        },
        {
            id: "global_atk",
            parent: ["ignore_dodge", orangeBranchNodeIds[1]],
            maxLevel: 50,
            radius: 0.5,
            x: 0,
            y: -315,
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_hp", "global_atk"],
            maxLevel: 1,
            radius: 1,
            x: -190,
            y: -318,
        },
    ],
    // Blue Branch
    [
        // Tier 1
        {
            id: "hp_boost",
            maxLevel: 100,
            radius: 1,
            x: 68,
            y: -45,
        },
        // Tier 2
        {
            id: "attack_boost",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.5,
            x: 133,
            y: -78,
        },
        {
            id: "defense_boost",
            parent: "hp_boost",
            maxLevel: 100,
            radius: 0.5,
            x: 133,
            y: 75,
        },
        // Tier 3
        {
            id: "dodge",
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 173,
            y: -165,
        },
        {
            id: blueBranchNodeIds[0],
            parent: "attack_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 225,
            y: -73,
        },
        {
            id: "ignore_dodge",
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 225,
            y: 68,
        },
        {
            id: blueBranchNodeIds[1],
            parent: "defense_boost",
            maxLevel: 100,
            radius: 0.75,
            x: 173,
            y: 158,
        },
        // Tier 4
        {
            id: "global_atk",
            parent: ["dodge", blueBranchNodeIds[0]],
            maxLevel: 50,
            radius: 0.5,
            x: 268,
            y: -158,
        },
        {
            id: "global_def",
            parent: ["ignore_dodge", blueBranchNodeIds[1]],
            maxLevel: 50,
            radius: 0.5,
            x: 268,
            y: 150,
        },
        // Tier 5
        {
            id: "final_damage_boost",
            parent: ["global_atk", "global_def"],
            maxLevel: 1,
            radius: 1,
            x: 368,
            y: -3,
        },
    ]
];