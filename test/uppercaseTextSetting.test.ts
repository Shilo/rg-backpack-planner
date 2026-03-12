import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Store ---

const storePath = resolve("src/lib/uppercaseTextStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("uppercaseTextStore.ts should exist for the uppercase text setting.");
}

if (!/DEFAULT_UPPERCASE_TEXT\s*=\s*true/.test(storeSource)) {
    throw new Error("uppercaseTextStore default should be true.");
}

if (!/getItem\("uppercase-text"\)/.test(storeSource)) {
    throw new Error("uppercaseTextStore should read from 'uppercase-text' storage key.");
}

if (!/setItem\("uppercase-text",/.test(storeSource)) {
    throw new Error("uppercaseTextStore should persist to 'uppercase-text' storage key.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("uppercaseTextStore should expose resetToDefault().");
}

// --- CSS ---

const cssPath = resolve("src/app.css");
const cssSource = readFileSync(cssPath, "utf8");

if (!/\.uppercase-text\s*\*\s*\{[^}]*text-transform:\s*uppercase/.test(cssSource)) {
    throw new Error("app.css should scope text-transform: uppercase to .uppercase-text * selector.");
}

// Bare * { text-transform: uppercase } should not exist
if (/(?:^|[\r\n])\s*\*\s*\{[^}]*text-transform:\s*uppercase/.test(cssSource)) {
    throw new Error("app.css should not have a bare * { text-transform: uppercase } rule.");
}

// --- Reactivity function ---

const themeApplyPath = resolve("src/lib/themeApply.ts");
const themeApplySource = readFileSync(themeApplyPath, "utf8");

if (!/export function initUppercaseTextReactivity/.test(themeApplySource)) {
    throw new Error("themeApply.ts should export initUppercaseTextReactivity().");
}

// --- main.ts wiring ---

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");

if (!/initUppercaseTextReactivity/.test(mainSource)) {
    throw new Error("main.ts should call initUppercaseTextReactivity().");
}

if (!/cleanupUppercaseText/.test(mainSource)) {
    throw new Error("main.ts should store the cleanup return value of initUppercaseTextReactivity().");
}

// --- Settings page ---

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+\{\s*uppercaseText\s*\}\s+from\s+"\.\.\/uppercaseTextStore"/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should import uppercaseText store.");
}

if (!/settings\.uppercaseText/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should use settings.uppercaseText i18n key.");
}

if (!/checked=\{\$uppercaseText\}/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should bind toggle checked state to $uppercaseText.");
}

if (!/uppercaseText\.set\(!\$uppercaseText\)/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage toggle should invert uppercaseText store value.");
}

if (!/uppercaseText\.resetToDefault\(\)/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage reset should include uppercaseText.resetToDefault().");
}

// --- No bare component-level text-transform: uppercase ---

const componentFiles = [
    "src/lib/AppTitleDisplay.svelte",
    "src/lib/ColorPickerDialog.svelte",
    "src/lib/ContextMenu.svelte",
    "src/lib/PreviewBuildIndicator.svelte",
    "src/lib/SliderSetting.svelte",
    "src/lib/SideMenuSection.svelte",
    "src/lib/TabBar.svelte",
    "src/lib/TreeContextMenuList.svelte",
    "src/lib/TreeTabs.svelte",
    "src/lib/buttons/PreviewBuildsDropdown.svelte",
    "src/lib/modals/InputModal.svelte",
    "src/lib/modals/LoadBuildModal.svelte",
];

for (const file of componentFiles) {
    const source = readFileSync(resolve(file), "utf8");
    if (/text-transform:\s*uppercase/.test(source)) {
        throw new Error(`${file} should not have a text-transform: uppercase declaration (remove it; the global .uppercase-text rule covers it).`);
    }
}

// --- Locale keys ---

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"uppercaseText"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.uppercaseText translation is required.`);
    }
    if (!/"uppercaseTextTooltip"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.uppercaseTextTooltip translation is required.`);
    }
}
