import { createTree } from "./baseTree";
import type { SkillId } from "../types/tree";
export const vanguardSkillIds: SkillId[] = ["pierce_damage", "counterattack_resistance", "critical_hit"];

export const vanguardTree = createTree(
    // Yellow Branch
    [vanguardSkillIds[0], vanguardSkillIds[1]],
    // Orange Branch
    [vanguardSkillIds[0], vanguardSkillIds[2]],
    // Blue Branch
    [vanguardSkillIds[0], vanguardSkillIds[1]],
);
