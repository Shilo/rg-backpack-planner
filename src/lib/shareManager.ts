import { treeLevels, setTreeLevels } from "./treeLevelsStore";
import { techCrystalsOwned, setTechCrystalsOwned } from "./techCrystalStore";
import { compressTreeProgress, expandTreeProgress } from "./treeProgressStore";
import type { TreeNode } from "./Tree.svelte";
import { get } from "svelte/store";
import { baseTree } from "../config/baseTree";

// Base path from vite.config.ts - must match the base configuration
const BASE_PATH = "/rg-backpack-planner/";

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
 * Converts tree levels from object format to array format
 * Uses node order from baseTree to map node IDs to array indices
 * Truncates each tree array to the last non-zero index + 1
 * @param trees Array of tree levels as Record<string, number>
 * @returns Array format: [tree1[], tree2[], tree3[], owned]
 */
function convertTreesToArrayFormat(
  trees: Record<string, number>[],
  owned: number,
): [number[][], number] {
  // Get node IDs in order from baseTree
  const nodeIds = baseTree.map((node) => node.id);
  
  // Convert each tree to array format
  const treeArrays: number[][] = trees.map((tree) => {
    // Create array with levels in node order
    const levels = nodeIds.map((nodeId) => tree[nodeId] ?? 0);
    
    // Find last non-zero index
    let lastNonZeroIndex = -1;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (levels[i] !== 0) {
        lastNonZeroIndex = i;
        break;
      }
    }
    
    // Truncate to last non-zero index + 1 (or empty array if all zeros)
    if (lastNonZeroIndex === -1) {
      return [];
    }
    return levels.slice(0, lastNonZeroIndex + 1);
  });
  
  return [treeArrays, owned];
}

/**
 * Converts tree levels from array format back to object format
 * Uses node order from baseTree to map array indices to node IDs
 * Pads truncated arrays with zeros
 * @param arrayFormat Array format: [tree1[], tree2[], tree3[], owned]
 * @returns BuildData with object format
 */
function convertArrayFormatToTrees(
  arrayFormat: unknown,
): BuildData {
  // Validate input is an array
  if (!Array.isArray(arrayFormat) || arrayFormat.length === 0) {
    return { trees: [{}, {}, {}], owned: 0 };
  }
  
  // Extract owned value (last element if it's a number)
  let treeArrays: number[][];
  let owned: number;
  
  const lastElement = arrayFormat[arrayFormat.length - 1];
  if (typeof lastElement === "number" && arrayFormat.length > 1) {
    // Format: [tree1[], tree2[], tree3[], owned]
    treeArrays = arrayFormat.slice(0, -1) as number[][];
    owned = lastElement;
  } else {
    // Fallback: assume owned is 0 if not provided
    treeArrays = arrayFormat as number[][];
    owned = 0;
  }
  
  // Get node IDs in order from baseTree
  const nodeIds = baseTree.map((node) => node.id);
  
  // Convert each tree array back to object format
  const trees: Record<string, number>[] = treeArrays.map((treeArray) => {
    if (!Array.isArray(treeArray)) {
      return {};
    }
    
    const tree: Record<string, number> = {};
    
    // Map array indices to node IDs
    for (let i = 0; i < treeArray.length; i++) {
      if (i < nodeIds.length && typeof treeArray[i] === "number") {
        tree[nodeIds[i]] = treeArray[i];
      }
    }
    
    // Note: nodes beyond the array length are implicitly 0, so we don't need to set them
    
    return tree;
  });
  
  // Ensure we have 3 trees (pad with empty objects if needed)
  while (trees.length < 3) {
    trees.push({});
  }
  
  return { trees, owned };
}

/**
 * Encodes build data into a base64url string for URL sharing
 * Uses compact array-based format with truncated trailing zeros for smallest possible URL
 */
export function encodeBuildData(buildData: BuildData): string {
  // Convert to array format: [tree1[], tree2[], tree3[], owned]
  // Each tree array is truncated to last non-zero index + 1
  const [treeArrays, owned] = convertTreesToArrayFormat(buildData.trees, buildData.owned);
  
  // Create compact array format: [tree1[], tree2[], tree3[], owned]
  // Type assertion needed because TypeScript can't infer the union type correctly
  const arrayFormat = [...treeArrays, owned] as Array<number[] | number>;
  
  // Encode to base64, then convert to base64url for URL safety
  const base64 = btoa(JSON.stringify(arrayFormat));
  return encodeBase64Url(base64);
}

/**
 * Decodes a base64url string back into build data
 * Returns compressed data (expansion happens in applyBuildFromUrl)
 */
export function decodeBuildData(encoded: string): BuildData | null {
  try {
    // Validate that the string looks like valid base64url
    // Base64url characters: A-Z, a-z, 0-9, -, _
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
      return null;
    }
    
    // Convert base64url back to base64, then decode
    const base64 = decodeBase64Url(encoded);
    const decoded = atob(base64);
    const parsed = JSON.parse(decoded);
    
    // Must be array format: [tree1[], tree2[], tree3[], owned]
    if (!Array.isArray(parsed)) {
      return null;
    }
    
    return convertArrayFormatToTrees(parsed);
  } catch (error) {
    // Silently fail - this might not be build data
    return null;
  }
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
    // Only try to decode if it looks like base64url and is long enough
    // Base64url characters: A-Z, a-z, 0-9, -, _
    // Minimum length check helps avoid false positives
    if (/^[A-Za-z0-9_-]+$/.test(lastSegment) && lastSegment.length >= 8) {
      const decoded = decodeBuildData(lastSegment);
      if (decoded) {
        return decoded;
      }
    }
  }
  
  return null;
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
 * Updates the current URL with the current build data
 * Used in preview mode to keep URL in sync with changes
 * Does not reload the page, just updates the URL
 * Uses path-based routing: /{encoded}
 */
export function updateUrlWithCurrentBuild(): void {
  if (typeof window === "undefined") return;
  
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
    
    // Remove the last segment if it's valid build data
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Only remove if it successfully decodes as build data
      if (/^[A-Za-z0-9_-]+$/.test(lastSegment) && lastSegment.length >= 8) {
        const testDecoded = decodeBuildData(lastSegment);
        if (testDecoded) {
          pathSegments.pop();
        }
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
