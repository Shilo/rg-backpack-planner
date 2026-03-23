import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const storePath = resolve("src/lib/reduceMotionStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("reduceMotionStore.ts should exist for the Reduce Motion setting.");
}

if (!/DEFAULT_REDUCE_MOTION\s*=\s*false/.test(storeSource)) {
    throw new Error("reduceMotionStore default should be false.");
}

if (!/getItem\("reduce-motion"\)/.test(storeSource)) {
    throw new Error("reduceMotionStore should read from the reduce-motion storage key.");
}

if (!/setItem\("reduce-motion",\s*String\(value\)\)/.test(storeSource)) {
    throw new Error("reduceMotionStore should persist boolean values as strings.");
}

if (!/export function prefersNoAnimations\(\)/.test(storeSource)) {
    throw new Error("reduceMotionStore should export prefersNoAnimations().");
}

if (!/export const animationsDisabled\b/.test(storeSource)) {
    throw new Error("reduceMotionStore should export a reactive animationsDisabled value.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("reduceMotionStore should expose resetToDefault().");
}

const themeApplySource = readFileSync(resolve("src/lib/themeApply.ts"), "utf8");

if (!/export function initReduceMotionReactivity/.test(themeApplySource)) {
    throw new Error("themeApply.ts should export initReduceMotionReactivity().");
}

if (!/no-animations/.test(themeApplySource)) {
    throw new Error("themeApply.ts should toggle a no-animations root class.");
}

const mainSource = readFileSync(resolve("src/main.ts"), "utf8");

if (!/initReduceMotionReactivity/.test(mainSource)) {
    throw new Error("main.ts should initialize reduce-motion reactivity.");
}

if (!/cleanupReduceMotion/.test(mainSource)) {
    throw new Error("main.ts should keep the reduce-motion cleanup function for disposal.");
}

const generalSource = readFileSync(
    resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte"),
    "utf8",
);

if (!/import\s+\{\s*reduceMotion\s*\}\s+from\s+"\.\.\/reduceMotionStore"/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should import the reduceMotion store.");
}

if (!/settings\.reduceMotion/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use the settings.reduceMotion i18n key.");
}

if (!/checked=\{\$reduceMotion\}/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should bind the toggle to $reduceMotion.");
}

if (!/WaveformSlashIcon/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use a Phosphor icon for Reduce Motion.");
}

if (!/icon=\{WaveformSlashIcon as unknown as Component\}/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should pass the Reduce Motion icon to ToggleSwitch.");
}

if (!/reduceMotion\.set\(!\$reduceMotion\)/.test(generalSource)) {
    throw new Error("GeneralSettingsPage toggle should invert the reduceMotion store.");
}

if (!/reduceMotion\.resetToDefault\(\)/.test(generalSource)) {
    throw new Error("GeneralSettingsPage reset should include reduceMotion.resetToDefault().");
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/fr.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const localeData = JSON.parse(readFileSync(localePath, "utf8"));
    const settings = localeData?.settings;

    if (!settings) {
        throw new Error(`${localePath}: settings section is required.`);
    }

    if (!settings.reduceMotion) {
        throw new Error(`${localePath}: settings.reduceMotion translation is required.`);
    }

    if (!settings.reduceMotionDescription) {
        throw new Error(
            `${localePath}: settings.reduceMotionDescription translation is required.`,
        );
    }
}

console.log("reduceMotionSetting: all tests passed");
