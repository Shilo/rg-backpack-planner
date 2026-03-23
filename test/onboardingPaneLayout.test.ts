import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
    computePaneRect,
    overlapArea,
    type Direction,
    type Rect,
} from "../src/lib/onboarding/paneLayout.ts";

type PaneCase = {
    key: string;
    size: { width: number; height: number };
    anchorRect: Rect;
    direction: Direction;
};

function assertInViewport(
    rect: Rect,
    viewportWidth: number,
    viewportHeight: number,
    edgePadding: number,
    bottomEdgePadding: number,
    label: string,
) {
    const maxBottomPadding = Math.max(edgePadding, bottomEdgePadding);
    if (rect.left < edgePadding || rect.top < edgePadding) {
        throw new Error(`${label} should stay inside the padded viewport.`);
    }
    if (rect.right > viewportWidth - edgePadding) {
        throw new Error(`${label} should not overflow the viewport width.`);
    }
    if (rect.bottom > viewportHeight - maxBottomPadding) {
        throw new Error(`${label} should clear the bottom safe area.`);
    }
}

function assertNoOverlap(a: Rect, b: Rect, label: string) {
    if (overlapArea(a, b) > 0) {
        throw new Error(`${label} should not overlap.`);
    }
}

function runScenario(
    viewportWidth: number,
    viewportHeight: number,
    edgePadding: number,
    bottomEdgePadding: number,
    panes: PaneCase[],
) {
    const placed = new Map<string, Rect>();
    const spotlightRects = panes.map((pane) => pane.anchorRect);

    for (const pane of panes) {
        const avoidRects = [
            ...Array.from(placed.values()),
            ...spotlightRects.filter((rect) => rect !== pane.anchorRect),
        ];
        const rect = computePaneRect({
            anchorRect: pane.anchorRect,
            paneSize: pane.size,
            direction: pane.direction,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
            ownSpotlightRect: pane.anchorRect,
            avoidRects,
        });

        assertInViewport(
            rect,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
            pane.key,
        );
        assertNoOverlap(rect, pane.anchorRect, `${pane.key} and its spotlight`);
        for (const [otherKey, otherRect] of placed) {
            assertNoOverlap(rect, otherRect, `${pane.key} and ${otherKey}`);
        }
        for (const otherSpotlight of spotlightRects) {
            if (otherSpotlight === pane.anchorRect) continue;
            assertNoOverlap(
                rect,
                otherSpotlight,
                `${pane.key} and another spotlight`,
            );
        }

        placed.set(pane.key, rect);
    }
}

const stepsPath = resolve("src/lib/onboarding/onboardingSteps.ts");
const overlayPath = resolve("src/lib/onboarding/OnboardingOverlay.svelte");
const footerPath = resolve("src/lib/onboarding/OnboardingFooterNote.svelte");
const panePath = resolve("src/lib/onboarding/OnboardingPane.svelte");
const primaryActionPath = resolve("src/lib/PrimaryActionIndicator.svelte");

if (!existsSync(stepsPath)) {
    throw new Error(
        "onboardingSteps.ts should exist so onboarding steps can stay data-driven.",
    );
}

if (!existsSync(footerPath)) {
    throw new Error(
        "OnboardingFooterNote.svelte should exist for the onboarding progress footer.",
    );
}

const stepsSource = readFileSync(stepsPath, "utf8");
const overlaySource = readFileSync(overlayPath, "utf8");
const footerSource = readFileSync(footerPath, "utf8");
const paneSource = readFileSync(panePath, "utf8");
const primaryActionSource = readFileSync(primaryActionPath, "utf8");
const cardSource = readFileSync(
    resolve("src/lib/onboarding/OnboardingCard.svelte"),
    "utf8",
);

for (const stepId of ['"nodes"', '"root"', '"tree"', '"hud"', '"primary-action"']) {
    if (!stepsSource.includes(stepId)) {
        throw new Error(
            `onboardingSteps.ts should define the ${stepId} walkthrough step.`,
        );
    }
}

const stepSequence = [
    stepsSource.indexOf('id: "nodes"'),
    stepsSource.indexOf('id: "root"'),
    stepsSource.indexOf('id: "tree"'),
    stepsSource.indexOf('id: "hud"'),
    stepsSource.indexOf('id: "primary-action"'),
];

if (stepSequence.some((index) => index === -1)) {
    throw new Error(
        "onboardingSteps.ts should define the nodes, root, tree, hud, and primary-action steps.",
    );
}

for (let i = 1; i < stepSequence.length; i += 1) {
    if (stepSequence[i - 1] >= stepSequence[i]) {
        throw new Error(
            "onboardingSteps.ts should order steps as nodes, root, tree, hud, then primary-action.",
        );
    }
}

