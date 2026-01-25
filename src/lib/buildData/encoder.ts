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
 * Serialized format uses: base62 numbers (0-9, a-z, A-Z), separators (- _ ~), owned marker (o), and empty marker (_)
 */
export const SERIALIZED_PATTERN = /^[0-9a-zA-Z\-_~o]+$/;

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
  const plainLength = value.length * count + (count - 1); // "val_val_val" = 3*3+2 = 11
  const encodedCount = encodeRLECount(count); // Uses base62 for counts >= 10
  const rleLength = value.length + 1 + encodedCount.length; // "val~3" or "val~a" = 3+1+1 = 5
  // For empty strings, use RLE when equal length for consistency (e.g., __ vs ~3, both 2 chars)
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
    result.push(`${value}~${encodedCount}`);
  } else {
    // Output plain values (either single value or when RLE doesn't save space)
    for (let j = 0; j < count; j++) {
      result.push(value);
    }
  }
}

/**
 * Compresses consecutive duplicate values using run-length encoding (RLE)
 * Format: value~count where ~ is the RLE marker (only when it saves space)
 * Examples: ["2s", "2s", "2s", "2s"] → "2s~4", ["1"] → "1", ["1", "2s"] → "1_2s"
 * @param values Array of base62-encoded value strings
 * @returns RLE-compressed string with underscores separating tokens
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

  return result.join("_");
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
 * @param pattern The RLE pattern (value~count or ~count, count may be base62)
 * @returns Array of expanded values
 * @throws Error if pattern is invalid
 */
function expandRLEPattern(pattern: string): string[] {
  // Count can be decimal (0-9) or base62 (0-9, a-z, A-Z)
  const rleMatchWithValue = pattern.match(/^(.+)~([0-9a-zA-Z]+)$/);
  const rleMatchZeros = pattern.match(/^~([0-9a-zA-Z]+)$/);

  if (rleMatchZeros) {
    // Pattern: ~count (run of zeros)
    const count = parseRLECount(rleMatchZeros[1], pattern);
    return Array(count).fill("");
  } else if (rleMatchWithValue) {
    // Pattern: value~count (run of non-zero values)
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
 * Accepts both RLE format (value~count or ~count) and plain values
 * Examples: "2s~4" → ["2s", "2s", "2s", "2s"], "~3" → ["", "", ""], "1" → ["1"]
 * @param valueString Underscore-separated string with RLE patterns or plain values
 * @returns Array of expanded value strings
 */
function expandRLE(valueString: string): string[] {
  if (valueString === "") {
    return [];
  }

  const parts = valueString.split("_");
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
 * Serializes branch-grouped array format to count-framed compact string
 * Format: <treeCount>-<tree>-<tree>-...[-o<owned>]
 * tree := <branchCount>-<branch>-<branch>-...
 * branch := <tokenCount>_<token>_<token>_...
 * token := <value> | <value>~<run> | ~<run>
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
      const tokenCount = base62Values.length; // Count original values (before RLE)
      const tokens = compressRLE(base62Values);
      // Format: <tokenCount>_<tokens>
      return tokenCount === 0 ? "" : `${encodeBase62(tokenCount)}_${tokens}`;
    });

    // Always include all 3 branches to preserve positional information (yellow, orange, blue)
    // Empty branches are serialized as empty strings
    const branchCount = 3; // Always 3 branches (yellow, orange, blue)
    // Format: <branchCount>-<branch>-<branch>-<branch>
    return `${encodeBase62(branchCount)}-${branchStrings.join("-")}`;
  });

  // Omit trailing empty trees
  const lastNonEmptyTreeIndex = findLastNonEmptyIndex(treeStrings);

  // If all trees are empty, use special marker for empty build
  if (lastNonEmptyTreeIndex === -1) {
    if (owned === 0) {
      return "0-"; // 0 trees, no owned
    } else {
      return `0--o${encodeBase62(owned)}`; // 0 trees, but has owned
    }
  }

  // Get non-empty trees
  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);
  const treeCount = nonEmptyTreeStrings.length;

  // Build result: <treeCount>-<tree>-<tree>-...
  let result = `${encodeBase62(treeCount)}-${nonEmptyTreeStrings.join("-")}`;

  // Append owned if non-zero: -o<owned>
  if (owned > 0) {
    result += `-o${encodeBase62(owned)}`;
  }

  return result;
}

