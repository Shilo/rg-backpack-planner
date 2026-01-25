/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and serialization for URL sharing (all characters are URL-safe, no base64 encoding needed)
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
 * Branch root node IDs - maps branch type to root node ID
 */
const BRANCH_ROOTS = {
  yellow: "attack",
  orange: "defense",
  blue: "hp",
} as const;

/**
 * Reverse lookup map: root node ID -> branch type (for O(1) lookup)
 */
const ROOT_TO_BRANCH = new Map<string, BranchType>(
  Object.entries(BRANCH_ROOTS).map(([branch, root]) => [root, branch as BranchType])
);

/**
 * Special marker for completely empty build (all trees empty, owned=0)
 */
const EMPTY_BUILD_MARKER = "_";

/**
 * Regex pattern for valid serialized format characters
 * Serialized format uses: base62 numbers (0-9, a-z, A-Z), separators (: ; , - *), and empty marker (_)
 */
export const SERIALIZED_PATTERN = /^[0-9a-zA-Z:;,\-*_]+$/;

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
 * Checks if a node ID matches any branch root
 * @param nodeId The node ID to check
 * @returns The branch type if it's a root, or null
 */
function getBranchRoot(nodeId: string): BranchType | null {
  return ROOT_TO_BRANCH.get(nodeId) ?? null;
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
  const rootBranch = getBranchRoot(nodeId);
  if (rootBranch) {
    branchCache.set(nodeId, rootBranch);
    return rootBranch;
  }

  // Trace ancestry through parentIds
  if (node.parentIds && node.parentIds.length > 0) {
    for (const parentId of node.parentIds) {
      // Check if parent is a branch root
      const parentRootBranch = getBranchRoot(parentId);
      if (parentRootBranch) {
        branchCache.set(nodeId, parentRootBranch);
        return parentRootBranch;
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
 * Base62 character set: 0-9, a-z, A-Z (62 characters total)
 * More compact than base36 for better compression
 */
const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Encodes a number to base-62 string (0-9, a-z, A-Z)
 * More compact than base36 for values > 35
 * @param num Number to encode
 * @returns Base-62 encoded string
 */
function encodeBase62(num: number): string {
  if (num === 0) return "0";
  
  let result = "";
  let n = num;
  while (n > 0) {
    result = BASE62_CHARS[n % 62] + result;
    n = Math.floor(n / 62);
  }
  return result;
}

/**
 * Decodes a base-62 string back to a number
 * @param str Base-62 encoded string (0-9, a-z, A-Z)
 * @returns Decoded number
 */
function decodeBase62(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const charIndex = BASE62_CHARS.indexOf(char);
    if (charIndex === -1) {
      throw new Error(`Invalid base62 character: ${char}`);
    }
    result = result * 62 + charIndex;
  }
  return result;
}

/**
 * Encodes a count for RLE format (uses base62 for counts >= 10 to save space)
 * @param count The count to encode
 * @returns Encoded count string (decimal for 1-9, base62 for 10+)
 */
function encodeRLECount(count: number): string {
  // Use base62 for counts >= 10 to save space (10 → "a", 36 → "A", 62 → "10")
  return count >= 10 ? encodeBase62(count) : count.toString();
}

/**
 * Calculates whether RLE format saves space compared to plain format
 * @param value The value string
 * @param count The repetition count
 * @returns True if RLE format is shorter or equal (for consistency with empty strings)
 */
function shouldUseRLE(value: string, count: number): boolean {
  if (count === 1) {
    return false;
  }
  const plainLength = value.length * count + (count - 1); // "val,val,val" = 3*3+2 = 11
  const encodedCount = encodeRLECount(count); // Uses base62 for counts >= 10
  const rleLength = value.length + 1 + encodedCount.length; // "val-3" or "val-a" = 3+1+1 = 5
  // For empty strings, use RLE when equal length for consistency (e.g., ,, vs -3, both 2 chars)
  // For non-empty strings, only use RLE when it saves space
  return value === "" ? rleLength <= plainLength : rleLength < plainLength;
}

/**
 * Outputs a run (single value or RLE-compressed) to the result array
 * @param result The result array to append to
 * @param value The value to output
 * @param count The repetition count
 */
function outputRun(result: string[], value: string, count: number): void {
  if (shouldUseRLE(value, count)) {
    const encodedCount = encodeRLECount(count);
    result.push(`${value}-${encodedCount}`);
  } else {
    // Output plain values (either single value or when RLE doesn't save space)
    for (let j = 0; j < count; j++) {
      result.push(value);
    }
  }
}

/**
 * Compresses consecutive duplicate values using run-length encoding (RLE)
 * Format: value-count where - is the separator (only when it saves space)
 * Examples: ["2s", "2s", "2s", "2s"] → "2s-4", ["1"] → "1", ["1", "2s"] → "1,2s"
 * @param values Array of base62-encoded value strings
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
      outputRun(result, currentValue, count);
      currentValue = values[i];
      count = 1;
    }
  }

  // Output final run
  outputRun(result, currentValue, count);

  return result.join(",");
}

/**
 * Validates and parses an RLE count from a string (decimal for 1-9, base62 for 10+)
 * @param countStr The count string to parse
 * @param context Context string for error messages
 * @returns The parsed count
 * @throws Error if count is invalid
 */
function parseRLECount(countStr: string, context: string): number {
  // Base62 uses a-z and A-Z, so if it contains letters, it's base62; otherwise decimal
  const hasLetters = /[a-zA-Z]/.test(countStr);
  const count = hasLetters ? decodeBase62(countStr) : parseInt(countStr, 10);
  
  if (isNaN(count) || count < 1) {
    throw new Error(`Invalid RLE format: invalid count in "${context}"`);
  }
  return count;
}

/**
 * Expands a single RLE pattern to an array of values
 * @param pattern The RLE pattern (value-count or -count, count may be base62)
 * @returns Array of expanded values
 * @throws Error if pattern is invalid
 */
function expandRLEPattern(pattern: string): string[] {
  // Count can be decimal (0-9) or base62 (0-9, a-z, A-Z)
  const rleMatchWithValue = pattern.match(/^(.+)-([0-9a-zA-Z]+)$/);
  const rleMatchZeros = pattern.match(/^-([0-9a-zA-Z]+)$/);

  if (rleMatchZeros) {
    // Pattern: -count (run of zeros)
    const count = parseRLECount(rleMatchZeros[1], pattern);
    return Array(count).fill("");
  } else if (rleMatchWithValue) {
    // Pattern: value-count (run of non-zero values)
    const value = rleMatchWithValue[1];
    const count = parseRLECount(rleMatchWithValue[2], pattern);
    return Array(count).fill(value);
  } else {
    // Plain value (no RLE, single occurrence)
    return [pattern];
  }
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
    } else {
      result.push(...expandRLEPattern(part));
    }
  }

  return result;
}

/**
 * Finds the last non-empty index in an array of strings
 * @param strings Array of strings to search
 * @returns Index of last non-empty string, or -1 if all empty
 */
function findLastNonEmptyIndex(strings: string[]): number {
  for (let i = strings.length - 1; i >= 0; i--) {
    if (strings[i] !== "") {
      return i;
    }
  }
  return -1;
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
      // Serialize branch: encode to base62, then compress with RLE
      const base62Values = branch.map((val) => (val === 0 ? "" : encodeBase62(val)));
      return compressRLE(base62Values);
    });

    // Omit trailing empty branches
    const lastNonEmptyIndex = findLastNonEmptyIndex(branchStrings);
    if (lastNonEmptyIndex === -1) {
      return "";
    }

    return branchStrings.slice(0, lastNonEmptyIndex + 1).join(":");
  });

  // Omit trailing empty trees
  const lastNonEmptyTreeIndex = findLastNonEmptyIndex(treeStrings);

  // If all trees are empty, use special marker for empty build (or just owned if non-zero)
  if (lastNonEmptyTreeIndex === -1) {
    return owned === 0 ? EMPTY_BUILD_MARKER : encodeBase62(owned);
  }

  // Get non-empty trees
  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

  // Check if all trees are identical (tree-level RLE compression)
  if (nonEmptyTreeStrings.length === 3) {
    const firstTree = nonEmptyTreeStrings[0];
    if (firstTree !== "" && nonEmptyTreeStrings.every((tree) => tree === firstTree)) {
      // All 3 trees are identical, compress to treeString*count (use base62 for count >= 10)
      const countStr = encodeRLECount(3);
      const treePart = `${firstTree}*${countStr}`;
      return owned === 0 ? treePart : `${treePart};${encodeBase62(owned)}`;
    }
  }

  // Check for partial tree-level RLE compression (2 out of 3 trees identical)
  if (nonEmptyTreeStrings.length >= 2) {
    const result: string[] = [];
    let i = 0;

    while (i < nonEmptyTreeStrings.length) {
      const currentTree = nonEmptyTreeStrings[i];

      // Check if current tree and next tree are identical
      if (i + 1 < nonEmptyTreeStrings.length && currentTree === nonEmptyTreeStrings[i + 1] && currentTree !== "") {
        // Two identical trees found, compress to treeString*2
        result.push(`${currentTree}*${encodeRLECount(2)}`);
        i += 2; // Skip both trees
      } else {
        result.push(currentTree);
        i += 1;
      }
    }

    // If we compressed anything, use the compressed result
    if (result.length < nonEmptyTreeStrings.length) {
      return owned === 0
        ? result.join(";")
        : [...result, encodeBase62(owned)].join(";");
    }
  }

  // Trees are not identical, output normally
  return owned === 0
    ? nonEmptyTreeStrings.join(";")
    : [...nonEmptyTreeStrings, encodeBase62(owned)].join(";");
}

