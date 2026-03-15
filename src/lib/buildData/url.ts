/**
 * URL management for build data sharing
 * Handles hash-fragment routing and URL updates
 */

import type { BuildData } from "./encoder";
import {
    encodeBuildData,
    decodeBuildData,
    decodeNameSpaces,
} from "./encoder";
import {
    getRecommendedBuildTokenForEncoded,
    resolveRecommendedBuildEncoded,
} from "./recommended";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import {
    setPreviewBuildName,
    clearPreviewBuildName,
    previewBuildName,
} from "../previewBuildNameStore";
import { get } from "svelte/store";

export const CUSTOM_BUILD_PREFIX = "/";

export interface ResolvedShareToken {
    buildData: BuildData;
    encoded: string;
    canonicalToken: string;
    kind: "recommended" | "custom";
    shouldNormalize: boolean;
}

/**
 * Cached base path from vite.config.ts
 * Normalized to have leading slash and trailing slash
 */
let cachedBasePath: string | null = null;

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

function getCandidateVariants(candidate: string): string[] {
    const token = candidate.trim();
    if (!token) {
        return [];
    }

    const variants = [token];
    const decoded = safeDecodeURIComponent(token);
    if (decoded && decoded !== token) {
        variants.push(decoded);
    }
    return variants;
}

function getCustomBuildToken(encoded: string): string {
    return `${CUSTOM_BUILD_PREFIX}${encoded}`;
}

function getShareTokenForEncoded(encoded: string): string {
    return getRecommendedBuildTokenForEncoded(encoded) ?? getCustomBuildToken(encoded);
}

function getExplicitCustomEncoded(candidate: string): {
    encoded: string;
    shouldNormalize: boolean;
} | null {
    const variants = getCandidateVariants(candidate);
    for (const variant of variants) {
        if (!variant.startsWith(CUSTOM_BUILD_PREFIX)) {
            continue;
        }

        const encoded = variant.slice(CUSTOM_BUILD_PREFIX.length).trim();
        if (!encoded) {
            return null;
        }

        const canonicalToken = getCustomBuildToken(encoded);
        return {
            encoded,
            shouldNormalize: candidate.trim() !== canonicalToken,
        };
    }

    return null;
}

function getRecommendedResolution(candidate: string): ResolvedShareToken | null {
    for (const variant of getCandidateVariants(candidate)) {
        const encoded = resolveRecommendedBuildEncoded(variant);
        if (!encoded) {
            continue;
        }

        const buildData = decodeBuildData(encoded);
        const canonicalToken = getRecommendedBuildTokenForEncoded(encoded);
        if (!buildData || !canonicalToken) {
            return null;
        }

        return {
            buildData,
            encoded,
            canonicalToken,
            kind: "recommended",
            shouldNormalize: false,
        };
    }

    return null;
}

export function resolveShareToken(candidate: string): ResolvedShareToken | null {
    const token = candidate.trim();
    if (!token) {
        return null;
    }

    const explicitCustom = getExplicitCustomEncoded(token);
    if (explicitCustom) {
        const buildData = decodeBuildData(explicitCustom.encoded);
        if (!buildData) {
            return null;
        }

        return {
            buildData,
            encoded: explicitCustom.encoded,
            canonicalToken: getCustomBuildToken(explicitCustom.encoded),
            kind: "custom",
            shouldNormalize: explicitCustom.shouldNormalize,
        };
    }

    const recommended = getRecommendedResolution(token);
    if (recommended) {
        return recommended;
    }

    const legacyCustomBuild = decodeBuildData(token);
    if (!legacyCustomBuild) {
        return null;
    }

    return {
        buildData: legacyCustomBuild,
        encoded: token,
        canonicalToken: getCustomBuildToken(token),
        kind: "custom",
        shouldNormalize: true,
    };
}

