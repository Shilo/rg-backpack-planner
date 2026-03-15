import { get } from "svelte/store";
import { t, formatNumber, formatPercent } from "svelte-whisper";
import { techCrystalsSpent } from "../techCrystalStore";
import { treeLevelsTotal } from "../treeLevelsStore";
import { skillBonuses, SKILL_DISPLAY_ORDER } from "../skillBonusStore";
import { activeBuildName } from "../buildPresetsStore";
import { isDefaultPresetName } from "../buildData/url";

/**
 * Generates a stats image blob using current store state and theme colors.
 * Resolves the build title from the active preset / preview state.
 * Each call produces a fresh image — no caching.
 */
export async function generateStatsImageBlob(): Promise<Blob | null> {
    const { renderStatsImage } = await import("./statsImageRenderer");
    const $t = get(t);

    const buildName = get(activeBuildName);
    const buildTitle =
        buildName && !isDefaultPresetName(buildName)
            ? buildName
            : undefined;

    const bonuses: { label: string; value: string }[] = [];
    const currentBonuses = get(skillBonuses);
    for (const skillId of SKILL_DISPLAY_ORDER) {
        const value = currentBonuses.get(skillId);
        if (value !== undefined && value > 0) {
            bonuses.push({
                label: $t(`skills.${skillId}`),
                value: formatPercent(value),
            });
        }
    }
    return renderStatsImage({
        buildTitle,
        techCrystalsLabel: $t("statistics.techCrystalsSpent"),
        techCrystalsValue: formatNumber(get(techCrystalsSpent)),
        nodeLevelsLabel: $t("statistics.backpackNodeLevels"),
        nodeLevelsValue: formatNumber(get(treeLevelsTotal)),
        skillBonuses: bonuses,
    });
}
