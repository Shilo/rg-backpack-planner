import appPackage from "../../../package.json";
import { decodeBuildData } from "./encoder";

export const RESERVED_BUILD_PREFIX = "/";

export interface RecommendedBuild {
    index: number;
    alias: string;
    displayName: string;
    encoded: string;
}

function normalizeRecommendedAlias(candidate: string): string {
    return candidate.trim().toLowerCase().replace(/[\s_]+/g, "");
}

function safeDecodeURIComponent(candidate: string): string | null {
    if (!candidate.includes("%")) {
        return null;
    }

    try {
        return decodeURIComponent(candidate);
    } catch {
        return null;
    }
}

function parseRecommendedBuild(
    encoded: string,
    index: number,
): RecommendedBuild | null {
    if (typeof encoded !== "string" || encoded.trim() === "") {
        return null;
    }

    const separatorIndex = encoded.indexOf("|");
    if (separatorIndex === -1) {
        return null;
    }

    const alias = encoded.slice(0, separatorIndex).trim();
    if (!alias) {
        return null;
    }

    const buildData = decodeBuildData(encoded);
    if (!buildData?.name) {
        return null;
    }

    return {
        index: index + 1,
        alias,
        displayName: buildData.name,
        encoded,
    };
}

const premadeBuilds = Array.isArray(appPackage?.premadeBuilds)
    ? appPackage.premadeBuilds
    : [];

export const recommendedBuilds: RecommendedBuild[] = premadeBuilds
    .map((encoded, index) => parseRecommendedBuild(encoded, index))
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

function stripReservedBuildPrefix(candidate: string): string | null {
    const token = candidate.trim();
    if (!token.startsWith(RESERVED_BUILD_PREFIX)) {
        return null;
    }

    const value = token.slice(RESERVED_BUILD_PREFIX.length).trim();
    return value || null;
}

function getReservedBuildCandidate(candidate: string): string | null {
    const directCandidate = stripReservedBuildPrefix(candidate);
    if (directCandidate) {
        return directCandidate;
    }

    const decodedCandidate = safeDecodeURIComponent(candidate);
    if (!decodedCandidate || decodedCandidate === candidate) {
        return null;
    }

    return stripReservedBuildPrefix(decodedCandidate);
}

export function resolveRecommendedBuildAlias(
    candidate: string,
): RecommendedBuild | null {
    const token = getReservedBuildCandidate(candidate);
    if (!token || token.includes("|")) {
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
    const build = recommendedBuildByEncoded.get(encoded);
    return build ? `${RESERVED_BUILD_PREFIX}${build.alias}` : null;
}