export function resolveShareTokenFromUrl(): ResolvedShareToken | null {
    if (typeof window === "undefined") {
        return null;
    }

    const hash = window.location.hash;
    if (!hash || hash === "#") {
        return null;
    }

    const candidate = hash.slice(1).trim();
    if (!candidate) {
        return null;
    }

    return resolveShareToken(candidate);
}

/**
 * Get the base path from Vite config, cached on first access
 * Normalizes to ensure leading slash and trailing slash
 */
export function getBasePath(): string {
    if (cachedBasePath === null) {
        // Get base from Vite's injected BASE_URL
        let base = import.meta.env?.BASE_URL ?? "/";

        // Ensure leading slash
        if (!base.startsWith("/")) {
            base = "/" + base;
        }

        // Ensure trailing slash for concatenation
        if (!base.endsWith("/")) {
            base = base + "/";
        }

        cachedBasePath = base;
    }

    return cachedBasePath;
}

/**
 * Get the encoded build data from the current URL.
 *
 * Supported formats:
 *   /{base}#{recommended}
 *   /{base}#/{custom}
 */
export function getEncodedFromUrl(): string | null {
    if (typeof window === "undefined") return null;

    const hash = window.location.hash;
    if (!hash || hash === "#") return null;

    const candidate = hash.slice(1).trim();
    if (!candidate) return null;

    return resolveShareToken(candidate)?.encoded ?? candidate;
}

/**
 * Build a share path (path + hash, no origin) with the given encoded data.
 *
 * Uses hash-fragment format: /{base}#{encoded}
 * No encoding needed; hash is client-only and not sent to server.
 */
function buildSharePath(encoded: string): string {
    const base = getBasePath();
    return `${base}#${encoded}`;
}

/**
 * Build a full shareable URL with the given encoded data
 */
function buildShareUrl(encoded: string): string {
    if (typeof window === "undefined") {
        // Fallback for SSR - shouldn't happen in practice
        return "";
    }
    return window.location.origin + buildSharePath(encoded);
}

/**
 * Clear share data from URL, leaving only the base path
 *
 * Intended usages:
 * - replace = true (default): cleanup-style operations where we don't want an extra history entry
 *   (e.g. invalid share link handling).
 * - replace = false: \"mode switch\" operations that conceptually move between preview and personal
 *   builds (e.g. Clone Preview, Stop Preview) where we want the share URL to remain in history so
 *   the Back button returns to it.
 *
 * @param replace - If true, replaces current history entry (default). If false, pushes new entry to preserve history.
 */
export function clearShareFromUrl(replace: boolean = true): void {
    if (typeof window === "undefined") return;

    const basePath = getBasePath();
    if (replace) {
        window.history.replaceState({}, "", basePath);
    } else {
        window.history.pushState({}, "", basePath);
    }
}

// Flag to prevent URL updates during initial build application
let isApplyingBuildFromUrl = false;

/**
 * Set the flag state (for use by applier.ts)
 */
export function setIsApplyingBuildFromUrl(value: boolean): void {
    isApplyingBuildFromUrl = value;
}

/**
 * Creates a shareable URL with the current build data
 * Uses hash-fragment format: /{base}#{encoded}
 */
export function createShareUrl(buildData?: BuildData): string {
    const data = buildData
        ? {
              ...buildData,
              name: isDefaultPresetName(buildData.name)
                  ? undefined
                  : buildData.name,
          }
        : {
              trees: get(treeLevels),
              owned: get(techCrystalsOwned),
          };
    const encoded = encodeBuildData(data);
    const shareToken = getShareTokenForEncoded(encoded);
    return buildShareUrl(shareToken);
}

/**
 * Determines whether a preset name is a default/generated value that should
 * not be encoded into share URLs.
 *
 * Only checks canonical English names since all preset names are stored
 * in canonical English internally. Display translation happens at the UI layer.
 */
export function isDefaultPresetName(name?: string | null): boolean {
    if (!name) return false;
    const trimmed = name.trim();

    if (trimmed === "Default" || trimmed === "New" || trimmed === "Clone") {
        return true;
    }

    return /^(New|Clone)\s+\d+$/i.test(trimmed);
}

