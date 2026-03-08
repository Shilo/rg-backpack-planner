import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const showTierStorePath = resolve("src/lib/showTierStore.ts");
let showTierStoreSource = "";

try {
    showTierStoreSource = readFileSync(showTierStorePath, "utf8");
} catch {
    throw new Error("showTierStore.ts should exist for the show tier setting.");
}

if (!/DEFAULT_SHOW_TIER\s*=\s*true/.test(showTierStoreSource)) {
    throw new Error("showTierStore default should be true.");
}

if (!/getItem\("show-tier"\)/.test(showTierStoreSource)) {
    throw new Error("showTierStore should read from show-tier storage key.");
}

if (!/setItem\("show-tier",\s*String\(value\)\)/.test(showTierStoreSource)) {
    throw new Error(
        "showTierStore should persist show-tier boolean values as strings.",
    );
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(showTierStoreSource)) {
    throw new Error("showTierStore should expose resetToDefault().");
}

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+ToggleSwitch\s+from\s+"..\/ToggleSwitch\.svelte"/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should import ToggleSwitch.");
}

if (!/import\s+\{\s*showTier\s*\}\s+from\s+"..\/showTierStore"/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should import showTier store.");
}

if (!/settings\.showTier/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize the show tier toggle label with settings.showTier.",
    );
}

if (!/checked=\{\$showTier\}/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should bind toggle checked state to $showTier.");
}

if (!/showTier\.set\(!\$showTier\)/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage toggle should invert showTier store value.");
}

if (!/showTier\.resetToDefault\(\)/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage reset should include showTier.resetToDefault().",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");
const treeNormalized = treeSource.replace(/\s+/g, " ");

if (!/import\s+\{\s*showTier\s*\}\s+from\s+"\.\/showTierStore"/.test(treeSource)) {
    throw new Error("Tree should import showTier store.");
}

if (!/showTier=\{\$showTier\}/.test(treeNormalized)) {
    throw new Error("Tree should pass $showTier into Node.");
}

const nodePath = resolve("src/lib/Node.svelte");
const nodeSource = readFileSync(nodePath, "utf8");
const nodeNormalized = nodeSource.replace(/\s+/g, " ");

if (!/export let tier: number = 0;/.test(nodeSource)) {
    throw new Error("Node should accept tier prop.");
}

if (!/export let showTier = true;/.test(nodeSource)) {
    throw new Error("Node should accept showTier prop.");
}

// Node shows tier only when showTier, level > 0, and not maxed (implementation uses nested #if level > 0, #if isMaxed, #if showTier)
if (!/\{#if level > 0\}/.test(nodeSource)) {
    throw new Error("Node should condition tier/level badge on level > 0.");
}
if (!/\{#if showTier\}/.test(nodeSource)) {
    throw new Error("Node should condition tier display on showTier.");
}
if (!/isMaxed/.test(nodeSource)) {
    throw new Error("Node should branch on isMaxed so tier is hidden when maxed.");
}

if (!/class="node-level-badge-anchor"/.test(nodeSource)) {
    throw new Error("Node should render a level badge anchor (tier/level).");
}

if (!/\{#if showTier\}[\s\S]*?tier/.test(nodeSource)) {
    throw new Error("Node tier display should be inside showTier block and use tier.");
}

const showTierBlockMatch = nodeSource.match(
    /\{#if showTier\}([\s\S]*?)\{\/if\}/,
);
const showTierBlock = showTierBlockMatch?.[1] ?? "";

if (showTierBlock && /class="node-badge node-badge-star"/.test(showTierBlock)) {
    throw new Error(
        "Node tier badge should not render a star; it should be hidden when maxed.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"showTier"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.showTier translation is required.`);
    }
}
