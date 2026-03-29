import type { BuildData } from "../buildData/encoder";
import type { TabConfig, SkillId } from "../../types/tree";
import {
    calculateTechCrystalsSpent,
    calculateTreeTechCrystalsSpent,
} from "../techCrystalStore";
import { computeSkillBonuses, SKILL_DISPLAY_ORDER } from "../skillBonusStore";
import { sumLevels } from "../treeLevelsStore";
import type { CompareState } from "./compareStore";

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

/**
 * Builds the sections array for comparison display.
 * valueA always holds buildA's stats, valueB holds buildB's stats.
 * activeSide determines which side reads from live store values vs computed snapshot.
 */
export function buildCompareSections(
    state: CompareState,
    tabs: TabConfig[],
    live: {
        skillBonuses: Map<SkillId, number>;
        techCrystalsSpent: number;
        techCrystalsSpentByTree: number[];
        treeLevelsTotal: number;
        treeLevelsByTree: number[];
    },
    translate: (key: string) => string,
): CompareSection[] {
    if (!state.isComparing || !state.buildA || !state.buildB) return [];

    const frozenData =
        state.activeSide === "a" ? state.buildB.data : state.buildA.data;
    const frozenStats = computeCompareStats(frozenData, tabs);

    const val = (liveVal: number, frozenVal: number) =>
        state.activeSide === "a"
            ? { valueA: liveVal, valueB: frozenVal }
            : { valueA: frozenVal, valueB: liveVal };

    const bonusRows: CompareSection["rows"] = [];
    for (const skillId of SKILL_DISPLAY_ORDER) {
        const liveVal = live.skillBonuses.get(skillId) ?? 0;
        const frozenVal = frozenStats.skillBonuses.get(skillId) ?? 0;
        if (liveVal > 0 || frozenVal > 0) {
            bonusRows.push({
                label: translate(`skills.short.${skillId}`),
                ...val(liveVal, frozenVal),
                format: "percent",
            });
        }
    }

    if (bonusRows.length === 0) {
        bonusRows.push({
            label: translate("common.none"),
            valueA: 0,
            valueB: 0,
            format: "number",
        });
    }

    return [
        {
            header: { text: translate("statistics.backpackBonus") },
            rows: bonusRows,
        },
        {
            header: {
                text: translate("statistics.techCrystalsSpent"),
                iconWeight: "fill",
            },
            rows: [
                {
                    label: translate("statistics.total"),
                    ...val(live.techCrystalsSpent, frozenStats.techCrystalsSpent),
                    format: "number",
                },
                {
                    label: translate("trees.guardian"),
                    ...val(
                        live.techCrystalsSpentByTree[0] ?? 0,
                        frozenStats.techCrystalsSpentByTree[0] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.vanguard"),
                    ...val(
                        live.techCrystalsSpentByTree[1] ?? 0,
                        frozenStats.techCrystalsSpentByTree[1] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.cannon"),
                    ...val(
                        live.techCrystalsSpentByTree[2] ?? 0,
                        frozenStats.techCrystalsSpentByTree[2] ?? 0,
                    ),
                    format: "number",
                },
            ],
        },
        {
            header: {
                text: translate("statistics.backpackNodeLevels"),
            },
            rows: [
                {
                    label: translate("statistics.total"),
                    ...val(live.treeLevelsTotal, frozenStats.treeLevelsTotal),
                    format: "number",
                },
                {
                    label: translate("trees.guardian"),
                    ...val(
                        live.treeLevelsByTree[0] ?? 0,
                        frozenStats.treeLevelsByTree[0] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.vanguard"),
                    ...val(
                        live.treeLevelsByTree[1] ?? 0,
                        frozenStats.treeLevelsByTree[1] ?? 0,
                    ),
                    format: "number",
                },
                {
                    label: translate("trees.cannon"),
                    ...val(
                        live.treeLevelsByTree[2] ?? 0,
                        frozenStats.treeLevelsByTree[2] ?? 0,
                    ),
                    format: "number",
                },
            ],
        },
    ];
}