/**
 * Expands tree-level RLE patterns (treeString~count format)
 * @param treeSegments Array of tree segment strings
 * @returns Array of expanded tree segments
 */
function expandTreeRLE(treeSegments: string[]): string[] {
  const expanded: string[] = [];
  for (const segment of treeSegments) {
    // Check for tree-level RLE: treeString~count
    // IMPORTANT: Tree-level RLE format is: <branchCount>-<branch>-<branch>-...~<count>
    // We need to distinguish this from branch-level RLE which is: <tokenCount>_<token>~<count>
    // 
    // Key difference: In tree-level RLE, the ~ appears AFTER the last branch separator `-`
    // In branch-level RLE, the ~ appears WITHIN a branch (after `_` token separator)
    //
    // So we check: if the segment ends with ~count, AND the part before ~ contains at least one `-`
    // AND the last `-` before `~` is followed by a branch that doesn't contain `~` in its middle,
    // then it's tree-level RLE.
    //
    // Actually, simpler: tree-level RLE means the entire tree segment (all branches) is repeated.
    // The format is: <branchCount>-<branch1>-<branch2>-<branch3>~<count>
    // Branch-level RLE is: <tokenCount>_<token>~<count> or <tokenCount>_<token1>_<token2>~<count>_...
    //
    // The key: if a branch contains `~`, it will be in the format <tokenCount>_...~<count>
    // So if we see `_` followed by something ending in `~`, it's branch-level RLE, not tree-level.
    //
    // Safest approach: Only treat as tree-level RLE if:
    // 1. Segment ends with ~count
    // 2. The part before the last `~` does NOT contain `_` followed by `~` (which would be branch RLE)
    const rleMatch = segment.match(/^(.+)~([0-9a-zA-Z]+)$/);
    if (rleMatch) {
      const treeString = rleMatch[1];
      const countStr = rleMatch[2];
      
      // Check if this is branch-level RLE (has pattern like "X_Y~Z" or "X_Y_Z~W")
      // vs tree-level RLE (has pattern like "3-branch1-branch2-branch3~count")
      // Branch RLE has `_` before the `~`, tree RLE has `-` before the `~`
      // But wait, a branch can have multiple tokens: "3_1_2_3~4", so we can't just check for `_` before `~`
      //
      // Better: Tree-level RLE should have the pattern where the last `-` separator
      // comes before the `~`. Branch-level RLE has `_` separators, and the `~` is part of a token.
      // So if the last separator before `~` is `-`, it's tree-level. If it's `_`, it's branch-level.
      const lastDashIndex = treeString.lastIndexOf("-");
      const lastUnderscoreIndex = treeString.lastIndexOf("_");
      
      if (lastDashIndex > lastUnderscoreIndex) {
        // Last separator is `-`, so this is tree-level RLE
        const count = parseRLECount(countStr, segment);
        for (let i = 0; i < count; i++) {
          expanded.push(treeString);
        }
      } else {
        // Last separator is `_` (or no separator), so this is branch-level RLE, not tree-level
        expanded.push(segment);
      }
    } else {
      expanded.push(segment);
    }
  }
  return expanded;
}

/**
 * Parses count-framed compact string back to array format
 * Format: <treeCount>-<tree>-<tree>-...[-o<owned>]
 * Returns: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * Pads missing trees and branches, defaults owned to 0
 */
