import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");
const treeNormalized = treeSource.replace(/\s+/g, " ");

// Verify focusTreeInViewForCapture is exported from Tree.svelte
if (!/export function focusTreeInViewForCapture\s*\(/.test(treeSource)) {
    throw new Error(
        "Tree.svelte should export focusTreeInViewForCapture() so the bridge can call it " +
        "to ensure captures use Fit scale regardless of the close-up zoom setting.",
    );
}

// Verify focusTreeInViewForCapture calls computeFocusViewState with Fit override
if (!/computeFocusViewState\s*\(\s*TreeZoomLevel\.Fit\s*\)/.test(treeNormalized)) {
    throw new Error(
        "Tree.svelte focusTreeInViewForCapture should call computeFocusViewState(TreeZoomLevel.Fit) " +
        "to force Fit scale, ensuring close-up zoom setting does not crop the captured image.",
    );
}

// Verify focusTreeInViewForCapture does NOT set allowReactiveFocus=true
// (capture transform is temporary; reactive focus must not re-fire after restore)
const fnMatch = treeSource.match(
    /export function focusTreeInViewForCapture\s*\(\s*\)\s*\{([\s\S]*?)^    \}/m,
);
if (!fnMatch) {
    throw new Error(
        "Tree.svelte focusTreeInViewForCapture function body could not be extracted.",
    );
}
const fnBody = fnMatch[1];
if (/allowReactiveFocus\s*=\s*true/.test(fnBody)) {
    throw new Error(
        "Tree.svelte focusTreeInViewForCapture must NOT set allowReactiveFocus=true — " +
        "capture applies a temporary transform; setting it true would cause reactive paths " +
        "to re-fire and override the view state restored after capture.",
    );
}

// Verify computeFocusViewState accepts an overrideZoom parameter
if (!/function computeFocusViewState\s*\(\s*overrideZoom/.test(treeSource)) {
    throw new Error(
        "Tree.svelte computeFocusViewState should accept an overrideZoom parameter " +
        "so focusTreeInViewForCapture can pass TreeZoomLevel.Fit.",
    );
}

// Verify the TreeTabs bridge prefers focusTreeInViewForCapture
const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");
const treeTabsNormalized = treeTabsSource.replace(/\s+/g, " ");

if (!/focusTreeInViewForCapture/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs.svelte bridgeAction focusActiveTreeInView should call focusTreeInViewForCapture " +
        "to use Fit scale for capture.",
    );
}

// Verify treeRef interface includes focusTreeInViewForCapture
if (!/focusTreeInViewForCapture\?:/.test(treeTabsNormalized)) {
    throw new Error(
        "TreeTabs.svelte treeRef interface should declare focusTreeInViewForCapture as an optional method.",
    );
}
