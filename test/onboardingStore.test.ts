import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Store file structure ---
const storePath = resolve("src/lib/onboarding/onboardingStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("onboardingStore.ts should exist.");
}

if (!/DEFAULT_ONBOARDING_SEEN\s*=\s*false/.test(storeSource)) {
    throw new Error("onboardingStore default should be false.");
}

if (!/getItem\("onboarding-seen"\)/.test(storeSource)) {
    throw new Error("onboardingStore should read from onboarding-seen storage key.");
}

if (!/setItem\("onboarding-seen",\s*String\(value\)\)/.test(storeSource)) {
    throw new Error("onboardingStore should persist onboarding-seen boolean values as strings.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("onboardingStore should expose resetToDefault().");
}

// --- i18n keys in all locales ---
const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"onboarding"\s*:\s*\{/.test(source)) {
        throw new Error(`${localePath}: onboarding translation section is required.`);
    }
    if (!/"dismissClick"/.test(source)) {
        throw new Error(`${localePath}: onboarding.dismissClick key is required.`);
    }
    if (!/"dismissTap"/.test(source)) {
        throw new Error(`${localePath}: onboarding.dismissTap key is required.`);
    }
    if (!/"nodesSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.nodesSection key is required.`);
    }
    if (!/"treeSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.treeSection key is required.`);
    }
    if (!/"showTutorial"/.test(source)) {
        throw new Error(`${localePath}: onboarding.showTutorial key is required.`);
    }
}

// --- Integration assertions (Tree.svelte, GeneralSettingsPage) ---
// These verify Chunk 3 integration. They are added here because the test
// runs after all chunks are complete. If running Chunk 1 in isolation,
// these will fail until Chunk 3 is done.

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/import.*onboardingSeen.*from.*\.\/onboarding\/onboardingStore/.test(treeSource)) {
    throw new Error("Tree.svelte should import onboardingSeen from onboardingStore.");
}

if (!/OnboardingOverlay/.test(treeSource)) {
    throw new Error("Tree.svelte should render OnboardingOverlay component.");
}

const generalPath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalSource = readFileSync(generalPath, "utf8");

if (!/showOnboarding/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should import showOnboarding.");
}

if (!/showOnboarding\(\)/.test(generalSource)) {
    throw new Error("GeneralSettingsPage Show Tutorial button should call showOnboarding().");
}
