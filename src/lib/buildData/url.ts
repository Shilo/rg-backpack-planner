/**
 * URL management for build data sharing
 * Handles path-based routing and URL updates
 */

import type { BuildData } from "./encoder";
import { encodeBuildData, decodeBuildData } from "./encoder";

/**
 * Base path from vite.config.ts - must match the base configuration
 */
const BASE_PATH = "/rg-backpack-planner/";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { get } from "svelte/store";

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
  // Use path-based routing: /{encoded}
  // Remove trailing slash from pathname if present, then append encoded data
  let basePath = window.location.pathname.replace(/\/$/, "");
  if (!basePath) {
    basePath = "/";
  }
  // Avoid double slashes
  const separator = basePath === "/" ? "" : "/";
  return `${window.location.origin}${basePath}${separator}${encoded}`;
}

/**
 * Extracts build data from the current URL
 * Uses path-based routing: /{encoded}
 */
export function loadBuildFromUrl(): BuildData | null {
  if (typeof window === "undefined") return null;
  
  // Path-based routing: /{encoded}
  const pathname = window.location.pathname;
  // Extract the last segment of the path (after the last /)
  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0) {
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Exclude known base path segments (e.g., "rg-backpack-planner")
    const basePathSegment = BASE_PATH.replace(/^\/|\/$/g, ""); // Remove leading/trailing slashes
    if (lastSegment === basePathSegment) {
      return null; // This is just the base path, not build data
    }
    
    // Only try to decode if it looks like base64url
    // Base64url characters: A-Z, a-z, 0-9, -, _
    // Minimum length of 4 to avoid obvious false positives (very short strings)
    // decodeBuildData will handle further validation
    if (/^[A-Za-z0-9_-]+$/.test(lastSegment) && lastSegment.length >= 4) {
      const decoded = decodeBuildData(lastSegment);
      if (decoded) {
        return decoded;
      }
    }
  }
  
  return null;
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
    
    // Use path-based routing: /{encoded}
    // Get base path (remove any existing encoded data from pathname)
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split("/").filter(Boolean);
    
    // Check if the current URL already has the same encoded data
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment === encoded) {
        // URL already matches current build data - no update needed
        return;
      }
    }
    
    // Remove the last segment if it looks like build data
    // We can skip the decode check since we're about to replace it anyway
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // If it matches the pattern for build data, remove it
      if (/^[A-Za-z0-9_-]+$/.test(lastSegment) && lastSegment.length >= 4) {
        pathSegments.pop();
      }
    }
    
    // Construct the new path
    // Ensure we preserve at least the base path
    const basePath = pathSegments.length > 0 
      ? `/${pathSegments.join("/")}` 
      : BASE_PATH.replace(/\/$/, ""); // Remove trailing slash for joining
    // Avoid double slashes
    const separator = basePath === "/" ? "" : "/";
    const newPath = `${basePath}${separator}${encoded}`;
    
    // Only update URL if it's different from current pathname
    if (newPath === currentPath) {
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