if (!/currentStepIndex/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should track the active walkthrough step index.",
    );
}

if (!/OnboardingFooterNote/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should render the dedicated onboarding footer note component.",
    );
}

if (/pointerdown/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should advance on click/tap instead of pointerdown.",
    );
}

if (!/on:click=\{handleAdvanceClick\}/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should advance when the blocking overlay is clicked.",
    );
}

if (!/isKeyboardAction\(event,\s*"dismiss"\)/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should recognize dismiss actions so Escape can close the tutorial.",
    );
}

if (!/dismissOnboarding\(\);\s*return;/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should route the shared dismiss key handling through dismissOnboarding().",
    );
}

if (!/isKeyboardAction\(event,\s*"cycle"\)/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should recognize cycle actions so arrow keys can navigate the tutorial.",
    );
}

if (
    !/event\.key === "ArrowLeft"\s*\|\|\s*event\.key === "ArrowRight"/.test(
        overlaySource,
    )
) {
    throw new Error(
        "OnboardingOverlay should limit onboarding cycle navigation to the left and right arrow keys.",
    );
}

if (
    !/getCycleDirection\(event\)\s*<\s*0\s*\?\s*handleBack\(\)\s*:\s*handleAdvance\(\)/.test(
        overlaySource,
    )
) {
    throw new Error(
        "OnboardingOverlay should route left arrow to back and right arrow to forward from the shared key handler.",
    );
}

const paneTagMatches = overlaySource.match(/<OnboardingPane\b/g) ?? [];
if (paneTagMatches.length !== 1) {
    throw new Error(
        "OnboardingOverlay should render exactly one OnboardingPane per step.",
    );
}

if (!/splitIndex=\{activeStep\.splitIndex \?\? null\}/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should pass each step's explicit splitIndex through to OnboardingPane.",
    );
}

if (!/top-right-actions/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should still spotlight App.svelte .top-right-actions.",
    );
}

if (!/data-node-id="root"/.test(overlaySource)) {
    throw new Error(
        'OnboardingOverlay should measure the live root node element via data-node-id="root".',
    );
}

if (!/data-onboarding-target="primary-action"/.test(primaryActionSource)) {
    throw new Error(
        "PrimaryActionIndicator should expose a stable onboarding target.",
    );
}

if (
    !/resolveElementRect\('\[data-onboarding-target="primary-action"\]'/.test(
        overlaySource,
    )
) {
    throw new Error(
        "OnboardingOverlay should measure the primary-action HUD button.",
    );
}

if (
    !/if \(activeStep\.target === "primary-action"\) return primaryActionSpotlightRect;/.test(
        overlaySource,
    )
) {
    throw new Error(
        "OnboardingOverlay should route the primary-action step to its spotlight rect.",
    );
}

if (!/progress-tick/.test(footerSource)) {
    throw new Error(
        "OnboardingFooterNote should render segmented onboarding progress ticks.",
    );
}

if (!/class="footer-title-row"/.test(footerSource)) {
    throw new Error(
        "OnboardingFooterNote should render a title row with tutorial heading and paging.",
    );
}



if (!/export let titleIcon/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should accept a titleIcon for the step header.",
    );
}

if (/step-badge/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should replace the separate step badge with a shared header card row.",
    );
}

if (!/pane-header-card/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should render a dedicated header card for icon, title, and paging.",
    );
}

if (!/pane-step-count/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should render paging inside the header card.",
    );
}

if (!/export let stepNumber/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should accept stepNumber so each pane is indexed.",
    );
}

if (!/export let splitIndex: number \| null = null/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should accept an explicit splitIndex for two-column steps.",
    );
}

if (!/splitIndex !== null/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should only enable two-column layout when splitIndex is provided.",
    );
}

if (/cards\.length > 3 && !compact/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should no longer derive two-column layout from card count and compact mode.",
    );
}

if (!/cards\.slice\(0,\s*(splitIndex|effectiveSplitIndex)\)/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should render the first half of larger card sets in the left column.",
    );
}

if (!/cards\.slice\((splitIndex|effectiveSplitIndex)\)/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should render the remaining larger card sets in the right column.",
    );
}

if (!/class="cards-columns"/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should render a dedicated flex wrapper for larger card sets.",
    );
}

if (
    !/\.cards-columns\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*flex-start;/.test(
        paneSource,
    )
) {
    throw new Error(
        "OnboardingPane should render larger card sets with a horizontal flex column wrapper.",
    );
}

if (!/\.cards-columns\s*\{[\s\S]*flex-direction:\s*row;/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should place the right column to the right of the left column.",
    );
}

