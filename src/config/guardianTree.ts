import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";
export const guardianSkillIds: SkillId[] = ["skill_crit", "pierce_resistance", "stun"];

export const guardianTree = createTree(
    // Yellow Branch
    [guardianSkillIds[0], guardianSkillIds[1]],
    // Orange Branch
    [guardianSkillIds[2], guardianSkillIds[0]],
    // Blue Branch
    [guardianSkillIds[2], guardianSkillIds[1]],
);
