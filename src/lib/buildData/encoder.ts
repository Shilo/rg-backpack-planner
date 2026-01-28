/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and serialization for URL sharing (all characters are URL-safe, no base64 encoding needed)
 */

import { baseTree } from "../../config/baseTree";

/**
 * Build data structure representing tree levels and tech crystals owned.
 * Levels are stored as a single flat array indexed by:
 *   flatIndex = treeIndex * baseTree.length + nodeIndex
 * Encoder uses baseTree only for length and fixed branch layout (0-9 yellow, 10-19 orange, 20-29 blue).
 */
export interface BuildData {
  levels: number[];
  owned: number;
}

type BranchType = "yellow" | "orange" | "blue";

const BRANCH_KEYS: BranchType[] = ["yellow", "orange", "blue"];

function getNodeBranch(index: number): BranchType {
  if (index < 10) return "yellow";
  if (index < 20) return "orange";
  return "blue";
}

/**
 * Special marker for completely empty build (all trees empty, owned=0)
 */
const EMPTY_BUILD_MARKER = "_";

/**
 * Separator constants for serialization format
 * All separators are URL-safe and don't require encoding
 */
const SEPARATOR_NODE_VALUE = "."; // Separates node values within a branch
const SEPARATOR_BRANCH = ","; // Separates branches within a tree
const SEPARATOR_TREE = ";"; // Separates trees and owned value
const SEPARATOR_RLE_NODE_COUNT = "'"; // Separates value from count in RLE node patterns
const SEPARATOR_RLE_TREE_COUNT = ":"; // Separates tree string from count in RLE tree patterns

/**
 * Regex pattern for valid serialized format characters
 * Serialized format uses: base62 numbers (0-9, a-z, A-Z), separators (.,;':), and empty marker (_)
 */