/**
 * Parses a branch segment string into an array of numbers
 * @param branchSegment The branch segment string (may be empty)
 * @returns Array of numbers (empty array if branchSegment is empty)
 */
function parseBranchSegment(branchSegment: string): number[] {
  if (branchSegment === "") {
    return [];
  }
  const expandedValues = expandRLE(branchSegment);
  return expandedValues.map((val) => {
    if (val === "") return 0;
    try {
      return decodeBase62(val);
    } catch (error) {
      throw new Error(`Invalid number value: ${val}`);
    }
  });
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
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  const segments = serialized.split(";");
  let owned = 0;
  let treeSegments: string[];

  // Strict positional order: trees first, then owned at the end
  // If there are multiple segments and the last one has no separators, it must be owned
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1];
    // owned must be a single base62 number with no branch or node separators
    if (!lastSegment.includes(":") && !lastSegment.includes(",") && !lastSegment.includes("*") && lastSegment !== "") {
      try {
        owned = decodeBase62(lastSegment);
      } catch (error) {
        throw new Error(`Invalid owned value: ${lastSegment}`);
      }
      treeSegments = segments.slice(0, -1);
    } else {
      treeSegments = segments;
    }
  } else {
    treeSegments = segments;
  }

  // Expand tree-level RLE (treeString*count format, count may be base62)
  const expandedTreeSegments: string[] = [];
  for (const segment of treeSegments) {
    const treeRLEMatch = segment.match(/^(.+)\*([0-9a-zA-Z]+)$/);
    if (treeRLEMatch) {
      const treeString = treeRLEMatch[1];
      const countStr = treeRLEMatch[2];
      const count = parseRLECount(countStr, segment);
      // Expand the tree repetition
      expandedTreeSegments.push(...Array(count).fill(treeString));
    } else {
      expandedTreeSegments.push(segment);
    }
  }

  // Pad missing trailing trees to 3
  while (expandedTreeSegments.length < 3) {
    expandedTreeSegments.push("");
  }

  // Parse tree segments into branch arrays
  const treeBranchArrays: number[][][] = expandedTreeSegments.map((segment) => {
    if (segment === "") {
      return [[], [], []];
    }

    const branchSegments = segment.split(":");
    // Pad missing trailing branches to 3
    while (branchSegments.length < 3) {
      branchSegments.push("");
    }

    return branchSegments.slice(0, 3).map(parseBranchSegment);
  });

  return [treeBranchArrays, owned];
}

