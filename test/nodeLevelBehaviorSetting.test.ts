import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const nodeLevelBehaviorStorePath = resolve("src/lib/nodeLevelBehaviorStore.ts");
let nodeLevelBehaviorStoreSource = "";

try {
    nodeLevelBehaviorStoreSource = readFileSync(nodeLevelBehaviorStorePath, "utf8");
} catch {
    throw new Error(
        "nodeLevelBehaviorStore.ts should exist for the node level behavior setting.",
    );
}

if (!/getItem\("node-level-behavior"\)/.test(nodeLevelBehaviorStoreSource)) {
    throw new Error(
        "nodeLevelBehaviorStore should read from node-level-behavior storage key.",
    );
}

if (!/Number\.parseInt\(storedValue,\s*10\)/.test(nodeLevelBehaviorStoreSource)) {
    throw new Error(
        "nodeLevelBehaviorStore should parse node-level-behavior from integer storage values.",
    );
}

if (
    !/Solo\s*=\s*0/.test(nodeLevelBehaviorStoreSource) ||
    !/Sync\s*=\s*1/.test(nodeLevelBehaviorStoreSource)
) {
    throw new Error(
        "nodeLevelBehaviorStore should use selected-index values 0 (solo) and 1 (sync).",
    );
}

if (
    !/Number\.isInteger\(value\)\s*&&\s*value in NodeLevelBehavior/.test(
        nodeLevelBehaviorStoreSource,
    )
) {
    throw new Error(
        "nodeLevelBehaviorStore should dynamically validate values from NodeLevelBehavior enum.",
    );
}

if (
    !/setItem\("node-level-behavior",\s*String\(value\)\)/.test(
        nodeLevelBehaviorStoreSource,
    )
) {
    throw new Error(
        "nodeLevelBehaviorStore should persist selected index values directly as strings.",
    );
}

if (
    !/DEFAULT_NODE_LEVEL_BEHAVIOR\s*=\s*NodeLevelBehavior\.Sync/.test(
        nodeLevelBehaviorStoreSource,
    )
) {
    throw new Error(
        "nodeLevelBehaviorStore default should be sync behavior.",
    );
}

const settingsPagePath = resolve("src/lib/sideMenuPages/NodeSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+\{\s*nodeLevelBehavior/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should import nodeLevelBehavior store.");
}

if (!/settings\.nodeLevelBehavior/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize node level behavior segmented-control label.",
    );
}

if (!/settings\.nodeLevelBehaviorSolo/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize solo node level behavior option.",
    );
}

if (!/settings\.nodeLevelBehaviorSync/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize sync-lineage node level behavior option.",
    );
}

if (!/isNodeLevelBehavior/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should validate node level behavior index through isNodeLevelBehavior.",
    );
}

const generalPagePath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalPageSource = readFileSync(generalPagePath, "utf8");

if (!/nodeLevelBehavior\.resetToDefault\(\)/.test(generalPageSource)) {
    throw new Error(
        "GeneralSettingsPage reset should include nodeLevelBehavior.resetToDefault().",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/import\s+\{\s*nodeLevelBehavior/.test(treeSource)) {
    throw new Error("Tree should import nodeLevelBehavior store.");
}

if (!/nodeLevelBehavior:\s*\$nodeLevelBehavior/.test(treeSource)) {
    throw new Error(
        "Tree should pass $nodeLevelBehavior to applyLevelChange for node level behavior.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"nodeLevelBehavior"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodeLevelBehavior translation is required.`,
        );
    }
    if (!/"nodeLevelBehaviorSolo"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodeLevelBehaviorSolo translation is required.`,
        );
    }
    if (!/"nodeLevelBehaviorSync"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodeLevelBehaviorSync translation is required.`,
        );
    }
}
