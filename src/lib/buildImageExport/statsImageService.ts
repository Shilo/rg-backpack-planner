import { get } from "svelte/store";
import { t, formatNumber, formatPercent } from "svelte-whisper";
import { techCrystalsSpent } from "../techCrystalStore";
import { treeLevelsTotal } from "../treeLevelsStore";
import { skillBonuses, SKILL_DISPLAY_ORDER } from "../skillBonusStore";
import { isDefaultPresetName } from "../buildData/url";
import { renderStatsImage, type StatsImageData } from "./statsImageRenderer";

/**
 * Gathers all data required for the stats image from Svelte stores.
 * @param buildTitle Optional title for the build
 * @returns StatsImageData object
 */
export function getStatsImageData(buildTitle?: string): StatsImageData {
    const bonuses: { label: string; value: string }[] = [];
    const currentBonuses = get(skillBonuses);
    const trans = get(t);

    for (const skillId of SKILL_DISPLAY_ORDER) {
        const value = currentBonuses.get(skillId);
        if (value !== undefined && value > 0) {
            bonuses.push({
                label: trans(`skills.${skillId}`),
                value: formatPercent(value),
            });
        }
    }

    return {
        buildTitle: buildTitle && !isDefaultPresetName(buildTitle) ? buildTitle : undefined,
        techCrystalsLabel: trans("statistics.techCrystalsSpent"),
        techCrystalsValue: formatNumber(get(techCrystalsSpent)),
        nodeLevelsLabel: trans("statistics.backpackNodeLevels"),
        nodeLevelsValue: formatNumber(get(treeLevelsTotal)),
        skillBonuses: bonuses,
    };
}

/**
 * Generates a stats image blob.
 * @param buildTitle Optional title for the build
 * @returns Promise resolving to a Blob or null
 */
export async function generateStatsImageBlob(buildTitle?: string): Promise<Blob | null> {
    const data = getStatsImageData(buildTitle);
    return await renderStatsImage(data);
}