/**
 * Truncates trailing zeros from an array
 * @param arr Array of numbers
 * @returns Array with trailing zeros removed
 */
function truncateTrailingZeros(arr: number[]): number[] {
  let lastNonZeroIndex = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== 0) {
      lastNonZeroIndex = i;
      break;
    }
  }
  return lastNonZeroIndex === -1 ? [] : arr.slice(0, lastNonZeroIndex + 1);
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
  const branchKeys: BranchType[] = ["yellow", "orange", "blue"];

  // Convert each tree to branch-grouped format
  const treeBranchArrays: number[][][] = trees.map((tree) => {
    // Create branch arrays: [yellow[], orange[], blue[]]
    const branches: number[][] = branchKeys.map((branchKey) => {
      const nodeIds = mapping[branchKey];
      return nodeIds.map((nodeId) => tree[nodeId] ?? 0);
    });

    // Truncate trailing zeros from each branch
    return branches.map(truncateTrailingZeros);
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
    const branchKeys: BranchType[] = ["yellow", "orange", "blue"];
    const branches = [yellowBranch, orangeBranch, blueBranch];

    // Map each branch's nodes to the tree object
    branchKeys.forEach((branchKey, branchIndex) => {
      const branch = branches[branchIndex];
      const nodeIds = mapping[branchKey];
      branch.forEach((value, i) => {
        if (i < nodeIds.length) {
          if (typeof value !== "number") {
            throw new Error(
              `Invalid array format: tree ${treeIndex}, ${branchKey} branch, index ${i} is not a number`
            );
          }
          tree[nodeIds[i]] = value;
        }
      });
    });

    // Note: nodes beyond branch array lengths are implicitly 0, so we don't need to set them
    return tree;
  });

  return { trees, owned };
}

