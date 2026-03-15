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

for (const stepId of ['"nodes"', '"hud"', '"root"', '"tree"']) {
    if (!stepsSource.includes(stepId)) {
        throw new Error(
            `onboardingSteps.ts should define the ${stepId} walkthrough step.`,
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

const paneTagMatches = overlaySource.match(/<OnboardingPane\b/g) ?? [];
if (paneTagMatches.length !== 1) {
    throw new Error(
        "OnboardingOverlay should render exactly one OnboardingPane per step.",
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

if (!/progress-tick/.test(footerSource)) {
    throw new Error(
        "OnboardingFooterNote should render segmented onboarding progress ticks.",
    );
}

if (!/export let stepNumber/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should accept stepNumber so each pane is indexed.",
    );
}

if (!/export let titleIcon/.test(paneSource)) {
    throw new Error(
        "OnboardingPane should accept a titleIcon for the step header.",
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
    if (typeof locale.onboarding?.continueClick !== "string") {
        throw new Error(
            `${localePath}: onboarding.continueClick key is required.`,
        );
    }
    if (typeof locale.onboarding?.continueTap !== "string") {
        throw new Error(
            `${localePath}: onboarding.continueTap key is required.`,
        );
    }
    if (typeof locale.onboarding?.startClick !== "string") {
        throw new Error(
            `${localePath}: onboarding.startClick key is required.`,
        );
    }
    if (typeof locale.onboarding?.startTap !== "string") {
        throw new Error(
            `${localePath}: onboarding.startTap key is required.`,
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
