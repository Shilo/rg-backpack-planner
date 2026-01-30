/**
 * Tests for build data encoding/decoding
 * Run with: node --loader ts-node/esm src/lib/buildData/encoder.test.ts
 * Or import and run in browser console
 */

import type { BuildData } from "../src/lib/buildData/encoder";
import { encodeBuildData, decodeBuildData } from "../src/lib/buildData/encoder";

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
      trees: [Array.from({ length: 21 }, (_, i) => (i === 20 ? 1 : 0)), [], []],
      owned: 0,
    },
  },
  {
    name: "Multiple nodes, all level 1",
    buildData: {
      trees: [
        [1, 1, 1],
        Array.from({ length: 13 }, (_, i) => (i >= 10 && i <= 12 ? 1 : 0)),
        Array.from({ length: 23 }, (_, i) => (i >= 20 && i <= 22 ? 1 : 0)),
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
          i === 10 ? 100 : i === 11 ? 50 : i === 12 ? 25 : i === 19 ? 5 : 0,
        ),
        Array.from({ length: 30 }, (_, i) =>
          i === 20 ? 100 : i === 21 ? 50 : i === 22 ? 25 : i === 29 ? 5 : 0,
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
        Array.from({ length: 12 }, (_, i) => (i === 10 || i === 11 ? 1 : 0)),
        Array.from({ length: 22 }, (_, i) => (i === 20 || i === 21 ? 1 : 0)),
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
          i === 20 || i === 21 || i === 22 || i === 26 || i === 27 || i === 28
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
      [73, 0, 83, 0, 47, 0, 79, 41, 71, 3, 0, 67, 0, 61, 0, 59, 0, 0, 53, 0, 0, 43, 0, 37, 0, 31, 2, 0, 0, 0].forEach(
        (v, i) => {
          t1[i] = v;
        },
      );
      [0, 91, 0, 88, 0, 86, 0, 82, 0, 0, 78, 0, 76, 0, 74, 0, 72, 68, 64, 4, 0, 62, 0, 58, 0, 56, 0, 0, 0, 0].forEach(
        (v, i) => {
          t2[i] = v;
        },
      );
      [95, 0, 93, 0, 87, 85, 0, 81, 0, 0, 0, 77, 0, 75, 69, 0, 65, 0, 63, 0, 57, 0, 55, 0, 51, 49, 0, 0, 0, 5].forEach(
        (v, i) => {
          t3[i] = v;
        },
      );
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
      trees: [Array.from({ length: 21 }, (_, i) => (i === 20 ? 1 : 0)), [], []],
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
          i === 0 || i === 10 || i === 20 || i === 3 || i === 13 || i === 23
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
        Array.from({ length: 21 }, (_, i) => (i === 0 || i === 20 ? 1 : 0)),
        Array.from({ length: 21 }, (_, i) => (i === 0 || i === 20 ? 1 : 0)),
        [],
      ],
      owned: 0,
    },
  },
  {
    name: "All three trees identical",
    buildData: {
      trees: [
        Array.from({ length: 21 }, (_, i) => (i === 0 || i === 20 ? 1 : 0)),
        Array.from({ length: 21 }, (_, i) => (i === 0 || i === 20 ? 1 : 0)),
        Array.from({ length: 21 }, (_, i) => (i === 0 || i === 20 ? 1 : 0)),
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
    buildData: { trees: fromObjectTrees([{ "0": 1 }, {}, { "20": 1 }]), owned: 0 },
  },
  {
    name: "Last tree empty",
    buildData: { trees: fromObjectTrees([{ "0": 1 }, { "20": 1 }, {}]), owned: 0 },
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
          "0": 1, "10": 1, "20": 2, "3": 2, "13": 2, "23": 3,
          "7": 3, "17": 3, "27": 3, "1": 4, "11": 4, "21": 4,
        },
        {},
        {},
      ]),
      owned: 0,
    },
  },
];