function parseArrayFormat(serialized: string): [number[][][], number] {
  // Handle empty build marker
  if (serialized === EMPTY_BUILD_MARKER || serialized === "0-") {
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  // Parse: treeCount-tree-tree-...[-oowned]
  // Note: We can't simply split on "-" and filter empty strings because empty branches
  // are represented as empty strings, and we need to preserve them for positional info
  
  let owned = 0;
  let serializedWithoutOwned = serialized;
  
  // Check for owned suffix: -o<owned> at the end
  const ownedMatch = serialized.match(/-o([0-9a-zA-Z]+)$/);
  if (ownedMatch) {
    const ownedStr = ownedMatch[1];
    try {
      owned = decodeBase62(ownedStr);
    } catch (error) {
      throw new Error(`Invalid owned value: ${ownedStr}`);
    }
    // Remove the owned suffix
    serializedWithoutOwned = serialized.slice(0, ownedMatch.index);
  }
  
  // Split on "-" to get parts (DO NOT filter empty strings - they represent empty branches)
  const parts = serializedWithoutOwned.split("-");
  if (parts.length === 0) {
    throw new Error("Invalid format: empty string");
  }
  
  // Handle special case: "0--o<owned>" where we get ["0", "", "o<owned>"]
  // After removing owned, we might have ["0", ""] which should be treated as treeCount=0
  // But if we have "0-", we get ["0", ""] which is also valid
  
  // Find first non-empty part (should be treeCount)
  let firstNonEmptyIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] !== "") {
      firstNonEmptyIndex = i;
      break;
    }
  }
  
  if (firstNonEmptyIndex === -1) {
    throw new Error("Invalid format: missing tree count");
  }

  // Parse tree count (first non-empty part)
  let treeCount: number;
  try {
    treeCount = decodeBase62(parts[firstNonEmptyIndex]);
  } catch (error) {
    throw new Error(`Invalid tree count: ${parts[firstNonEmptyIndex]}`);
  }

  if (treeCount < 0 || treeCount > 3) {
    throw new Error(`Invalid tree count: ${treeCount} (must be 0-3)`);
  }

  // Parse trees: each tree starts with branchCount, followed by branchCount branches
  // We need to reconstruct tree segments by reading branchCount and consuming that many segments
  // IMPORTANT: Empty strings represent empty branches and must be preserved
  const treeSegments: string[] = [];
  let partIndex = firstNonEmptyIndex + 1; // Start after treeCount
  
  for (let i = 0; i < treeCount; i++) {
    if (partIndex >= parts.length) {
      throw new Error(`Invalid format: tree ${i} missing branch count`);
    }
    
    // Read branchCount (must be non-empty)
    // Skip empty parts only before branchCount (shouldn't happen in valid input, but handle edge cases)
    while (partIndex < parts.length && parts[partIndex] === "") {
      partIndex++;
    }
    
    if (partIndex >= parts.length) {
      throw new Error(`Invalid format: tree ${i} missing branch count`);
    }
    
    let branchCount: number;
    try {
      branchCount = decodeBase62(parts[partIndex]);
    } catch (error) {
      throw new Error(`Invalid branch count in tree ${i}: ${parts[partIndex]}`);
    }
    
    if (branchCount < 0 || branchCount > 3) {
      throw new Error(`Invalid branch count in tree ${i}: ${branchCount} (must be 0-3)`);
    }
    
    // Reconstruct tree segment: branchCount-branch1-branch2-...
    // We need to consume branchCount + 1 parts total (branchCount + branchCount branches)
    // Empty strings ARE valid parts (they represent empty branches) - DO NOT skip them!
    if (partIndex + branchCount >= parts.length) {
      throw new Error(`Invalid format: tree ${i} incomplete (expected ${branchCount} branches, got ${parts.length - partIndex - 1})`);
    }
    
    // Reconstruct the tree segment by joining the parts (including empty strings for empty branches)
    const treeSegmentParts = [parts[partIndex]]; // branchCount
    for (let j = 0; j < branchCount; j++) {
      // Empty strings are valid - they represent empty branches
      treeSegmentParts.push(parts[partIndex + 1 + j] ?? "");
    }
    treeSegments.push(treeSegmentParts.join("-"));
    
    partIndex += branchCount + 1; // Move past branchCount and all branches (including empty ones)
  }

  // Validate tree count matches segments
  if (treeCount !== treeSegments.length) {
    throw new Error(`Tree count mismatch: expected ${treeCount} trees, got ${treeSegments.length} segments`);
  }

  // Expand tree-level RLE if needed (treeString~count format)
  const expandedTrees = expandTreeRLE(treeSegments);

  // Pad to 3 trees
  while (expandedTrees.length < 3) {
    expandedTrees.push("");
  }

  // Parse each tree
  const treeBranchArrays = expandedTrees.map((segment, treeIndex) => {
    if (segment === "") return [[], [], []];

    const branchParts = segment.split("-");
    if (branchParts.length === 0) {
      throw new Error(`Invalid format: tree ${treeIndex} has no branch count`);
    }

    let branchCount: number;
    try {
      branchCount = decodeBase62(branchParts[0]);
    } catch (error) {
      throw new Error(`Invalid branch count in tree ${treeIndex}: ${branchParts[0]}`);
    }

    if (branchCount < 0 || branchCount > 3) {
      throw new Error(`Invalid branch count in tree ${treeIndex}: ${branchCount} (must be 0-3)`);
    }

    const branchSegments = branchParts.slice(1);

    // Validate branch count matches segments (should always be 3 now)
    if (branchCount !== branchSegments.length) {
      throw new Error(`Branch count mismatch in tree ${treeIndex}: expected ${branchCount} branches, got ${branchSegments.length} segments`);
    }

    // Ensure we have exactly 3 branches (pad if needed, though this shouldn't happen with new format)
    while (branchSegments.length < 3) {
      branchSegments.push("");
    }

    // Parse each branch: <tokenCount>_<token>_<token>_...
    return branchSegments.slice(0, 3).map((branchSegment, branchIndex) => {
      if (branchSegment === "") {
        return [];
      }

      // Split on _ to get tokenCount and tokens
      const branchParts = branchSegment.split("_");
      if (branchParts.length === 0) {
        throw new Error(`Invalid format: tree ${treeIndex}, branch ${branchIndex} has no token count`);
      }

      let tokenCount: number;
      try {
        tokenCount = decodeBase62(branchParts[0]);
      } catch (error) {
        throw new Error(`Invalid token count in tree ${treeIndex}, branch ${branchIndex}: ${branchParts[0]}`);
      }

      if (tokenCount < 0) {
        throw new Error(`Invalid token count in tree ${treeIndex}, branch ${branchIndex}: ${tokenCount} (must be >= 0)`);
      }

      // Reconstruct tokens string: everything after tokenCount, joined with "_"
      // This preserves any underscores that were part of the original token string
      const tokens = branchParts.slice(1).join("_");

      // Validate token count matches actual tokens
      const tokenArray = tokens === "" ? [] : expandRLE(tokens);
      if (tokenCount !== tokenArray.length) {
        // Debug info for troubleshooting
        const debugInfo = {
          branchSegment,
          branchParts,
          tokenCount,
          tokens,
          tokenArrayLength: tokenArray.length,
          tokenArray,
        };
        throw new Error(`Token count mismatch in tree ${treeIndex}, branch ${branchIndex}: expected ${tokenCount} tokens, got ${tokenArray.length}. Debug: ${JSON.stringify(debugInfo)}`);
      }

      // Parse tokens to numbers
      return tokenArray.map((val) => {
        if (val === "") return 0;
        try {
          return decodeBase62(val);
        } catch (error) {
          throw new Error(`Invalid number value in tree ${treeIndex}, branch ${branchIndex}: ${val}`);
        }
      });
    });
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
