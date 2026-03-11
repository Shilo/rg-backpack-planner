import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";
export const cannonSkillIds: SkillId[] = ["skill_crit_resistance", "ignore_stun", "damage_reflection_chance"];

export const cannonTree = createTree(
    // Yellow Branch
    [cannonSkillIds[0], cannonSkillIds[1]],
    // Orange Branch
    [cannonSkillIds[0], cannonSkillIds[2]],
    // Blue Branch
    [cannonSkillIds[2], cannonSkillIds[1]],
);
