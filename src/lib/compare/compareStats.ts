import type { BuildData } from "../buildData/encoder";
import type { TabConfig, SkillId } from "../../types/tree";
import {
    calculateTechCrystalsSpent,
    calculateTreeTechCrystalsSpent,
} from "../techCrystalStore";
import { computeSkillBonuses } from "../skillBonusStore";
import { sumLevels } from "../treeLevelsStore";

export interface CompareStats {
    skillBonuses: Map<SkillId, number>;
    techCrystalsSpent: number;
    techCrystalsSpentByTree: number[];
    treeLevelsTotal: number;
    treeLevelsByTree: number[];
}

export function computeCompareStats(
    buildData: BuildData,
    tabs: TabConfig[],
): CompareStats {
    const skillBonuses = computeSkillBonuses(buildData.trees, tabs);

    const techCrystalsSpentByTree = buildData.trees.map((levels, i) => {
        const tab = tabs[i];
        if (!tab) return 0;
        return calculateTreeTechCrystalsSpent(levels, tab.nodes);
    });
    const techCrystalsSpent = calculateTechCrystalsSpent(
        buildData.trees,
        tabs,
    );

    const treeLevelsByTree = buildData.trees.map((levels) => sumLevels(levels));
    const treeLevelsTotal = treeLevelsByTree.reduce((a, b) => a + b, 0);

    return {
        skillBonuses,
        techCrystalsSpent,
        techCrystalsSpentByTree,
        treeLevelsTotal,
        treeLevelsByTree,
    };
}

export type Indicator = "higher" | "lower" | "equal";

/**
 * Compare two numeric values and return an indicator.
 * "higher" means activeValue > referenceValue.
 */
export function getIndicator(
    activeValue: number,
    referenceValue: number,
): Indicator {
    if (activeValue > referenceValue) return "higher";
    if (activeValue < referenceValue) return "lower";
    return "equal";
}
