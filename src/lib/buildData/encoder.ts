/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and serialization for URL sharing (all characters are URL-safe, no base64 encoding needed)
 */

import type { Tree, NodeId } from "../../types/baseTree.types";
import { guardianTree } from "../../config_new/guardianTree";
import { vanguardTree } from "../../config_new/vanguardTree";
import { cannonTree } from "../../config_new/cannonTree";

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
 * Per-tree branch mappings derived from typed trees.
 * Each entry corresponds to one tree (guardian, vanguard, cannon).
 */
type BranchMapping = {
  yellow: NodeId[];
  orange: NodeId[];
  blue: NodeId[];
};

const TREES: Tree[] = [guardianTree, vanguardTree, cannonTree];

const treeBranchMappings: BranchMapping[] = TREES.map((tree) => ({
  yellow: tree[0].map((node) => node.id),
  orange: tree[1].map((node) => node.id),
  blue: tree[2].map((node) => node.id),
}));

function getBranchMappingForTreeIndex(index: number): BranchMapping {
  return treeBranchMappings[index] ?? treeBranchMappings[0];
}

/**
 * Base62 character set: 0-9, a-z, A-Z (62 characters total)
 * More compact than base36 for better compression
 */
const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

function encodeRLECount(count: number): string {
  return count >= 10 ? encodeBase62(count) : count.toString();
}

function shouldUseRLE(value: string, count: number): boolean {
  if (count === 1) return false;
  if (value === "" && count >= 2) return true;
  if (count === 2 && value.length > 1) return true;

  const plainLength = value.length * count + (count - 1);
  const encodedCount = encodeRLECount(count);
  const rleLength = value.length + 1 + encodedCount.length;
  return rleLength < plainLength;
}

function outputRun(result: string[], value: string, count: number): void {
  if (shouldUseRLE(value, count)) {
    const encodedCount = encodeRLECount(count);
    result.push(`${value}${SEPARATOR_RLE_NODE_COUNT}${encodedCount}`);
  } else {
    for (let j = 0; j < count; j++) {
      result.push(value);
    }
  }
}

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
  outputRun(result, currentValue, count);
  return result.join(SEPARATOR_NODE_VALUE);
}

function parseRLECount(countStr: string, context: string): number {
  const hasLetters = /[a-zA-Z]/.test(countStr);
  const count = hasLetters ? decodeBase62(countStr) : parseInt(countStr, 10);
  if (isNaN(count) || count < 1) {
    throw new Error(`Invalid RLE format: invalid count in "${context}"`);
  }
  return count;
}

function expandRLEPattern(pattern: string): string[] {
  const escaped = SEPARATOR_RLE_NODE_COUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rleMatchWithValue = pattern.match(new RegExp(`^(.+)${escaped}([0-9a-zA-Z]+)$`));
  const rleMatchZeros = pattern.match(new RegExp(`^${escaped}([0-9a-zA-Z]+)$`));

  if (rleMatchZeros) {
    const count = parseRLECount(rleMatchZeros[1], pattern);
    return Array(count).fill("");
  } else if (rleMatchWithValue) {
    const value = rleMatchWithValue[1];
    const count = parseRLECount(rleMatchWithValue[2], pattern);
    return Array(count).fill(value);
  } else {
    return [pattern];
  }
}

function expandRLE(valueString: string): string[] {
  if (valueString === "") return [];
  const parts = valueString.split(SEPARATOR_NODE_VALUE);
  const result: string[] = [];
  for (const part of parts) {
    if (part === "") {
      result.push("");
    } else {
      result.push(...expandRLEPattern(part));
    }
  }
  return result;
}

function findLastNonEmptyIndex(strings: string[]): number {
  for (let i = strings.length - 1; i >= 0; i--) {
    if (strings[i] !== "") return i;
  }
  return -1;
}

