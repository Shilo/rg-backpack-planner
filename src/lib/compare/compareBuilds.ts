import type { TabConfig } from "../../types/tree";
import { calculateTechCrystalsSpent } from "../techCrystalStore";
import { decodeBuildData } from "../buildData/encoder";
import { recommendedBuilds } from "../buildData/recommended";
import { getRecommendedBuildIcon } from "../customIcons";

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
