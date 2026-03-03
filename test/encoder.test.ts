/**
 * Tests for build data encoding/decoding
 * Run with: npm run test
 * Or import and run in browser console
 */

import type { BuildData } from "../src/lib/buildData/encoder.ts";
import {
    encodeBuildData,
    decodeBuildData,
    decodeNameSpaces,
} from "../src/lib/buildData/encoder.ts";
import { getBuildNameFromEncoded } from "../src/lib/buildData/url.ts";

function fromObjectTrees(trees: Array<Record<string, number>>): number[][] {
    const maxIndex = 30;
    return trees.map((obj) => {
        const arr: number[] = new Array(maxIndex).fill(0);
        for (const [key, value] of Object.entries(obj)) {
            const index = Number(key);
            if (
                Number.isInteger(index) &&
                index >= 0 &&
                index < maxIndex &&
                typeof value === "number"
            ) {
                arr[index] = value;
            }
        }
        return arr;
    });
}

/**
 * Test cases use index-based BuildData.
 * Indices 0-9 yellow, 10-19 orange, 20-29 blue.
 */
const testCases: Array<{ name: string; buildData: BuildData }> = [
    {
        name: "Empty build (all zeros)",
        buildData: {
            trees: [[], [], []],
            owned: 0,
        },
    },
    {
        name: "Single node level 1 (index 0)",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
        },
    },
    {
        name: "Single node (blue root index 20)",
        buildData: {
            trees: [
                Array.from({ length: 21 }, (_, i) => (i === 20 ? 1 : 0)),
                [],
                [],
            ],
            owned: 0,
        },
    },
    {
        name: "Multiple nodes, all level 1",
        buildData: {
            trees: [
                [1, 1, 1],
                Array.from({ length: 13 }, (_, i) =>
                    i >= 10 && i <= 12 ? 1 : 0,
                ),
                Array.from({ length: 23 }, (_, i) =>
                    i >= 20 && i <= 22 ? 1 : 0,
                ),
            ],
            owned: 0,
        },
    },
    {
        name: "Mixed levels with zeros",
        buildData: {
            trees: [
                [1, 0, 1, 0, 0, 0, 0, 1],
                Array.from({ length: 13 }, (_, i) =>
                    i === 10 ? 100 : i === 12 ? 1 : 0,
                ),
                Array.from({ length: 28 }, (_, i) =>
                    i === 21 || i === 22 ? 1 : i === 27 ? 100 : 0,
                ),
            ],
            owned: 0,
        },
    },
    {
        name: "High values",
        buildData: {
            trees: [
                [100, 50, 25, 0, 0, 0, 0, 0, 0, 5],
                Array.from({ length: 20 }, (_, i) =>
                    i === 10
                        ? 100
                        : i === 11
                            ? 50
                            : i === 12
                                ? 25
                                : i === 19
                                    ? 5
                                    : 0,
                ),
                Array.from({ length: 30 }, (_, i) =>
                    i === 20
                        ? 100
                        : i === 21
                            ? 50
                            : i === 22
                                ? 25
                                : i === 29
                                    ? 5
                                    : 0,
                ),
            ],
            owned: 0,
        },
    },
    {
        name: "With owned crystals",
        buildData: {
            trees: [
                [1, 1],
                Array.from({ length: 12 }, (_, i) =>
                    i === 10 || i === 11 ? 1 : 0,
                ),
                Array.from({ length: 22 }, (_, i) =>
                    i === 20 || i === 21 ? 1 : 0,
                ),
            ],
            owned: 50,
        },
    },
    {
        name: "Complex build with many nodes",
        buildData: {
            trees: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 5],
                Array.from({ length: 20 }, (_, i) =>
                    i >= 10 && i <= 18 ? 1 : i === 19 ? 5 : 0,
                ),
                Array.from({ length: 30 }, (_, i) =>
                    i === 20 ||
                        i === 21 ||
                        i === 22 ||
                        i === 26 ||
                        i === 27 ||
                        i === 28
                        ? 1
                        : i === 23 || i === 24
                            ? 100
                            : i === 25
                                ? 50
                                : i === 29
                                    ? 5
                                    : 0,
                ),
            ],
            owned: 0,
        },
    },
    {
        name: "All nodes at max level in every tree",
        buildData: (() => {
            const full: number[] = [];
            for (let i = 0; i < 30; i++) {
                full[i] =
                    i === 9 || i === 19 || i === 29
                        ? 1
                        : i === 7 ||
                            i === 8 ||
                            i === 17 ||
                            i === 18 ||
                            i === 27 ||
                            i === 28
                            ? 50
                            : 100;
            }
            return { trees: [[...full], [...full], [...full]], owned: 0 };
        })(),
    },
    {
        name: "Worst case: All trees different, no patterns, high values, scattered zeros",
        buildData: (() => {
            const t1: number[] = [];
            const t2: number[] = [];
            const t3: number[] = [];
            [
                73, 0, 83, 0, 47, 0, 79, 41, 71, 3, 0, 67, 0, 61, 0, 59, 0, 0,
                53, 0, 0, 43, 0, 37, 0, 31, 2, 0, 0, 0,
            ].forEach((v, i) => {
                t1[i] = v;
            });
            [
                0, 91, 0, 88, 0, 86, 0, 82, 0, 0, 78, 0, 76, 0, 74, 0, 72, 68,
                64, 4, 0, 62, 0, 58, 0, 56, 0, 0, 0, 0,
            ].forEach((v, i) => {
                t2[i] = v;
            });
            [
                95, 0, 93, 0, 87, 85, 0, 81, 0, 0, 0, 77, 0, 75, 69, 0, 65, 0,
                63, 0, 57, 0, 55, 0, 51, 49, 0, 0, 0, 5,
            ].forEach((v, i) => {
                t3[i] = v;
            });
            return { trees: [t1, t2, t3], owned: 1234 };
        })(),
    },
    // Edge case tests
    {
        name: "Empty build with owned > 0",
        buildData: {
            trees: [[], [], []],
            owned: 100,
        },
    },
    {
        name: "Single branch with single value",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
        },
    },
    {
        name: "All zeros in a branch (trailing truncation)",
        buildData: {
            trees: [[1, 0, 0, 0], [], []],
            owned: 0,
        },
    },
    {
        name: "All zeros in a tree",
        buildData: {
            trees: [[], [], []],
            owned: 0,
        },
    },
    {
        name: "Maximum values (100, 50, 5)",
        buildData: {
            trees: [[100, 0, 0, 0, 0, 0, 0, 50, 0, 5], [], []],
            owned: 0,
        },
    },
    {
        name: "Large owned value (multi-character base62)",
        buildData: {
            trees: [[1], [], []],
            owned: 3844,
        },
    },
    {
        name: "Very large owned value",
        buildData: {
            trees: [[], [], []],
            owned: 238328, // "1000" in base62
        },
    },
    {
        name: "Single value in branch (no RLE)",
        buildData: {
            trees: [
                Array.from({ length: 21 }, (_, i) => (i === 20 ? 1 : 0)),
                [],
                [],
            ],
            owned: 0,
        },
    },
    {
        name: "All zeros in branch (RLE pattern)",
        buildData: {
            trees: [[0, 0, 0, 0, 0], [], []],
            owned: 0,
        },
    },
    {
        name: "Mixed zeros and values (RLE patterns)",
        buildData: {
            trees: [
                Array.from({ length: 24 }, (_, i) =>
                    i === 10 || i === 3 || i === 23 ? 1 : 0,
                ),
                [],
                [],
            ],
            owned: 0,
        },
    },
    {
        name: "Consecutive identical values (RLE compression)",
        buildData: {
            trees: [[1, 1, 1, 1], [], []],
            owned: 0,
        },
    },
    {
        name: "Long run of zeros (RLE)",
        buildData: {
            trees: [Array.from({ length: 30 }, () => 0), [], []],
            owned: 0,
        },
    },
    {
        name: "Long run of identical non-zero values (RLE)",
        buildData: {
            trees: [
                Array.from({ length: 24 }, (_, i) =>
                    i === 0 ||
                        i === 10 ||
                        i === 20 ||
                        i === 3 ||
                        i === 13 ||
                        i === 23
                        ? 50
                        : 0,
                ),
                [],
                [],
            ],
            owned: 0,
        },
    },
    {
        name: "Base62 edge case: value 0",
        buildData: { trees: [[0], [], []], owned: 0 },
    },
    {
        name: "Base62 edge case: value 61 (last single char)",
        buildData: { trees: [[61], [], []], owned: 0 },
    },
    {
        name: "Base62 edge case: value 62 (first two char)",
        buildData: { trees: [[62], [], []], owned: 0 },
    },
    {
        name: "Base62 edge case: value 3843 (last two char)",
        buildData: { trees: [[3843], [], []], owned: 0 },
    },
    {
        name: "Base62 edge case: value 3844 (first three char)",
        buildData: { trees: [[3844], [], []], owned: 0 },
    },
    {
        name: "Two identical trees",
        buildData: {
            trees: [
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                [],
            ],
            owned: 0,
        },
    },
    {
        name: "Two trees with owned",
        buildData: {
            trees: [
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                [],
            ],
            owned: 25,
        },
    },
    {
        name: "All three trees identical",
        buildData: {
            trees: [
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
                Array.from({ length: 21 }, (_, i) =>
                    i === 0 || i === 20 ? 1 : 0,
                ),
            ],
            owned: 0,
        },
    },
    {
        name: "First tree empty, others have data",
        buildData: {
            trees: [
                [],
                [1],
                Array.from({ length: 21 }, (_, i) => (i === 20 ? 1 : 0)),
            ],
            owned: 0,
        },
    },
    {
        name: "Middle tree empty",
        buildData: {
            trees: fromObjectTrees([{ "0": 1 }, {}, { "20": 1 }]),
            owned: 0,
        },
    },
    {
        name: "Last tree empty",
        buildData: {
            trees: fromObjectTrees([{ "0": 1 }, { "20": 1 }, {}]),
            owned: 0,
        },
    },
    {
        name: "First branch empty in tree",
        buildData: {
            trees: fromObjectTrees([{ "10": 1, "20": 1 }, {}, {}]),
            owned: 0,
        },
    },
    {
        name: "Middle branch empty in tree",
        buildData: {
            trees: fromObjectTrees([{ "0": 1, "20": 1 }, {}, {}]),
            owned: 0,
        },
    },
    {
        name: "Last branch empty in tree",
        buildData: {
            trees: fromObjectTrees([{ "0": 1, "10": 1 }, {}, {}]),
            owned: 0,
        },
    },
    {
        name: "Single node at max level (100)",
        buildData: { trees: fromObjectTrees([{ "0": 100 }, {}, {}]), owned: 0 },
    },
    {
        name: "Single node at global max (50)",
        buildData: { trees: fromObjectTrees([{ "7": 50 }, {}, {}]), owned: 0 },
    },
    {
        name: "Single node at final max (5)",
        buildData: { trees: fromObjectTrees([{ "9": 5 }, {}, {}]), owned: 0 },
    },
    {
        name: "Owned value 0 (should be omitted)",
        buildData: { trees: fromObjectTrees([{ "0": 1 }, {}, {}]), owned: 0 },
    },
    {
        name: "Owned value 1 (single char base62)",
        buildData: { trees: fromObjectTrees([{ "0": 1 }, {}, {}]), owned: 1 },
    },
    {
        name: "Owned value 61 (last single char base62)",
        buildData: { trees: fromObjectTrees([{ "0": 1 }, {}, {}]), owned: 61 },
    },
    {
        name: "Owned value 62 (first two char base62)",
        buildData: { trees: fromObjectTrees([{ "0": 1 }, {}, {}]), owned: 62 },
    },
    {
        name: "Complex RLE: alternating pattern",
        buildData: {
            trees: fromObjectTrees([
                { "0": 1, "10": 0, "20": 1, "3": 0, "13": 1, "23": 0 },
                {},
                {},
            ]),
            owned: 0,
        },
    },
    {
        name: "Complex RLE: runs of 2, 3, 4 values",
        buildData: {
            trees: fromObjectTrees([
                {
                    "0": 1,
                    "10": 1,
                    "20": 2,
                    "3": 2,
                    "13": 2,
                    "23": 3,
                    "7": 3,
                    "17": 3,
                    "27": 3,
                    "1": 4,
                    "11": 4,
                    "21": 4,
                },
                {},
                {},
            ]),
            owned: 0,
        },
    },
    // Additional edge cases
    {
        name: "Only middle branch in tree",
        buildData: { trees: fromObjectTrees([{}, { "10": 1 }, {}]), owned: 0 },
    },
    {
        name: "Leading zeros in branch",
        buildData: { trees: fromObjectTrees([{ "2": 1 }, {}, {}]), owned: 0 },
    },
    {
        name: "RLE run of exactly 2",
        buildData: { trees: [[2, 2], [], []], owned: 0 },
    },
    {
        name: "RLE count 10 (base62)",
        buildData: {
            trees: [Array.from({ length: 10 }, () => 1), [], []],
            owned: 0,
        },
    },
    {
        name: "Single value at last node (index 29)",
        buildData: { trees: fromObjectTrees([{ "29": 1 }, {}, {}]), owned: 0 },
    },
    {
        name: "Owned 3843 (base62 ZZ)",
        buildData: {
            trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
            owned: 3843,
        },
    },
    {
        name: "Alternating at branch boundary (indices 8,9,10)",
        buildData: {
            trees: fromObjectTrees([{ "8": 1, "9": 0, "10": 1 }, {}, {}]),
            owned: 0,
        },
    },
    {
        name: "All three max values in single branch (100, 50, 5)",
        buildData: {
            trees: fromObjectTrees([{ "0": 100, "7": 50, "9": 5 }, {}, {}]),
            owned: 0,
        },
    },
    // Build name tests
    {
        name: "Simple build with name",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "My Build",
        },
    },
    {
        name: "Build with name and owned crystals",
        buildData: {
            trees: [[1, 1], [], []],
            owned: 50,
            name: "PVE Build",
        },
    },
    {
        name: "Build with name containing spaces",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "My PVE Build",
        },
    },
    {
        name: "Build with name containing special characters",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "Build #1 (PVE)",
        },
    },
    {
        name: "Build with name containing URL-encoded characters",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "Build & Test",
        },
    },
    {
        name: "Build with name containing unicode characters",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "Build 🎒 Test",
        },
    },
    {
        name: "Build with empty string name (should be treated as no name)",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "",
        },
    },
    {
        name: "Build with whitespace-only name (should be treated as no name)",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "   ",
        },
    },
    {
        name: "Complex build with name",
        buildData: {
            trees: [
                [1, 1, 1, 1, 1],
                Array.from({ length: 12 }, (_, i) =>
                    i === 10 || i === 11 ? 1 : 0,
                ),
                Array.from({ length: 22 }, (_, i) =>
                    i === 20 || i === 21 ? 1 : 0,
                ),
            ],
            owned: 100,
            name: "Complex PVE Build",
        },
    },
    {
        name: "Build with very long name",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "This is a very long build name that tests how the encoder handles longer strings",
        },
    },
    {
        name: "Build with name containing pipe character (separator)",
        buildData: {
            trees: [[1], [], []],
            owned: 0,
            name: "Build | Test",
        },
    },
];