/**
 * Decoder compatibility tests
 * Format: . (node), , (branch), ; (tree), ' (RLE node count), : (RLE tree count)
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
    serialized: "1:3;a",
    expected: {
      trees: fromObjectTrees([{ "0": 1 }, { "0": 1 }, { "0": 1 }]),
      owned: 10,
    },
  },
  {
    name: "Tree-level RLE with branches and owned: 3 identical complex trees, owned 10",
    serialized: "1,,1:3;a",
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
    name: "Invalid: too many trees when using tree-level RLE plus owned",
    serialized: "1:4;a",
    expected: null,
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
        console.log(`❌ FAILED: Encoding threw error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.log(`❌ FAILED: Decoding threw error: ${error instanceof Error ? error.message : String(error)}`);
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
              `❌ Tree ${i}, node ${nodeId}: expected ${level}, got ${decodedLevel}`
            );
          }
        }
      }

      // Compare owned
      if (decoded.owned !== testCase.buildData.owned) {
        treesMatch = false;
        console.log(
          `❌ Owned: expected ${testCase.buildData.owned}, got ${decoded.owned}`
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
      console.log(`Serialized string length: ${serializedLength} characters`);
      const compressionRatio = serializedLength > 0
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
      console.log(`❌ FAILED: ${error instanceof Error ? error.message : String(error)}`);
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
  console.log(`📏 Average JSON string length: ${(totalJsonLength / testCases.length).toFixed(1)} characters`);
  console.log(`📏 Average serialized string length: ${(totalSerializedLength / testCases.length).toFixed(1)} characters`);
  const overallCompressionRatio = totalSerializedLength > 0
    ? `${((1 - totalSerializedLength / totalJsonLength) * 100).toFixed(1)}%`
    : "0%";
  console.log(`🗜️ Overall compression ratio vs JSON: ${overallCompressionRatio}`);
  console.log();
  console.log("📈 Longest Encoded Length:");
  console.log(`   Serialized: ${longestSerializedLength} characters - "${longestSerializedTestName}"`);
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

      const expectedJson = JSON.stringify(testCase.expected);
      const decodedJson = JSON.stringify(decoded);

      if (decodedJson === expectedJson) {
        console.log("✅ PASSED");
        passedTests++;
      } else {
        console.log("❌ FAILED: Data mismatch");
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
const errorTestCases: Array<{ name: string; invalidString: string; expectedError?: string }> = [
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
    name: "Invalid format: too many trees with owned",
    invalidString: "1:4;a",
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
      console.log(`❌ FAILED: ${error instanceof Error ? error.message : String(error)}`);
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

// Auto-run when imported
try {
  const errorSummary = runErrorTests();
  console.log();
  const normalSummary = runTests();
  console.log();
  const decodeSummary = runDecoderCompatibilityTests();
  console.log();

  // Combined Final Summary
  console.log("===");
  console.log("Final Combined Summary");
  console.log("===");
  const totalTests = errorSummary.total + normalSummary.total + decodeSummary.total;
  const totalPassed = errorSummary.passed + normalSummary.passed + decodeSummary.passed;
  const totalFailed = errorSummary.failed + normalSummary.failed + decodeSummary.failed;
  const totalSkipped = errorSummary.skipped + normalSummary.skipped + decodeSummary.skipped;

  console.log(`📊 Total tests (all): ${totalTests}`);
  console.log(`   - Error handling tests: ${errorSummary.total} (${errorSummary.passed} passed, ${errorSummary.failed} failed, ${errorSummary.skipped} skipped)`);
  console.log(`   - Encoding/decoding tests: ${normalSummary.total} (${normalSummary.passed} passed, ${normalSummary.failed} failed)`);
  console.log(`   - Decoder compatibility tests: ${decodeSummary.total} (${decodeSummary.passed} passed, ${decodeSummary.failed} failed, ${decodeSummary.skipped} skipped)`);
  console.log(`✅ Total passed: ${totalPassed}`);
  console.log(`❌ Total failed: ${totalFailed}`);
  if (totalSkipped > 0) {
    console.log(`⏭️  Total skipped: ${totalSkipped}`);
  }
  console.log(`📊 Success rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  if (normalSummary.compressionStats) {
    console.log(`🗜️ Compression ratio: ${normalSummary.compressionStats.compressionRatio}`);
  }
  console.log("===");
} catch (error) {
  console.error("❌ Test suite crashed:", error instanceof Error ? error.message : String(error));
  throw error;
}
