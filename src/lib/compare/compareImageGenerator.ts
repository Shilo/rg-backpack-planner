import { get } from "svelte/store";
import { t } from "svelte-whisper";
import { compareState } from "./compareStore";
import {
    activeTabs,
    techCrystalsSpent,
    techCrystalsSpentGuardian,
    techCrystalsSpentVanguard,
    techCrystalsSpentCannon,
} from "../techCrystalStore";
import { skillBonuses } from "../skillBonusStore";
import {
    treeLevelsTotal,
    treeLevelsGuardian,
    treeLevelsVanguard,
    treeLevelsCannon,
} from "../treeLevelsStore";
import { buildCompareSections, getCompareBuildLabel } from "./compareStats";
import { renderCompareImage } from "./compareImageRenderer";

export async function generateCompareImageBlob(): Promise<Blob | null> {
    const state = get(compareState);
    if (!state.isComparing || !state.buildA || !state.buildB) return null;

    const tabs = get(activeTabs);

    const sections = buildCompareSections(
        state,
        tabs,
        {
            skillBonuses: get(skillBonuses),
            techCrystalsSpent: get(techCrystalsSpent),
            techCrystalsSpentByTree: [
                get(techCrystalsSpentGuardian),
                get(techCrystalsSpentVanguard),
                get(techCrystalsSpentCannon),
            ],
            treeLevelsTotal: get(treeLevelsTotal),
            treeLevelsByTree: [
                get(treeLevelsGuardian),
                get(treeLevelsVanguard),
                get(treeLevelsCannon),
            ],
        },
        t,
    );

    return renderCompareImage({
        labelA: getCompareBuildLabel(state.buildA, t),
        labelB: getCompareBuildLabel(state.buildB, t),
        sections,
    });
}