/**
 * Decoder compatibility tests
 * Format: . (node), , (branch), ; (tree), ' (RLE node count), : (RLE tree count), | (build name)
 */
const decodeCompatibilityCases: Array<{
    name: string;
    serialized: string;
    expected: BuildData | null;
}> = [
        {
            name: "Tree-level RLE without owned: 3 identical simple trees",
            serialized: "1:3",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 0,
            },
        },
        {
            name: "Tree-level RLE with owned: 3 identical simple trees, owned 10",
            serialized: "1:3;;;a",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 10,
            },
        },
        {
            name: "Tree-level RLE with branches and owned: 3 identical complex trees, owned 10",
            serialized: "1,,1:3;;;a",
            expected: {
                trees: fromObjectTrees([
                    { "0": 1, "20": 1 },
                    { "0": 1, "20": 1 },
                    { "0": 1, "20": 1 },
                ]),
                owned: 10,
            },
        },
        {
            name: "Explicit three trees plus owned: 3 identical simple trees, owned 10",
            serialized: "1;1;1;a",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 10,
            },
        },
        {
            name: "Invalid: bad owned value (not base62)",
            serialized: "1;1;1;@",
            expected: null,
        },
        // Build name compatibility tests (name at start)
        {
            name: "Build with name: simple name",
            serialized: "My%20Build|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "My Build",
            },
        },
        {
            name: "Build with name and owned: name at start",
            serialized: "PVE%20Build|1;;;a",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 10,
                name: "PVE Build",
            },
        },
        {
            name: "Build with name containing special characters",
            serialized: "Build%20%231%20(PVE)|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "Build #1 (PVE)",
            },
        },
        {
            name: "Build with name containing ampersand",
            serialized: "Build%20%26%20Test|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "Build & Test",
            },
        },
        {
            name: "Build with name: complex build",
            serialized: "Complex%20Build|1,1;1,1;1,1;a",
            expected: {
                trees: fromObjectTrees([
                    { "0": 1, "10": 1 },
                    { "0": 1, "10": 1 },
                    { "0": 1, "10": 1 },
                ]),
                owned: 10,
                name: "Complex Build",
            },
        },
        {
            name: "Build with name: empty build with name",
            serialized: "Empty%20Build|_",
            expected: {
                trees: [[], [], []],
                owned: 0,
                name: "Empty Build",
            },
        },
        {
            name: "Build with name: tree-level RLE with name",
            serialized: "Three%20Trees|1:3",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 0,
                name: "Three Trees",
            },
        },
        {
            name: "Build with name: tree-level RLE with owned and name",
            serialized: "Named%20Build|1:3;;;a",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 10,
                name: "Named Build",
            },
        },
        // Underscore-encoded name tests (new URL-safe encoding)
        {
            name: "Build with underscore-encoded name: single space",
            serialized: "My_Build|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "My Build",
            },
        },
        {
            name: "Build with underscore-encoded name: multiple spaces",
            serialized: "My_Cool_Build|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "My Cool Build",
            },
        },
        {
            name: "Build with underscore-encoded name: consecutive spaces",
            serialized: "Build__Name|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "Build  Name",
            },
        },
        {
            name: "Build with underscore-encoded name: leading and trailing spaces",
            serialized: "_Build_|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: " Build ",
            },
        },
        {
            name: "Build with underscore-encoded name: only underscores",
            serialized: "___|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "   ",
            },
        },
        {
            name: "Build with underscore-encoded name: no spaces",
            serialized: "BuildName|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "BuildName",
            },
        },
        {
            name: "Build with underscore-encoded name: mixed with special chars",
            serialized: "Build_1_(PVE)|1",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, {}, {}]),
                owned: 0,
                name: "Build 1 (PVE)",
            },
        },
        {
            name: "Build with underscore-encoded name: complex build with owned",
            serialized: "PVE_Guardian_Max|1,1;1,1;1,1;a",
            expected: {
                trees: fromObjectTrees([
                    { "0": 1, "10": 1 },
                    { "0": 1, "10": 1 },
                    { "0": 1, "10": 1 },
                ]),
                owned: 10,
                name: "PVE Guardian Max",
            },
        },
        {
            name: "Build with underscore-encoded name: empty build",
            serialized: "Empty_Test|_",
            expected: {
                trees: [[], [], []],
                owned: 0,
                name: "Empty Test",
            },
        },
        {
            name: "Build with underscore-encoded name: tree-level RLE",
            serialized: "Three_Identical_Trees|1:3",
            expected: {
                trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
                owned: 0,
                name: "Three Identical Trees",
            },
        },
    ];

