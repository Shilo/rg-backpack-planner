/**
 * URL management for build data sharing
 * Handles query-based routing and URL updates
 */

import type { BuildData } from "./encoder";
import { encodeBuildData, decodeBuildData, SERIALIZED_PATTERN } from "./encoder";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
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
 *   /{base}?b={encoded}
 */
export function getEncodedFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  // 1) Preferred: query parameter (?b=...)
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search);
    const encoded = params.get("b");
    const trimmed = encoded?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Build a share path (path + query, no origin) with the given encoded data.
 *
 * Uses query-based format for better compatibility with crawlers:
 *   /{base}?b={encoded}
 */
function buildSharePath(encoded: string): string {
  const base = getBasePath();
  // Base already has trailing slash. Attach query parameter (?b=...).
  // Use encodeURIComponent so the encoded data is safe in the query string.
  return `${base}?b=${encodeURIComponent(encoded)}`;
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
 * Get the flag state (for use by applier.ts)
 */
export function getIsApplyingBuildFromUrl(): boolean {
  return isApplyingBuildFromUrl;
}

/**
 * Set the flag state (for use by applier.ts)
 */
export function setIsApplyingBuildFromUrl(value: boolean): void {
  isApplyingBuildFromUrl = value;
}

/**
 * Creates a shareable URL with the current build data
 * Uses query-based routing with ?b={encoded}
 */
export function createShareUrl(buildData?: BuildData): string {
  const data = buildData ?? {
    trees: get(treeLevels),
    owned: get(techCrystalsOwned),
  };
  const encoded = encodeBuildData(data);
  return buildShareUrl(encoded);
}

/**
 * Extracts build data from the current URL
 * Uses query-based routing with ?b={encoded}
 */
export function loadBuildFromUrl(): BuildData | null {
  if (typeof window === "undefined") return null;

  const encoded = getEncodedFromUrl();
  if (!encoded) {
    return null;
  }

  const buildData = decodeBuildData(encoded);
  if (buildData) {
    console.warn("[loadBuildFromUrl] Successfully loaded build data from URL:", encoded);
  }
  return buildData;
}

/**
 * Parses user input (full URL or raw code) into a validated encoded build string.
 *
 * Accepts:
 * - Full Backpack Planner URL: https://.../rg-backpack-planner/?b={encoded}[...]
 * - Raw encoded string matching SERIALIZED_PATTERN
 *
 * Returns:
 * - Encoded string if valid and decodable
 * - null otherwise
 */
export function parseEncodedFromUserInput(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  let candidate: string | null = null;

  // URL-style input
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const searchParams = url.searchParams;

      // Preferred and only supported URL format: query parameter (?b=...)
      const fromQuery = searchParams.get("b");
      const paramTrimmed = fromQuery?.trim();
      candidate = paramTrimmed && paramTrimmed.length > 0 ? paramTrimmed : null;
    } catch {
      candidate = null;
    }
  } else {
    // Raw candidate string
    candidate = trimmed;
  }

  if (!candidate) return null;

  // Basic character validation (defensive; decodeBuildData also validates)
  if (!SERIALIZED_PATTERN.test(candidate)) {
    return null;
  }

  const buildData = decodeBuildData(candidate);
  if (!buildData) {
    return null;
  }

  return candidate;
}

/**
 * Updates the current URL with the current build data
 * Used in preview mode to keep URL in sync with changes
 * Does not reload the page, just updates the URL
 * Uses query-based routing with ?b={encoded}
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

    // Only update URL if it's different from current path + search
    const currentPathAndSearch = window.location.pathname + window.location.search;
    if (newPath === currentPathAndSearch) {
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
 * Navigates to a specific encoded build by updating the URL path and
 * dispatching a popstate event so App.svelte can re-run URL initialization.
 *
 * Does not reload the page.
 */
export function navigateToEncodedBuild(encoded: string): void {
  if (typeof window === "undefined") return;

  const newPath = buildSharePath(encoded);

  // Update URL without reloading page
  window.history.replaceState({}, "", newPath);

  // Let the existing popstate handler re-run initialization logic
  window.dispatchEvent(new PopStateEvent("popstate"));
}
