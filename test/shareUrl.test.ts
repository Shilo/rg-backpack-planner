import {
    isDefaultPresetName,
    parseEncodedFromUserInput,
    getBuildNameFromEncoded,
} from "../src/lib/buildData/url.ts";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) {
        throw new Error(
            `${message}. Expected ${expectedJson}, got ${actualJson}`,
        );
    }
}

// isDefaultPresetName tests — canonical English names only
// (preset names are always stored in canonical English internally)
assertEqual(isDefaultPresetName("Default"), true, "Should identify 'Default'");
assertEqual(isDefaultPresetName("New"), true, "Should identify 'New'");
assertEqual(isDefaultPresetName("Clone"), true, "Should identify 'Clone'");
assertEqual(isDefaultPresetName("New 123"), true, "Should identify 'New X'");
assertEqual(isDefaultPresetName("Clone 42"), true, "Should identify 'Clone X'");
assertEqual(isDefaultPresetName("My Build"), false, "Should not identify custom name");
assertEqual(isDefaultPresetName("CloneBuild"), false, "Should not identify partial match");
assertEqual(isDefaultPresetName(""), false, "Should handle empty string");
assertEqual(isDefaultPresetName(undefined), false, "Should handle undefined");
assertEqual(isDefaultPresetName(null), false, "Should handle null");
assertEqual(isDefaultPresetName("デフォルト"), false, "Should not identify localized names (stored canonically)");

// Valid payload for parse tests
// This is a minimal valid encoded payload representing an empty build
const VALID_PAYLOAD = "A-A-A"; // Adjust this if the payload format changes in the future, but "A-A-A" is typical for empty base64/url-safe encoders

// Since we can't easily generate a mathematically valid encoded string in this test without
// calling the real encoder (which we want to test parsing for, not encoding), 
// we will create a mock valid payload by encoding a known build.
import { encodeBuildData } from "../src/lib/buildData/encoder.ts";
const validBuildData = {
    trees: [[1]],
    owned: 0,
};
const encodedValidBuild = encodeBuildData(validBuildData);

// parseEncodedFromUserInput tests
assertEqual(
    parseEncodedFromUserInput(`https://example.com/#${encodedValidBuild}`),
    encodedValidBuild,
    "Should extract payload from full URL with hash",
);
assertEqual(
    parseEncodedFromUserInput(`http://localhost:5173/rg-backpack-planner/#Name|${encodedValidBuild}`),
    `Name|${encodedValidBuild}`,
    "Should extract named payload from full URL",
);
assertEqual(
    parseEncodedFromUserInput(`#${encodedValidBuild}`),
    encodedValidBuild,
    "Should extract payload from raw hash string",
);
assertEqual(
    parseEncodedFromUserInput(encodedValidBuild),
    encodedValidBuild,
    "Should validate raw payload string",
);
assertEqual(
    parseEncodedFromUserInput(`Custom_Name|${encodedValidBuild}`),
    `Custom_Name|${encodedValidBuild}`,
    "Should validate raw payload with name",
);
assertEqual(
    parseEncodedFromUserInput("https://example.com/"),
    null,
    "Should reject URL without hash",
);
assertEqual(
    parseEncodedFromUserInput("not-a-valid-encoded-string-!@#$"),
    null,
    "Should reject invalid payload",
);
assertEqual(
    parseEncodedFromUserInput(""),
    null,
    "Should reject empty string",
);

// getBuildNameFromEncoded tests
assertEqual(
    getBuildNameFromEncoded(`My_Cool_Build|${encodedValidBuild}`),
    "My Cool Build",
    "Should extract and decode name with underscores",
);
assertEqual(
    getBuildNameFromEncoded(`My%20Build|${encodedValidBuild}`),
    "My Build",
    "Should extract and decode URL-encoded name",
);
assertEqual(
    getBuildNameFromEncoded(`${encodedValidBuild}`),
    null,
    "Should return null if no name present",
);
assertEqual(
    getBuildNameFromEncoded(`|${encodedValidBuild}`),
    null,
    "Should return null if name is empty before separator",
);
