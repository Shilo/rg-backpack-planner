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
 * Format: tree1_values;tree2_values;tree3_values[;owned]
 * Example: ",1,1,1;100,,1;,1,1" (owned=0) or ",1,1,1;100,,1;,1,1;5" (owned=5)
 * Zero values are serialized as empty strings for compactness
 * Owned is only included if non-zero (no trailing semicolon if owned=0)
 */
function serializeArrayFormat(
  treeArrays: number[][],
  owned: number,
): string {
  // Join each tree array with commas, using empty string for zero values
  const treeStrings = treeArrays.map((tree) => 
    tree.map((val) => val === 0 ? "" : val.toString()).join(",")
  );
  // Join trees with semicolons, only append owned if non-zero
  if (owned === 0) {
    return treeStrings.join(";");
  }
  return [...treeStrings, owned.toString()].join(";");
}

/**
 * Parses custom compact string back to array format
 * Format: tree1_values;tree2_values;tree3_values[;owned]
 * Returns: [tree1[], tree2[], tree3[], owned]
 * Requires exactly 3 trees. If no owned value is present, defaults to 0
 */
function parseArrayFormat(serialized: string): [number[][], number] | null {
  try {
    const segments = serialized.split(";");
    // Must have exactly 3 trees, optionally followed by owned
    if (segments.length < 3 || segments.length > 4) {
      throw new Error(`Invalid format: expected 3 or 4 segments (3 trees + optional owned), got ${segments.length}`);
    }

    let owned = 0;
    let treeSegments: string[];

    // Check if last segment is owned (single number, no commas)
    const lastSegment = segments[segments.length - 1];
    // If last segment has no commas and is a valid number, it's owned
    if (lastSegment.indexOf(",") === -1 && lastSegment !== "") {
      const lastAsNumber = parseInt(lastSegment, 10);
      if (!isNaN(lastAsNumber) && segments.length === 4) {
        // Last segment is owned, first 3 are trees
        owned = lastAsNumber;
        treeSegments = segments.slice(0, -1);
      } else if (segments.length === 3) {
        // Exactly 3 segments, all are trees (owned defaults to 0)
        treeSegments = segments;
      } else {
        throw new Error(`Invalid format: unexpected segment count with owned value`);
      }
    } else {
      // Last segment has commas or is empty, it's a tree
      if (segments.length !== 3) {
        throw new Error(`Invalid format: expected exactly 3 trees when owned is omitted, got ${segments.length} segments`);
      }
      treeSegments = segments;
    }

    // Parse exactly 3 tree segments
    if (treeSegments.length !== 3) {
      throw new Error(`Invalid format: expected exactly 3 trees, got ${treeSegments.length}`);
    }

    const treeArrays: number[][] = treeSegments.map((segment) => {
      if (segment === "") return []; // Empty tree (all zeros)
      return segment.split(",").map((val) => {
        // Empty string between commas represents 0
        if (val === "") return 0;
        const num = parseInt(val, 10);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${val}`);
        }
        return num;
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
  // Validate input is an array with at least 4 elements (3 trees + owned)
  if (!Array.isArray(arrayFormat) || arrayFormat.length < 4) {
    throw new Error("Invalid array format: must have at least 4 elements (3 trees + owned)");
  }
  
  // Extract owned value (last element must be a number)
  const lastElement = arrayFormat[arrayFormat.length - 1];
  if (typeof lastElement !== "number") {
    throw new Error("Invalid array format: last element must be a number (owned)");
  }
  
  // Format: [tree1[], tree2[], tree3[], owned]
  const treeArrays = arrayFormat.slice(0, -1) as number[][];
  const owned = lastElement;
  
  // Validate we have exactly 3 trees
  if (treeArrays.length !== 3) {
    throw new Error(`Invalid array format: expected 3 trees, got ${treeArrays.length}`);
  }
  
  // Get node IDs in order from baseTree
  const nodeIds = baseTree.map((node) => node.id);
  
  // Convert each tree array back to object format
  const trees: Record<string, number>[] = treeArrays.map((treeArray, treeIndex) => {
    if (!Array.isArray(treeArray)) {
      throw new Error(`Invalid array format: tree ${treeIndex} is not an array`);
    }
    
    const tree: Record<string, number> = {};
    
    // Map array indices to node IDs
    for (let i = 0; i < treeArray.length; i++) {
      if (i < nodeIds.length) {
        if (typeof treeArray[i] !== "number") {
          throw new Error(`Invalid array format: tree ${treeIndex}, index ${i} is not a number`);
        }
        tree[nodeIds[i]] = treeArray[i];
      }
    }
    
    // Note: nodes beyond the array length are implicitly 0, so we don't need to set them
    
    return tree;
  });
  
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
  
  console.warn("[encodeBuildData] Deserialized data before save:", {
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
    
    console.warn("[decodeBuildData] Decoded string:", decoded);
    
    // Use custom parser instead of JSON.parse
    const parsed = parseArrayFormat(decoded);
    if (!parsed) {
      return null;
    }
    
    const [treeArrays, owned] = parsed;
    
    // Convert to BuildData format (reconstruct array format for convertArrayFormatToTrees)
    const arrayFormat = [...treeArrays, owned];
    
    console.warn("[decodeBuildData] Parsed array format after load:", arrayFormat);
    
    const buildData = convertArrayFormatToTrees(arrayFormat);
    
    console.warn("[decodeBuildData] Deserialized data after load:", buildData);
    
    return buildData;
  } catch (error) {
    // Silently fail - this might not be build data
    return null;
  }
}
