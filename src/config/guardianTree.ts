import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";

export const uniqueSkillIds: SkillId[] = ["skill_crit", "pierce_resistance", "stun"];

export const guardianTree = createTree(
    // Yellow Branch
    [uniqueSkillIds[0], uniqueSkillIds[1]],
    // Orange Branch
    [uniqueSkillIds[2], uniqueSkillIds[0]],
    // Blue Branch
    [uniqueSkillIds[2], uniqueSkillIds[1]],
);
