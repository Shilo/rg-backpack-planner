import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const modalStoreSource = readFileSync(resolve("src/lib/modalStore.ts"), "utf8");
const modalHostSource = readFileSync(resolve("src/lib/ModalHost.svelte"), "utf8");
const resetTreeModalSource = readFileSync(
    resolve("src/lib/resetTreeModal.ts"),
    "utf8",
);
const resetTreeSheetSource = readFileSync(
    resolve("src/lib/modals/ResetTreeChoicesModal.svelte"),
    "utf8",
);
const activeTreeResetButtonSource = readFileSync(
    resolve("src/lib/ActiveTreeResetButton.svelte"),
    "utf8",
);
const appSource = readFileSync(resolve("src/App.svelte"), "utf8");
const customIconsSource = readFileSync(resolve("src/lib/customIcons.ts"), "utf8");

if (!/sheetIcon\?:\s*Component\s*\|\s*null;/.test(modalStoreSource)) {
    throw new Error(
        "modalStore should carry a dedicated sheetIcon for the reset bottom sheet.",
    );
}

if (!/sheetIcon=\{\$modalStore\.sheetIcon \?\? null\}/.test(modalHostSource)) {
    throw new Error(
        "ModalHost should pass the active tree sheetIcon into ResetTreeChoicesModal.",
    );
}

if (/<ResetTreeChoicesModal[\s\S]*titleIcon=/.test(modalHostSource)) {
    throw new Error(
        "ResetTreeChoicesModal should not render the extra reset title icon once the tree icon carries the header identity.",
    );
}

if (!/sheetIcon:\s*treeIcon \?\? null/.test(resetTreeModalSource)) {
    throw new Error(
        "resetTreeModal should forward the active tree icon into the shared modal payload.",
    );
}

if (!/export function getTreeIcon\b/.test(customIconsSource)) {
    throw new Error(
        "customIcons should expose a shared getTreeIcon helper for tree-specific icons.",
    );
}

if (!/export let treeId\b/.test(activeTreeResetButtonSource)) {
    throw new Error(
        "ActiveTreeResetButton should accept treeId so it can resolve the active tree icon.",
    );
}

if (!/getTreeIcon\(treeId\)/.test(activeTreeResetButtonSource)) {
    throw new Error(
        "ActiveTreeResetButton should reuse the shared getTreeIcon helper.",
    );
}

if (!/treeId=\{tabs\[activeTreeIndex\]\?\.id \?\? \"\"\}/.test(appSource)) {
    throw new Error(
        "App should pass the active tab id into ActiveTreeResetButton.",
    );
}

if (!/export let sheetIcon\b/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should accept a sheetIcon prop for the active tree.",
    );
}

if (!/this=\{sheetIcon\}/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should render the active tree icon in the sheet header.",
    );
}

if (/reset-tree-sheet__handle-zone|reset-tree-sheet__grabber/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should remove the drag handle affordance when the sheet does not support resizing.",
    );
}

if (
    !/width:\s*min\(100%,\s*40rem\)/.test(modalHostSource) &&
    !/max-width:\s*min\(40rem,\s*calc\(100vw\s*-\s*7rem/.test(modalHostSource)
) {
    throw new Error(
        "Reset tree sheet should cap its width near the Material 3 640dp max width.",
    );
}

if (
    !/var\(--safe-bottom,\s*0px\)/.test(resetTreeSheetSource) &&
    !/var\(--safe-bottom,\s*0px\)/.test(modalHostSource)
) {
    throw new Error(
        "Reset tree sheet should explicitly account for safe-area insets.",
    );
}

if (!/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(resetTreeSheetSource)) {
    throw new Error(
        "Reset tree sheet should support a two-column action layout for landscape or short-height cases.",
    );
}

if (!/reset-tree-sheet__header-copy/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should group title and description in a compact header copy column next to the tree icon.",
    );
}

if (!/transition:modalShellTransition/.test(modalHostSource)) {
    throw new Error(
        "ModalHost should use a dedicated shell transition so the reset sheet animates from and back toward the bottom edge.",
    );
}

if (!/@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*26rem\)/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should include an extra-compact short-height landscape layout for 820x360 class viewports.",
    );
}

if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should include a reduced-motion fallback for its animations.",
    );
}

if (!/animation:/.test(resetTreeSheetSource)) {
    throw new Error(
        "ResetTreeChoicesModal should animate its content to feel like a modern bottom sheet.",
    );
}

console.log("resetTreeChoicesMaterial3: all tests passed");
