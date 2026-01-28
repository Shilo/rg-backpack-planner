import { createTree } from "./baseTree";

export const guardianTree = createTree(
    // Yellow Branch
    ["skill_crit", "pierce_resistance"],
    // Orange Branch
    ["stun", "skill_crit"],
    // Blue Branch
    ["stun", "pierce_resistance"]
)