/**
 * Encodes build data into a serialized string for URL sharing
 * Uses compact branch-based format with truncated trailing zeros
 * Returns the serialized string directly (all characters are URL-safe, no base64 encoding needed)
 */
export function encodeBuildData(buildData: BuildData): string {
  const [treeArrays, owned] = convertTreesToArrayFormat(buildData.trees, buildData.owned);
  const serialized = serializeArrayFormat(treeArrays, owned);

  console.warn("[encodeBuildData] Deserialized data before save:", {
    arrayFormat: [...treeArrays, owned],
    originalBuildData: buildData,
    serializedString: serialized,
  });

  return serialized;
}

/**
 * Safely executes a function and logs errors, returning null on failure
 * @param fn Function to execute
 * @param errorMessage Error message prefix for logging
 * @returns Function result or null if error occurred
 */
function safeExecute<T>(
  fn: () => T,
  errorMessage: string
): T | null {
  try {
    return fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[decodeBuildData] ${errorMessage}:`, message);
    return null;
  }
}

/**
 * Decodes a serialized string back into build data
 */
export function decodeBuildData(encoded: string): BuildData | null {
  if (!SERIALIZED_PATTERN.test(encoded)) {
    console.warn("[decodeBuildData] Invalid serialized format:", encoded);
    return null;
  }

  const parsed = safeExecute(
    () => parseArrayFormat(encoded),
    "Failed to parse array format"
  );
  if (!parsed) return null;

  const [treeArrays, owned] = parsed;
  const arrayFormat = [...treeArrays, owned];

  console.warn("[decodeBuildData] Parsed array format after load:", arrayFormat);

  const buildData = safeExecute(
    () => convertArrayFormatToTrees(arrayFormat),
    "Failed to convert array format to trees"
  );
  if (!buildData) return null;

  console.warn("[decodeBuildData] Deserialized data after load:", buildData);
  console.warn("[decodeBuildData] Returning buildData: SUCCESS");

  return buildData;
}
