/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and base64url encoding for URL sharing
 */

import { baseTree } from "../../config/baseTree";

/**
 * TreeNode type (matching Tree.svelte)
 */
type TreeNode = {
  id: string;
  x: number;
  y: number;
  maxLevel: number;
  label?: string;
  parentIds?: string[];
  radius?: number;
};

/**
 * Build data structure representing tree levels and tech crystals owned
 */
export interface BuildData {
  trees: Record<string, number>[];
  owned: number;
}

/**
 * Branch types: yellow (attack), orange (defense), blue (hp)
 */
type BranchType = "yellow" | "orange" | "blue";

/**
 * Branch root node IDs
 */
const BRANCH_ROOTS = {
  yellow: "attack",
  orange: "defense",
  blue: "hp",
} as const;

/**
 * Special marker for completely empty build (all trees empty, owned=0)
 */
const EMPTY_BUILD_MARKER = "_";

/**
 * Regex pattern for valid base64url characters
 * Base64url characters: A-Z, a-z, 0-9, -, _
 */
export const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Node map for quick lookup
 */
let nodeMap: Map<string, TreeNode> | null = null;

/**
 * Branch membership cache
 */
let branchCache: Map<string, BranchType> | null = null;

/**
 * Initialize node map from baseTree
 */
function initializeNodeMap(): Map<string, TreeNode> {
  if (!nodeMap) {
    nodeMap = new Map();
    for (const node of baseTree) {
      nodeMap.set(node.id, node);
    }
  }
  return nodeMap;
}

/**
 * Determines which branch a node belongs to by tracing ancestry back to branch roots
 * @param nodeId The node ID to check
 * @returns The branch type (yellow, orange, or blue)
 */
function getNodeBranch(nodeId: string): BranchType {
  // Initialize cache if needed
  if (!branchCache) {
    branchCache = new Map();
  }

  // Check cache first
  if (branchCache.has(nodeId)) {
    return branchCache.get(nodeId)!;
  }

  const nodeMap = initializeNodeMap();
  const node = nodeMap.get(nodeId);

  if (!node) {
    // Node not found, default to yellow (shouldn't happen)
    branchCache.set(nodeId, "yellow");
    return "yellow";
  }

  // Check if this node is a branch root
  if (nodeId === BRANCH_ROOTS.yellow) {
    branchCache.set(nodeId, "yellow");
    return "yellow";
  }
  if (nodeId === BRANCH_ROOTS.orange) {
    branchCache.set(nodeId, "orange");
    return "orange";
  }
  if (nodeId === BRANCH_ROOTS.blue) {
    branchCache.set(nodeId, "blue");
    return "blue";
  }

  // Trace ancestry through parentIds
  if (node.parentIds && node.parentIds.length > 0) {
    for (const parentId of node.parentIds) {
      // Check if parent is a branch root
      if (parentId === BRANCH_ROOTS.yellow) {
        branchCache.set(nodeId, "yellow");
        return "yellow";
      }
      if (parentId === BRANCH_ROOTS.orange) {
        branchCache.set(nodeId, "orange");
        return "orange";
      }
      if (parentId === BRANCH_ROOTS.blue) {
        branchCache.set(nodeId, "blue");
        return "blue";
      }

      // Recursively check parent
      const parentBranch = getNodeBranch(parentId);
      branchCache.set(nodeId, parentBranch);
      return parentBranch;
    }
  }

  // No parentIds or root connection - this shouldn't happen for valid trees
  // Default to yellow
  branchCache.set(nodeId, "yellow");
  return "yellow";
}

/**
 * Creates branch mapping: maps each branch to an ordered array of node IDs
 * @returns Object with yellow, orange, blue arrays of node IDs in order
 */
function createBranchMapping(): {
  yellow: string[];
  orange: string[];
  blue: string[];
} {
  const mapping = {
    yellow: [] as string[],
    orange: [] as string[],
    blue: [] as string[],
  };

  // Process nodes in baseTree order to maintain consistent ordering
  for (const node of baseTree) {
    const branch = getNodeBranch(node.id);
    mapping[branch].push(node.id);
  }

  return mapping;
}

