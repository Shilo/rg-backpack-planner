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
          if (decodedTree[nodeId] !== level) {
            treesMatch = false;
            console.log(
              `❌ Tree ${i}, node ${nodeId}: expected ${level}, got ${decodedTree[nodeId] ?? 0}`
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

      // Check compression is positive (base64url must be smaller than custom serialized)
      const compressionIsPositive = encodedLength < customSerializedLength;
      
      if (!treesMatch) {
        console.log("❌ FAILED: Data mismatch");
        failedTests++;
      } else if (!compressionIsPositive) {
        console.log(`❌ FAILED: Compression is not positive (base64url: ${encodedLength}, custom: ${customSerializedLength})`);
        failedTests++;
      } else {
        console.log("✅ PASSED");
        passedTests++;
      }

      // Print lengths
      console.log(`JSON string length: ${jsonLength} characters`);
      console.log(`Custom serialized length: ${customSerializedLength} characters`);
      console.log(`Base64url encoded length: ${encodedLength} characters`);
      console.log(`Compression ratio (base64url vs custom): ${((1 - encodedLength / customSerializedLength) * 100).toFixed(1)}%`);

      totalCustomSerializedLength += customSerializedLength;
      totalJsonLength += jsonLength;
      totalBase64urlLength += encodedLength;

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
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📏 Average JSON string length: ${(totalJsonLength / testCases.length).toFixed(1)} characters`);
  console.log(`📏 Average custom serialized length: ${(totalCustomSerializedLength / testCases.length).toFixed(1)} characters`);
  console.log(`📏 Average base64url encoded length: ${(totalBase64urlLength / testCases.length).toFixed(1)} characters`);
  console.log(`🗜️  Overall compression ratio (base64url vs custom): ${((1 - totalBase64urlLength / totalCustomSerializedLength) * 100).toFixed(1)}%`);
  console.log("===");
}

// Auto-run when imported
runTests();
