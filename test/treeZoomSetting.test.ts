import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeZoomStorePath = resolve("src/lib/treeZoomStore.ts");
let treeZoomStoreSource = "";

try {
    treeZoomStoreSource = readFileSync(treeZoomStorePath, "utf8");
} catch {
    throw new Error("treeZoomStore.ts should exist for the new tree zoom setting.");
}

if (!/TREE_ZOOM_SCALES\s*=\s*\[\s*100,\s*150\s*\]\s*as const/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should define tree zoom scales as an array with 100 and 150.",
    );
}

if (/TREE_ZOOM_FIT\s*=/.test(treeZoomStoreSource) || /TREE_ZOOM_CLOSE_UP\s*=/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should not keep legacy TREE_ZOOM_FIT/TREE_ZOOM_CLOSE_UP constants.",
    );
}

if (!/export enum TreeZoomLevel/.test(treeZoomStoreSource)) {
    throw new Error("treeZoomStore should expose TreeZoomLevel enum.");
}

if (
    !/Fit\s*=\s*0/.test(treeZoomStoreSource) ||
    !/CloseUp\s*=\s*1/.test(treeZoomStoreSource)
) {
    throw new Error(
        "treeZoomStore should store tree zoom preference as selected-index values 0 and 1.",
    );
}

if (!/getItem\("tree-zoom-scale"\)/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should read from the new tree-zoom-scale storage key.",
    );
}

if (!/Number\.parseInt\(storedValue,\s*10\)/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should parse tree-zoom-scale from integer storage values.",
    );
}

if (
    !/Number\.isInteger\(value\)\s*&&\s*value in TreeZoomLevel/.test(
        treeZoomStoreSource,
    )
) {
    throw new Error(
        "treeZoomStore should dynamically validate values from TreeZoomLevel enum.",
    );
}

if (/VALID_TREE_ZOOM_SCALES/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should not rely on a separate VALID_TREE_ZOOM_SCALES set.",
    );
}

if (!/setItem\("tree-zoom-scale",\s*String\(value\)\)/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should persist selected-index zoom values directly as strings.",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/import\s+\{\s*treeZoomScale/.test(treeSource)) {
    throw new Error("Tree should use treeZoomScale.");
}

if (!/\$treeZoomScale/.test(treeSource)) {
    throw new Error("Tree focus logic should read from $treeZoomScale.");
}

if (!/TreeZoomLevel\.CloseUp/.test(treeSource)) {
    throw new Error("Tree should compare close-up mode against TreeZoomLevel enum.");
}

const settingsPagePath = resolve("src/lib/sideMenuPages/AppearanceSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+\{\s*treeZoomScale/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should import treeZoomScale for segmented tree zoom control.",
    );
}

if (!/label=\{\$t\("settings\.treeZoom"\)\}/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should label the segmented control with settings.treeZoom.",
    );
}

if (!/settings\.treeZoomFitOption/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should include settings.treeZoomFitOption for segmented control options.",
    );
}

if (!/settings\.treeZoomCloseUpOption/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should include settings.treeZoomCloseUpOption for segmented control options.",
    );
}

if (!/isTreeZoomLevel/.test(settingsPageSource)) {
    throw new Error(
        "SideMenuSettingsPage should validate segmented tree zoom index through isTreeZoomLevel.",
    );
}

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"treeZoom"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.treeZoom translation is required.`);
    }
    if (!/"treeZoomFitOption"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.treeZoomFitOption translation is required.`,
        );
    }
    if (!/"treeZoomCloseUpOption"\s*:/.test(source)) {
        throw new Error(
            `${localePath}: settings.treeZoomCloseUpOption translation is required.`,
        );
    }
}
