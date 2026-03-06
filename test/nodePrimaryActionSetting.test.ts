import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const nodeActionStorePath = resolve("src/lib/nodePrimaryActionStore.ts");
let nodeActionStoreSource = "";

try {
    nodeActionStoreSource = readFileSync(nodeActionStorePath, "utf8");
} catch {
    throw new Error(
        "nodePrimaryActionStore.ts should exist for the new node action setting.",
    );
}

if (!/getItem\("node-touch-action"\)/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore should read from node-touch-action storage key.",
    );
}

if (!/Number\.parseInt\(storedValue,\s*10\)/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore should parse node-touch-action from integer storage values.",
    );
}

if (
    !/NODE_PRIMARY_ACTION_INCREMENT_ONE\s*=\s*0/.test(nodeActionStoreSource) ||
    !/NODE_PRIMARY_ACTION_INCREMENT_TEN\s*=\s*1/.test(nodeActionStoreSource) ||
    !/NODE_PRIMARY_ACTION_INCREMENT_TIER\s*=\s*2/.test(nodeActionStoreSource)
) {
    throw new Error(
        "nodePrimaryActionStore should use direct selected-index values 0, 1, and 2.",
    );
}

if (/STORAGE_NODE_PRIMARY_ACTION_VALUES/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore should not use an explicit storage mapping table.",
    );
}

if (!/setItem\("node-touch-action",\s*String\(value\)\)/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore should persist selected index values directly as strings.",
    );
}

if (!/export type NodePrimaryAction = 0 \| 1 \| 2;/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore should model node actions as selected-index integers.",
    );
}

if (!/DEFAULT_NODE_PRIMARY_ACTION\s*=\s*NODE_PRIMARY_ACTION_INCREMENT_ONE/.test(nodeActionStoreSource)) {
    throw new Error(
        "nodePrimaryActionStore default should be increment-one (+1).",
    );
}

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+\{\s*nodePrimaryAction/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should import nodePrimaryAction store.",
    );
}

if (!/settings\.nodePrimaryActionTitle/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize Node primary action title.",
    );
}

if (!/settings\.nodePrimaryActionLeftClick/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize Left Click platform label.",
    );
}

if (!/settings\.nodePrimaryActionTouch/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should localize Touch platform label.",
    );
}

if (!/options=\{\s*nodePrimaryActionOptions\s*\}/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should render segmented control options for node primary action.",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/import\s+\{\s*nodePrimaryAction/.test(treeSource)) {
    throw new Error("Tree should use nodePrimaryAction store.");
}

if (!/function\s+levelDownTier\s*\(index:\s*NodeIndex\)/.test(treeSource)) {
    throw new Error("Tree should define levelDownTier helper.");
}

if (!/event\.pointerType === "mouse" && event\.shiftKey/.test(treeSource)) {
    throw new Error(
        "Tree should detect shift + left click for opposite node action.",
    );
}

if (!/event\.pointerType === "mouse" && event\.button === 1/.test(treeSource)) {
    throw new Error(
        "Tree should detect middle-click for opposite node action.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"nodePrimaryActionTitle"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodePrimaryActionTitle translation is required.`,
        );
    }
    if (!/"nodePrimaryActionLeftClick"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodePrimaryActionLeftClick translation is required.`,
        );
    }
    if (!/"nodePrimaryActionTouch"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.nodePrimaryActionTouch translation is required.`,
        );
    }

    if (/"singleLevelUp"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: legacy settings.singleLevelUp translation should be removed.`,
        );
    }
}
