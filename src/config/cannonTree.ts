import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";

export const uniqueSkillIds: SkillId[] = ["skill_crit_resistance", "ignore_stun", "damage_reflection_chance"];

export const cannonTree = createTree(
    // Yellow Branch
    [uniqueSkillIds[0], uniqueSkillIds[1]],
    // Orange Branch
    [uniqueSkillIds[0], uniqueSkillIds[2]],
    // Blue Branch
    [uniqueSkillIds[2], uniqueSkillIds[1]],
);
