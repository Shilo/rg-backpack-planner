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

if (!/\{#if showTier && level > 0 && state !== "maxed"\}/.test(nodeSource)) {
    throw new Error(
        "Node should only render the tier badge when showTier is enabled, level > 0, and not maxed.",
    );
}

if (!/class="node-tier-badge-anchor"/.test(nodeSource)) {
    throw new Error("Node should render a top tier badge anchor.");
}

if (!/class="node-tier-badge-anchor"[\s\S]*<span class="node-badge">T\{tier\}<\/span>/.test(nodeSource)) {
    throw new Error('Node tier badge should render prefixed tier text like "T1".');
}

const tierBadgeBlockMatch = nodeSource.match(
    /\{#if showTier && level > 0 && state !== "maxed"\}([\s\S]*?)\{\/if\}/,
);
const tierBadgeBlock = tierBadgeBlockMatch?.[1] ?? "";

if (/class="node-badge node-badge-star"/.test(tierBadgeBlock)) {
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
