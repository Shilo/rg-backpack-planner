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
      owned: 1234, // High owned value requiring multi-character base36
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

  let totalCustomSerializedLength = 0;
  let totalJsonLength = 0;
  let totalBase64urlLength = 0;
  let passedTests = 0;
  let failedTests = 0;
  let warningCount = 0;
  
  // Track longest encoded lengths and values
  let longestCustomSerializedLength = 0;
  let longestBase64urlLength = 0;
  let longestCustomTestName = "";
  let longestBase64urlTestName = "";
  let longestCustomSerializedValue = "";
  let longestBase64urlValue = "";

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log("---");

    try {
      // Get JSON string for comparison
      const jsonString = JSON.stringify(testCase.buildData);
      const jsonLength = jsonString.length;

      // Encode to get base64url
      const encoded = encodeBuildData(testCase.buildData);
      const encodedLength = encoded.length;

      // Decode base64url to get the custom serialized string (before base64)
      // Convert base64url back to base64, then decode
      let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      const customSerialized = atob(base64);
      const customSerializedLength = customSerialized.length;
      
      // Note: Serialized string uses base36 encoding and custom separators
      // Format: yellow:orange:blue;yellow:orange:blue;yellow:orange:blue[;owned]
      // Separators: : (branches), ; (trees), , (values), - (RLE), * (tree RLE)

      // Decode build data
      const decoded = decodeBuildData(encoded);
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

      // Check compression (base64url encoding should not expand since all chars are base64url-safe)
      // However, base64 encoding still adds some overhead, so check if it's reasonable
      const compressionIsPositive = encodedLength <= customSerializedLength * 1.4; // Allow up to 40% overhead for base64

      if (!treesMatch) {
        console.log("❌ FAILED: Data mismatch");
        failedTests++;
      } else {
        console.log("✅ PASSED");
        passedTests++;
        // Warn if compression overhead is too high (but don't fail)
        if (!compressionIsPositive) {
          console.log(`⚠️ WARNING: Base64 encoding overhead is high (base64url: ${encodedLength}, custom: ${customSerializedLength}, overhead: ${((encodedLength / customSerializedLength - 1) * 100).toFixed(1)}%)`);
          warningCount++;
        }
      }

      // Print lengths
      console.log(`JSON string length: ${jsonLength} characters`);
      console.log(`Custom serialized length: ${customSerializedLength} characters`);
      console.log(`Base64url encoded length: ${encodedLength} characters`);
      const overhead = encodedLength > customSerializedLength 
        ? `+${((encodedLength / customSerializedLength - 1) * 100).toFixed(1)}%`
        : `${((1 - encodedLength / customSerializedLength) * 100).toFixed(1)}%`;
      console.log(`Base64 encoding overhead: ${overhead}`);

      totalCustomSerializedLength += customSerializedLength;
      totalJsonLength += jsonLength;
      totalBase64urlLength += encodedLength;
      
      // Track longest encoded lengths and values
      if (customSerializedLength > longestCustomSerializedLength) {
        longestCustomSerializedLength = customSerializedLength;
        longestCustomTestName = testCase.name;
        longestCustomSerializedValue = customSerialized;
      }
      if (encodedLength > longestBase64urlLength) {
        longestBase64urlLength = encodedLength;
        longestBase64urlTestName = testCase.name;
        longestBase64urlValue = encoded;
      }

      // Print before/after
      console.log("\nOriginal build data (JSON):");
      console.log(JSON.stringify(testCase.buildData, null, 2));
      console.log("\nDecoded build data (JSON):");
      console.log(JSON.stringify(decoded, null, 2));
      console.log("\nCustom serialized string (before base64):");
      console.log(customSerialized);
      console.log("\nBase64url encoded string:");
      console.log(encoded);
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
  if (warningCount > 0) {
    console.log(`⚠️ Warnings: ${warningCount} (compression not positive)`);
  }
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📏 Average JSON string length: ${(totalJsonLength / testCases.length).toFixed(1)} characters`);
  console.log(`📏 Average custom serialized length: ${(totalCustomSerializedLength / testCases.length).toFixed(1)} characters`);
  console.log(`📏 Average base64url encoded length: ${(totalBase64urlLength / testCases.length).toFixed(1)} characters`);
  const overallOverhead = totalBase64urlLength > totalCustomSerializedLength
    ? `+${((totalBase64urlLength / totalCustomSerializedLength - 1) * 100).toFixed(1)}%`
    : `${((1 - totalBase64urlLength / totalCustomSerializedLength) * 100).toFixed(1)}%`;
  console.log(`🗜️ Overall base64 encoding overhead: ${overallOverhead}`);
  console.log();
  console.log("📈 Longest Encoded Lengths:");
  console.log(`   Custom serialized: ${longestCustomSerializedLength} characters - "${longestCustomTestName}"`);
  console.log(`   Base64url encoded: ${longestBase64urlLength} characters - "${longestBase64urlTestName}"`);
  console.log();
  console.log("📝 Longest Encoded Values:");
  console.log(`   Custom serialized (${longestCustomSerializedLength} chars):`);
  console.log(`   ${longestCustomSerializedValue}`);
  console.log(`   Base64url encoded (${longestBase64urlLength} chars):`);
  console.log(`   ${longestBase64urlValue}`);
  console.log("===");
}

// Auto-run when imported
runTests();
