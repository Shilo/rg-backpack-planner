import {
    createShareUrl,
    getEncodedFromUrl,
    isDefaultPresetName,
    parseEncodedFromUserInput,
    getBuildNameFromEncoded,
    resolveShareToken,
} from "../src/lib/buildData/url.ts";
import { decodeBuildData, encodeBuildData } from "../src/lib/buildData/encoder.ts";
import { recommendedBuilds } from "../src/lib/buildData/recommended.ts";
import { getRecommendedShareUrlChoices } from "../src/lib/buildData/share.ts";

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
const CUSTOM_FIRST_NODE_ONE = "1";
const OUT_OF_RANGE_NUMERIC_CUSTOM = "6";
const SHARED_PAYLOAD_EXAMPLE =
    "E'4.k.E.E.a.k.1,E'7.k.k.1,E.E.k.E.E.k'3.a;,E'7.k.k;Y.Y.E.Y.k.E.E.a.k,Y.Y.E.E.Y.E.E.k.k.1";
const RECOMMENDED_LATE_PVE =
    "Late_PvE|,k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7";
const RESERVED_LOOKING_CUSTOM_NAME = "Late PvE";
const RESERVED_LOOKING_NAMED_CUSTOM = `Late_PvE|${encodedValidBuild}`;
const RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM = `1|${encodedValidBuild}`;
const FIRST_RECOMMENDED_BUILD = recommendedBuilds[0];
const RECOMMENDED_LATE_PVE_ENTRY = recommendedBuilds.find(
    (build) => build.encoded === RECOMMENDED_LATE_PVE,
);
const recommendedLatePveBuildData = decodeBuildData(RECOMMENDED_LATE_PVE);
if (!recommendedLatePveBuildData) {
    throw new Error("Expected Late_PvE recommended build fixture to decode");
}
if (!FIRST_RECOMMENDED_BUILD) {
    throw new Error("Expected at least one recommended build fixture");
}
if (!RECOMMENDED_LATE_PVE_ENTRY) {
    throw new Error("Expected Late_PvE recommended build metadata");
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
    "Should decode a legacy bare custom payload from a full URL hash",
);
assertEqual(
    parseEncodedFromUserInput(`http://localhost:5173/rg-backpack-planner/#Name|${encodedValidBuild}`),
    `Name|${encodedValidBuild}`,
    "Should decode a legacy bare named custom payload from a full URL hash",
);
assertEqual(
    parseEncodedFromUserInput(`#${encodedValidBuild}`),
    encodedValidBuild,
    "Should decode a legacy bare custom payload from a raw hash string",
);
assertEqual(
    parseEncodedFromUserInput(encodedValidBuild),
    encodedValidBuild,
    "Should decode a raw legacy bare custom payload",
);
assertEqual(
    parseEncodedFromUserInput(`Custom_Name|${encodedValidBuild}`),
    `Custom_Name|${encodedValidBuild}`,
    "Should decode a raw legacy bare named custom payload",
);
assertEqual(
    parseEncodedFromUserInput(`https://rgbp.app/#${SHARED_PAYLOAD_EXAMPLE}`),
    SHARED_PAYLOAD_EXAMPLE,
    "Should decode the reported production bare custom share URL payload",
);
assertEqual(
    parseEncodedFromUserInput(
        `https://rgbp.app/#${encodeURIComponent(SHARED_PAYLOAD_EXAMPLE)}`,
    ),
    SHARED_PAYLOAD_EXAMPLE,
    "Should decode percent-encoded bare custom share URL payloads to raw canonical custom payloads",
);
assertEqual(
    parseEncodedFromUserInput("Late_PvE"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a bare recommended build name alias to its encoded build",
);
assertEqual(
    parseEncodedFromUserInput("#Late_PvE"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a bare recommended build name alias from a raw hash",
);
assertEqual(
    parseEncodedFromUserInput("late_pve"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a lowercase bare recommended build name alias",
);
assertEqual(
    parseEncodedFromUserInput("late pve"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a space-separated bare recommended build name alias",
);
assertEqual(
    parseEncodedFromUserInput("latepve"),
    RECOMMENDED_LATE_PVE,
    "Should resolve a compact bare recommended build name alias",
);
assertEqual(
    parseEncodedFromUserInput("  LaTe   PvE  "),
    RECOMMENDED_LATE_PVE,
    "Should resolve a mixed-case bare recommended build name alias with extra spaces",
);
assertEqual(
    parseEncodedFromUserInput("1"),
    FIRST_RECOMMENDED_BUILD.encoded,
    "Should resolve a bare recommended build numeric alias to its encoded build",
);
assertEqual(
    parseEncodedFromUserInput("https://rgbp.app/#1"),
    FIRST_RECOMMENDED_BUILD.encoded,
    "Should resolve a bare recommended build numeric alias from a full URL",
);
assertEqual(
    parseEncodedFromUserInput(OUT_OF_RANGE_NUMERIC_CUSTOM),
    OUT_OF_RANGE_NUMERIC_CUSTOM,
    "Should fall back to a bare custom payload when a numeric alias is out of recommended range",
);
assertEqual(
    parseEncodedFromUserInput(`https://rgbp.app/#${OUT_OF_RANGE_NUMERIC_CUSTOM}`),
    OUT_OF_RANGE_NUMERIC_CUSTOM,
    "Should fall back to a bare custom payload from a full URL when a numeric alias is out of recommended range",
);
assertEqual(
    parseEncodedFromUserInput(RESERVED_LOOKING_NAMED_CUSTOM),
    RESERVED_LOOKING_NAMED_CUSTOM,
    "Should keep a bare named custom payload custom even when its name matches a reserved alias",
);
assertEqual(
    parseEncodedFromUserInput(`/${CUSTOM_FIRST_NODE_ONE}`),
    CUSTOM_FIRST_NODE_ONE,
    "Should treat a prefixed custom payload as custom-only",
);
assertEqual(
    parseEncodedFromUserInput(`https://rgbp.app/#/${encodedValidBuild}`),
    encodedValidBuild,
    "Should decode a canonical prefixed custom payload from a full URL",
);
assertEqual(
    parseEncodedFromUserInput(`/${`Custom_Name|${encodedValidBuild}`}`),
    `Custom_Name|${encodedValidBuild}`,
    "Should decode a canonical prefixed named custom payload",
);
assertEqual(
    parseEncodedFromUserInput(`/${RESERVED_LOOKING_NAMED_CUSTOM}`),
    RESERVED_LOOKING_NAMED_CUSTOM,
    "Should treat a prefixed reserved-looking named payload as custom-only",
);
assertEqual(
    parseEncodedFromUserInput(`/${RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM}`),
    RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM,
    "Should treat a prefixed numeric reserved-looking named payload as custom-only",
);
assertEqual(
    parseEncodedFromUserInput(`https://rgbp.app/#%2F${encodedValidBuild}`),
    encodedValidBuild,
    "Should treat a percent-encoded custom prefix as custom-only",
);
assertEqual(
    parseEncodedFromUserInput("/Late_PvE"),
    null,
    "Should not resolve a prefixed recommended-looking token as a reserved build",
);
assertEqual(
    parseEncodedFromUserInput("https://rgbp.app/#Late_PvE|"),
    null,
    "Should keep a malformed bare named-looking token invalid",
);
assertEqual(
    parseEncodedFromUserInput("https://rgbp.app/#1|"),
    null,
    "Should keep a malformed bare numeric named-looking token invalid",
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
    "Should resolve the canonical bare recommended name hash to encoded build data",
);

window.location.hash = "#late pve";
assertEqual(
    getEncodedFromUrl(),
    RECOMMENDED_LATE_PVE,
    "Should resolve a lowercase spaced bare recommended name hash to encoded build data",
);

window.location.hash = "#latepve";
assertEqual(
    getEncodedFromUrl(),
    RECOMMENDED_LATE_PVE,
    "Should resolve a compact bare recommended name hash to encoded build data",
);

window.location.hash = "#1";
assertEqual(
    getEncodedFromUrl(),
    FIRST_RECOMMENDED_BUILD.encoded,
    "Should resolve the bare recommended numeric hash to encoded build data",
);

window.location.hash = `#${OUT_OF_RANGE_NUMERIC_CUSTOM}`;
assertEqual(
    getEncodedFromUrl(),
    OUT_OF_RANGE_NUMERIC_CUSTOM,
    "Should fall back to a bare custom hash when a numeric alias is out of recommended range",
);

window.location.hash = `#${RESERVED_LOOKING_NAMED_CUSTOM}`;
assertEqual(
    getEncodedFromUrl(),
    RESERVED_LOOKING_NAMED_CUSTOM,
    "Should keep a bare reserved-looking named custom hash on the custom path",
);

window.location.hash = `#${encodeURIComponent(SHARED_PAYLOAD_EXAMPLE)}`;
assertEqual(
    getEncodedFromUrl(),
    SHARED_PAYLOAD_EXAMPLE,
    "Should resolve a percent-encoded bare custom hash to raw encoded build data",
);

window.location.hash = "#/1";
assertEqual(
    getEncodedFromUrl(),
    CUSTOM_FIRST_NODE_ONE,
    "Should resolve a prefixed custom hash as custom-only",
);

window.location.hash = "#%2F1";
assertEqual(
    getEncodedFromUrl(),
    CUSTOM_FIRST_NODE_ONE,
    "Should resolve a percent-encoded prefixed custom hash as custom-only",
);

window.location.hash = `#/${encodedValidBuild}`;
assertEqual(
    getEncodedFromUrl(),
    encodedValidBuild,
    "Should resolve a canonical prefixed custom hash unchanged",
);

// resolveShareToken normalization tests
const legacyCustomResolution = resolveShareToken(encodedValidBuild);
assertEqual(
    legacyCustomResolution
        ? {
              encoded: legacyCustomResolution.encoded,
              canonicalToken: legacyCustomResolution.canonicalToken,
              kind: legacyCustomResolution.kind,
              shouldNormalize: legacyCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: encodedValidBuild,
        canonicalToken: `/${encodedValidBuild}`,
        kind: "custom",
        shouldNormalize: true,
    },
    "Should mark a legacy bare custom payload for immediate canonical normalization",
);

const outOfRangeNumericCustomResolution = resolveShareToken(
    OUT_OF_RANGE_NUMERIC_CUSTOM,
);
assertEqual(
    outOfRangeNumericCustomResolution
        ? {
              encoded: outOfRangeNumericCustomResolution.encoded,
              canonicalToken: outOfRangeNumericCustomResolution.canonicalToken,
              kind: outOfRangeNumericCustomResolution.kind,
              shouldNormalize: outOfRangeNumericCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: OUT_OF_RANGE_NUMERIC_CUSTOM,
        canonicalToken: `/${OUT_OF_RANGE_NUMERIC_CUSTOM}`,
        kind: "custom",
        shouldNormalize: true,
    },
    "Should normalize an out-of-range numeric token back to the canonical custom namespace",
);

const reservedLookingNamedCustomResolution = resolveShareToken(
    RESERVED_LOOKING_NAMED_CUSTOM,
);
assertEqual(
    reservedLookingNamedCustomResolution
        ? {
              encoded: reservedLookingNamedCustomResolution.encoded,
              canonicalToken: reservedLookingNamedCustomResolution.canonicalToken,
              kind: reservedLookingNamedCustomResolution.kind,
              shouldNormalize: reservedLookingNamedCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: RESERVED_LOOKING_NAMED_CUSTOM,
        canonicalToken: `/${RESERVED_LOOKING_NAMED_CUSTOM}`,
        kind: "custom",
        shouldNormalize: true,
    },
    "Should normalize a bare reserved-looking named custom payload to the canonical custom namespace",
);

const percentEncodedLegacyCustomResolution = resolveShareToken(
    encodeURIComponent(SHARED_PAYLOAD_EXAMPLE),
);
assertEqual(
    percentEncodedLegacyCustomResolution
        ? {
              encoded: percentEncodedLegacyCustomResolution.encoded,
              canonicalToken: percentEncodedLegacyCustomResolution.canonicalToken,
              kind: percentEncodedLegacyCustomResolution.kind,
              shouldNormalize: percentEncodedLegacyCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: SHARED_PAYLOAD_EXAMPLE,
        canonicalToken: `/${SHARED_PAYLOAD_EXAMPLE}`,
        kind: "custom",
        shouldNormalize: true,
    },
    "Should canonicalize a percent-encoded legacy bare custom payload to the raw prefixed custom token",
);

const prefixedCustomResolution = resolveShareToken(`/${encodedValidBuild}`);
assertEqual(
    prefixedCustomResolution
        ? {
              encoded: prefixedCustomResolution.encoded,
              canonicalToken: prefixedCustomResolution.canonicalToken,
              kind: prefixedCustomResolution.kind,
              shouldNormalize: prefixedCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: encodedValidBuild,
        canonicalToken: `/${encodedValidBuild}`,
        kind: "custom",
        shouldNormalize: false,
    },
    "Should leave an already-prefixed custom payload canonical",
);

const prefixedReservedLookingNamedCustomResolution = resolveShareToken(
    `/${RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM}`,
);
assertEqual(
    prefixedReservedLookingNamedCustomResolution
        ? {
              encoded: prefixedReservedLookingNamedCustomResolution.encoded,
              canonicalToken: prefixedReservedLookingNamedCustomResolution.canonicalToken,
              kind: prefixedReservedLookingNamedCustomResolution.kind,
              shouldNormalize: prefixedReservedLookingNamedCustomResolution.shouldNormalize,
          }
        : null,
    {
        encoded: RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM,
        canonicalToken: `/${RESERVED_LOOKING_NUMERIC_NAMED_CUSTOM}`,
        kind: "custom",
        shouldNormalize: false,
    },
    "Should leave a prefixed reserved-looking named custom payload canonical",
);

// createShareUrl namespace tests
assertEqual(
    createShareUrl(recommendedLatePveBuildData),
    "https://rgbp.app/#Late_PvE",
    "Should emit the canonical bare recommended name alias for exact recommended builds",
);

assertEqual(
    createShareUrl(validBuildData),
    `https://rgbp.app/#/${encodedValidBuild}`,
    "Should emit the canonical prefixed custom URL for non-recommended builds",
);

assertEqual(
    createShareUrl({
        ...validBuildData,
        name: RESERVED_LOOKING_CUSTOM_NAME,
    }),
    `https://rgbp.app/#/${RESERVED_LOOKING_NAMED_CUSTOM}`,
    "Should keep a custom build with a reserved-looking name in the canonical custom namespace",
);

const editedRecommendedBuildData = {
    ...recommendedLatePveBuildData,
    owned: recommendedLatePveBuildData.owned + 1,
};
assertEqual(
    createShareUrl(editedRecommendedBuildData),
    `https://rgbp.app/#/${encodeBuildData(editedRecommendedBuildData)}`,
    "Should switch to the canonical prefixed custom URL after a recommended build is edited",
);

// recommended share-choice tests
assertEqual(
    getRecommendedShareUrlChoices({
        buildName: recommendedLatePveBuildData.name ?? null,
        customBuildData: recommendedLatePveBuildData,
    }),
    [
        {
            id: "full",
            displayUrl: `rgbp.app/#${RECOMMENDED_LATE_PVE_ENTRY.alias}`,
            url: `https://rgbp.app/#${RECOMMENDED_LATE_PVE_ENTRY.alias}`,
        },
        {
            id: "short",
            displayUrl: `rgbp.app/#${RECOMMENDED_LATE_PVE_ENTRY.index}`,
            url: `https://rgbp.app/#${RECOMMENDED_LATE_PVE_ENTRY.index}`,
        },
    ],
    "Should expose both full and short recommended share choices for an exact recommended build",
);

assertEqual(
    getRecommendedShareUrlChoices({
        buildName: RESERVED_LOOKING_CUSTOM_NAME,
        customBuildData: validBuildData,
    }),
    null,
    "Should not expose recommended share choices for custom builds, even with reserved-looking names",
);

assertEqual(
    getRecommendedShareUrlChoices({
        buildName: editedRecommendedBuildData.name ?? null,
        customBuildData: editedRecommendedBuildData,
    }),
    null,
    "Should not expose recommended share choices after a recommended build is edited",
);
