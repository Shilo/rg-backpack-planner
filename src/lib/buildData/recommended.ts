import appPackage from "../../../package.json";
import { derived } from "svelte/store";
import { decodeBuildData, encodeBuildData } from "./encoder";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { isPreviewMode } from "../previewModeStore";
import { previewBuildName } from "../previewBuildNameStore";

export interface RecommendedBuild {
    index: number;
    alias: string;
    displayName: string;
    encoded: string;
    iconName: string;
    i18nKey: string;
}

interface PremadeBuildEntry {
    name: string;
    build: string;
    icon: string;
}

function normalizeRecommendedAlias(candidate: string): string {
    return candidate.trim().toLowerCase().replace(/[\s_]+/g, "");
}

function parseRecommendedBuild(
    entry: PremadeBuildEntry,
    index: number,
): RecommendedBuild | null {
    if (!entry?.name || !entry?.build) {
        return null;
    }

    const encoded = `${entry.name}|${entry.build}`;
    const buildData = decodeBuildData(encoded);
    if (!buildData?.name) {
        return null;
    }

    return {
        index: index + 1,
        alias: entry.name,
        displayName: buildData.name,
        encoded,
        iconName: entry.icon ?? "",
        i18nKey: `preview.premade.${entry.name}`,
    };
}

const premadeBuilds: PremadeBuildEntry[] = Array.isArray(appPackage?.premadeBuilds)
    ? appPackage.premadeBuilds
    : [];

export const recommendedBuilds: RecommendedBuild[] = premadeBuilds
    .map((entry, index) => parseRecommendedBuild(entry, index))
    .filter((build): build is RecommendedBuild => build !== null);

const recommendedBuildByAlias = new Map(
    recommendedBuilds.map((build) => [
        normalizeRecommendedAlias(build.alias),
        build,
    ]),
);
const recommendedBuildByEncoded = new Map(
    recommendedBuilds.map((build) => [build.encoded, build]),
);

function getRecommendedBuildByIndex(indexToken: string): RecommendedBuild | null {
    if (!/^[1-9]\d*$/.test(indexToken)) {
        return null;
    }

    const index = Number.parseInt(indexToken, 10);
    return recommendedBuilds[index - 1] ?? null;
}

export function resolveRecommendedBuildAlias(
    candidate: string,
): RecommendedBuild | null {
    const token = candidate.trim();
    if (!token || token.includes("|") || token.startsWith("/")) {
        return null;
    }

    return (
        getRecommendedBuildByIndex(token) ??
        recommendedBuildByAlias.get(normalizeRecommendedAlias(token)) ??
        null
    );
}

export function resolveRecommendedBuildEncoded(
    candidate: string,
): string | null {
    return resolveRecommendedBuildAlias(candidate)?.encoded ?? null;
}

export function getRecommendedBuildTokenForEncoded(
    encoded: string,
): string | null {
    return recommendedBuildByEncoded.get(encoded)?.alias ?? null;
}

export function getRecommendedBuildForEncoded(
    encoded: string,
): RecommendedBuild | null {
    return recommendedBuildByEncoded.get(encoded) ?? null;
}

/**
 * Derived store that reactively tracks whether the current preview build
 * matches a recommended build. Re-encodes the current build state on every
 * change (tree levels, tech crystals, build name) and looks it up.
 * Returns null when not in preview mode or when the build doesn't match.
 */
export const previewRecommendedBuild = derived(
    [isPreviewMode, treeLevels, techCrystalsOwned, previewBuildName],
    ([$isPreviewMode, $treeLevels, $techCrystalsOwned, $previewBuildName]) => {
        if (!$isPreviewMode) return null;
        const encoded = encodeBuildData({
            trees: $treeLevels,
            owned: $techCrystalsOwned,
            name: $previewBuildName ?? undefined,
        });
        return getRecommendedBuildForEncoded(encoded);
    },
);
