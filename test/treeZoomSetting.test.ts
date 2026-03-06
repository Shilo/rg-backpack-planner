import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeZoomStorePath = resolve("src/lib/treeZoomStore.ts");
let treeZoomStoreSource = "";

try {
    treeZoomStoreSource = readFileSync(treeZoomStorePath, "utf8");
} catch {
    throw new Error("treeZoomStore.ts should exist for the new tree zoom setting.");
}

if (!/TREE_ZOOM_FIT\s*=\s*100/.test(treeZoomStoreSource)) {
    throw new Error("treeZoomStore should define TREE_ZOOM_FIT as 100.");
}

if (!/TREE_ZOOM_CLOSE_UP\s*=\s*150/.test(treeZoomStoreSource)) {
    throw new Error("treeZoomStore should define TREE_ZOOM_CLOSE_UP as 150.");
}

if (!/getItem\("tree-zoom-scale"\)/.test(treeZoomStoreSource)) {
    throw new Error(
        "treeZoomStore should read from the new tree-zoom-scale storage key.",
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

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
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
