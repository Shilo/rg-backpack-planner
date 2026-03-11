import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";

export const uniqueSkillIds: SkillId[] = ["pierce_damage", "counterattack_resistance", "critical_hit"];

export const vanguardTree = createTree(
    // Yellow Branch
    [uniqueSkillIds[0], uniqueSkillIds[1]],
    // Orange Branch
    [uniqueSkillIds[0], uniqueSkillIds[2]],
    // Blue Branch
    [uniqueSkillIds[0], uniqueSkillIds[1]],
);