function serializeArrayFormat(treeBranchArrays: number[][][], owned: number): string {
  const treeStrings: string[] = treeBranchArrays.map((branches) => {
    const branchStrings: string[] = branches.map((branch) => {
      const base62Values = branch.map((val) => (val === 0 ? "" : encodeBase62(val)));
      return compressRLE(base62Values);
    });
    const lastNonEmptyIndex = findLastNonEmptyIndex(branchStrings);
    if (lastNonEmptyIndex === -1) return "";
    return branchStrings.slice(0, lastNonEmptyIndex + 1).join(SEPARATOR_BRANCH);
  });

  const lastNonEmptyTreeIndex = findLastNonEmptyIndex(treeStrings);
  if (lastNonEmptyTreeIndex === -1) {
    return owned === 0 ? EMPTY_BUILD_MARKER : `${SEPARATOR_TREE}${encodeBase62(owned)}`;
  }

  const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

  if (nonEmptyTreeStrings.length === 3) {
    const firstTree = nonEmptyTreeStrings[0];
    if (firstTree !== "" && nonEmptyTreeStrings.every((tree) => tree === firstTree)) {
      const countStr = encodeRLECount(3);
      const treePart = `${firstTree}${SEPARATOR_RLE_TREE_COUNT}${countStr}`;
      return owned === 0 ? treePart : `${treePart}${SEPARATOR_TREE}${encodeBase62(owned)}`;
    }
  }

  if (nonEmptyTreeStrings.length >= 2) {
    const result: string[] = [];
    let i = 0;
    while (i < nonEmptyTreeStrings.length) {
      const currentTree = nonEmptyTreeStrings[i];
      if (
        i + 1 < nonEmptyTreeStrings.length &&
        currentTree === nonEmptyTreeStrings[i + 1] &&
        currentTree !== ""
      ) {
        result.push(`${currentTree}${SEPARATOR_RLE_TREE_COUNT}${encodeRLECount(2)}`);
        i += 2;
      } else {
        result.push(currentTree);
        i += 1;
      }
    }
    if (result.length < nonEmptyTreeStrings.length) {
      return owned === 0
        ? result.join(SEPARATOR_TREE)
        : [...result, encodeBase62(owned)].join(SEPARATOR_TREE);
    }
  }

  return owned === 0
    ? nonEmptyTreeStrings.join(SEPARATOR_TREE)
    : [...nonEmptyTreeStrings, encodeBase62(owned)].join(SEPARATOR_TREE);
}

function parseBranchSegment(branchSegment: string): number[] {
  if (branchSegment === "") return [];
  const expandedValues = expandRLE(branchSegment);
  return expandedValues.map((val) => {
    if (val === "") return 0;
    try {
      return decodeBase62(val);
    } catch {
      throw new Error(`Invalid number value: ${val}`);
    }
  });
}

function parseArrayFormat(serialized: string): [number[][][], number] {
  if (serialized === EMPTY_BUILD_MARKER) {
    return [[[[], [], []], [[], [], []], [[], [], []]], 0];
  }

  const segments = serialized.split(SEPARATOR_TREE);
  let owned = 0;
  let treeSegments: string[];

  if (segments.length > 1) {
    const lastSegment = segments[segments.length - 1];
    if (
      !lastSegment.includes(SEPARATOR_BRANCH) &&
      !lastSegment.includes(SEPARATOR_NODE_VALUE) &&
      !lastSegment.includes(SEPARATOR_RLE_TREE_COUNT) &&
      lastSegment !== ""
    ) {
      owned = decodeBase62(lastSegment);
      treeSegments = segments.slice(0, -1);
    } else {
      treeSegments = segments;
    }
  } else {
    const singleSegment = segments[0];
    if (singleSegment === EMPTY_BUILD_MARKER) {
      treeSegments = [];
    } else if (
      !singleSegment.includes(SEPARATOR_BRANCH) &&
      !singleSegment.includes(SEPARATOR_NODE_VALUE) &&
      !singleSegment.includes(SEPARATOR_RLE_TREE_COUNT) &&
      singleSegment !== ""
    ) {
      treeSegments = segments;
    } else {
      treeSegments = segments;
    }
  }

  const expandedTreeSegments: string[] = [];
  const escapedTree = SEPARATOR_RLE_TREE_COUNT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const segment of treeSegments) {
    const treeRLEMatch = segment.match(new RegExp(`^(.+)${escapedTree}([0-9a-zA-Z]+)$`));
    if (treeRLEMatch) {
      const treeString = treeRLEMatch[1];
      const countStr = treeRLEMatch[2];
      const count = parseRLECount(countStr, segment);
      expandedTreeSegments.push(...Array(count).fill(treeString));
    } else {
      expandedTreeSegments.push(segment);
    }
  }

  while (expandedTreeSegments.length < 3) {
    expandedTreeSegments.push("");
  }

  const treeBranchArrays: number[][][] = expandedTreeSegments.map((segment) => {
    if (segment === "") return [[], [], []];
    const branchSegments = segment.split(SEPARATOR_BRANCH);
    while (branchSegments.length < 3) {
      branchSegments.push("");
    }
    return branchSegments.slice(0, 3).map(parseBranchSegment);
  });

  return [treeBranchArrays, owned];
}

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

