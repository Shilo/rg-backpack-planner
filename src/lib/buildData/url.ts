/**
 * URL management for build data sharing
 * Handles path-based routing and URL updates
 */

import type { BuildData } from "./encoder";
import { encodeBuildData, decodeBuildData } from "./encoder";
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
 * Extract the path segment after the base path
 * Returns empty string if pathname is exactly the base (with or without trailing slash)
 * Returns the first path segment after base if present
 */
function getPathAfterBase(pathname: string): string {
  const base = getBasePath();
  const baseNormalized = base.replace(/\/$/, ""); // Remove trailing slash for comparison
  
  // Normalize pathname: remove trailing slash for comparison
  const pathnameNormalized = pathname.replace(/\/$/, "");
  
  // If pathname is exactly the base (with or without trailing slash), return empty
  if (pathnameNormalized === baseNormalized || pathname === base) {
    return "";
  }
  
  // Check if pathname starts with base
  if (pathname.startsWith(base)) {
    // Get everything after base
    const afterBase = pathname.slice(base.length);
    // Take only the first segment (encoded data is a single segment)
    const firstSegment = afterBase.split("/")[0];
    return firstSegment || "";
  }
  
  // If pathname doesn't start with base, return empty
  return "";
}

/**
 * Get the encoded build data from the current URL
 * Returns null if there's no path after base
 * No validation - just returns whatever is after base
 */
export function getEncodedFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  
  const encoded = getPathAfterBase(window.location.pathname);
  return encoded || null;
}

/**
 * Build a share path (path only, no origin) with the given encoded data
 */
function buildSharePath(encoded: string): string {
  const base = getBasePath();
  // Base already has trailing slash, encoded has no slashes
  return base + encoded;
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
 * Uses path-based routing: /{encoded} instead of query parameters
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
 * Uses path-based routing: /{encoded}
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
 * Updates the current URL with the current build data
 * Used in preview mode to keep URL in sync with changes
 * Does not reload the page, just updates the URL
 * Uses path-based routing: /{encoded}
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

    // Only update URL if it's different from current pathname
    if (newPath === window.location.pathname) {
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