/**
 * Extracts build data from the current URL
 * Uses hash-fragment format: /{base}#{encoded}
 */
export function loadBuildFromUrl(): BuildData | null {
    if (typeof window === "undefined") return null;

    const resolved = resolveShareTokenFromUrl();
    if (!resolved) {
        clearPreviewBuildName();
        return null;
    }

    if (resolved.buildData.name) {
        setPreviewBuildName(resolved.buildData.name);
    } else {
        clearPreviewBuildName();
    }

    return resolved.buildData;
}

/**
 * Parses user input (full URL or raw code) into a validated encoded build string.
 *
 * Accepts:
 * - Full Backpack Planner URL: https://.../rg-backpack-planner/#{encoded}
 * - Raw encoded string (may include build name with | separator)
 *
 * Returns:
 * - Encoded string if valid and decodable
 * - null otherwise
 */
export function parseEncodedFromUserInput(input: string): string | null {
    if (typeof input !== "string") return null;

    const candidate = (
        input.includes("#") ? (input.split("#").pop() ?? "") : input
    ).trim();
    if (!candidate) return null;

    return resolveShareToken(candidate)?.encoded ?? null;
}

/**
 * Extracts the build name from an encoded build string.
 * Uses the name separator ("|") and returns the first component if present.
 * Properly decodes URL encoding and underscores to spaces.
 */
export function getBuildNameFromEncoded(encoded: string): string | null {
    if (typeof encoded !== "string") return null;
    const separatorIndex = encoded.indexOf("|");
    if (separatorIndex === -1) return null;
    const namePart = encoded.slice(0, separatorIndex).trim();
    if (!namePart) return null;
    try {
        // Decode URL encoding, then convert underscores to spaces
        return decodeNameSpaces(decodeURIComponent(namePart));
    } catch (error) {
        // If decoding fails, just convert underscores
        return decodeNameSpaces(namePart);
    }
}

/**
 * Updates the current URL with the current build data
 * Used in preview mode to keep URL in sync with changes
 * Does not reload the page, just updates the URL
 * Uses hash-fragment format: /{base}#{encoded}
 */
export function updateUrlWithCurrentBuild(): void {
    if (typeof window === "undefined") return;

    // Skip URL updates during initial build application
    if (isApplyingBuildFromUrl) {
        return;
    }

    try {
        const buildData: BuildData = {
            trees: get(treeLevels),
            owned: get(techCrystalsOwned),
            name: get(previewBuildName) ?? undefined,
        };

        const encoded = encodeBuildData(buildData);
        const shareToken = getShareTokenForEncoded(encoded);
        const newPath = buildSharePath(shareToken);

        // Only update URL if it's different from current path + hash
        const currentPathAndHash =
            window.location.pathname + window.location.hash;
        if (newPath === currentPathAndHash) {
            return; // No change needed
        }

        // Validate the path is safe before updating
        try {
            new URL(newPath, window.location.origin);
            // Update URL without reloading page
            window.history.replaceState({}, "", newPath);
        } catch (urlError) {
            console.error("Invalid URL path generated:", newPath, urlError);
        }
    } catch (error) {
        console.error("Failed to update URL with current build:", error);
    }
}

/**
 * Navigates to a specific encoded build by updating the URL hash.
 * Uses pushState so Back/Forward stays same-document (no reload).
 * Manually dispatches hashchange since pushState does not fire it.
 *
 * Does not reload the page.
 */
export function navigateToEncodedBuild(encoded: string): void {
    if (typeof window === "undefined") return;

    const oldURL = window.location.href;
    const newPath = buildSharePath(getShareTokenForEncoded(encoded));
    window.history.pushState({}, "", newPath);
    window.dispatchEvent(
        new HashChangeEvent("hashchange", {
            oldURL,
            newURL: window.location.origin + newPath,
        }),
    );
}