if (/Math\.ceil\(cards\.length \/ 2\)/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should no longer auto-calculate splitIndex from card count.",
    );
}

if (
    !/\.card-column\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*width:\s*max-content;/.test(
        paneSource,
    )
) {
    throw new Error(
        "OnboardingPane should let each card column size itself from its widest child.",
    );
}

if (
    !/\.card-column\s*\{[\s\S]*align-items:\s*stretch;/.test(paneSource)
) {
    throw new Error(
        "OnboardingPane should stretch each card to the width of the widest card in its column.",
    );
}

if (/card-grid/.test(paneSource) || /grid-template-columns:\s*repeat\(2/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should no longer use a rigid grid for larger card sets.",
    );
}

if (!/export let title: string/.test(cardSource)) {
    throw new Error("OnboardingCard should accept a title prop.");
}

if (/\.onboarding-card\s*\{[\s\S]*width:\s*max-content;/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should not override the column width with its own max-content width.",
    );
}

if (!/export let inputs: InputBinding\[]/.test(cardSource)) {
    throw new Error("OnboardingCard should accept controls-style InputBinding arrays.");
}

if (!/import InputChips from "\.\.\/InputChips\.svelte"/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should reuse InputChips for controls-style shortcut rendering.",
    );
}

if (!/<InputChips/.test(cardSource)) {
    throw new Error("OnboardingCard should render InputChips for each input binding.");
}

if (!/parseTextHints/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should parse description hints with the shared text hint helper before rendering.",
    );
}

if (!/parseTextHints\(description\)/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should parse description hints with the shared text hint helper, like TableRow.",
    );
}

if (/parseTextHints\(input\.keys\)/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should not parse input bindings for text hints.",
    );
}

if (!/class=\{part\.className\}/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should render parsed description hints with the shared class from parseTextHints.",
    );
}

if (
    !/card-desc[\s\S]*card-inputs/.test(cardSource)
) {
    throw new Error(
        "OnboardingCard should render the description before the shortcut chips.",
    );
}

if (/card-desc-hint/.test(cardSource)) {
    throw new Error(
        "OnboardingCard should rely on the shared global text hint class instead of a local hint style.",
    );
}

if (!/title=\{card\.title/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should pass each card title through to OnboardingCard.",
    );
}

if (!/inputs=\{card\.inputs/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should pass each card inputs array through to OnboardingCard.",
    );
}

for (const localePath of [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
]) {
    const locale = JSON.parse(readFileSync(localePath, "utf8"));
    if (typeof locale.onboarding?.rootSection !== "string") {
        throw new Error(`${localePath}: onboarding.rootSection key is required.`);
    }
    if (typeof locale.onboarding?.hudSection !== "string") {
        throw new Error(`${localePath}: onboarding.hudSection key is required.`);
    }
    if (typeof locale.onboarding?.continueAction !== "string") {
        throw new Error(
            `${localePath}: onboarding.continueAction key is required.`,
        );
    }
}

const enLocale = JSON.parse(readFileSync(resolve("src/locales/en.json"), "utf8"));
if (enLocale.onboarding?.rootSection !== "Root Node") {
    throw new Error('English onboarding.rootSection should be renamed to "Root Node".');
}

runScenario(390, 744, 12, 74, [
    {
        key: "node",
        size: { width: 204, height: 130 },
        anchorRect: { left: 68, top: 162, right: 146, bottom: 240 },
        direction: "right",
    },
    {
        key: "hud",
        size: { width: 200, height: 88 },
        anchorRect: { left: 266, top: 12, right: 378, bottom: 86 },
        direction: "left",
    },
    {
        key: "root",
        size: { width: 208, height: 112 },
        anchorRect: { left: 172, top: 302, right: 218, bottom: 348 },
        direction: "down",
    },
    {
        key: "tree",
        size: { width: 204, height: 130 },
        anchorRect: { left: 110, top: 472, right: 168, bottom: 530 },
        direction: "left",
    },
]);

runScenario(640, 360, 12, 66, [
    {
        key: "node",
        size: { width: 192, height: 100 },
        anchorRect: { left: 74, top: 68, right: 146, bottom: 140 },
        direction: "right",
    },
    {
        key: "hud",
        size: { width: 188, height: 70 },
        anchorRect: { left: 500, top: 12, right: 628, bottom: 74 },
        direction: "left",
    },
    {
        key: "root",
        size: { width: 196, height: 96 },
        anchorRect: { left: 294, top: 116, right: 340, bottom: 162 },
        direction: "down",
    },
    {
        key: "tree",
        size: { width: 196, height: 122 },
        anchorRect: { left: 150, top: 204, right: 206, bottom: 260 },
        direction: "right",
    },
]);
