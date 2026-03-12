import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- All page files exist ---

const pageFiles = [
    "src/lib/sideMenuPages/SettingsPage.svelte",
    "src/lib/sideMenuPages/SettingsNavButton.svelte",
    "src/lib/sideMenuPages/RootSettingsPage.svelte",
    "src/lib/sideMenuPages/NodeSettingsPage.svelte",
    "src/lib/sideMenuPages/AppearanceSettingsPage.svelte",
    "src/lib/sideMenuPages/GeneralSettingsPage.svelte",
];

for (const file of pageFiles) {
    if (!existsSync(resolve(file))) {
        throw new Error(`${file} should exist.`);
    }
}

// --- SideMenuSettingsPage exports SettingsPageId type ---

const shellPath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const shellSource = readFileSync(shellPath, "utf8");

if (!/export type SettingsPageId/.test(shellSource)) {
    throw new Error("SideMenuSettingsPage should export SettingsPageId type.");
}

// --- Shell uses cache-variable lazy loading pattern ---

if (!/await import\("\.\/RootSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import RootSettingsPage.svelte.");
}

if (!/await import\("\.\/NodeSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import NodeSettingsPage.svelte.");
}

if (!/await import\("\.\/AppearanceSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import AppearanceSettingsPage.svelte.");
}

if (!/await import\("\.\/GeneralSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import GeneralSettingsPage.svelte.");
}

// --- RootSettingsPage has navigation buttons ---

const rootSource = readFileSync(
    resolve("src/lib/sideMenuPages/RootSettingsPage.svelte"),
    "utf8",
);

if (!/SettingsNavButton/.test(rootSource)) {
    throw new Error("RootSettingsPage should use SettingsNavButton components.");
}

if (!/data-page="node"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="node" for focus restoration.');
}

if (!/data-page="appearance"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="appearance" for focus restoration.');
}

if (!/data-page="general"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="general" for focus restoration.');
}

// --- SettingsPage base component ---

const baseSource = readFileSync(
    resolve("src/lib/sideMenuPages/SettingsPage.svelte"),
    "utf8",
);

if (!/slot name="dangerZone"/.test(baseSource)) {
    throw new Error("SettingsPage should have a dangerZone named slot.");
}

if (!/slot name="advancedSettings"/.test(baseSource)) {
    throw new Error("SettingsPage should have an advancedSettings named slot.");
}

if (!/onBack/.test(baseSource)) {
    throw new Error("SettingsPage should accept onBack prop.");
}

// --- GeneralSettingsPage has danger zone ---

const generalSource = readFileSync(
    resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte"),
    "utf8",
);

if (!/dangerZone/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use the dangerZone slot.");
}

if (!/settings\.dangerZone/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use the settings.dangerZone i18n key.");
}

// --- Locale keys exist ---

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

const requiredKeys = [
    "node",
    "nodeDescription",
    "appearance",
    "appearanceDescription",
    "general",
    "generalDescription",
    "backToSettings",
];

for (const localePath of localePaths) {
    const localeData = JSON.parse(readFileSync(localePath, "utf8"));
    const pages = localeData?.settings?.pages;
    if (!pages) {
        throw new Error(`${localePath}: settings.pages section is required.`);
    }
    for (const key of requiredKeys) {
        if (!pages[key]) {
            throw new Error(
                `${localePath}: settings.pages.${key} translation is required.`,
            );
        }
    }
    if (!localeData?.settings?.dangerZone) {
        throw new Error(`${localePath}: settings.dangerZone translation is required.`);
    }
    if (!localeData?.settings?.advanced) {
        throw new Error(`${localePath}: settings.advanced translation is required.`);
    }
}

// --- SideMenu passes scrollContentElement ---

const sideMenuSource = readFileSync(
    resolve("src/lib/SideMenu.svelte"),
    "utf8",
);

if (!/\{scrollContentElement\}/.test(sideMenuSource)) {
    throw new Error("SideMenu should pass scrollContentElement to SideMenuSettingsPage.");
}
