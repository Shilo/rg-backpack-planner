import type { BuildData } from "../buildData/encoder";
import { decodeBuildData } from "../buildData/encoder";
import type { TabConfig, SkillId } from "../../types/tree";
import {
    calculateTechCrystalsSpent,
    calculateTreeTechCrystalsSpent,
} from "../techCrystalStore";
import { computeSkillBonuses } from "../skillBonusStore";
import { sumLevels } from "../treeLevelsStore";
import { recommendedBuilds } from "../buildData/recommended";
import { getRecommendedBuildIcon } from "../customIcons";

export interface CompareRow {
    label: string;
    valueA: number;
    valueB: number;
    format: "number" | "percent";
}

export interface CompareSection {
    header: {
        text: string;
        icon?: any;
        iconWeight?: string;
    };
    rows: CompareRow[];
}

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

export interface RecommendedBuildEntry {
    name: string;
    icon: any;
    code: string;
    index: number;
    tcSpent: number;
}

/**
 * Maps recommended builds with localized names and tech crystal costs.
 * Shared between CompareBuildsMenu and PreviewBuildsDropdown.
 */
export function mapRecommendedBuilds(
    tabs: TabConfig[],
    translate: (key: string) => string,
): RecommendedBuildEntry[] {
    return recommendedBuilds.map((build) => {
        const localizedName = translate(build.i18nKey) || build.displayName;
        const buildData = decodeBuildData(build.encoded);
        const tcSpent = buildData
            ? calculateTechCrystalsSpent(buildData.trees, tabs)
            : 0;
        return {
            name: localizedName,
            icon: getRecommendedBuildIcon(build.iconName),
            code: build.encoded,
            index: build.index,
            tcSpent,
        };
    });
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
