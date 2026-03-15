import type { LevelsByIndex } from "../types/tree";
import { sumLevels, sumTreeBranchLevels, type TreeBranchKey } from "./treeLevelsStore";

export type ResetTreeChoiceId = "orange" | "blue" | "yellow" | "tree";

export type ResetTreeChoiceState = {
    id: ResetTreeChoiceId;
    enabled: boolean;
    branch?: TreeBranchKey;
};

export const RESET_TREE_CHOICE_ORDER: ResetTreeChoiceId[] = [
    "orange",
    "blue",
    "yellow",
    "tree",
];

export function buildResetTreeChoiceState(
    activeLevels: LevelsByIndex | null | undefined,
): {
    choices: ResetTreeChoiceState[];
    branchTotals: Record<TreeBranchKey, number>;
    totalLevels: number;
    canResetTree: boolean;
} {
    const branchTotals: Record<TreeBranchKey, number> = {
        yellow: sumTreeBranchLevels(activeLevels, "yellow"),
        orange: sumTreeBranchLevels(activeLevels, "orange"),
        blue: sumTreeBranchLevels(activeLevels, "blue"),
    };
    const totalLevels = sumLevels(activeLevels);

    return {
        choices: [
            {
                id: "orange",
                branch: "orange",
                enabled: branchTotals.orange > 0,
            },
            {
                id: "blue",
                branch: "blue",
                enabled: branchTotals.blue > 0,
            },
            {
                id: "yellow",
                branch: "yellow",
                enabled: branchTotals.yellow > 0,
            },
            {
                id: "tree",
                enabled: totalLevels > 0,
            },
        ],
        branchTotals,
        totalLevels,
        canResetTree: totalLevels > 0,
    };
}
