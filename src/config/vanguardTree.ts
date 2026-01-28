import { createTree } from "./baseTree";

export const vanguardTree = createTree(
    // Yellow Branch
    ["pierce_damage", "counterattack_resistance"],
    // Orange Branch
    ["pierce_damage", "critical_hit"],
    // Blue Branch
    ["pierce_damage", "counterattack_resistance"]
)