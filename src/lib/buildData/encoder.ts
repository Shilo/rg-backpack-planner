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
 * Serializes array format to custom compact string
 * Format: tree1_values;tree2_values;tree3_values;owned
 * Example: "0,1,1,1;100,0,1;0,1,1;0"
 */
function serializeArrayFormat(
  treeArrays: number[][],
  owned: number,
): string {
  // Join each tree array with commas
  const treeStrings = treeArrays.map((tree) => tree.join(","));
  // Join all trees and owned with semicolons
  return [...treeStrings, owned.toString()].join(";");
}

/**
 * Parses custom compact string back to array format
 * Format: tree1_values;tree2_values;tree3_values;owned
 * Returns: [tree1[], tree2[], tree3[], owned]
 */
function parseArrayFormat(serialized: string): [number[][], number] | null {
  try {
    const segments = serialized.split(";");
    if (segments.length < 2) return null; // Need at least one tree + owned

    // Last segment is owned
    const owned = parseInt(segments[segments.length - 1], 10);
    if (isNaN(owned)) return null;

    // All segments except last are trees
    const treeArrays: number[][] = segments.slice(0, -1).map((segment) => {
      if (segment === "") return []; // Empty tree
      return segment.split(",").map((val) => {
        const num = parseInt(val, 10);
        return isNaN(num) ? 0 : num;
      });
    });

    return [treeArrays, owned];
  } catch {
    return null;
  }
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
  
  // Use custom serializer instead of JSON.stringify
  const serialized = serializeArrayFormat(treeArrays, owned);
  
  console.log("[encodeBuildData] Deserialized data before save:", {
    arrayFormat: [...treeArrays, owned],
    originalBuildData: buildData,
    serializedString: serialized,
  });
  
  // Encode to base64, then convert to base64url for URL safety
  const base64 = btoa(serialized);
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
    
    console.log("[decodeBuildData] Decoded string:", decoded);
    
    // Use custom parser instead of JSON.parse
    const parsed = parseArrayFormat(decoded);
    if (!parsed) {
      return null;
    }
    
    const [treeArrays, owned] = parsed;
    
    // Convert to BuildData format (reconstruct array format for convertArrayFormatToTrees)
    const arrayFormat = [...treeArrays, owned];
    
    console.log("[decodeBuildData] Parsed array format after load:", arrayFormat);
    
    const buildData = convertArrayFormatToTrees(arrayFormat);
    
    console.log("[decodeBuildData] Deserialized data after load:", buildData);
    
    return buildData;
  } catch (error) {
    // Silently fail - this might not be build data
    return null;
  }
}
