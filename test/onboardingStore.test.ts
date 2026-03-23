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

if (!/export function completeOnboarding\(\)/.test(storeSource)) {
    throw new Error("onboardingStore should expose completeOnboarding().");
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
    if (!/"nodesSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.nodesSection key is required.`);
    }
    if (!/"treeSection"/.test(source)) {
        throw new Error(`${localePath}: onboarding.treeSection key is required.`);
    }
    if (!/"showTutorial"/.test(source)) {
        throw new Error(`${localePath}: onboarding.showTutorial key is required.`);
    }
    if (!/"continueAction"/.test(source)) {
        throw new Error(`${localePath}: onboarding.continueAction key is required.`);
    }
}

// --- Integration assertions (App.svelte, Tree.svelte, GeneralSettingsPage) ---
// These verify Chunk 3 integration. They are added here because the test
// runs after all chunks are complete. If running Chunk 1 in isolation,
// these will fail until Chunk 3 is done.

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (/onboardingStore/.test(treeSource)) {
    throw new Error("Tree.svelte should not depend on onboardingStore after the overlay moves to App.svelte.");
}

if (/OnboardingOverlay/.test(treeSource)) {
    throw new Error("Tree.svelte should not render OnboardingOverlay after it moves to App.svelte.");
}

if (/completeOnboarding/.test(treeSource)) {
    throw new Error("Tree.svelte should not own completeOnboarding() after the overlay moves to App.svelte.");
}

const generalPath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalSource = readFileSync(generalPath, "utf8");

if (!/showOnboarding/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should import showOnboarding.");
}

if (!/showOnboarding\(\)/.test(generalSource)) {
    throw new Error("GeneralSettingsPage Show Tutorial button should call showOnboarding().");
}

const appPath = resolve("src/App.svelte");
const appSource = readFileSync(appPath, "utf8");

if (!/import\s+\{[\s\S]*onboardingSeen[\s\S]*\}\s+from\s+"\.\/lib\/onboarding\/onboardingStore"/.test(appSource)) {
    throw new Error("App.svelte should import onboardingSeen so onboarding can force-show the top-right HUD.");
}

// UndoRedoToolbar is always visible — no forceShow needed.
// Verify UndoRedoToolbar is present in App.svelte (it replaces forceShow-based ActiveTreeResetButton).
if (!/UndoRedoToolbar/.test(appSource)) {
    throw new Error(
        "App.svelte should use UndoRedoToolbar (always visible, no forceShow needed for onboarding).",
    );
}

if (!/import\s+OnboardingOverlay\s+from\s+"\.\/lib\/onboarding\/OnboardingOverlay\.svelte"/.test(appSource)) {
    throw new Error("App.svelte should import OnboardingOverlay after the overlay moves to app level.");
}

if (!/completeOnboarding/.test(appSource)) {
    throw new Error("App.svelte should own completeOnboarding() when the walkthrough finishes.");
}

if (!/activeTreeOnboardingReady/.test(appSource)) {
    throw new Error(
        "App.svelte should track when the active tree is ready before auto-showing onboarding.",
    );
}

if (
    !/<TreeTabs[\s\S]*onboardingActive=\{!\$onboardingSeen && activeTreeOnboardingReady\}/.test(
        appSource,
    )
) {
    throw new Error(
        "App.svelte should pass onboardingActive to TreeTabs so onboarding can temporarily force the first tree tab.",
    );
}

if (
    !/\{#if !\$onboardingSeen && activeTreeOnboardingReady\}[\s\S]*<OnboardingOverlay\b/.test(
        appSource,
    )
) {
    throw new Error(
        "App.svelte should wait for the active tree onboarding-ready signal before rendering OnboardingOverlay.",
    );
}

// UndoRedoToolbar is always visible (no forceShow needed) — verify it's used in App.svelte
const appSvelteSource = readFileSync(resolve("src/App.svelte"), "utf8");
if (!/UndoRedoToolbar/.test(appSvelteSource)) {
    throw new Error(
        "App should use UndoRedoToolbar (always visible, replacing forceShow-based ActiveTreeResetButton).",
    );
}

const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");

if (!/export let activeOnboardingReady: boolean = false;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte should expose activeOnboardingReady so App.svelte can delay onboarding until tree layout is ready.",
    );
}

if (!/export let onboardingActive = false;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte should expose onboardingActive so App.svelte can temporarily override the active tree tab during onboarding.",
    );
}

if (!/let onboardingRestoreIndex: number \| null = null;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte should track the previous active tab index while onboarding temporarily forces the first tab.",
    );
}

if (
    !/if \(onboardingActive && onboardingRestoreIndex === null\) \{[\s\S]*onboardingRestoreIndex = activeIndex;[\s\S]*setActive\(0\);[\s\S]*\}/.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs.svelte should capture the current tab and switch to the first tab when onboarding starts.",
    );
}

if (
    !/else if \(!onboardingActive && onboardingRestoreIndex !== null\) \{[\s\S]*setActive\(onboardingRestoreIndex\);[\s\S]*onboardingRestoreIndex = null;[\s\S]*\}/.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs.svelte should restore the previous tab after onboarding finishes or is canceled.",
    );
}

if (!/onOnboardingReadyChange=\{handleOnboardingReadyChange\}/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte should forward Tree onboarding-ready updates through handleOnboardingReadyChange().",
    );
}

if (!/activeOnboardingReady = false;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte should reset activeOnboardingReady when the active tree changes.",
    );
}


const tsconfigAppPath = resolve("tsconfig.app.json");
const tsconfigAppSource = readFileSync(tsconfigAppPath, "utf8");

if (!/"allowArbitraryExtensions"\s*:\s*true/.test(tsconfigAppSource)) {
    throw new Error(
        "tsconfig.app.json should enable allowArbitraryExtensions for .svelte module resolution warnings.",
    );
}
