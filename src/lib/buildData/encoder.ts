/**
 * Build data encoding and decoding
 * Handles conversion between object format and compact array format,
 * and serialization for URL sharing (all characters are URL-safe, no base64 encoding needed)
 */

import { baseTree } from "../../config/baseTree";

/**
 * Build data structure representing tree levels and tech crystals owned.
 * Levels are numeric arrays indexed by node position in baseTree (0..baseTree.length-1).
 * Encoder uses baseTree only for length and fixed branch layout (0-9 yellow, 10-19 orange, 20-29 blue).
 */
export interface BuildData {
    trees: number[][];
    owned: number;
    name?: string;
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
 * Compact, readable, URL-safe for hash fragments: . , ; ' : |
 */
const SEPARATOR_NODE_VALUE = "."; // Node values within a branch
const SEPARATOR_BRANCH = ","; // Branches within a tree
const SEPARATOR_TREE = ";"; // Trees and owned value
const SEPARATOR_RLE_NODE_COUNT = "'"; // Value from count in RLE node patterns
const SEPARATOR_RLE_TREE_COUNT = ":"; // Tree string from count in RLE tree patterns
const SEPARATOR_BUILD_NAME = "|"; // Build name separator (appears after owned value)

/**
 * Regex pattern for valid serialized format characters
 * base62 (0-9a-zA-Z), separators (.,;':|), empty marker (_)
 * Note: Build name may contain URL-encoded characters (%XX), but this pattern
 * is checked on the build data part only (before the name separator)
 */
export const SERIALIZED_PATTERN = /^[0-9a-zA-Z.,;:'_]+$/;

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
const BASE62_CHARS =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
 * Format: value'count or 'count (only when it saves space)
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
    const escapedRleNodeCountSeparator = SEPARATOR_RLE_NODE_COUNT.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
    );
    const rleMatchWithValue = pattern.match(
        new RegExp(`^(.+)${escapedRleNodeCountSeparator}([0-9a-zA-Z]+)$`),
    );
    const rleMatchZeros = pattern.match(
        new RegExp(`^${escapedRleNodeCountSeparator}([0-9a-zA-Z]+)$`),
    );

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
 * Format: [name|]tree1;tree2;tree3[;owned]
 * Owned requires exactly 4 components (3 semicolons): tree1;tree2;tree3;owned
 * Name appears at the start with | separator: name|tree1;tree2;tree3;owned
 * @param treeBranchArrays Array of [yellow[], orange[], blue[]] for each tree
 * @param owned Number of tech crystals owned
 * @param name Optional build name
 * @returns Serialized string
 */
function serializeArrayFormat(
    treeBranchArrays: number[][][],
    owned: number,
    name?: string,
): string {
    // Build name prefix if present
    const namePrefix =
        name && name.trim()
            ? `${encodeURIComponent(name.trim())}${SEPARATOR_BUILD_NAME}`
            : "";
    // Serialize each tree's branches
    const treeStrings: string[] = treeBranchArrays.map((branches) => {
        const branchStrings: string[] = branches.map((branch) => {
            const base62Values = branch.map((val) =>
                val === 0 ? "" : encodeBase62(val),
            );
            return compressRLE(base62Values);
        });
        const lastNonEmptyIndex = findLastNonEmptyIndex(branchStrings);
        if (lastNonEmptyIndex === -1) return "";
        return branchStrings
            .slice(0, lastNonEmptyIndex + 1)
            .join(SEPARATOR_BRANCH);
    });

    const lastNonEmptyTreeIndex = findLastNonEmptyIndex(treeStrings);

    // All trees empty
    if (lastNonEmptyTreeIndex === -1) {
        let result: string;
        if (owned === 0) {
            result = EMPTY_BUILD_MARKER;
        } else {
            result = `${SEPARATOR_TREE}${SEPARATOR_TREE}${SEPARATOR_TREE}${encodeBase62(owned)}`;
        }
        return `${namePrefix}${result}`;
    }

    const nonEmptyTreeStrings = treeStrings.slice(0, lastNonEmptyTreeIndex + 1);

    // Tree-level RLE: 3 identical trees
    if (nonEmptyTreeStrings.length === 3) {
        const firstTree = nonEmptyTreeStrings[0];
        if (
            firstTree !== "" &&
            nonEmptyTreeStrings.every((tree) => tree === firstTree)
        ) {
            const treePart = `${firstTree}${SEPARATOR_RLE_TREE_COUNT}${encodeRLECount(3)}`;
            let result: string;
            if (owned === 0) {
                result = treePart;
            } else {
                result = `${treePart}${SEPARATOR_TREE}${SEPARATOR_TREE}${SEPARATOR_TREE}${encodeBase62(owned)}`;
            }
            return `${namePrefix}${result}`;
        }
    }

    // Tree-level RLE: 2 identical trees
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
                result.push(
                    `${currentTree}${SEPARATOR_RLE_TREE_COUNT}${encodeRLECount(2)}`,
                );
                i += 2;
            } else {
                result.push(currentTree);
                i += 1;
            }
        }
        if (result.length < nonEmptyTreeStrings.length) {
            let serialized: string;
            if (owned === 0) {
                serialized = result.join(SEPARATOR_TREE);
            } else {
                // Pad to 3 tree parts before owned
                while (result.length < 3) result.push("");
                serialized = [...result, encodeBase62(owned)].join(
                    SEPARATOR_TREE,
                );
            }
            return `${namePrefix}${serialized}`;
        }
    }

    // No RLE
    let result: string;
    if (owned === 0) {
        result = nonEmptyTreeStrings.join(SEPARATOR_TREE);
    } else {
        const parts = [...nonEmptyTreeStrings];
        while (parts.length < 3) parts.push("");
        result = [...parts, encodeBase62(owned)].join(SEPARATOR_TREE);
    }

    return `${namePrefix}${result}`;
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
 * Owned is ONLY the 4th component: exactly 4 segments (3 semicolons) required for owned.
 * Format: [name|]tree1;tree2;tree3 or [name|]tree1;tree2;tree3;owned
 * Name appears at the start with | separator: name|tree1;tree2;tree3;owned
 * @returns Tuple of [treeBranchArrays, owned, name]
 */
