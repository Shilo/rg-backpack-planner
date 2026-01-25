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
      // Serialize branch as comma-separated values, empty string for zero
      return branch.map((val) => (val === 0 ? "" : val.toString())).join(",");
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
    return owned.toString();
  }

  // Get non-empty trees
  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

  // Join trees with semicolons, append owned if non-zero
  if (owned === 0) {
    return nonEmptyTreeStrings.join(";");
  }
  return [...nonEmptyTreeStrings, owned.toString()].join(";");
}

/**
 * Parses branch-grouped custom compact string back to array format
 * Format: yellow:orange:blue;yellow:orange:blue;yellow:orange:blue[;owned]
 * Returns: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * Pads missing trees and branches, defaults owned to 0
 */
function parseArrayFormat(serialized: string): [number[][][], number] | null {
  try {
    // Handle special marker for empty build
    if (serialized === EMPTY_BUILD_MARKER) {
      // Return 3 trees, each with 3 empty branches
      return [[[[], [], []], [[], [], []], [[], [], []]], 0];
    }

    const segments = serialized.split(";");
    let owned = 0;
    let treeSegments: string[];

    // Strict positional order: trees first, then owned at the end
    // Check if last segment could be owned (single number, no `:` or `,` separators)
    if (segments.length > 1) {
      const lastSegment = segments[segments.length - 1];
      // owned must be a single number with no branch or node separators
      if (lastSegment.indexOf(":") === -1 && lastSegment.indexOf(",") === -1 && lastSegment !== "") {
        const lastAsNumber = parseInt(lastSegment, 10);
        if (!isNaN(lastAsNumber)) {
          // Last segment is owned, all previous segments are trees
          owned = lastAsNumber;
          treeSegments = segments.slice(0, -1);
        } else {
          // Not a valid number, treat as tree segment
          treeSegments = segments;
        }
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
        // Parse comma-separated values
        return branchSegment.split(",").map((val) => {
          if (val === "") return 0; // Empty string between commas represents 0
          const num = parseInt(val, 10);
          if (isNaN(num)) {
            throw new Error(`Invalid number value: ${val}`);
          }
          return num;
        });
      });

      return branches;
    });

    return [treeBranchArrays, owned];
  } catch {
    return null;
  }
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
  try {
    // Validate that the string looks like valid base64url
    if (!BASE64URL_PATTERN.test(encoded)) {
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
    console.warn("[decodeBuildData] Returning buildData:", buildData !== null ? "SUCCESS" : "NULL");

    return buildData;
  } catch (error) {
    // Log error for debugging
    console.error("[decodeBuildData] Error during decoding:", error);
    // Silently fail - this might not be build data
    return null;
  }
}