export const SERIALIZED_PATTERN = /^[0-9a-zA-Z.,;':_]+$/;

/**
 * Branch mapping: ordered node indices per branch. Uses baseTree.length only.
 */
function createBranchMapping(): Record<BranchType, number[]> {
  const mapping: Record<BranchType, number[]> = {
    yellow: [],
    orange: [],
    blue: [],
  };
  for (let i = 0; i < baseTree.length; i++) {
    mapping[getNodeBranch(i)].push(i);
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

  // Always use RLE for zeros when count >= 2 (saves space: '2 = 2 chars vs .. = 2 chars, '3 = 2 chars vs ... = 3 chars)
  if (value === "" && count >= 2) {
    return true;
  }

  // Always use RLE for count=2 if value length > 1 (saves 1 char: "val'2" = 5 chars vs "val.val" = 6 chars)
  if (count === 2 && value.length > 1) {
    return true;
  }

  const plainLength = value.length * count + (count - 1); // "val.val.val" = 3*3+2 = 11
  const encodedCount = encodeRLECount(count); // Uses base62 for counts >= 10
  const rleLength = value.length + 1 + encodedCount.length; // "val'3" or "val'a" = 3+1+1 = 5
  // For non-empty strings, only use RLE when it saves space
  return rleLength < plainLength;
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
    result.push(`${value}${SEPARATOR_RLE_NODE_COUNT}${encodedCount}`);
  } else {
    // Output plain values (either single value or when RLE doesn't save space)
    for (let j = 0; j < count; j++) {
      result.push(value);
    }
  }
}

/**
 * Compresses consecutive duplicate values using run-length encoding (RLE)
 * Format: value-count where ' is the separator (only when it saves space)
 * Examples: ["2s", "2s", "2s", "2s"] → "2s'4", ["1"] → "1", ["1", "2s"] → "1.2s"
 * @param values Array of base62-encoded value strings
 * @returns RLE-compressed string with periods separating runs
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

  return result.join(SEPARATOR_NODE_VALUE);
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
 * @param pattern The RLE pattern (value'count or 'count, count may be base62)
 * @returns Array of expanded values
 * @throws Error if pattern is invalid
 */
function expandRLEPattern(pattern: string): string[] {
  // Count can be decimal (0-9) or base62 (0-9, a-z, A-Z)
  // Single quote is not a special regex character, but we escape it for clarity
  const escapedRleNodeCountSeparator = SEPARATOR_RLE_NODE_COUNT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rleMatchWithValue = pattern.match(new RegExp(`^(.+)${escapedRleNodeCountSeparator}([0-9a-zA-Z]+)$`));
  const rleMatchZeros = pattern.match(new RegExp(`^${escapedRleNodeCountSeparator}([0-9a-zA-Z]+)$`));

  if (rleMatchZeros) {
    // Pattern: 'count (run of zeros)
    const count = parseRLECount(rleMatchZeros[1], pattern);
    return Array(count).fill("");
  } else if (rleMatchWithValue) {
    // Pattern: value'count (run of non-zero values)
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
 * Accepts both RLE format (value'count or 'count) and plain values
 * Examples: "2s'4" → ["2s", "2s", "2s", "2s"], "'3" → ["", "", ""], "1" → ["1"]
 * @param valueString Period-separated string with RLE patterns or plain values
 * @returns Array of expanded value strings
 */
function expandRLE(valueString: string): string[] {
  if (valueString === "") {
    return [];
  }

  const parts = valueString.split(SEPARATOR_NODE_VALUE);
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
 * Format: yellow,orange,blue;yellow,orange,blue;yellow,orange,blue[;owned]
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

    return branchStrings.slice(0, lastNonEmptyIndex + 1).join(SEPARATOR_BRANCH);
  });

  // Omit trailing empty trees
  const lastNonEmptyTreeIndex = findLastNonEmptyIndex(treeStrings);

  // If all trees are empty, use special marker for empty build (or just owned if non-zero)
  // However, to avoid ambiguity with single tree values, we always include the tree structure
  // even for empty builds. Use ";" prefix to indicate owned-only builds.
  if (lastNonEmptyTreeIndex === -1) {
    return owned === 0 ? EMPTY_BUILD_MARKER : `${SEPARATOR_TREE}${encodeBase62(owned)}`;
  }

  // Get non-empty trees
  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

  // Check if all trees are identical (tree-level RLE compression)
  if (nonEmptyTreeStrings.length === 3) {
    const firstTree = nonEmptyTreeStrings[0];
    if (firstTree !== "" && nonEmptyTreeStrings.every((tree) => tree === firstTree)) {
      // All 3 trees are identical, compress to treeString:count (use base62 for count >= 10)
      const countStr = encodeRLECount(3);
      const treePart = `${firstTree}${SEPARATOR_RLE_TREE_COUNT}${countStr}`;
      return owned === 0 ? treePart : `${treePart}${SEPARATOR_TREE}${encodeBase62(owned)}`;
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
        // Two identical trees found, compress to treeString:2
        result.push(`${currentTree}${SEPARATOR_RLE_TREE_COUNT}${encodeRLECount(2)}`);
        i += 2; // Skip both trees
      } else {
        result.push(currentTree);
        i += 1;
      }
    }

    // If we compressed anything, use the compressed result
    if (result.length < nonEmptyTreeStrings.length) {
      return owned === 0
        ? result.join(SEPARATOR_TREE)
        : [...result, encodeBase62(owned)].join(SEPARATOR_TREE);
    }
  }

  // Trees are not identical, output normally
  return owned === 0
    ? nonEmptyTreeStrings.join(SEPARATOR_TREE)
    : [...nonEmptyTreeStrings, encodeBase62(owned)].join(SEPARATOR_TREE);
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
 * Format: yellow,orange,blue;yellow,orange,blue;yellow,orange,blue[;owned]
 * Returns: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * Pads missing trees and branches, defaults owned to 0
 */
function parseArrayFormat(serialized: string): [number[][][], number] {
  // Handle special marker for empty build
  if (serialized === EMPTY_BUILD_MARKER) {
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  const segments = serialized.split(SEPARATOR_TREE);
  let owned = 0;
  let treeSegments: string[];

  // Strict positional order: trees first, then owned at the end
  // If there are multiple segments and the last one has no separators, it must be owned
  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1];
    // owned must be a single base62 number with no branch, node, or RLE tree count separators
    if (!lastSegment.includes(SEPARATOR_BRANCH) && !lastSegment.includes(SEPARATOR_NODE_VALUE) && !lastSegment.includes(SEPARATOR_RLE_TREE_COUNT) && lastSegment !== "") {
      try {
        owned = decodeBase62(lastSegment);
      } catch (error) {
        throw new Error(`Invalid owned value: ${lastSegment}`);
      }
      treeSegments = segments.slice(0, -1);
    } else {
      treeSegments = segments;
    }
  } else if (segments.length === 1) {
    // Single segment: could be empty build marker, owned value (empty build with owned), or a tree
    const singleSegment = segments[0];

    // If it's the empty build marker, handle it
    if (singleSegment === EMPTY_BUILD_MARKER) {
      treeSegments = [];
    } else if (!singleSegment.includes(SEPARATOR_BRANCH) && !singleSegment.includes(SEPARATOR_NODE_VALUE) && !singleSegment.includes(SEPARATOR_RLE_TREE_COUNT) && singleSegment !== "") {
      // Single segment with no separators (no ,, ., or :)
      // The encoder now produces ";owned" for empty builds with owned > 0, so a single segment
      // with no separators can only be a single tree value in yellow branch.
      // (Empty builds with owned are now encoded as ";owned" which becomes multiple segments)
      treeSegments = segments; // Treat as tree value (yellow branch)
    } else {
      // Has separators (, ., or :), must be a tree segment
      treeSegments = segments;
    }
  } else {
    treeSegments = segments;
  }

  // Expand tree-level RLE (treeString:count format, count may be base62)
  const expandedTreeSegments: string[] = [];
  for (const segment of treeSegments) {
    // Colon is not a special regex character, but we escape it for clarity
    const escapedRleTreeCountSeparator = SEPARATOR_RLE_TREE_COUNT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const treeRLEMatch = segment.match(new RegExp(`^(.+)${escapedRleTreeCountSeparator}([0-9a-zA-Z]+)$`));
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

    const branchSegments = segment.split(SEPARATOR_BRANCH);
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
 * Converts per-tree level arrays to branch-grouped array format.
 * @param trees Array of tree levels as number[][] (per-tree, baseTree index order)
 * @returns Array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 */
function convertTreesToArrayFormat(
  trees: number[][],
  owned: number,
): [number[][][], number] {
  const mapping = getBranchMapping();
  const treeBranchArrays: number[][][] = trees.map((tree) =>
    BRANCH_KEYS.map((key) => {
      const branchIndices = mapping[key];
      const values = branchIndices.map((index) => tree[index] ?? 0);
      return truncateTrailingZeros(values);
    }),
  );
  return [treeBranchArrays, owned];
}

/**
 * Converts tree levels from branch-grouped array format back to per-tree arrays
 * Maps branch arrays back to node indices using branch mapping
 * @param arrayFormat Array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * @returns BuildData with object format
 */
function convertArrayFormatToTrees(
  arrayFormat: unknown,
): { trees: number[][]; owned: number } {
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

  // Convert each tree's branch arrays back to per-tree arrays
  const trees: number[][] = treeBranchArrays.map((treeBranches, treeIndex) => {
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

    const tree: number[] = new Array(baseTree.length).fill(0);
    const branches = [yellowBranch, orangeBranch, blueBranch];
    BRANCH_KEYS.forEach((branchKey, bi) => {
      const branch = branches[bi];
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

    // Nodes beyond branch array lengths are implicitly 0
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
  // Unflatten flat levels into per-tree arrays
  const trees: number[][] = [];
  const nodesPerTree = baseTree.length;
  const treeCount = 3; // Guardian, Vanguard, Cannon
  for (let t = 0; t < treeCount; t++) {
    const start = t * nodesPerTree;
    const tree: number[] = new Array(nodesPerTree).fill(0);
    for (let i = 0; i < nodesPerTree; i++) {
      const idx = start + i;
      if (idx < buildData.levels.length) {
        tree[i] = buildData.levels[idx] ?? 0;
      }
    }
    trees.push(tree);
  }

  const [treeArrays, owned] = convertTreesToArrayFormat(trees, buildData.owned);
  const serialized = serializeArrayFormat(treeArrays, owned);

  return serialized;
}

function safeExecute<T>(fn: () => T, logPrefix: string): T | null {
  try {
    return fn();
  } catch (e) {
    if (typeof console !== "undefined" && console.error) {
      console.error(`${logPrefix}:`, e);
    }
    return null;
  }
}

/**
 * Decodes a serialized string back into build data
 */
export function decodeBuildData(encoded: string): BuildData | null {
  if (!SERIALIZED_PATTERN.test(encoded)) {
    return null;
  }

  const parsed = safeExecute(
    () => parseArrayFormat(encoded),
    "Failed to parse array format"
  );
  if (!parsed) return null;

  const [treeArrays, owned] = parsed;
  const arrayFormat = [...treeArrays, owned];

  const buildData = safeExecute(
    () => convertArrayFormatToTrees(arrayFormat),
    "Failed to convert array format to trees"
  );
  if (!buildData) return null;

  // Flatten per-tree arrays back into a single flat levels array
  const flat: number[] = [];
  for (const tree of buildData.trees) {
    for (const value of tree) {
      flat.push(value ?? 0);
    }
  }

  return { levels: flat, owned: buildData.owned };
}
