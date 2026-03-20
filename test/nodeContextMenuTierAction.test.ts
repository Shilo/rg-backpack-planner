import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const nodeMenuPath = resolve("src/lib/NodeContextMenu.svelte");
const nodeMenuSource = readFileSync(nodeMenuPath, "utf8");
const nodeMenuNormalized = nodeMenuSource.replace(/\s+/g, " ");

if (!/export let onIncrementTier: \(\(index: NodeIndex\) => void\) \| null = null;/.test(nodeMenuNormalized)) {
    throw new Error(
        "NodeContextMenu should expose onIncrementTier callback prop.",
    );
}

if (!/incrementTier: canUp \? computeTotalCost\(/.test(nodeMenuNormalized)) {
    throw new Error(
        "NodeContextMenu should compute tier action cost via computeTotalCost.",
    );
}

if (!/label=\{tierTargetLevel >= maxLevel \? \$t\("nodeMenu.max"\) : \$t\("nodeMenu.incrementTier"\)\}/.test(nodeMenuNormalized)) {
    throw new Error(
        "Tier action label should switch between +Tier and Max based on target.",
    );
}

if (!/\{#if !isSingleLevel\}[\s\S]*nodeMenu\.incrementOne[\s\S]*nodeMenu\.incrementTen[\s\S]*nodeMenu\.decrementOne[\s\S]*nodeMenu\.decrementTen[\s\S]*\{\/if\}/m.test(nodeMenuSource)) {
    throw new Error(
        "Single-level nodes should hide +1/+10/-1/-10 actions.",
    );
}

if (!/onDecrementTier/.test(nodeMenuSource)) {
    throw new Error(
        "NodeContextMenu should have onDecrementTier callback prop.",
    );
}

if (!/previousTierTargetLevel/.test(nodeMenuSource)) {
    throw new Error(
        "NodeContextMenu should use previousTierTargetLevel for -Tier cost.",
    );
}

if (!/decrementTierIsReset/.test(nodeMenuSource)) {
    throw new Error(
        "NodeContextMenu should use decrementTierIsReset to swap -Tier to Reset when at tier 1.",
    );
}

if (!/button-ghost|ghost/.test(nodeMenuSource)) {
    throw new Error(
        "NodeContextMenu Reset button should use ghost Button variant.",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");
const treeNormalized = treeSource.replace(/\s+/g, " ");

if (!/function levelUpTier\(index: NodeIndex\)/.test(treeSource)) {
    throw new Error("Tree should define a levelUpTier handler.");
}

if (!/const nextLevel = nextTierTargetLevel\(level, node.maxLevel\);/.test(treeNormalized)) {
    throw new Error(
        "Tree levelUpTier handler should compute next level via nextTierTargetLevel.",
    );
}

if (!/onIncrementTier=\{levelUpTier\}/.test(treeNormalized)) {
    throw new Error(
        "Tree should pass levelUpTier to NodeContextMenu as onIncrementTier.",
    );
}

if (!/onDecrementTier/.test(treeSource)) {
    throw new Error(
        "Tree should pass onDecrementTier to NodeContextMenu.",
    );
}

const enLocalePath = resolve("src/locales/en.json");
const enLocaleSource = readFileSync(enLocalePath, "utf8");
if (!/"incrementTier"\s*:\s*"\+Tier"/.test(enLocaleSource)) {
    throw new Error(
        "English locale should define nodeMenu.incrementTier as +Tier.",
    );
}

const jaLocalePath = resolve("src/locales/ja.json");
const jaLocaleSource = readFileSync(jaLocalePath, "utf8");
if (!/"incrementTier"\s*:/.test(jaLocaleSource)) {
    throw new Error("Japanese locale should define nodeMenu.incrementTier.");
}

const zhLocalePath = resolve("src/locales/zh.json");
const zhLocaleSource = readFileSync(zhLocalePath, "utf8");
if (!/"incrementTier"\s*:/.test(zhLocaleSource)) {
    throw new Error("Chinese locale should define nodeMenu.incrementTier.");
}

const frLocalePath = resolve("src/locales/fr.json");
const frLocaleSource = readFileSync(frLocalePath, "utf8");

const localePaths = [enLocalePath, frLocalePath, jaLocalePath, zhLocalePath];
const localeSources = [enLocaleSource, frLocaleSource, jaLocaleSource, zhLocaleSource];
for (let i = 0; i < localePaths.length; i++) {
    if (!/"decrementTier"\s*:/.test(localeSources[i])) {
        throw new Error(
            `${localePaths[i]}: nodeMenu.decrementTier translation is required.`,
        );
    }
}
