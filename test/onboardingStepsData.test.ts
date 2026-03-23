import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stepsPath = resolve("src/lib/onboarding/onboardingSteps.ts");
const source = readFileSync(stepsPath, "utf8");

if (!/getControlActions/.test(source)) {
    throw new Error(
        "onboardingSteps.ts should reuse controlsData action copy for matching onboarding cards.",
    );
}

if (!/id:\s*"primary-action"/.test(source)) {
    throw new Error(
        'onboardingSteps.ts should define a dedicated "primary-action" walkthrough step.',
    );
}

if (!/target:\s*"primary-action"/.test(source)) {
    throw new Error(
        'onboardingSteps.ts should target the dedicated "primary-action" spotlight.',
    );
}

if (!/controlCard\(\s*"hud-primary-action"/.test(source)) {
    throw new Error(
        'primary-action onboarding content should map to the "hud-primary-action" controls action.',
    );
}

if (!/controlCard\(\s*"hud-budget"/.test(source)) {
    throw new Error(
        'budget onboarding content should map to the "hud-budget" controls action.',
    );
}

if (!/controlCard\(\s*"hud-undo"/.test(source) || !/controlCard\(\s*"hud-redo"/.test(source)) {
    throw new Error(
        "toolbar onboarding cards should map undo and redo copy from controls.actions.*.",
    );
}

if (!/showKeyboard\s*=\s*!isTouch/.test(source) || !/filterByDevice/.test(source)) {
    throw new Error(
        "desktop onboarding should include control-page keyboard inputs by filtering actions with keyboard enabled off touch devices.",
    );
}

if (!/onboarding\.lockedQuickLevel/.test(source)) {
    throw new Error(
        "onboardingSteps.ts should keep onboarding.* fallback copy for onboarding-only locked-node behavior.",
    );
}

const nodesStepStart = source.indexOf('id: "nodes"');
const lockedStepStart = source.indexOf('id: "locked"');
const nodesStepBlock =
    nodesStepStart === -1 || lockedStepStart === -1
        ? ""
        : source.slice(nodesStepStart, lockedStepStart);

if (!nodesStepBlock.includes("splitIndex: 2")) {
    throw new Error(
        'the "nodes" onboarding step should define splitIndex 2 for the 2 | 3 card layout.',
    );
}

const treeCardsStart = source.indexOf("const treeCards = [");
const previewCardsStart = source.indexOf("const previewCards = [");
const treeCardsBlock =
    treeCardsStart === -1 || previewCardsStart === -1
        ? ""
        : source.slice(treeCardsStart, previewCardsStart);

const treeOptionsPos = treeCardsBlock.indexOf('controlCard(\n            "tree-options"');
const treePanPos = treeCardsBlock.indexOf('controlCard(\n            "tree-pan"');
const treeZoomPos = treeCardsBlock.indexOf('controlCard(\n            "tree-zoom"');

if (treeOptionsPos === -1 || treePanPos === -1 || treeZoomPos === -1) {
    throw new Error("treeCards should define tree pan, zoom, and options cards.");
}

if (!(treePanPos < treeZoomPos && treeZoomPos < treeOptionsPos)) {
    throw new Error(
        'treeCards should order pan, zoom, then options so "Tree Options" is the final card.',
    );
}

const treeStepStart = source.indexOf('id: "tree"');
const hudStepStart = source.indexOf('id: "hud"');
const treeStepBlock =
    treeStepStart === -1 || hudStepStart === -1
        ? ""
        : source.slice(treeStepStart, hudStepStart);

if (!treeStepBlock.includes("splitIndex: 2")) {
    throw new Error(
        'the "tree" onboarding step should define splitIndex 2 for the 2 | 1 card layout.',
    );
}

const lockedCardsStart = source.indexOf("const lockedCards = [");
const lockedCardsEnd = source.indexOf("const hudCards = [");
const lockedCardsBlock =
    lockedCardsStart === -1 || lockedCardsEnd === -1
        ? ""
        : source.slice(lockedCardsStart, lockedCardsEnd);

if (
    !lockedCardsBlock.includes('translate("onboarding.lockedAccessible")') ||
    !lockedCardsBlock.includes("[{ keys: labels.primary, device }]")
) {
    throw new Error(
        'the first "Locked Nodes" note should show the primary input label for the current device.',
    );
}
