import { treeLevels, setTreeLevels } from "./treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "./techCrystalStore";
import { compressTreeProgress, expandTreeProgress } from "./treeProgressStore";
import type { TreeNode } from "./Tree.svelte";
import { get } from "svelte/store";

export interface BuildData {
  trees: Record<string, number>[];
  owned: number;
}

/**
 * Encodes a string to base64url format (URL-safe base64)
 * Replaces + with -, / with _, and removes padding =
 */
function encodeBase64Url(base64: string): string {
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decodes a base64url string back to standard base64
 * Replaces - with +, _ with /, and adds back padding =
 */
function decodeBase64Url(base64url: string): string {
  // Add padding back if needed
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding to make length a multiple of 4
  while (base64.length % 4) {
    base64 += "=";
  }
  return base64;
}

/**
 * Encodes build data into a base64url string for URL sharing
 * Compresses tree data (removes zeros) and uses URL-safe encoding for smallest possible URL
 */
export function encodeBuildData(buildData: BuildData): string {
  // Compress trees to remove zero values
  const compressed = {
    trees: compressTreeProgress(buildData.trees),
    owned: buildData.owned,
  };
  
  // Encode to base64, then convert to base64url for URL safety
  const base64 = btoa(JSON.stringify(compressed));
  return encodeBase64Url(base64);
}

/**
 * Decodes a base64url string back into build data
 * Returns compressed data (expansion happens in applyBuildFromUrl)
 */
export function decodeBuildData(encoded: string): BuildData | null {
  try {
    // Convert base64url back to base64, then decode
    const base64 = decodeBase64Url(encoded);
    const decoded = atob(base64);
    const buildData = JSON.parse(decoded) as BuildData;
    
    // Validate the structure
    if (
      typeof buildData === "object" &&
      Array.isArray(buildData.trees) &&
      typeof buildData.owned === "number"
    ) {
      // Return compressed data - expansion will happen in applyBuildFromUrl
      return buildData;
    }
    return null;
  } catch (error) {
    console.error("Failed to decode build data:", error);
    return null;
  }
}

/**
 * Creates a shareable URL with the current build data
 */
export function createShareUrl(buildData?: BuildData): string {
  const data = buildData ?? {
    trees: get(treeLevels),
    owned: get(techCrystalsOwned),
  };
  const encoded = encodeBuildData(data);
  return `${window.location.origin}${window.location.pathname}?build=${encoded}`;
}

/**
 * Saves the current build to a shareable URL and copies it to clipboard
 */
export async function saveBuildToUrl(): Promise<boolean> {
  try {
    const shareUrl = createShareUrl();
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch (error) {
    console.error("Failed to save build URL:", error);
    return false;
  }
}

/**
 * Extracts build data from the current URL query parameters
 */
export function loadBuildFromUrl(): BuildData | null {
  if (typeof window === "undefined") return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const encoded = urlParams.get("build");
  
  if (!encoded) return null;
  
  return decodeBuildData(encoded);
}

/**
 * Applies build data from URL to the stores
 * Expands compressed tree data using tree definitions
 * @param trees Optional array of tree node definitions to expand against
 * @returns true if build was successfully applied, false otherwise
 */
export function applyBuildFromUrl(
  trees?: { nodes: TreeNode[] }[],
): boolean {
  const buildData = loadBuildFromUrl();
  if (!buildData) return false;
  
  try {
    // Expand compressed tree data if trees are provided
    let expandedTrees = buildData.trees;
    if (trees && buildData.trees.length === trees.length) {
      expandedTrees = expandTreeProgress(buildData.trees, trees);
    }
    
    // Apply tree levels
    const currentTrees = get(treeLevels);
    if (expandedTrees.length === currentTrees.length) {
      expandedTrees.forEach((tree, index) => {
        setTreeLevels(index, tree);
      });
    } else {
      console.warn(
        `Build data has ${expandedTrees.length} trees, but current app has ${currentTrees.length} trees. Skipping tree levels.`
      );
    }
    
    // Apply tech crystals owned
    setTechCrystalsOwned(buildData.owned);
    
    return true;
  } catch (error) {
    console.error("Failed to apply build from URL:", error);
    return false;
  }
}

/**
 * Saves the current build as an image
 * TODO: Implement screenshot functionality for all 3 trees
 * This would require html2canvas or similar library
 */
export async function saveBuildAsImage(): Promise<boolean> {
  // TODO: Implement screenshot functionality
  // This would require:
  // 1. Installing html2canvas or similar library
  // 2. Capturing screenshots of all 3 trees
  // 3. Combining them into a single image
  // 4. Triggering download or share
  return false;
}
