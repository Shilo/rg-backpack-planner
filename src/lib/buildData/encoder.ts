/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and base64url encoding for URL sharing
 */

import { baseTree } from "../../config/baseTree";

/**
 * Build data structure representing tree levels and tech crystals owned
 */
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
  
  // Log deserialized data before encoding
  const jsonString = JSON.stringify(arrayFormat);
  console.log("[encodeBuildData] Deserialized data before save:", {
    arrayFormat,
    originalBuildData: buildData,
    jsonString,
  });
  
  // Encode to base64, then convert to base64url for URL safety
  const base64 = btoa(jsonString);
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
    
    // Log the decoded JSON string
    console.log("[decodeBuildData] Decoded JSON string:", decoded);
    
    const parsed = JSON.parse(decoded);
    
    // Must be array format: [tree1[], tree2[], tree3[], owned]
    if (!Array.isArray(parsed)) {
      return null;
    }
    
    // Log parsed array format
    console.log("[decodeBuildData] Parsed array format after load:", parsed);
    
    const buildData = convertArrayFormatToTrees(parsed);
    
    // Log final deserialized data
    console.log("[decodeBuildData] Deserialized data after load:", buildData);
    
    return buildData;
  } catch (error) {
    // Silently fail - this might not be build data
    return null;
  }
}