/**
 * Cached branch mapping
 */
let branchMapping: ReturnType<typeof createBranchMapping> | null = null;

/**
 * Gets the branch mapping (cached)
 */
function getBranchMapping() {
  if (!branchMapping) {
    branchMapping = createBranchMapping();
  }
  return branchMapping;
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
 * Encodes a number to base-36 string (0-9, a-z)
 * More compact than decimal for values > 9
 * @param num Number to encode
 * @returns Base-36 encoded string (lowercase)
 */
function encodeBase36(num: number): string {
  if (num === 0) {
    return "0";
  }
  return num.toString(36);
}

/**
 * Decodes a base-36 string back to a number
 * @param str Base-36 encoded string (0-9, a-z)
 * @returns Decoded number
 */
function decodeBase36(str: string): number {
  return parseInt(str, 36);
}

/**
 * Compresses consecutive duplicate values using run-length encoding (RLE)
 * Format: value-count where - is the separator (only when count > 1)
 * Single values are output without RLE format for better compression
 * Examples: ["2s", "2s", "2s", "2s"] → "2s-4", ["1"] → "1", ["1", "2s"] → "1,2s"
 * @param values Array of base36-encoded value strings
 * @returns RLE-compressed string with commas separating runs
 */
function compressRLE(values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  const result: string[] = [];
  let currentValue = values[0];
  let count = 1;

  for (let i = 1; i < values.length; i++) {
    if (values[i] === currentValue) {
      count++;
    } else {
      // Output current run
      // Use RLE only if it actually saves space
      // Plain format: "value,value,value" = value.length * count + (count - 1) commas
      // RLE format: "value-count" = value.length + 1 + count.toString().length
      if (count === 1) {
        result.push(currentValue);
      } else {
        const plainLength = currentValue.length * count + (count - 1);
        const rleLength = currentValue.length + 1 + count.toString().length;
        if (rleLength < plainLength) {
          result.push(`${currentValue}-${count}`);
        } else {
          // RLE doesn't save space, output plain values
          for (let j = 0; j < count; j++) {
            result.push(currentValue);
          }
        }
      }
      // Start new run
      currentValue = values[i];
      count = 1;
    }
  }

  // Output final run
  if (count === 1) {
    result.push(currentValue);
  } else {
    const plainLength = currentValue.length * count + (count - 1);
    const rleLength = currentValue.length + 1 + count.toString().length;
    if (rleLength < plainLength) {
      result.push(`${currentValue}-${count}`);
    } else {
      // RLE doesn't save space, output plain values
      for (let j = 0; j < count; j++) {
        result.push(currentValue);
      }
    }
  }

  return result.join(",");
}

/**
 * Expands RLE-compressed string back to array of values
 * Accepts both RLE format (value-count or -count) and plain values
 * Examples: "2s-4" → ["2s", "2s", "2s", "2s"], "-3" → ["", "", ""], "1" → ["1"]
 * @param valueString Comma-separated string with RLE patterns or plain values
 * @returns Array of expanded value strings
 */
function expandRLE(valueString: string): string[] {
  if (valueString === "") {
    return [];
  }

  const parts = valueString.split(",");
  const result: string[] = [];

  for (const part of parts) {
    if (part === "") {
      // Empty part represents zero
      result.push("");
      continue;
    }
    
    // Check if this is an RLE pattern
    // Pattern 1: value-count (e.g., "2s-4")
    // Pattern 2: -count (e.g., "-3" for 3 zeros)
    const rleMatchWithValue = part.match(/^(.+)-(\d+)$/);
    const rleMatchZeros = part.match(/^-(\d+)$/);
    
    if (rleMatchZeros) {
      // Pattern: -count (run of zeros)
      const count = parseInt(rleMatchZeros[1], 10);
      if (isNaN(count) || count < 1) {
        throw new Error(`Invalid RLE format: invalid count in "${part}"`);
      }
      for (let i = 0; i < count; i++) {
        result.push("");
      }
    } else if (rleMatchWithValue) {
      // Pattern: value-count (run of non-zero values)
      const value = rleMatchWithValue[1];
      const count = parseInt(rleMatchWithValue[2], 10);
      if (isNaN(count) || count < 1) {
        throw new Error(`Invalid RLE format: invalid count in "${part}"`);
      }
      // Expand the run
      for (let i = 0; i < count; i++) {
        result.push(value);
      }
    } else {
      // Plain value (no RLE, single occurrence)
      result.push(part);
    }
  }

  return result;
}

/**
 * Serializes branch-grouped array format to custom compact string
 * Format: yellow:orange:blue;yellow:orange:blue;yellow:orange:blue[;owned]
 * Trailing empty branches and trailing empty trees are omitted
 * Owned is only included if non-zero
 * @param treeBranchArrays Array of [yellow[], orange[], blue[]] for each tree
 * @param owned Number of tech crystals owned
 * @returns Serialized string
 */
function serializeArrayFormat(
  treeBranchArrays: number[][][],
  owned: number,
): string {
  // Serialize each tree's branches
  const treeStrings: string[] = treeBranchArrays.map((branches) => {
    // branches is [yellow[], orange[], blue[]]
    const branchStrings: string[] = branches.map((branch) => {
      // Serialize branch: encode to base36, then compress with RLE
      const base36Values = branch.map((val) => (val === 0 ? "" : encodeBase36(val)));
      // Apply RLE compression to reduce repeated values
      return compressRLE(base36Values);
    });

    // Omit trailing empty branches
    // Find last non-empty branch index
    let lastNonEmptyIndex = -1;
    for (let i = branchStrings.length - 1; i >= 0; i--) {
      if (branchStrings[i] !== "") {
        lastNonEmptyIndex = i;
        break;
      }
    }

    // If all branches are empty, return empty string
    if (lastNonEmptyIndex === -1) {
      return "";
    }

    // Return branches up to last non-empty, joined with :
    return branchStrings.slice(0, lastNonEmptyIndex + 1).join(":");
  });

  // Omit trailing empty trees
  let lastNonEmptyTreeIndex = -1;
  for (let i = treeStrings.length - 1; i >= 0; i--) {
    if (treeStrings[i] !== "") {
      lastNonEmptyTreeIndex = i;
      break;
    }
  }

  // If all trees are empty, use special marker for empty build (or just owned if non-zero)
  if (lastNonEmptyTreeIndex === -1) {
    if (owned === 0) {
      // Use special marker for completely empty build
      return EMPTY_BUILD_MARKER;
    }
    return encodeBase36(owned);
  }

  // Get non-empty trees
  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

  // Join trees with semicolons, append owned if non-zero
  if (owned === 0) {
    return nonEmptyTreeStrings.join(";");
  }
  return [...nonEmptyTreeStrings, encodeBase36(owned)].join(";");
}

/**
 * Parses branch-grouped custom compact string back to array format
 * Format: yellow:orange:blue;yellow:orange:blue;yellow:orange:blue[;owned]
 * Returns: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * Pads missing trees and branches, defaults owned to 0
 */
function parseArrayFormat(serialized: string): [number[][][], number] {
  // Handle special marker for empty build
  if (serialized === EMPTY_BUILD_MARKER) {
    // Return 3 trees, each with 3 empty branches
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  const segments = serialized.split(";");
  let owned = 0;
  let treeSegments: string[];

  // Strict positional order: trees first, then owned at the end
  // If there are multiple segments and the last one has no separators, it must be owned
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1];
    // owned must be a single base36 number with no branch or node separators
    if (lastSegment.indexOf(":") === -1 && lastSegment.indexOf(",") === -1 && lastSegment !== "") {
      // Last segment is owned, all previous segments are trees
      owned = decodeBase36(lastSegment);
      if (isNaN(owned)) {
        throw new Error(`Invalid owned value: ${lastSegment}`);
      }
      treeSegments = segments.slice(0, -1);
    } else {
      // Last segment has separators or is empty, all segments are trees
      treeSegments = segments;
    }
  } else {
    // Only one segment - must be a tree segment (owned is always after trees)
    treeSegments = segments;
  }

  // Pad missing trailing trees to 3 (fill in trailing trees)
  while (treeSegments.length < 3) {
    treeSegments.push("");
  }

  // Parse tree segments into branch arrays
  const treeBranchArrays: number[][][] = treeSegments.map((segment) => {
    // If empty string, all 3 branches are empty
    if (segment === "") {
      return [[], [], []];
    }

    // Split by `:` to get branch segments (strict order: yellow:orange:blue)
    const branchSegments = segment.split(":");

    // Pad missing trailing branches to 3 (fill in trailing branches)
    while (branchSegments.length < 3) {
      branchSegments.push("");
    }

    // Parse each branch segment
    const branches: number[][] = branchSegments.slice(0, 3).map((branchSegment) => {
      if (branchSegment === "") {
        return []; // Empty branch
      }
      // Expand RLE patterns and parse values
      const expandedValues = expandRLE(branchSegment);
      return expandedValues.map((val) => {
        if (val === "") return 0; // Empty string represents 0
        const num = decodeBase36(val);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${val}`);
        }
        return num;
      });
    });

    return branches;
  });

  return [treeBranchArrays, owned];
}

/**
 * Converts tree levels from object format to branch-grouped array format
 * Groups nodes by branch (yellow, orange, blue) instead of circular order
 * @param trees Array of tree levels as Record<string, number>
 * @returns Array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 */
function convertTreesToArrayFormat(
  trees: Record<string, number>[],
  owned: number,
): [number[][][], number] {
  const mapping = getBranchMapping();

  // Convert each tree to branch-grouped format
  const treeBranchArrays: number[][][] = trees.map((tree) => {
    // Create branch arrays: [yellow[], orange[], blue[]]
    const branches: number[][] = [
      [], // yellow
      [], // orange
      [], // blue
    ];

    // Map nodes to their branches
    for (const nodeId of mapping.yellow) {
      const value = tree[nodeId] ?? 0;
      branches[0].push(value);
    }
    for (const nodeId of mapping.orange) {
      const value = tree[nodeId] ?? 0;
      branches[1].push(value);
    }
    for (const nodeId of mapping.blue) {
      const value = tree[nodeId] ?? 0;
      branches[2].push(value);
    }

    // Truncate trailing zeros from each branch
    const truncatedBranches: number[][] = branches.map((branch) => {
      // Find last non-zero index
      let lastNonZeroIndex = -1;
      for (let i = branch.length - 1; i >= 0; i--) {
        if (branch[i] !== 0) {
          lastNonZeroIndex = i;
          break;
        }
      }
      // Return truncated branch (or empty array if all zeros)
      if (lastNonZeroIndex === -1) {
        return [];
      }
      return branch.slice(0, lastNonZeroIndex + 1);
    });

    return truncatedBranches;
  });

  return [treeBranchArrays, owned];
}

/**
 * Converts tree levels from branch-grouped array format back to object format
 * Maps branch arrays back to node positions using branch mapping
 * @param arrayFormat Array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
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

  // Format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
  const treeBranchArrays = arrayFormat.slice(0, -1) as number[][][];
  const owned = lastElement;

  // Validate we have exactly 3 trees
  if (treeBranchArrays.length !== 3) {
    throw new Error(`Invalid array format: expected 3 trees, got ${treeBranchArrays.length}`);
  }

  const mapping = getBranchMapping();

  // Convert each tree's branch arrays back to object format
  const trees: Record<string, number>[] = treeBranchArrays.map((treeBranches, treeIndex) => {
    if (!Array.isArray(treeBranches)) {
      throw new Error(`Invalid array format: tree ${treeIndex} is not an array`);
    }

    // Validate branches structure: [yellow[], orange[], blue[]]
    if (treeBranches.length !== 3) {
      throw new Error(`Invalid array format: tree ${treeIndex} must have 3 branches, got ${treeBranches.length}`);
    }

    const [yellowBranch, orangeBranch, blueBranch] = treeBranches;

    // Validate each branch is an array
    if (!Array.isArray(yellowBranch) || !Array.isArray(orangeBranch) || !Array.isArray(blueBranch)) {
      throw new Error(`Invalid array format: tree ${treeIndex} branches must be arrays`);
    }

    const tree: Record<string, number> = {};

    // Map yellow branch nodes
    for (let i = 0; i < yellowBranch.length; i++) {
      if (i < mapping.yellow.length) {
        const nodeId = mapping.yellow[i];
        if (typeof yellowBranch[i] !== "number") {
          throw new Error(`Invalid array format: tree ${treeIndex}, yellow branch, index ${i} is not a number`);
        }
        tree[nodeId] = yellowBranch[i];
      }
    }

    // Map orange branch nodes
    for (let i = 0; i < orangeBranch.length; i++) {
      if (i < mapping.orange.length) {
        const nodeId = mapping.orange[i];
        if (typeof orangeBranch[i] !== "number") {
          throw new Error(`Invalid array format: tree ${treeIndex}, orange branch, index ${i} is not a number`);
        }
        tree[nodeId] = orangeBranch[i];
      }
    }

    // Map blue branch nodes
    for (let i = 0; i < blueBranch.length; i++) {
      if (i < mapping.blue.length) {
        const nodeId = mapping.blue[i];
        if (typeof blueBranch[i] !== "number") {
          throw new Error(`Invalid array format: tree ${treeIndex}, blue branch, index ${i} is not a number`);
        }
        tree[nodeId] = blueBranch[i];
      }
    }

    // Note: nodes beyond branch array lengths are implicitly 0, so we don't need to set them

    return tree;
  });

  return { trees, owned };
}

/**
 * Encodes build data into a base64url string for URL sharing
 * Uses compact branch-based format with truncated trailing zeros for smallest possible URL
 */
export function encodeBuildData(buildData: BuildData): string {
  // Convert to branch-grouped array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
  // Each tree_branches is [yellow[], orange[], blue[]]
  // Each branch is truncated to last non-zero index + 1
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
  // Validate that the string looks like valid base64url
  if (!BASE64URL_PATTERN.test(encoded)) {
    console.warn("[decodeBuildData] Invalid base64url format:", encoded);
    return null;
  }

  try {
    // Convert base64url back to base64, then decode
    const base64 = decodeBase64Url(encoded);
    let decoded: string;
    try {
      decoded = atob(base64);
    } catch (error) {
      console.warn("[decodeBuildData] Failed to decode base64 string:", error instanceof Error ? error.message : String(error));
      return null;
    }

    console.warn("[decodeBuildData] Decoded string:", decoded);

    // Use custom parser instead of JSON.parse
    let treeArrays: number[][][];
    let owned: number;
    try {
      [treeArrays, owned] = parseArrayFormat(decoded);
    } catch (error) {
      console.warn("[decodeBuildData] Failed to parse array format:", error instanceof Error ? error.message : String(error));
      return null;
    }

    // Convert to BuildData format (reconstruct array format for convertArrayFormatToTrees)
    const arrayFormat = [...treeArrays, owned];

    console.warn("[decodeBuildData] Parsed array format after load:", arrayFormat);

    let buildData: BuildData;
    try {
      buildData = convertArrayFormatToTrees(arrayFormat);
    } catch (error) {
      console.warn("[decodeBuildData] Failed to convert array format to trees:", error instanceof Error ? error.message : String(error));
      return null;
    }

    console.warn("[decodeBuildData] Deserialized data after load:", buildData);
    console.warn("[decodeBuildData] Returning buildData: SUCCESS");

    return buildData;
  } catch (error) {
    // Catch any unexpected errors
    console.warn("[decodeBuildData] Unexpected error during decoding:", error instanceof Error ? error.message : String(error));
    return null;
  }
}
