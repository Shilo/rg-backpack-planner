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
 * Checks if a node ID matches any branch root
 * @param nodeId The node ID to check
 * @returns The branch type if it's a root, or null
 */
function getBranchRoot(nodeId: string): BranchType | null {
  for (const [branch, rootId] of Object.entries(BRANCH_ROOTS)) {
    if (nodeId === rootId) {
      return branch as BranchType;
    }
  }
  return null;
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
 * Base62 character set: A-Z, a-z, 0-9 (62 characters)
 * More compact than base36 for values > 35
 */
const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Encodes a number to base-62 string (0-9, A-Z, a-z)
 * More compact than base36 for values > 35
 * @param num Number to encode
 * @returns Base-62 encoded string
 */
function encodeBase62(num: number): string {
  if (num === 0) {
    return "0";
  }
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
 * @param str Base-62 encoded string (0-9, A-Z, a-z)
 * @returns Decoded number
 */
function decodeBase62(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = BASE62_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base62 character: ${char}`);
    }
    result = result * 62 + index;
  }
  return result;
}

/**
 * Encodes a count for RLE format (uses base62 for counts >= 10 to save space)
 * @param count The count to encode
 * @returns Encoded count string (decimal for 1-9, base62 for 10+)
 */
function encodeRLECount(count: number): string {
  // Use base62 for counts >= 10 to save space (10 → "A" saves 1 char)
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
  const rleLength = value.length + 1 + encodedCount.length; // "val_3" or "val_A" = 3+1+1 = 5
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
    // Use - for RLE separator (value-count or -count for zeros)
    // This is safe because we always serialize all 3 branches, so - only appears as branch separator between the 3 branches
    // RLE - appears within a branch, so when we split by - for branches, we need to handle it
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
 * Format: value-count where - is the separator for RLE (only when it saves space)
 * Node separator is _, branch separator is - (between branches)
 * Examples: ["2s", "2s", "2s", "2s"] → "2s-4", ["1"] → "1", ["1", "2s"] → "1_2s"
 * Note: - is used for both branch separator and RLE, but since we always serialize all 3 branches,
 * branch separators are always at fixed positions (between the 3 branches)
 * @param values Array of base62-encoded value strings
 * @returns RLE-compressed string with underscores separating runs
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
 * @param part The full part string for error messages
 * @returns The parsed count
 * @throws Error if count is invalid
 */
function parseRLECount(countStr: string, part: string): number {
  // Base62 uses A-Z, a-z, 0-9. If it contains letters or is longer than 1 char, try base62; otherwise decimal
  const isBase62 = /[A-Za-z]/.test(countStr) || countStr.length > 1;
  const count = isBase62 ? decodeBase62(countStr) : parseInt(countStr, 10);
  
  if (isNaN(count) || count < 1) {
    throw new Error(`Invalid RLE format: invalid count in "${part}"`);
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
  // Count can be decimal (0-9) or base62 (0-9, A-Z, a-z)
  // Base62 pattern: [0-9A-Za-z]+
  // RLE uses - as separator: value-count or -count
  // The value part should never contain - (only base62 characters)
  const rleMatchZeros = pattern.match(/^-([0-9A-Za-z]+)$/);
  
  // Match RLE pattern: find the last - that separates value from count
  // This handles cases where value might be multi-character base62
  const lastDashIndex = pattern.lastIndexOf("-");
  
  if (rleMatchZeros) {
    // Pattern: -count (run of zeros)
    const count = parseRLECount(rleMatchZeros[1], pattern);
    return Array(count).fill("");
  } else if (lastDashIndex > 0 && lastDashIndex < pattern.length - 1) {
    // Pattern might be value-count
    const value = pattern.slice(0, lastDashIndex);
    const countStr = pattern.slice(lastDashIndex + 1);
    
    // Validate: value should be pure base62 (no -), count should be base62
    if (/^[0-9A-Za-z]+$/.test(value) && /^[0-9A-Za-z]+$/.test(countStr)) {
      // Valid RLE pattern: value-count
      const count = parseRLECount(countStr, pattern);
      return Array(count).fill(value);
    } else {
      // Invalid pattern (value contains - or count is invalid)
      // If pattern contains -, it's malformed and indicates incorrect branch splitting
      if (pattern.indexOf("-") !== -1) {
        throw new Error(`Invalid RLE pattern (contains - in invalid position): ${pattern}`);
      }
      // No - in pattern, treat as plain value
      return [pattern];
    }
  } else if (lastDashIndex === pattern.length - 1) {
    // Pattern ends with - (like "4-")
    // This is likely a malformed RLE pattern or a branch separator that got included
    // Try to treat the part before - as a plain value
    const valuePart = pattern.slice(0, -1);
    if (valuePart.length > 0 && /^[0-9A-Za-z]+$/.test(valuePart)) {
      // Valid base62 value before the trailing -, treat as plain value
      return [valuePart];
    } else {
      // Invalid - throw error
      throw new Error(`Invalid pattern (ends with - but value part is invalid): ${pattern}`);
    }
  } else {
    // Plain value (no RLE, single occurrence)
    // If it contains -, it's malformed
    if (pattern.indexOf("-") !== -1) {
      throw new Error(`Invalid pattern (contains - but not valid RLE): ${pattern}`);
    }
    return [pattern];
  }
}

/**
 * Expands RLE-compressed string back to array of values
 * Accepts both RLE format (value-count or -count) and plain values
 * Examples: "2s-4" → ["2s", "2s", "2s", "2s"], "-3" → ["", "", ""], "1" → ["1"]
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

    // Always include all 3 branches to avoid creating -- patterns
    // -- is reserved for tree separator, so we can't have consecutive - from empty branches
    // However, if leading branches are empty, we get -- at the start, which conflicts
    // Solution: if the tree starts with empty branches, we need to handle it specially
    // For now, always include all 3 branches - if this creates -- at start, we'll handle it in parsing
    const joined = branchStrings.join("-");
    
    // If all branches are empty, the joined string will be "--" (empty-empty-empty)
    // Return empty string for completely empty trees
    if (joined === "--") {
      return "";
    }
    
    // If the result starts with --, it means leading branches are empty
    // This will be handled in parsing by recognizing it as a tree with empty leading branches
    return joined;
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
      // All 3 trees are identical, compress to treeString--count (use base62 for count >= 10)
      const countStr = encodeRLECount(3);
      const treePart = `${firstTree}--${countStr}`;
      return owned === 0 ? treePart : `${treePart}--${encodeBase62(owned)}`;
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
        // Two identical trees found, compress to treeString--2
        // Only compress if it saves space: tree--2 (tree.length + 3) vs tree--tree (tree.length * 2 + 2)
        // tree--2 saves space when: tree.length + 3 < tree.length * 2 + 2
        // Simplifies to: 1 < tree.length, or tree.length > 1
        const countStr = encodeRLECount(2);
        result.push(`${currentTree}--${countStr}`);
        i += 2; // Skip both trees
      } else {
        // No match, output current tree normally
        result.push(currentTree);
        i += 1;
      }
    }

    // If we compressed anything, use the compressed result
    if (result.length < nonEmptyTreeStrings.length) {
      return owned === 0
        ? result.join("--")
        : [...result, encodeBase62(owned)].join("--");
    }
  }

  // Trees are not identical, output normally
  return owned === 0
    ? nonEmptyTreeStrings.join("--")
    : [...nonEmptyTreeStrings, encodeBase62(owned)].join("--");
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
  try {
    const expandedValues = expandRLE(branchSegment);
    return expandedValues.map((val) => {
      if (val === "") return 0; // Empty string represents 0
      // Validate that the value doesn't contain - (which would indicate malformed RLE)
      if (val.indexOf("-") !== -1) {
        throw new Error(`Invalid branch value (contains -): ${val}. Branch segment: ${branchSegment}`);
      }
      try {
        const num = decodeBase62(val);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${val}`);
        }
        return num;
      } catch (e) {
        // Re-throw with more context
        throw new Error(`Failed to decode base62 value "${val}" in branch segment "${branchSegment}": ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  } catch (e) {
    // Re-throw with context about the branch segment
    throw new Error(`Failed to parse branch segment "${branchSegment}": ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Parses branch-grouped custom compact string back to array format
 * Format: yellow-orange-blue--yellow-orange-blue--yellow-orange-blue[--owned]
 * Separators: _ (nodes), - (branches), -- (trees/tree RLE)
 * Returns: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * Pads missing trees and branches, defaults owned to 0
 */
function parseArrayFormat(serialized: string): [number[][][], number] {
  // Handle special marker for empty build
  if (serialized === EMPTY_BUILD_MARKER) {
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  // Parse character-by-character to handle multi-character separators correctly
  // Separators: _ (nodes), - (branches), -- (trees/tree RLE)
  // We need to avoid creating false empty segments when splitting
  // Also handle trees that start with -- (empty leading branches)
  
  const treeSegments: string[] = [];
  let currentSegment = "";
  let i = 0;
  let owned = 0;

  while (i < serialized.length) {
    // Check for -- (tree separator or tree RLE count)
    if (i < serialized.length - 1 && serialized[i] === "-" && serialized[i + 1] === "-") {
      // Found --
      
      // Special case: if this is at the start and currentSegment is empty, this is a tree with empty leading branches
      if (i === 0 && currentSegment === "" && treeSegments.length === 0) {
        // This tree starts with empty branches (--pattern means empty-empty-branch)
        // We'll handle this when we parse the segment - it will start with --
        // For now, just continue to collect the segment
        currentSegment = "--";
        i += 2;
        continue;
      }
      
      // If we're collecting a segment that starts with --, check if this -- is part of the tree data
      // or a separator. If followed by base62 (or end), it's a separator. Otherwise, it's part of tree data.
      if (currentSegment.startsWith("--") && i + 2 < serialized.length) {
        const charAfterDash = serialized[i + 2];
        if (charAfterDash !== "-" && !/[0-9A-Za-z]/.test(charAfterDash)) {
          // -- is followed by non-base62, non-dash (like _), it's part of tree data
          // Add both dashes to current segment and continue
          currentSegment += "--";
          i += 2;
          continue;
        }
        // Otherwise, -- is followed by base62 or another --, so it's a separator
      }
      
      if (currentSegment !== "") {
        treeSegments.push(currentSegment);
        currentSegment = "";
      }
      
      // Skip the --
      i += 2;
      
      // Check what comes after the -- we just skipped
      // If it's followed by _ (node separator) or other non-base62, non-dash characters,
      // then the -- is part of the next tree (empty leading branches), not a tree separator
      if (i < serialized.length) {
        const charAfterDash = serialized[i];
        // If followed by _ or other non-base62, non-dash character, -- is part of tree data
        if (charAfterDash !== "-" && !/[0-9A-Za-z]/.test(charAfterDash)) {
          // -- is followed by non-base62, non-dash character (like _)
          // This means the -- is part of the tree data (empty leading branches)
          // Start collecting the tree segment with --
          currentSegment = "--";
          continue; // Continue to collect the rest of the tree normally
        }
        // If followed by another --, we have ---- (4 dashes)
        // This means: first -- is separator, second -- starts next tree (empty leading branches)
        if (i < serialized.length - 1 && charAfterDash === "-" && serialized[i + 1] === "-") {
          // We have ---- (4 dashes total)
          // The first -- was a separator (already handled - we pushed currentSegment)
          // The second -- starts the next tree (empty leading branches)
          // Skip the second -- and start collecting with --
          currentSegment = "--";
          i += 2; // Skip the second --
          continue;
        }
      }
      
      // Check if this is followed by a base62 number (tree RLE count or owned)
      let base62Part = "";
      let j = i;
      while (j < serialized.length && /[0-9A-Za-z]/.test(serialized[j])) {
        base62Part += serialized[j];
        j++;
      }
      
      // If we found a base62 part, check what follows it
      if (base62Part.length > 0) {
        // Check if followed by -- (tree RLE count or owned separator)
        if (j < serialized.length - 1 && serialized[j] === "-" && serialized[j + 1] === "-") {
          // Followed by --, so this is a tree RLE count (if we have trees) or owned (if at end)
          if (treeSegments.length > 0) {
            // We have tree segments, so this is a tree RLE count
            try {
              const count = parseRLECount(base62Part, base62Part);
              const treeToRepeat = treeSegments[treeSegments.length - 1];
              // Remove the last segment and expand it
              treeSegments.pop();
              for (let k = 0; k < count; k++) {
                treeSegments.push(treeToRepeat);
              }
              i = j + 2; // Move past the count and the following --
              // Check if what follows is owned (base62 at end) or another tree
              // If it's just base62 at the end, parse it as owned
              if (i < serialized.length) {
                let ownedBase62 = "";
                let ownedJ = i;
                while (ownedJ < serialized.length && /[0-9A-Za-z]/.test(serialized[ownedJ])) {
                  ownedBase62 += serialized[ownedJ];
                  ownedJ++;
                }
                if (ownedBase62.length > 0 && ownedJ === serialized.length) {
                  // It's base62 at the end, so it's owned
                  try {
                    owned = decodeBase62(ownedBase62);
                    i = ownedJ;
                    break; // Done parsing
                  } catch {
                    // Not valid base62, continue as normal
                  }
                }
              }
              // Continue parsing - might be another tree or we already handled owned
              continue;
            } catch {
              // Not a valid count, treat as tree data
              currentSegment = "--" + base62Part;
              i = j;
              continue;
            }
          } else {
            // No tree segments, this can't be tree RLE
            // This might be malformed, but let's treat it as tree data
            currentSegment = "--" + base62Part;
            i = j;
            continue;
          }
        } else if (j === serialized.length) {
          // At the end - check if we have tree segments (tree RLE) or not (owned)
          if (treeSegments.length > 0) {
            // We have tree segments, so this is a tree RLE count
            try {
              const count = parseRLECount(base62Part, base62Part);
              const treeToRepeat = treeSegments[treeSegments.length - 1];
              // Remove the last segment and expand it
              treeSegments.pop();
              for (let k = 0; k < count; k++) {
                treeSegments.push(treeToRepeat);
              }
              i = j; // Move past the count
              break; // Done parsing
            } catch {
              // Not a valid count, treat as owned
              try {
                owned = decodeBase62(base62Part);
                i = j; // Move past the owned value
                break; // Done parsing
              } catch {
                // Not valid base62, treat as regular segment start
                currentSegment = base62Part;
                i = j;
                continue;
              }
            }
          } else {
            // No tree segments, so this is owned
            try {
              owned = decodeBase62(base62Part);
              i = j; // Move past the owned value
              break; // Done parsing
            } catch {
              // Not valid base62, treat as regular segment start
              currentSegment = base62Part;
              i = j;
              continue;
            }
          }
        } else {
          // Followed by - (single) or _ or other character
          // The -- is part of tree data (empty leading branches)
          // Start collecting the tree segment with --
          currentSegment = "--";
          continue; // Continue to collect the rest of the tree
        }
      } else {
        // Not followed by base62 or not at end/followed by --, so this is just a tree separator
        // The currentSegment (if any) was already pushed before we saw the --
        // Now we continue to collect the next tree segment
        // Don't push empty segment (empty trees are omitted in serialization)
        // i has already been incremented by 2 (we skipped the --), so we continue to process the next character
        continue;
      }
    } else {
      // Regular character
      currentSegment += serialized[i];
      i++;
    }
  }

  // Add final segment if any
  if (currentSegment !== "") {
    // Check if this segment starts with -- (tree with empty leading branches)
    // If so, it's definitely a tree, not owned
    if (currentSegment.startsWith("--")) {
      treeSegments.push(currentSegment);
    } else {
      // Check if this could be owned (pure base62 number at the end)
      // Only treat as owned if it's a pure base62 number and we have tree segments
      if (treeSegments.length > 0 && /^[0-9A-Za-z]+$/.test(currentSegment) && currentSegment.indexOf("-") === -1 && currentSegment.indexOf("_") === -1) {
        try {
          owned = decodeBase62(currentSegment);
          // Don't add to treeSegments, it's owned
        } catch {
          // Not valid base62, treat as tree segment
          treeSegments.push(currentSegment);
        }
      } else {
        // Not owned, treat as tree segment
        treeSegments.push(currentSegment);
      }
    }
  }

  // Pad missing trailing trees to 3
  while (treeSegments.length < 3) {
    treeSegments.push("");
  }

  // Parse tree segments into branch arrays
  const treeBranchArrays: number[][][] = treeSegments.map((segment) => {
    if (segment === "") {
      return [[], [], []];
    }

    let branchSegments: string[] = [];
    
    // Check if segment starts with -- (empty leading branches)
    if (segment.startsWith("--")) {
      // This tree has empty yellow and orange branches
      // The rest (after --) is the blue branch
      const blueBranch = segment.slice(2); // Skip the --
      // Validate that the blue branch doesn't contain branch separators (-)
      // If it does, this might be incorrectly parsed - try splitting it as a normal tree
      const dashCount = (blueBranch.match(/-/g) || []).length;
      if (dashCount >= 2) {
        // Blue branch contains multiple dashes - might be branch separators
        // Try parsing as a normal tree (without the -- prefix)
        // This handles cases where -- was incorrectly identified
        const normalSegment = segment.slice(2); // Remove the --
        // Try to split as normal tree
        const dashPositions: number[] = [];
        for (let k = 0; k < normalSegment.length; k++) {
          if (normalSegment[k] === "-") {
            dashPositions.push(k);
          }
        }
        if (dashPositions.length >= 2) {
          // Try splitting as normal tree
          let foundValid = false;
          for (let i = 0; i < dashPositions.length - 1 && !foundValid; i++) {
            for (let j = i + 1; j < dashPositions.length && !foundValid; j++) {
              const branch1 = normalSegment.slice(0, dashPositions[i]);
              const branch2 = normalSegment.slice(dashPositions[i] + 1, dashPositions[j]);
              const branch3 = normalSegment.slice(dashPositions[j] + 1);
              try {
                parseBranchSegment(branch1);
                parseBranchSegment(branch2);
                parseBranchSegment(branch3);
                branchSegments = [branch1, branch2, branch3];
                foundValid = true;
              } catch {
                // Invalid split, try next
              }
            }
          }
          if (!foundValid) {
            // Couldn't parse as normal tree, treat as single blue branch
            branchSegments = ["", "", blueBranch];
          }
          // If foundValid is true, branchSegments was already set in the loop above
        } else {
          // Not enough dashes for normal tree, treat as single blue branch
          branchSegments = ["", "", blueBranch];
        }
      } else {
        // Blue branch has 0 or 1 dash (likely RLE), treat as single branch
        branchSegments = ["", "", blueBranch];
      }
    } else {
      // Normal tree - split by - (branch separator)
      // Since we always serialize all 3 branches, we should have exactly 2 - separators
      // But - can also be part of RLE (value-count or -count)
      // Strategy: parse branches by trying all possible splits and validating
      // We know we need exactly 3 branches, so we need to find 2 - that are branch separators
      
      // Find all - positions
      const dashPositions: number[] = [];
      for (let k = 0; k < segment.length; k++) {
        if (segment[k] === "-") {
          dashPositions.push(k);
        }
      }
      
      if (dashPositions.length === 2) {
        // Exactly 2 dashes - they must be branch separators
        branchSegments = [
          segment.slice(0, dashPositions[0]),
          segment.slice(dashPositions[0] + 1, dashPositions[1]),
          segment.slice(dashPositions[1] + 1)
        ];
      } else if (dashPositions.length > 2) {
        // More than 2 dashes - some are RLE
        // Try all combinations of 2 dashes as branch separators
        // The correct combination is where all 3 resulting branches can be parsed
        let foundValid = false;
        branchSegments = [];
        
        for (let i = 0; i < dashPositions.length - 1 && !foundValid; i++) {
          for (let j = i + 1; j < dashPositions.length && !foundValid; j++) {
            const branch1 = segment.slice(0, dashPositions[i]);
            const branch2 = segment.slice(dashPositions[i] + 1, dashPositions[j]);
            const branch3 = segment.slice(dashPositions[j] + 1);
            
            // Try to parse each branch - if all succeed, this is the correct split
            try {
              parseBranchSegment(branch1);
              parseBranchSegment(branch2);
              parseBranchSegment(branch3);
              // All parsed successfully - this is the correct split
              branchSegments = [branch1, branch2, branch3];
              foundValid = true;
            } catch {
              // Invalid split, try next combination
            }
          }
        }
        
        if (!foundValid) {
          // Fallback: use last 2 dashes, but validate the result
          const fallbackBranches = [
            segment.slice(0, dashPositions[dashPositions.length - 2]),
            segment.slice(dashPositions[dashPositions.length - 2] + 1, dashPositions[dashPositions.length - 1]),
            segment.slice(dashPositions[dashPositions.length - 1] + 1)
          ];
          // Try to parse the fallback - if it fails, we have a problem
          try {
            parseBranchSegment(fallbackBranches[0]);
            parseBranchSegment(fallbackBranches[1]);
            parseBranchSegment(fallbackBranches[2]);
            branchSegments = fallbackBranches;
          } catch {
            // Fallback also failed - this shouldn't happen with valid data
            // But if it does, we'll use it anyway and let the error propagate
            branchSegments = fallbackBranches;
          }
        }
      } else {
        // Less than 2 dashes - pad with empty branches
        branchSegments = [segment, "", ""];
      }
    }
    
    // Pad to 3 if needed
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
 * Encodes build data into a base64url string for URL sharing
 * Uses compact branch-based format with base62 encoding and base64url-safe separators
 * All characters in serialized string are base64url-safe, so encoding doesn't expand
 */
export function encodeBuildData(buildData: BuildData): string {
  // Convert to branch-grouped array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
  // Each tree_branches is [yellow[], orange[], blue[]]
  // Each branch is truncated to last non-zero index + 1
  const [treeArrays, owned] = convertTreesToArrayFormat(buildData.trees, buildData.owned);

  // Use custom serializer with base62 encoding and base64url-safe separators
  const serialized = serializeArrayFormat(treeArrays, owned);

  console.warn("[encodeBuildData] Deserialized data before save:", {
    arrayFormat: [...treeArrays, owned],
    originalBuildData: buildData,
    serializedString: serialized,
  });

  // Serialized string uses only base64url-safe characters, so encode to base64url
  // This doesn't expand the string since all chars are already base64url-safe
  const base64 = btoa(serialized);
  return encodeBase64Url(base64);
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
 * Decodes a base64url string back into build data
 * Expects base64url-encoded string with base62 numbers and base64url-safe separators
 * Returns compressed data (expansion happens in applyBuildFromUrl)
 */
export function decodeBuildData(encoded: string): BuildData | null {
  // Validate that the string looks like valid base64url
  if (!BASE64URL_PATTERN.test(encoded)) {
    console.warn("[decodeBuildData] Invalid base64url format:", encoded);
    return null;
  }

  // Convert base64url back to base64, then decode
  const base64 = decodeBase64Url(encoded);
  const decoded = safeExecute(() => atob(base64), "Failed to decode base64 string");
  if (!decoded) return null;

  console.warn("[decodeBuildData] Decoded string:", decoded);

  // Parse array format (with base62 numbers and base64url-safe separators)
  const parsed = safeExecute(
    () => parseArrayFormat(decoded),
    "Failed to parse array format"
  );
  if (!parsed) return null;

  const [treeArrays, owned] = parsed;
  const arrayFormat = [...treeArrays, owned];

  console.warn("[decodeBuildData] Parsed array format after load:", arrayFormat);

  // Convert to BuildData format
  const buildData = safeExecute(
    () => convertArrayFormatToTrees(arrayFormat),
    "Failed to convert array format to trees"
  );
  if (!buildData) return null;

  console.warn("[decodeBuildData] Deserialized data after load:", buildData);
  console.warn("[decodeBuildData] Returning buildData: SUCCESS");

  return buildData;
}
