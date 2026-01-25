import { treeLevels, setTreeLevels } from "./treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "./techCrystalStore";
import { get } from "svelte/store";

export interface BuildData {
  trees: Record<string, number>[];
  owned: number;
}

/**
 * Encodes build data into a base64 string for URL sharing
 */
export function encodeBuildData(buildData: BuildData): string {
  return btoa(JSON.stringify(buildData));
}

/**
 * Decodes a base64 string back into build data
 */
export function decodeBuildData(encoded: string): BuildData | null {
  try {
    const decoded = atob(encoded);
    const buildData = JSON.parse(decoded) as BuildData;
    
    // Validate the structure
    if (
      typeof buildData === "object" &&
      Array.isArray(buildData.trees) &&
      typeof buildData.owned === "number"
    ) {
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
 * Returns true if build was successfully applied, false otherwise
 */
export function applyBuildFromUrl(): boolean {
  const buildData = loadBuildFromUrl();
  if (!buildData) return false;
  
  try {
    // Apply tree levels
    const currentTrees = get(treeLevels);
    if (buildData.trees.length === currentTrees.length) {
      buildData.trees.forEach((tree, index) => {
        setTreeLevels(index, tree);
      });
    } else {
      console.warn(
        `Build data has ${buildData.trees.length} trees, but current app has ${currentTrees.length} trees. Skipping tree levels.`
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