function convertTreesToArrayFormat(
  trees: Record<string, number>[],
  owned: number,
): [number[][][], number] {
  const branchKeys: BranchType[] = ["yellow", "orange", "blue"];

  const treeBranchArrays: number[][][] = trees.map((tree, treeIndex) => {
    const mapping = getBranchMappingForTreeIndex(treeIndex);
    const branches: number[][] = branchKeys.map((branchKey) => {
      const nodeIds = mapping[branchKey];
      return nodeIds.map((nodeId) => tree[nodeId] ?? 0);
    });
    return branches.map(truncateTrailingZeros);
  });

  return [treeBranchArrays, owned];
}

function convertArrayFormatToTrees(arrayFormat: unknown): BuildData {
  if (!Array.isArray(arrayFormat) || arrayFormat.length < 4) {
    throw new Error("Invalid array format: must have at least 4 elements (3 trees + owned)");
  }

  const lastElement = arrayFormat[arrayFormat.length - 1];
  if (typeof lastElement !== "number") {
    throw new Error("Invalid array format: last element must be a number (owned)");
  }

  const treeBranchArrays = arrayFormat.slice(0, -1) as number[][][];
  const owned = lastElement;

  if (treeBranchArrays.length !== 3) {
    throw new Error(`Invalid array format: expected 3 trees, got ${treeBranchArrays.length}`);
  }

  const trees: Record<string, number>[] = treeBranchArrays.map((treeBranches, treeIndex) => {
    if (!Array.isArray(treeBranches)) {
      throw new Error(`Invalid array format: tree ${treeIndex} is not an array`);
    }
    if (treeBranches.length !== 3) {
      throw new Error(`Invalid array format: tree ${treeIndex} must have 3 branches, got ${treeBranches.length}`);
    }

    const [yellowBranch, orangeBranch, blueBranch] = treeBranches;
    if (
      !Array.isArray(yellowBranch) ||
      !Array.isArray(orangeBranch) ||
      !Array.isArray(blueBranch)
    ) {
      throw new Error(`Invalid array format: tree ${treeIndex} branches must be arrays`);
    }

    const mapping = getBranchMappingForTreeIndex(treeIndex);
    const tree: Record<string, number> = {};
    const branchKeys: BranchType[] = ["yellow", "orange", "blue"];
    const branches = [yellowBranch, orangeBranch, blueBranch];

    branchKeys.forEach((branchKey, branchIndex) => {
      const branch = branches[branchIndex];
      const nodeIds = mapping[branchKey];
      branch.forEach((value, i) => {
        if (i < nodeIds.length) {
          if (typeof value !== "number") {
            throw new Error(
              `Invalid array format: tree ${treeIndex}, ${branchKey} branch, index ${i} is not a number`,
            );
          }
          tree[nodeIds[i]] = value;
        }
      });
    });

    return tree;
  });

  return { trees, owned };
}

export function encodeBuildData(buildData: BuildData): string {
  const [treeArrays, owned] = convertTreesToArrayFormat(buildData.trees, buildData.owned);
  return serializeArrayFormat(treeArrays, owned);
}

function safeExecute<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function decodeBuildData(encoded: string): BuildData | null {
  if (!SERIALIZED_PATTERN.test(encoded)) {
    return null;
  }

  const parsed = safeExecute(() => parseArrayFormat(encoded));
  if (!parsed) return null;

  const [treeArrays, owned] = parsed;
  const arrayFormat = [...treeArrays, owned];

  const buildData = safeExecute(() => convertArrayFormatToTrees(arrayFormat));
  if (!buildData) return null;

  return buildData;
}