function parseArrayFormat(
    serialized: string,
): [number[][][], number, string | undefined] {
    // Extract build name from the start if present
    let buildName: string | undefined = undefined;
    let buildDataPart = serialized;
    const nameSeparatorIndex = serialized.indexOf(SEPARATOR_BUILD_NAME);
    if (nameSeparatorIndex !== -1) {
        // Name is at the start, build data comes after the separator
        const namePart = serialized.slice(0, nameSeparatorIndex);
        buildDataPart = serialized.slice(nameSeparatorIndex + 1);
        if (namePart) {
            try {
                buildName = decodeURIComponent(namePart);
            } catch (error) {
                // If decoding fails, use the raw string
                buildName = namePart;
            }
        }
    }

    // Handle empty build marker (can appear with or without name)
    if (buildDataPart === EMPTY_BUILD_MARKER) {
        return [
            [
                [[], [], []],
                [[], [], []],
                [[], [], []],
            ],
            0,
            buildName,
        ];
    }

    const segments = buildDataPart.split(SEPARATOR_TREE);
    let treeSegmentsRaw: string[];
    let owned = 0;

    // Owned only when exactly 4 components (3 semicolons): tree1;tree2;tree3;owned
    if (segments.length === 4) {
        treeSegmentsRaw = segments.slice(0, 3);
        try {
            owned = decodeBase62(segments[3]);
        } catch (error) {
            throw new Error(`Invalid owned value: ${segments[3]}`);
        }
    } else {
        treeSegmentsRaw = segments;
    }

    const expandTreeSegments = (inputSegments: string[]): string[] => {
        const expanded: string[] = [];
        const escapedRle = SEPARATOR_RLE_TREE_COUNT.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
        const rleRegex = new RegExp(`^(.+)${escapedRle}([0-9a-zA-Z]+)$`);
        for (const segment of inputSegments) {
            const match = segment.match(rleRegex);
            if (match) {
                const count = parseRLECount(match[2], segment);
                expanded.push(...Array(count).fill(match[1]));
            } else {
                expanded.push(segment);
            }
        }
        return expanded;
    };

    let expandedTreeSegments = expandTreeSegments(treeSegmentsRaw);

    if (expandedTreeSegments.length > 3) {
        // When owned is present (4 segments), encoder pads with empty tree slots;
        // e.g. "1:3;;;a" has tree part ["1:3","",""] - "1:3" expands to 3, "" add 2 more.
        // Truncate to 3 trees to match encoder output format.
        if (segments.length === 4) {
            expandedTreeSegments = expandedTreeSegments.slice(0, 3);
        } else {
            throw new Error(
                `Invalid format: expected at most 3 trees, got ${expandedTreeSegments.length}`,
            );
        }
    }
    while (expandedTreeSegments.length < 3) {
        expandedTreeSegments.push("");
    }

    const treeBranchArrays: number[][][] = expandedTreeSegments.map(
        (segment) => {
            if (segment === "") {
                return [[], [], []];
            }

            const branchSegments = segment.split(SEPARATOR_BRANCH);
            // Pad missing trailing branches to 3
            while (branchSegments.length < 3) {
                branchSegments.push("");
            }

            return branchSegments.slice(0, 3).map(parseBranchSegment);
        },
    );

    return [treeBranchArrays, owned, buildName];
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
 * Converts tree levels from array format to branch-grouped array format
 * Groups nodes by branch (yellow, orange, blue) instead of circular order
 * @param trees Array of tree levels as number[]
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
 * Converts tree levels from branch-grouped array format back to array format
 * Maps branch arrays back to node indices using branch mapping
 * @param arrayFormat Array format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
 *   where each tree_branches is [yellow[], orange[], blue[]]
 * @returns BuildData with object format
 */
function convertArrayFormatToTrees(arrayFormat: unknown): BuildData {
    // Validate input is an array with at least 4 elements (3 trees + owned)
    if (!Array.isArray(arrayFormat) || arrayFormat.length < 4) {
        throw new Error(
            "Invalid array format: must have at least 4 elements (3 trees + owned)",
        );
    }

    // Extract owned value (last element must be a number)
    const lastElement = arrayFormat[arrayFormat.length - 1];
    if (typeof lastElement !== "number") {
        throw new Error(
            "Invalid array format: last element must be a number (owned)",
        );
    }

    // Format: [tree1_branches[], tree2_branches[], tree3_branches[], owned]
    const treeBranchArrays = arrayFormat.slice(0, -1) as number[][][];
    const owned = lastElement;

    // Validate we have exactly 3 trees
    if (treeBranchArrays.length !== 3) {
        throw new Error(
            `Invalid array format: expected 3 trees, got ${treeBranchArrays.length}`,
        );
    }

    const mapping = getBranchMapping();

    // Convert each tree's branch arrays back to array format
    const trees: number[][] = treeBranchArrays.map(
        (treeBranches, treeIndex) => {
            if (!Array.isArray(treeBranches)) {
                throw new Error(
                    `Invalid array format: tree ${treeIndex} is not an array`,
                );
            }

            // Validate branches structure: [yellow[], orange[], blue[]]
            if (treeBranches.length !== 3) {
                throw new Error(
                    `Invalid array format: tree ${treeIndex} must have 3 branches, got ${treeBranches.length}`,
                );
            }

            const [yellowBranch, orangeBranch, blueBranch] = treeBranches;

            // Validate each branch is an array
            if (
                !Array.isArray(yellowBranch) ||
                !Array.isArray(orangeBranch) ||
                !Array.isArray(blueBranch)
            ) {
                throw new Error(
                    `Invalid array format: tree ${treeIndex} branches must be arrays`,
                );
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
                                `Invalid array format: tree ${treeIndex}, ${branchKey} branch, index ${i} is not a number`,
                            );
                        }
                        tree[nodeIds[i]] = value;
                    }
                });
            });

            // Nodes beyond branch array lengths are implicitly 0
            return tree;
        },
    );

    return { trees, owned };
}

