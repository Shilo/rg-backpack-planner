import {
    createShareUrl,
    getEncodedFromUrl,
    isDefaultPresetName,
    parseEncodedFromUserInput,
    getBuildNameFromEncoded,
} from "../src/lib/buildData/url.ts";
import { decodeBuildData, encodeBuildData } from "../src/lib/buildData/encoder.ts";

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

const validBuildData = {
    trees: [[1, 1]],
    owned: 0,
};
const encodedValidBuild = encodeBuildData(validBuildData);
const SHARED_PAYLOAD_EXAMPLE =
    "E'4.k.E.E.a.k.1,E'7.k.k.1,E.E.k.E.E.k'3.a;,E'7.k.k;Y.Y.E.Y.k.E.E.a.k,Y.Y.E.E.Y.E.E.k.k.1";
const RECOMMENDED_LATE_PVE =
    "Late_PvE|,k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7";
const recommendedLatePveBuildData = decodeBuildData(RECOMMENDED_LATE_PVE);
if (!recommendedLatePveBuildData) {
    throw new Error("Expected Late_PvE recommended build fixture to decode");
}

Object.defineProperty(globalThis, "window", {
    value: {
        location: {
            origin: "https://rgbp.app",
            hash: "",
            pathname: "/",
            href: "https://rgbp.app/",
        },
        history: {
            replaceState() {},
            pushState() {},
        },
        dispatchEvent() {},
    },
    configurable: true,
});

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
    parseEncodedFromUserInput(`https://rgbp.app/#${SHARED_PAYLOAD_EXAMPLE}`),
    SHARED_PAYLOAD_EXAMPLE,
    "Should accept the reported production share URL payload",
);
assertEqual(
    parseEncodedFromUserInput(
        `https://rgbp.app/#${encodeURIComponent(SHARED_PAYLOAD_EXAMPLE)}`,
    ),
    encodeURIComponent(SHARED_PAYLOAD_EXAMPLE),
    "Should accept mobile percent-encoded share URL payloads",
);
assertEqual(
    parseEncodedFromUserInput("Late_PvE"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a recommended build name alias to its encoded build",
);
assertEqual(
    parseEncodedFromUserInput("#Late_PvE"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a recommended build name alias from a raw hash",
);
assertEqual(
    parseEncodedFromUserInput("late_pve"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a lowercase recommended build name alias",
);
assertEqual(
    parseEncodedFromUserInput("late pve"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a space-separated recommended build name alias",
);
assertEqual(
    parseEncodedFromUserInput("  LaTe   PvE  "),
    RECOMMENDED_LATE_PVE,
    "Should resolve a mixed-case recommended build name alias with extra spaces",
);
assertEqual(
    parseEncodedFromUserInput("4"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a recommended build numeric alias to its encoded build",
);
assertEqual(
    parseEncodedFromUserInput("https://rgbp.app/#4"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a recommended build numeric alias from a full URL",
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

// getEncodedFromUrl alias resolution tests
window.location.hash = "#Late_PvE";
assertEqual(
    getEncodedFromUrl(),
    RECOMMENDED_LATE_PVE,
    "Should resolve the canonical recommended name hash to encoded build data",
);

window.location.hash = "#late pve";
assertEqual(
    getEncodedFromUrl(),
    RECOMMENDED_LATE_PVE,
    "Should resolve a lowercase spaced recommended name hash to encoded build data",
);

window.location.hash = "#4";
assertEqual(
    getEncodedFromUrl(),
    RECOMMENDED_LATE_PVE,
    "Should resolve the recommended numeric hash to encoded build data",
);

window.location.hash = `#${encodedValidBuild}`;
assertEqual(
    getEncodedFromUrl(),
    encodedValidBuild,
    "Should leave existing custom build hashes unchanged",
);

// createShareUrl recommended alias tests
assertEqual(
    createShareUrl(recommendedLatePveBuildData),
    "https://rgbp.app/#Late_PvE",
    "Should emit the canonical recommended name alias for exact recommended builds",
);

const editedRecommendedBuildData = {
    ...recommendedLatePveBuildData,
    owned: recommendedLatePveBuildData.owned + 1,
};
assertEqual(
    createShareUrl(editedRecommendedBuildData),
    `https://rgbp.app/#${encodeBuildData(editedRecommendedBuildData)}`,
    "Should keep using the full encoded share URL after a recommended build is edited",
);
