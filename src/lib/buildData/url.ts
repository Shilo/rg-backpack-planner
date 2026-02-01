/**
 * URL management for build data sharing
 * Handles hash-fragment routing and URL updates
 */

import type { BuildData } from "./encoder";
import {
    encodeBuildData,
    decodeBuildData,
    SERIALIZED_PATTERN,
} from "./encoder";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import {
    setPreviewBuildName,
    clearPreviewBuildName,
} from "../previewBuildNameStore";
import { get } from "svelte/store";

/**
 * Cached base path from vite.config.ts
 * Normalized to have leading slash and trailing slash
 */
let cachedBasePath: string | null = null;

/**
 * Get the base path from Vite config, cached on first access
 * Normalizes to ensure leading slash and trailing slash
 */
export function getBasePath(): string {
    if (cachedBasePath === null) {
        // Get base from Vite's injected BASE_URL
        let base = import.meta.env.BASE_URL;

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
 * Supported format:
 *   /{base}#{encoded}
 */
export function getEncodedFromUrl(): string | null {
    if (typeof window === "undefined") return null;

    const hash = window.location.hash;
    if (!hash || hash === "#") return null;

    const encoded = hash.slice(1).trim();
    return encoded || null;
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
    return buildShareUrl(encoded);
}

/**
 * Determines whether a preset name is a default/generated value that should
 * not be encoded into share URLs.
 */
export function isDefaultPresetName(name?: string | null): boolean {
    if (!name) return false;
    if (name === "Default") return true;
    if (name === "New") return true;
    if (name === "Clone") return true;
    return /^(?:New|Clone)\s+\d+$/.test(name);
}

/**
 * Extracts build data from the current URL
 * Uses hash-fragment format: /{base}#{encoded}
 */
export function loadBuildFromUrl(): BuildData | null {
    if (typeof window === "undefined") return null;

    const encoded = getEncodedFromUrl();
    if (!encoded) {
        clearPreviewBuildName();
        return null;
    }

    const buildData = decodeBuildData(encoded);
    if (buildData) {
        // Store the build name if present
        if (buildData.name) {
            setPreviewBuildName(buildData.name);
        } else {
            clearPreviewBuildName();
        }
    } else {
        clearPreviewBuildName();
    }

    return buildData;
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

    // Split on build name separator to validate build data part separately
    // Name is at the start, so build data comes after the separator
    const nameSeparatorIndex = candidate.indexOf("|");
    const buildDataPart =
        nameSeparatorIndex !== -1
            ? candidate.slice(nameSeparatorIndex + 1)
            : candidate;

    // Validate build data part (after name separator, or entire string if no name) matches pattern
    if (!SERIALIZED_PATTERN.test(buildDataPart)) return null;

    return decodeBuildData(candidate) ? candidate : null;
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
        };

        const encoded = encodeBuildData(buildData);
        const newPath = buildSharePath(encoded);

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
    const newPath = buildSharePath(encoded);
    window.history.pushState({}, "", newPath);
    window.dispatchEvent(
        new HashChangeEvent("hashchange", {
            oldURL,
            newURL: window.location.origin + newPath,
        }),
    );
}
