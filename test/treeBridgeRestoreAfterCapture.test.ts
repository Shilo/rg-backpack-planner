import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const source = readFileSync(treeTabsPath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function restoreAfterCapture\s*\(/.test(source)) {
    throw new Error(
        "TreeTabs.svelte should define a restoreAfterCapture function.",
    );
}

if (!/restoreAfterCapture,/.test(normalized) && !/restoreAfterCapture\s*,/.test(normalized)) {
    throw new Error(
        "TreeTabs.svelte bridgeAction should include restoreAfterCapture in the bridge object.",
    );
}

if (!/getViewState:/.test(normalized)) {
    throw new Error(
        "TreeTabs.svelte bridgeAction should include getViewState in the bridge object.",
    );
}

if (!/treeRef\?\.getViewState\?\.\(\)/.test(normalized)) {
    throw new Error(
        "TreeTabs.svelte bridgeAction getViewState should delegate to treeRef?.getViewState?.().",
    );
}

// Verify restoreAfterCapture uses restoreViewState for same-tab case
if (!/treeRef\?\.restoreViewState\?\.\(/.test(normalized)) {
    throw new Error(
        "TreeTabs.svelte restoreAfterCapture should call treeRef?.restoreViewState?.() when restoring the currently active tab.",
    );
}

// Verify bridge focusActiveTreeInView prefers focusTreeInViewForCapture (Fit scale for capture)
if (!/focusTreeInViewForCapture/.test(normalized)) {
    throw new Error(
        "TreeTabs.svelte bridgeAction focusActiveTreeInView should call focusTreeInViewForCapture " +
        "to ensure capture always uses Fit scale, even when close-up zoom setting is active.",
    );
}

// Verify restoreAfterCapture sets lastViewState before switching tab
const fnMatch = source.match(
    /function restoreAfterCapture\s*\([^)]*\)\s*\{([\s\S]*?)^    \}/m,
);
if (!fnMatch) {
    throw new Error(
        "TreeTabs.svelte restoreAfterCapture function body could not be extracted — " +
        "the ordering assertion (lastViewState before activeIndex) was not verified.",
    );
}
const fnBody = fnMatch[1];
const lastViewStatePos = fnBody.indexOf("lastViewState = viewState");
const activeIndexPos = fnBody.indexOf("activeIndex = ");
if (lastViewStatePos > activeIndexPos && activeIndexPos !== -1) {
    throw new Error(
        "TreeTabs.svelte restoreAfterCapture must set lastViewState BEFORE changing activeIndex, " +
        "so Tree remounts with the correct initialViewState.",
    );
}
