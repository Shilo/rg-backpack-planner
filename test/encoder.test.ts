/**
 * Tests for build data encoding/decoding
 * Run with: node --loader ts-node/esm src/lib/buildData/encoder.test.ts
 * Or import and run in browser console
 */

import type { BuildData } from "../src/lib/buildData/encoder";
import { encodeBuildData, decodeBuildData } from "../src/lib/buildData/encoder";

/**
 * Test cases with various build configurations
 */
const testCases: Array<{ name: string; buildData: BuildData }> = [
  {
    name: "Empty build (all zeros)",
    buildData: {
      trees: [{}, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Single node level 1",
    buildData: {
      trees: [{ hp: 1 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Multiple nodes, all level 1",
    buildData: {
      trees: [
        { hp: 1, attack_3_1: 1, dodge_3_1: 1 },
        { hp: 1, attack_3_1: 1, dodge_3_1: 1 },
        { hp: 1, attack_3_1: 1, dodge_3_1: 1 },
      ],
      owned: 0,
    },
  },
  {
    name: "Mixed levels with zeros",
    buildData: {
      trees: [
        { hp: 1, attack_3_1: 0, dodge_3_1: 1, damage_reflection_3_1: 0, global_attack_3_1: 1 },
        { hp: 100, attack_3_1: 0, dodge_3_1: 1 },
        { hp: 0, attack_3_1: 1, dodge_3_1: 1, damage_reflection_3_1: 100 },
      ],
      owned: 0,
    },
  },
  {
    name: "High values",
    buildData: {
      trees: [
        { hp: 100, attack_3_1: 50, dodge_3_1: 25, final_3: 5 },
        { hp: 100, attack_3_1: 50, dodge_3_1: 25, final_3: 5 },
        { hp: 100, attack_3_1: 50, dodge_3_1: 25, final_3: 5 },
      ],
      owned: 0,
    },
  },
  {
    name: "With owned crystals",
    buildData: {
      trees: [
        { hp: 1, attack_3_1: 1 },
        { hp: 1, attack_3_1: 1 },
        { hp: 1, attack_3_1: 1 },
      ],
      owned: 50,
    },
  },
  {
    name: "Complex build with many nodes",
    buildData: {
      trees: [
        {
          hp: 1,
          attack_3_1: 1,
          dodge_3_1: 1,
          damage_reflection_3_1: 1,
          global_attack_3_1: 1,
          def_3_2: 1,
          ignore_dodge_3_2: 1,
          ignore_stun_3_2: 1,
          global_def_3_2: 1,
          final_3: 5,
        },
        {
          hp: 1,
          attack_3_1: 1,
          dodge_3_1: 1,
          damage_reflection_3_1: 1,
          global_attack_3_1: 1,
          def_3_2: 1,
          ignore_dodge_3_2: 1,
          ignore_stun_3_2: 1,
          global_def_3_2: 1,
          final_3: 5,
        },
        {
          hp: 1,
          attack_3_1: 1,
          dodge_3_1: 1,
          damage_reflection_3_1: 100,
          global_attack_3_1: 100,
          def_3_2: 50,
          ignore_dodge_3_2: 1,
          ignore_stun_3_2: 1,
          global_def_3_2: 1,
          final_3: 5,
        },
      ],
      owned: 0,
    },
  },
  {
    name: "All nodes at max level in every tree",
    buildData: {
      trees: [
        {
          attack: 100,
          defense: 100,
          hp: 100,
          attack_3_1: 100,
          dodge_3_1: 100,
          damage_reflection_3_1: 100,
          global_attack_3_1: 50,
          hp_1_1: 100,
          ignore_dodge_1_1: 100,
          skill_critical_res_1_1: 100,
          global_def_1_1: 50,
          hp_2_1: 100,
          dodge_2_1: 100,
          skill_crit_res_2_1: 100,
          global_hp_2_1: 50,
          def_3_2: 100,
          ignore_dodge_3_2: 100,
          ignore_stun_3_2: 100,
          global_def_3_2: 50,
          def_1_2: 100,
          dodge_1_2: 100,
          ignore_stun_1_2: 100,
          global_hp_1_2: 50,
          attack_2_2: 100,
          ignore_dodge_2_2: 100,
          damage_reflection_2_2: 100,
          global_attack_2_2: 50,
          final_1: 5,
          final_2: 5,
          final_3: 5,
        },
        {
          attack: 100,
          defense: 100,
          hp: 100,
          attack_3_1: 100,
          dodge_3_1: 100,
          damage_reflection_3_1: 100,
          global_attack_3_1: 50,
          hp_1_1: 100,
          ignore_dodge_1_1: 100,
          skill_critical_res_1_1: 100,
          global_def_1_1: 50,
          hp_2_1: 100,
          dodge_2_1: 100,
          skill_crit_res_2_1: 100,
          global_hp_2_1: 50,
          def_3_2: 100,
          ignore_dodge_3_2: 100,
          ignore_stun_3_2: 100,
          global_def_3_2: 50,
          def_1_2: 100,
          dodge_1_2: 100,
          ignore_stun_1_2: 100,
          global_hp_1_2: 50,
          attack_2_2: 100,
          ignore_dodge_2_2: 100,
          damage_reflection_2_2: 100,
          global_attack_2_2: 50,
          final_1: 5,
          final_2: 5,
          final_3: 5,
        },
        {
          attack: 100,
          defense: 100,
          hp: 100,
          attack_3_1: 100,
          dodge_3_1: 100,
          damage_reflection_3_1: 100,
          global_attack_3_1: 50,
          hp_1_1: 100,
          ignore_dodge_1_1: 100,
          skill_critical_res_1_1: 100,
          global_def_1_1: 50,
          hp_2_1: 100,
          dodge_2_1: 100,
          skill_crit_res_2_1: 100,
          global_hp_2_1: 50,
          def_3_2: 100,
          ignore_dodge_3_2: 100,
          ignore_stun_3_2: 100,
          global_def_3_2: 50,
          def_1_2: 100,
          dodge_1_2: 100,
          ignore_stun_1_2: 100,
          global_hp_1_2: 50,
          attack_2_2: 100,
          ignore_dodge_2_2: 100,
          damage_reflection_2_2: 100,
          global_attack_2_2: 50,
          final_1: 5,
          final_2: 5,
          final_3: 5,
        },
      ],
      owned: 0,
    },
  },
  {
    name: "Worst case: All trees different, no patterns, high values, scattered zeros",
    buildData: {
      trees: [
        {
          // Tree 1: Many different high values, no consecutive duplicates
          attack: 73,
          defense: 89,
          hp: 97,
          attack_3_1: 0,
          dodge_3_1: 83,
          damage_reflection_3_1: 0,
          global_attack_3_1: 47,
          hp_1_1: 0,
          ignore_dodge_1_1: 79,
          skill_critical_res_1_1: 0,
          global_def_1_1: 41,
          hp_2_1: 71,
          dodge_2_1: 0,
          skill_crit_res_2_1: 67,
          global_hp_2_1: 0,
          def_3_2: 61,
          ignore_dodge_3_2: 0,
          ignore_stun_3_2: 59,
          global_def_3_2: 0,
          def_1_2: 0,
          dodge_1_2: 53,
          ignore_stun_1_2: 0,
          global_hp_1_2: 43,
          attack_2_2: 0,
          ignore_dodge_2_2: 37,
          damage_reflection_2_2: 0,
          global_attack_2_2: 31,
          final_1: 3,
          final_2: 0,
          final_3: 2,
        },
        {
          // Tree 2: Completely different pattern, no consecutive duplicates
          attack: 0,
          defense: 91,
          hp: 0,
          attack_3_1: 88,
          dodge_3_1: 0,
          damage_reflection_3_1: 86,
          global_attack_3_1: 0,
          hp_1_1: 82,
          ignore_dodge_1_1: 0,
          skill_critical_res_1_1: 78,
          global_def_1_1: 0,
          hp_2_1: 0,
          dodge_2_1: 76,
          skill_crit_res_2_1: 0,
          global_hp_2_1: 74,
          def_3_2: 0,
          ignore_dodge_3_2: 72,
          ignore_stun_3_2: 0,
          global_def_3_2: 68,
          def_1_2: 64,
          dodge_1_2: 0,
          ignore_stun_1_2: 62,
          global_hp_1_2: 0,
          attack_2_2: 58,
          ignore_dodge_2_2: 0,
          damage_reflection_2_2: 56,
          global_attack_2_2: 0,
          final_1: 0,
          final_2: 4,
          final_3: 0,
        },
        {
          // Tree 3: Different again, alternating pattern with no consecutive duplicates
          attack: 95,
          defense: 0,
          hp: 93,
          attack_3_1: 0,
          dodge_3_1: 87,
          damage_reflection_3_1: 85,
          global_attack_3_1: 0,
          hp_1_1: 81,
          ignore_dodge_1_1: 0,
          skill_critical_res_1_1: 77,
          global_def_1_1: 0,
          hp_2_1: 75,
          dodge_2_1: 0,
          skill_crit_res_2_1: 69,
          global_hp_2_1: 0,
          def_3_2: 65,
          ignore_dodge_3_2: 0,
          ignore_stun_3_2: 63,
          global_def_3_2: 0,
          def_1_2: 57,
          dodge_1_2: 0,
          ignore_stun_1_2: 55,
          global_hp_1_2: 0,
          attack_2_2: 51,
          ignore_dodge_2_2: 0,
          damage_reflection_2_2: 49,
          global_attack_2_2: 0,
          final_1: 0,
          final_2: 0,
          final_3: 5,
        },
      ],
      owned: 1234, // High owned value requiring multi-character base62 (count-framed format)
    },
  },
  // Edge case tests
  {
    name: "Empty build with owned > 0",
    buildData: {
      trees: [{}, {}, {}],
      owned: 100,
    },
  },
  {
    name: "Single branch with single value",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "All zeros in a branch (trailing truncation)",
    buildData: {
      trees: [
        { attack: 1, hp_1_1: 0, ignore_dodge_1_1: 0, skill_critical_res_1_1: 0 },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "All zeros in a tree",
    buildData: {
      trees: [{}, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Maximum values (100, 50, 5)",
    buildData: {
      trees: [
        {
          attack: 100,
          global_attack_3_1: 50,
          final_3: 5,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Large owned value (multi-character base62)",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 3844, // "100" in base62
    },
  },
  {
    name: "Very large owned value",
    buildData: {
      trees: [{}, {}, {}],
      owned: 238328, // "1000" in base62
    },
  },
  {
    name: "Single value in branch (no RLE)",
    buildData: {
      trees: [{ hp: 1 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "All zeros in branch (RLE pattern)",
    buildData: {
      trees: [
        {
          attack: 0,
          hp_1_1: 0,
          ignore_dodge_1_1: 0,
          skill_critical_res_1_1: 0,
          global_def_1_1: 0,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Mixed zeros and values (RLE patterns)",
    buildData: {
      trees: [
        {
          attack: 0,
          defense: 1,
          hp: 0,
          attack_3_1: 1,
          dodge_3_1: 0,
          damage_reflection_3_1: 1,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Consecutive identical values (RLE compression)",
    buildData: {
      trees: [
        {
          attack: 1,
          hp_1_1: 1,
          ignore_dodge_1_1: 1,
          skill_critical_res_1_1: 1,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Long run of zeros (RLE)",
    buildData: {
      trees: [
        {
          attack: 0,
          defense: 0,
          hp: 0,
          attack_3_1: 0,
          dodge_3_1: 0,
          damage_reflection_3_1: 0,
          global_attack_3_1: 0,
          hp_1_1: 0,
          ignore_dodge_1_1: 0,
          skill_critical_res_1_1: 0,
          global_def_1_1: 0,
          hp_2_1: 0,
          dodge_2_1: 0,
          skill_crit_res_2_1: 0,
          global_hp_2_1: 0,
          def_3_2: 0,
          ignore_dodge_3_2: 0,
          ignore_stun_3_2: 0,
          global_def_3_2: 0,
          def_1_2: 0,
          dodge_1_2: 0,
          ignore_stun_1_2: 0,
          global_hp_1_2: 0,
          attack_2_2: 0,
          ignore_dodge_2_2: 0,
          damage_reflection_2_2: 0,
          global_attack_2_2: 0,
          final_1: 0,
          final_2: 0,
          final_3: 0,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Long run of identical non-zero values (RLE)",
    buildData: {
      trees: [
        {
          attack: 50,
          defense: 50,
          hp: 50,
          attack_3_1: 50,
          dodge_3_1: 50,
          damage_reflection_3_1: 50,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Base62 edge case: value 0",
    buildData: {
      trees: [{ attack: 0 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Base62 edge case: value 61 (last single char)",
    buildData: {
      trees: [{ attack: 61 }, {}, {}], // "z" in base62
      owned: 0,
    },
  },
  {
    name: "Base62 edge case: value 62 (first two char)",
    buildData: {
      trees: [{ attack: 62 }, {}, {}], // "10" in base62
      owned: 0,
    },
  },
  {
    name: "Base62 edge case: value 3843 (last two char)",
    buildData: {
      trees: [{ attack: 3843 }, {}, {}], // "ZZ" in base62
      owned: 0,
    },
  },
  {
    name: "Base62 edge case: value 3844 (first three char)",
    buildData: {
      trees: [{ attack: 3844 }, {}, {}], // "100" in base62
      owned: 0,
    },
  },
  {
    name: "Two identical trees",
    buildData: {
      trees: [
        { attack: 1, hp: 1 },
        { attack: 1, hp: 1 },
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "All three trees identical",
    buildData: {
      trees: [
        { attack: 1, hp: 1 },
        { attack: 1, hp: 1 },
        { attack: 1, hp: 1 },
      ],
      owned: 0,
    },
  },
  {
    name: "First tree empty, others have data",
    buildData: {
      trees: [{}, { attack: 1 }, { hp: 1 }],
      owned: 0,
    },
  },
  {
    name: "Middle tree empty",
    buildData: {
      trees: [{ attack: 1 }, {}, { hp: 1 }],
      owned: 0,
    },
  },
  {
    name: "Last tree empty",
    buildData: {
      trees: [{ attack: 1 }, { hp: 1 }, {}],
      owned: 0,
    },
  },
  {
    name: "First branch empty in tree",
    buildData: {
      trees: [
        {
          // Only orange and blue branches have data
          hp: 1,
          attack_3_1: 1,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Middle branch empty in tree",
    buildData: {
      trees: [
        {
          // Only yellow and blue branches have data
          attack: 1,
          hp: 1,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Last branch empty in tree",
    buildData: {
      trees: [
        {
          // Only yellow and orange branches have data
          attack: 1,
          defense: 1,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Single node at max level (100)",
    buildData: {
      trees: [{ attack: 100 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Single node at global max (50)",
    buildData: {
      trees: [{ global_attack_3_1: 50 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Single node at final max (5)",
    buildData: {
      trees: [{ final_3: 5 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Owned value 0 (should be omitted)",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 0,
    },
  },
  {
    name: "Owned value 1 (single char base62)",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 1,
    },
  },
  {
    name: "Owned value 61 (last single char base62)",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 61,
    },
  },
  {
    name: "Owned value 62 (first two char base62)",
    buildData: {
      trees: [{ attack: 1 }, {}, {}],
      owned: 62,
    },
  },
  {
    name: "Complex RLE: alternating pattern",
    buildData: {
      trees: [
        {
          attack: 1,
          defense: 0,
          hp: 1,
          attack_3_1: 0,
          dodge_3_1: 1,
          damage_reflection_3_1: 0,
        },
        {},
        {},
      ],
      owned: 0,
    },
  },
  {
    name: "Complex RLE: runs of 2, 3, 4 values",
    buildData: {
      trees: [
        {
          attack: 1,
          defense: 1,
          hp: 2,
          attack_3_1: 2,
          dodge_3_1: 2,
          damage_reflection_3_1: 3,
          global_attack_3_1: 3,
          hp_1_1: 3,
          ignore_dodge_1_1: 4,
          skill_critical_res_1_1: 4,
          global_def_1_1: 4,
          hp_2_1: 4,
        },
        {},
        {},
      ],
      owned: 0,
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
      const serialized = encodeBuildData(testCase.buildData);
      const serializedLength = serialized.length;
      
      // Note: Serialized string uses count-framed format with base62 encoding (0-9, a-z, A-Z)
      // Format: <treeCount>-<tree>-<tree>-...[-o<owned>]
      // tree := <branchCount>-<branch>-<branch>-...
      // branch := <tokenCount>_<token>_<token>_...
      // token := <value> | <value>~<run> | ~<run>
      // Separators: - (structural), _ (tokens), ~ (RLE), o (owned marker)
      // All characters are URL-safe, so no base64 encoding is needed

      // Decode build data
      const decoded = decodeBuildData(serialized);
      const decodedJsonLength = decoded ? JSON.stringify(decoded).length : 0;

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
      console.log(JSON.stringify(testCase.buildData, null, 2));
      console.log("\nDecoded build data (JSON):");
      console.log(JSON.stringify(decoded, null, 2));
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
}

/**
 * Error handling tests - these should fail gracefully
 */
const errorTestCases: Array<{ name: string; invalidString: string; expectedError?: string }> = [
  {
    name: "Invalid format: empty string",
    invalidString: "",
  },
  {
    name: "Invalid format: invalid base62 character",
    invalidString: "3-3---1_@",
  },
  {
    name: "Invalid format: missing tree count",
    invalidString: "-3---1_1",
  },
  {
    name: "Invalid format: invalid tree count (>3)",
    invalidString: "4-3---1_1",
  },
  {
    name: "Invalid format: invalid tree count (negative)",
    invalidString: "-1-3---1_1",
  },
  {
    name: "Invalid format: tree count mismatch",
    invalidString: "2-3---1_1-3---1_1-3---1_1",
  },
  {
    name: "Invalid format: missing branch count",
    invalidString: "1-",
  },
  {
    name: "Invalid format: invalid branch count (>3)",
    invalidString: "1-4-1_1",
  },
  {
    name: "Invalid format: branch count mismatch",
    invalidString: "1-2-1_1",
  },
  {
    name: "Invalid format: missing token count",
    invalidString: "1-1-_1",
  },
  {
    name: "Invalid format: token count mismatch",
    invalidString: "1-1-3_1",
  },
  {
    name: "Invalid format: invalid RLE pattern",
    invalidString: "1-1-1_1~~",
  },
  {
    name: "Invalid format: invalid owned marker",
    invalidString: "1-1-1_1-o",
  },
  {
    name: "Invalid format: owned marker without value",
    invalidString: "1-1-1_1-o",
  },
  {
    name: "Invalid format: extra segments",
    invalidString: "1-1-1_1-extra",
  },
  {
    name: "Invalid format: incomplete tree",
    invalidString: "1-3-1_1",
  },
  {
    name: "Invalid format: incomplete branch",
    invalidString: "1-1-",
  },
];

/**
 * Run error handling tests
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
      const decoded = decodeBuildData(testCase.invalidString);
      
      if (decoded === null) {
        console.log("✅ PASSED: Correctly rejected invalid format");
        passedTests++;
      } else {
        console.log("❌ FAILED: Should have rejected invalid format");
        console.log(`   Decoded result: ${JSON.stringify(decoded)}`);
        failedTests++;
      }
    } catch (error) {
      // decodeBuildData should not throw, it should return null
      console.log(`❌ FAILED: Threw error instead of returning null`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      failedTests++;
    }
    
    console.log();
  });

  // Summary
  console.log("===");
  console.log("Error Tests Summary");
  console.log("===");
  console.log(`📊 Total error tests: ${errorTestCases.length}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log("===");
}

// Auto-run when imported
runTests();
console.log();
runErrorTests();
