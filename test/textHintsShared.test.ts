import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTextHints } from "../src/lib/textHints.ts";

const sharedHintsPath = resolve("src/lib/textHints.ts");
const legacyHintsPath = resolve("src/lib/parentheticalHints.ts");
const tableRowPath = resolve("src/lib/TableRow.svelte");
const onboardingCardPath = resolve("src/lib/onboarding/OnboardingCard.svelte");
const appCssPath = resolve("src/app.css");
const enLocalePath = resolve("src/locales/en.json");
const jaLocalePath = resolve("src/locales/ja.json");
const jaTermMappingsPath = resolve("src/locales/term-mappings/ja.json");

if (!existsSync(sharedHintsPath)) {
    throw new Error(
        "A shared text hint helper should exist so controls and onboarding use the same parsing logic.",
    );
}

if (existsSync(legacyHintsPath)) {
    throw new Error(
        "The old bracket-specific hint helper should be removed after the generic rename.",
    );
}

const sharedHintsSource = readFileSync(sharedHintsPath, "utf8");
const tableRowSource = readFileSync(tableRowPath, "utf8");
const onboardingCardSource = readFileSync(onboardingCardPath, "utf8");
const appCssSource = readFileSync(appCssPath, "utf8");
const enLocale = JSON.parse(readFileSync(enLocalePath, "utf8"));
const jaLocale = JSON.parse(readFileSync(jaLocalePath, "utf8"));
const jaTermMappings = JSON.parse(readFileSync(jaTermMappingsPath, "utf8"));

if (!/export type HintPart/.test(sharedHintsSource)) {
    throw new Error(
        "The shared text hint helper should export a HintPart type.",
    );
}

if (!/export function parseTextHints/.test(sharedHintsSource)) {
    throw new Error(
        "The shared text hint helper should export parseTextHints.",
    );
}

if (!/className\?: string/.test(sharedHintsSource)) {
    throw new Error(
        "The shared text hint helper should support an optional className on hint parts.",
    );
}

if (!/parseTextHints\(value: string \| undefined,\s*hintClassName = "text-hint"\)/.test(sharedHintsSource)) {
    throw new Error(
        'parseTextHints should default hint parts to the shared "text-hint" class name.',
    );
}

if (
    !/\.text-hint\s*\{[\s\S]*display:\s*block;[\s\S]*color:\s*var\(--text-on-tinted\);/.test(
        appCssSource,
    )
) {
    throw new Error(
        "app.css should define the shared .text-hint presentation so components do not duplicate it.",
    );
}

if (
    !/import\s+\{\s*parseTextHints\s*\}\s+from\s+"\.\/textHints";/.test(
        tableRowSource,
    )
) {
    throw new Error(
        "TableRow should import parseTextHints from the shared helper.",
    );
}

if (/function parseDescription/.test(tableRowSource)) {
    throw new Error(
        "TableRow should not keep a local hint parser once the shared helper exists.",
    );
}

if (!/\$:\s*descParts = parseTextHints\(description\);/.test(tableRowSource)) {
    throw new Error(
        "TableRow should derive description hint parts from the shared helper.",
    );
}

if (!/class=\{part\.className\}/.test(tableRowSource)) {
    throw new Error(
        "TableRow should render shared hint classes from parseTextHints instead of a local hint class.",
    );
}

if (/table-row-hint/.test(tableRowSource)) {
    throw new Error(
        "TableRow should not keep a component-local hint class once the shared text hint class exists.",
    );
}

if (
    !/import\s+\{\s*parseTextHints\s*\}\s+from\s+"\.\.\/textHints";/.test(
        onboardingCardSource,
    )
) {
    throw new Error(
        "OnboardingCard should import parseTextHints from the shared helper.",
    );
}

if (!/\$:\s*descParts = parseTextHints\(description\);/.test(onboardingCardSource)) {
    throw new Error(
        "OnboardingCard should derive description hint parts from the shared helper.",
    );
}

if (/parseTextHints\(input\.keys\)/.test(onboardingCardSource)) {
    throw new Error(
        "OnboardingCard should not parse input bindings for text hints.",
    );
}

if (!/class=\{part\.className\}/.test(onboardingCardSource)) {
    throw new Error(
        "OnboardingCard should render shared hint classes from parseTextHints instead of a local hint class.",
    );
}

if (/card-desc-hint/.test(onboardingCardSource)) {
    throw new Error(
        "OnboardingCard should not keep a component-local hint class once the shared text hint class exists.",
    );
}

const parsed = parseTextHints(
    "Add levels using node action setting [[+1, +10, +Tier]]",
);
assert.deepStrictEqual(parsed, [
    { text: "Add levels using node action setting ", isHint: false },
    { text: "+1, +10, +Tier", isHint: true, className: "text-hint" },
]);

assert.deepStrictEqual(parseTextHints("HUD (Heads-Up Display)"), [
    { text: "HUD (Heads-Up Display)", isHint: false },
]);

assert.deepStrictEqual(
    parseTextHints("Add levels [[shared hint]]", "hint-override"),
    [
        { text: "Add levels ", isHint: false },
        { text: "shared hint", isHint: true, className: "hint-override" },
    ],
);

for (const path of [
    "primaryActionDesc",
    "levelUpDesc",
    "levelUpAltDesc",
    "levelDownDesc",
    "levelDownAltDesc",
]) {
    const enValue = enLocale.controls.actions[path];
    const jaValue = jaLocale.controls.actions[path];
    const mapping = jaTermMappings.mappings[`controls.actions.${path}`];

    if (typeof enValue !== "string" || typeof jaValue !== "string") {
        throw new Error(`controls.actions.${path} should exist in en and ja locales.`);
    }

    if (!/\[\[[^\]]+\]\]/.test(enValue)) {
        throw new Error(`controls.actions.${path} in en.json should mark hint text with [[ ]].`);
    }

    if (!/\[\[[^\]]+\]\]/.test(jaValue)) {
        throw new Error(`controls.actions.${path} in ja.json should mark hint text with [[ ]].`);
    }

    if (/[()][^)]*[)]/.test(enValue) || /（[^）]+）/.test(jaValue)) {
        throw new Error(`controls.actions.${path} should no longer use parentheses for hint markers.`);
    }

    if (!mapping || mapping.source !== enValue || mapping.target !== jaValue) {
        throw new Error(
            `term mapping for controls.actions.${path} should stay aligned with the locale hint markers.`,
        );
    }
}
