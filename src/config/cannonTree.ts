import { createTree } from "./baseTree";

export const cannonTree = createTree(
    // Yellow Branch
    ["skill_crit_resistance", "ignore_stun"],
    // Orange Branch
    ["skill_crit_resistance", "damage_reflection_chance"],
    // Blue Branch
    ["damage_reflection_chance", "ignore_stun"]
);