/**
 * Encodes build data into a serialized string for URL sharing
 * Uses compact branch-based format with truncated trailing zeros
 * Returns the serialized string directly (all characters are URL-safe, no base64 encoding needed)
 */
export function encodeBuildData(buildData: BuildData): string {
    const [treeArrays, owned] = convertTreesToArrayFormat(
        buildData.trees,
        buildData.owned,
    );
    return serializeArrayFormat(treeArrays, owned, buildData.name);
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
    // Split on build name separator to validate build data part separately
    // Name is at the start, so build data comes after the separator
    const nameSeparatorIndex = encoded.indexOf(SEPARATOR_BUILD_NAME);
    const buildDataPart =
        nameSeparatorIndex !== -1
            ? encoded.slice(nameSeparatorIndex + 1)
            : encoded;

    // Validate build data part (after name separator, or entire string if no name) matches pattern
    if (!SERIALIZED_PATTERN.test(buildDataPart)) {
        return null;
    }

    const parsed = safeExecute(
        () => parseArrayFormat(encoded),
        "Failed to parse array format",
    );
    if (!parsed) return null;

    const [treeArrays, owned, name] = parsed;
    const arrayFormat = [...treeArrays, owned];

    const buildData = safeExecute(
        () => convertArrayFormatToTrees(arrayFormat),
        "Failed to convert array format to trees",
    );
    if (!buildData) return null;

    // Add name if present
    if (name) {
        buildData.name = name;
    }

    return buildData;
}
