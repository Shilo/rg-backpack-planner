import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeBridgePath = resolve("src/lib/buildImageExport/treeBridge.ts");
const source = readFileSync(treeBridgePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/export type TreeBridge/.test(source)) {
    throw new Error(
        "treeBridge.ts should export a TreeBridge type.",
    );
}

if (!/getViewState\?/.test(source)) {
    throw new Error(
        "TreeBridge type should declare optional getViewState method for view-state save/restore during capture.",
    );
}

if (!/restoreAfterCapture\?/.test(source)) {
    throw new Error(
        "TreeBridge type should declare optional restoreAfterCapture method to restore tab and view state post-capture.",
    );
}

if (!/TreeViewState/.test(source)) {
    throw new Error(
        "treeBridge.ts should reference TreeViewState for the getViewState and restoreAfterCapture signatures.",
    );
}

if (!/import.*TreeViewState.*from/.test(normalized)) {
    throw new Error(
        "treeBridge.ts should import TreeViewState from Tree.svelte.",
    );
}

if (!/getWorldBoundsForCapture\?/.test(source)) {
    throw new Error(
        "TreeBridge type should declare optional getWorldBoundsForCapture method for capture-time bounds.",
    );
}