/**
 * Run all tests
 */
export function runTests() {
    console.log("===");
    console.log("Build Data Encoding/Decoding Tests");
    console.log("===");
    console.log();

    let totalSerializedLength = 0;
    let totalJsonLength = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Track longest encoded lengths and values
    let longestSerializedLength = 0;
    let longestSerializedTestName = "";
    let longestSerializedValue = "";

    testCases.forEach((testCase, index) => {
        console.log(`Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            // Get JSON string for comparison
            const jsonString = JSON.stringify(testCase.buildData);
            const jsonLength = jsonString.length;

            // Encode to get serialized string (directly, no base64 encoding)
            // Wrap in try-catch with timeout protection to prevent infinite loops
            let serialized: string;
            try {
                serialized = encodeBuildData(testCase.buildData);
            } catch (error) {
                console.log(
                    `❌ FAILED: Encoding threw error: ${error instanceof Error ? error.message : String(error)}`,
                );
                failedTests++;
                console.log();
                return;
            }

            const serializedLength = serialized.length;

            // Serialized format: . (node), , (branch), ; (tree), ' (RLE node), : (RLE tree)

            // Decode build data with timeout protection
            let decoded: BuildData | null = null;
            try {
                decoded = decodeBuildData(serialized);
            } catch (error) {
                console.log(
                    `❌ FAILED: Decoding threw error: ${error instanceof Error ? error.message : String(error)}`,
                );
                failedTests++;
                console.log();
                return;
            }

            // Verify
            if (!decoded) {
                console.log("❌ FAILED: Decode returned null");
                failedTests++;
                console.log();
                return;
            }

            // Compare trees
            let treesMatch = true;
            for (let i = 0; i < testCase.buildData.trees.length; i++) {
                const originalTree = testCase.buildData.trees[i];
                const decodedTree = decoded.trees[i];

                for (const [nodeId, level] of Object.entries(originalTree)) {
                    const decodedLevel = decodedTree[nodeId] ?? 0;
                    if (decodedLevel !== level) {
                        treesMatch = false;
                        console.log(
                            `❌ Tree ${i}, node ${nodeId}: expected ${level}, got ${decodedLevel}`,
                        );
                    }
                }
            }

            // Compare owned
            if (decoded.owned !== testCase.buildData.owned) {
                treesMatch = false;
                console.log(
                    `❌ Owned: expected ${testCase.buildData.owned}, got ${decoded.owned}`,
                );
            }

            // Compare name (if present)
            // Empty string or whitespace-only names are treated as "no name" during encoding
            const originalName = testCase.buildData.name;
            const isEmptyOrWhitespace =
                originalName !== undefined && originalName.trim() === "";
            const expectedName = isEmptyOrWhitespace ? undefined : originalName;

            if (expectedName !== undefined) {
                if (decoded.name !== expectedName) {
                    treesMatch = false;
                    console.log(
                        `❌ Name: expected "${expectedName}", got "${decoded.name ?? "undefined"}"`,
                    );
                }
            } else if (decoded.name !== undefined) {
                // Original had no name (or empty/whitespace), decoded shouldn't either
                treesMatch = false;
                console.log(
                    `❌ Name: expected undefined, got "${decoded.name}"`,
                );
            }

            if (!treesMatch) {
                console.log("❌ FAILED: Data mismatch");
                failedTests++;
            } else {
                console.log("✅ PASSED");
                passedTests++;
            }

            // Print lengths
            console.log(`JSON string length: ${jsonLength} characters`);
            console.log(
                `Serialized string length: ${serializedLength} characters`,
            );
            const compressionRatio =
                serializedLength > 0
                    ? `${((1 - serializedLength / jsonLength) * 100).toFixed(1)}%`
                    : "0%";
            console.log(`Compression ratio vs JSON: ${compressionRatio}`);

            totalSerializedLength += serializedLength;
            totalJsonLength += jsonLength;

            // Track longest encoded lengths and values
            if (serializedLength > longestSerializedLength) {
                longestSerializedLength = serializedLength;
                longestSerializedTestName = testCase.name;
                longestSerializedValue = serialized;
            }

            // Print before/after
            console.log("\nOriginal build data (JSON):");
            console.log(JSON.stringify(testCase.buildData));
            console.log("\nDecoded build data (JSON):");
            console.log(JSON.stringify(decoded));
            console.log("\nSerialized string:");
            console.log(serialized);
            console.log();
        } catch (error) {
            console.log(
                `❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
            );
            failedTests++;
            console.log();
        }
    });

    // Summary
    console.log("===");
    console.log("Summary");
    console.log("===");
    console.log(`📊 Total tests: ${testCases.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(
        `📏 Average JSON string length: ${(totalJsonLength / testCases.length).toFixed(1)} characters`,
    );
    console.log(
        `📏 Average serialized string length: ${(totalSerializedLength / testCases.length).toFixed(1)} characters`,
    );
    const overallCompressionRatio =
        totalSerializedLength > 0
            ? `${((1 - totalSerializedLength / totalJsonLength) * 100).toFixed(1)}%`
            : "0%";
    console.log(
        `🗜️ Overall compression ratio vs JSON: ${overallCompressionRatio}`,
    );
    console.log();
    console.log("📈 Longest Encoded Length:");
    console.log(
        `   Serialized: ${longestSerializedLength} characters - "${longestSerializedTestName}"`,
    );
    console.log();
    console.log("📝 Longest Encoded Value:");
    console.log(`   Serialized (${longestSerializedLength} chars):`);
    console.log(`   ${longestSerializedValue}`);
    console.log("===");

    return {
        total: testCases.length,
        passed: passedTests,
        failed: failedTests,
        skipped: 0,
        compressionStats: {
            avgJsonLength: totalJsonLength / testCases.length,
            avgSerializedLength: totalSerializedLength / testCases.length,
            compressionRatio: overallCompressionRatio,
            longestSerializedLength,
            longestSerializedTestName,
            longestSerializedValue,
        },
    };
}

/**
 * Run decoder compatibility tests (decode serialized strings → expected BuildData).
 */
export function runDecoderCompatibilityTests() {
    console.log("===");
    console.log("Decoder Compatibility Tests");
    console.log("===");
    console.log();

    let passedTests = 0;
    let failedTests = 0;

    decodeCompatibilityCases.forEach((testCase, index) => {
        console.log(`Decode Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            let decoded: BuildData | null = null;
            try {
                decoded = decodeBuildData(testCase.serialized);
            } catch (error) {
                console.log(
                    `❌ FAILED: Decoding threw error: ${error instanceof Error ? error.message : String(error)
                    }`,
                );
                failedTests++;
                console.log();
                return;
            }

            if (decoded === null) {
                if (testCase.expected === null) {
                    console.log("✅ PASSED: Correctly rejected invalid format");
                    passedTests++;
                } else {
                    console.log("❌ FAILED: Decode returned null");
                    failedTests++;
                }
                console.log();
                return;
            }

            if (testCase.expected === null) {
                console.log(
                    "❌ FAILED: Expected invalid format, but decoded to:",
                    JSON.stringify(decoded),
                );
                failedTests++;
                console.log();
                return;
            }

            // Compare trees
            let treesMatch = true;
            if (testCase.expected) {
                for (let i = 0; i < testCase.expected.trees.length; i++) {
                    const expectedTree = testCase.expected.trees[i];
                    const decodedTree = decoded.trees[i];

                    for (const [nodeId, level] of Object.entries(
                        expectedTree,
                    )) {
                        const decodedLevel = decodedTree[nodeId] ?? 0;
                        if (decodedLevel !== level) {
                            treesMatch = false;
                            console.log(
                                `❌ Tree ${i}, node ${nodeId}: expected ${level}, got ${decodedLevel}`,
                            );
                        }
                    }
                }

                // Compare owned
                if (decoded.owned !== testCase.expected.owned) {
                    treesMatch = false;
                    console.log(
                        `❌ Owned: expected ${testCase.expected.owned}, got ${decoded.owned}`,
                    );
                }

                // Compare name
                if (testCase.expected.name !== undefined) {
                    if (decoded.name !== testCase.expected.name) {
                        treesMatch = false;
                        console.log(
                            `❌ Name: expected "${testCase.expected.name}", got "${decoded.name ?? "undefined"}"`,
                        );
                    }
                } else if (decoded.name !== undefined) {
                    treesMatch = false;
                    console.log(
                        `❌ Name: expected undefined, got "${decoded.name}"`,
                    );
                }
            }

            if (treesMatch) {
                console.log("✅ PASSED");
                passedTests++;
            } else {
                console.log("❌ FAILED: Data mismatch");
                const expectedJson = JSON.stringify(testCase.expected);
                const decodedJson = JSON.stringify(decoded);
                console.log(`Expected: ${expectedJson}`);
                console.log(`Got:      ${decodedJson}`);
                failedTests++;
            }
        } catch (error) {
            console.log(
                `❌ FAILED: ${error instanceof Error ? error.message : String(error)
                }`,
            );
            failedTests++;
        }

        console.log();
    });

    console.log("===");
    console.log("Decoder Compatibility Summary");
    console.log("===");
    console.log(`📊 Total decode tests: ${decodeCompatibilityCases.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log("===");

    return {
        total: decodeCompatibilityCases.length,
        passed: passedTests,
        failed: failedTests,
        skipped: 0,
    };
}

/**
 * Error handling tests - invalid strings for format (.,;':)
 */
const errorTestCases: Array<{
    name: string;
    invalidString: string;
    expectedError?: string;
}> = [
        {
            name: "Invalid format: empty string",
            invalidString: "",
        },
        {
            name: "Invalid format: invalid character",
            invalidString: "1;1@1",
        },
        {
            name: "Invalid format: malformed RLE (value' with no count)",
            invalidString: "1'",
        },
        {
            name: "Invalid format: invalid RLE count (zero)",
            invalidString: "1'0",
        },
        {
            name: "Invalid format: bad owned value",
            invalidString: "1;1;1;@",
        },
        {
            name: "Invalid format: five trees (invalid)",
            invalidString: "1;1;1;1;1",
        },
        {
            name: "Invalid format: invalid base62 in owned",
            invalidString: "1;1;1;@@",
        },
        {
            name: "Invalid format: malformed tree RLE",
            invalidString: "1:",
        },
        {
            name: "Invalid format: invalid RLE count in tree",
            invalidString: "1:0",
        },
        {
            name: "Invalid format: build name separator without build data",
            invalidString: "Name|",
        },
        {
            name: "Invalid format: multiple build name separators",
            invalidString: "Name|Build|Extra",
        },
    ];

/**
 * Run error handling tests (decode invalid strings → null).
 */
export function runErrorTests() {
    console.log("===");
    console.log("Error Handling Tests");
    console.log("===");
    console.log();

    let passedTests = 0;
    let failedTests = 0;

    errorTestCases.forEach((testCase, index) => {
        console.log(`Error Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            let decoded: BuildData | null = null;
            try {
                decoded = decodeBuildData(testCase.invalidString);
            } catch {
                decoded = null;
            }

            if (decoded === null) {
                console.log("✅ PASSED: Correctly rejected invalid format");
                passedTests++;
            } else {
                console.log("❌ FAILED: Should have rejected invalid format");
                console.log(`   Decoded result: ${JSON.stringify(decoded)}`);
                failedTests++;
            }
        } catch (error) {
            console.log(
                `❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
            );
            failedTests++;
        }

        console.log();
    });

    console.log("===");
    console.log("Error Tests Summary");
    console.log("===");
    console.log(`📊 Total error tests: ${errorTestCases.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log("===");

    return {
        total: errorTestCases.length,
        passed: passedTests,
        failed: failedTests,
        skipped: 0,
    };
}

/**
 * Test cases for getBuildNameFromEncoded function
 */
const buildNameTestCases: Array<{
    name: string;
    encoded: string;
    expected: string | null;
}> = [
        // Valid cases
        {
            name: "Simple name with URL encoding",
            encoded: "My%20Build|1",
            expected: "My Build",
        },
        {
            name: "Name with underscores converted to spaces",
            encoded: "My_Build|1",
            expected: "My Build",
        },
        {
            name: "Name with both URL encoding and underscores",
            encoded: "My%20Cool_Build|1;;;a",
            expected: "My Cool Build",
        },
        {
            name: "Name with special characters URL encoded",
            encoded: "Build%20%231%20(PVE)|1",
            expected: "Build #1 (PVE)",
        },
        {
            name: "Name with multiple URL-encoded spaces",
            encoded: "Complex%20PVE%20Build|1,,1",
            expected: "Complex PVE Build",
        },
        {
            name: "Name with mixed underscores and URL-encoded spaces",
            encoded: "Best%20Guardian_Build|1",
            expected: "Best Guardian Build",
        },
        {
            name: "Simple single-word name",
            encoded: "Guardian|1",
            expected: "Guardian",
        },
        {
            name: "Name with URL-encoded parentheses",
            encoded: "Build%20%28v2%29|1",
            expected: "Build (v2)",
        },
        {
            name: "Long name with multiple words",
            encoded: "This_is_a_very_long_build_name|1",
            expected: "This is a very long build name",
        },
        {
            name: "Name with numbers",
            encoded: "Build_123|1",
            expected: "Build 123",
        },
        {
            name: "Name with URL-encoded apostrophe",
            encoded: "Player%27s_Build|1",
            expected: "Player's Build",
        },
        {
            name: "Name with multiple consecutive underscores",
            encoded: "My___Build|1",
            expected: "My   Build",
        },
        // Edge cases - missing separator
        {
            name: "No separator (no pipe character)",
            encoded: "My%20Build",
            expected: null,
        },
        {
            name: "No separator with underscores",
            encoded: "My_Build",
            expected: null,
        },
        {
            name: "Empty string",
            encoded: "",
            expected: null,
        },
        {
            name: "Only separator",
            encoded: "|",
            expected: null,
        },
        {
            name: "Separator at start (empty name)",
            encoded: "|1",
            expected: null,
        },
        {
            name: "Only whitespace before separator",
            encoded: "   |1",
            expected: null,
        },
        {
            name: "Whitespace-only name after URL decode",
            encoded: "%20%20%20|1",
            expected: "   ",
        },
        // Edge cases - malformed input
        {
            name: "Invalid URL encoding (incomplete percent)",
            encoded: "My%2Build|1",
            expected: "My+uild",
        },
        {
            name: "Invalid URL encoding (non-hex characters)",
            encoded: "My%ZZBuild|1",
            expected: "My%ZZBuild",
        },
        {
            name: "Multiple separators (use first)",
            encoded: "First|Second|1",
            expected: "First",
        },
        {
            name: "Name with trailing whitespace (URL encoded)",
            encoded: "MyBuild%20%20%20|1",
            expected: "MyBuild   ",
        },
        {
            name: "Name with leading whitespace (URL encoded)",
            encoded: "%20%20%20MyBuild|1",
            expected: "   MyBuild",
        },
        // Type safety
        {
            name: "Non-string input (number)",
            encoded: 123 as any,
            expected: null,
        },
        {
            name: "Non-string input (null)",
            encoded: null as any,
            expected: null,
        },
        {
            name: "Non-string input (undefined)",
            encoded: undefined as any,
            expected: null,
        },
        {
            name: "Non-string input (object)",
            encoded: {} as any,
            expected: null,
        },
    ];

export function runBuildNameTests() {
    console.log("===");
    console.log("Build Name Extraction Tests (getBuildNameFromEncoded)");
    console.log("===");
    console.log();

    let passedTests = 0;
    let failedTests = 0;

    buildNameTestCases.forEach((testCase, index) => {
        console.log(`Build Name Test ${index + 1}: ${testCase.name}`);
        console.log("---");
        console.log(`   Input: ${JSON.stringify(testCase.encoded)}`);
        console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);

        try {
            const result = getBuildNameFromEncoded(testCase.encoded);
            console.log(`   Result: ${JSON.stringify(result)}`);

            if (result === testCase.expected) {
                console.log("✅ PASSED");
                passedTests++;
            } else {
                console.log("❌ FAILED: Result does not match expected value");
                failedTests++;
            }
        } catch (error) {
            console.log(
                `❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
            );
            failedTests++;
        }

        console.log();
    });

    console.log("===");
    console.log("Build Name Tests Summary");
    console.log("===");
    console.log(`📊 Total tests: ${buildNameTestCases.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log("===");

    return {
        total: buildNameTestCases.length,
        passed: passedTests,
        failed: failedTests,
        skipped: 0,
    };
}

/**
 * Run name encoding/decoding utility function tests
 */
export function runNameEncodingTests() {
    console.log("===");
    console.log("Name Encoding/Decoding Utility Tests");
    console.log("===");
    console.log();

    let passedTests = 0;
    let failedTests = 0;

    const nameEncodingTestCases: Array<{
        name: string;
        input: string;
        expected: string;
    }> = [
            {
                name: "Single underscore to space",
                input: "My_Build",
                expected: "My Build",
            },
            {
                name: "Multiple underscores to spaces",
                input: "My_Cool_Build_Name",
                expected: "My Cool Build Name",
            },
            {
                name: "Consecutive underscores to consecutive spaces",
                input: "Build__Name",
                expected: "Build  Name",
            },
            {
                name: "Three consecutive underscores",
                input: "A___B",
                expected: "A   B",
            },
            {
                name: "Leading underscore to leading space",
                input: "_Build",
                expected: " Build",
            },
            {
                name: "Trailing underscore to trailing space",
                input: "Build_",
                expected: "Build ",
            },
            {
                name: "Leading and trailing underscores",
                input: "_Build_Name_",
                expected: " Build Name ",
            },
            {
                name: "Only underscores (single)",
                input: "_",
                expected: " ",
            },
            {
                name: "Only underscores (multiple)",
                input: "___",
                expected: "   ",
            },
            {
                name: "No underscores (no change)",
                input: "BuildName",
                expected: "BuildName",
            },
            {
                name: "Empty string",
                input: "",
                expected: "",
            },
            {
                name: "Mixed with numbers",
                input: "Build_1_PVE",
                expected: "Build 1 PVE",
            },
            {
                name: "Mixed with special characters",
                input: "Build_#1_(PVE)",
                expected: "Build #1 (PVE)",
            },
            {
                name: "Mixed with hyphens and underscores",
                input: "PVE-Build_v2.0",
                expected: "PVE-Build v2.0",
            },
            {
                name: "Very long name with many underscores",
                input: "This_is_a_very_long_build_name_for_testing",
                expected: "This is a very long build name for testing",
            },
        ];

    nameEncodingTestCases.forEach((testCase, index) => {
        console.log(`Name Test ${index + 1}: ${testCase.name}`);
        console.log("---");

        try {
            const result = decodeNameSpaces(testCase.input);

            if (result === testCase.expected) {
                console.log("✅ PASSED");
                passedTests++;
            } else {
                console.log("❌ FAILED: Output mismatch");
                console.log(`   Input:    "${testCase.input}"`);
                console.log(`   Expected: "${testCase.expected}"`);
                console.log(`   Got:      "${result}"`);
                failedTests++;
            }
        } catch (error) {
            console.log(
                `❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
            );
            failedTests++;
        }

        console.log();
    });

    console.log("===");
    console.log("Name Encoding Tests Summary");
    console.log("===");
    console.log(`📊 Total name tests: ${nameEncodingTestCases.length}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log("===");

    return {
        total: nameEncodingTestCases.length,
        passed: passedTests,
        failed: failedTests,
        skipped: 0,
    };
}

// Auto-run when imported
try {
    const errorSummary = runErrorTests();
    console.log();
    const normalSummary = runTests();
    console.log();
    const decodeSummary = runDecoderCompatibilityTests();
    console.log();
    const nameSummary = runNameEncodingTests();
    const buildNameSummary = runBuildNameTests();
    console.log();

    // Combined Final Summary
    console.log("===");
    console.log("Encoder Test Suite Summary");
    console.log("===");
    const totalTests =
        errorSummary.total +
        normalSummary.total +
        decodeSummary.total +
        nameSummary.total +
        buildNameSummary.total;
    const totalPassed =
        errorSummary.passed +
        normalSummary.passed +
        decodeSummary.passed +
        nameSummary.passed +
        buildNameSummary.passed;
    const totalFailed =
        errorSummary.failed +
        normalSummary.failed +
        decodeSummary.failed +
        nameSummary.failed +
        buildNameSummary.failed;
    const totalSkipped =
        errorSummary.skipped +
        normalSummary.skipped +
        decodeSummary.skipped +
        nameSummary.skipped +
        buildNameSummary.skipped;

    console.log(`📊 Total tests (all): ${totalTests}`);
    console.log(
        `   - Error handling tests: ${errorSummary.total} (${errorSummary.passed} passed, ${errorSummary.failed} failed, ${errorSummary.skipped} skipped)`,
    );
    console.log(
        `   - Encoding/decoding tests: ${normalSummary.total} (${normalSummary.passed} passed, ${normalSummary.failed} failed)`,
    );
    console.log(
        `   - Decoder compatibility tests: ${decodeSummary.total} (${decodeSummary.passed} passed, ${decodeSummary.failed} failed, ${decodeSummary.skipped} skipped)`,
    );
    console.log(
        `   - Name encoding tests: ${nameSummary.total} (${nameSummary.passed} passed, ${nameSummary.failed} failed, ${nameSummary.skipped} skipped)`,
    );
    console.log(
        `   - Build name extraction tests: ${buildNameSummary.total} (${buildNameSummary.passed} passed, ${buildNameSummary.failed} failed, ${buildNameSummary.skipped} skipped)`,
    );
    console.log(`✅ Total passed: ${totalPassed}`);
    console.log(`❌ Total failed: ${totalFailed}`);
    if (totalSkipped > 0) {
        console.log(`⏭️  Total skipped: ${totalSkipped}`);
    }
    console.log(
        `📊 Success rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`,
    );
    if (normalSummary.compressionStats) {
        console.log(
            `🗜️ Compression ratio: ${normalSummary.compressionStats.compressionRatio}`,
        );
    }
    console.log("===");

    if (totalFailed > 0) {
        throw new Error(`${totalFailed} encoder test(s) failed`);
    }
} catch (error) {
    console.error(
        "❌ Test suite crashed:",
        error instanceof Error ? error.message : String(error),
    );
    throw error;
}
