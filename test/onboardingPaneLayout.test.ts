import { readFileSync } from "node:fs";
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

const overlayPath = resolve("src/lib/onboarding/OnboardingOverlay.svelte");
const overlaySource = readFileSync(overlayPath, "utf8");

if (!/onboarding\.rootSection/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should render a dedicated root/quick-settings section.",
    );
}

if (!/onboarding\.hudSection/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should render a grouped HUD section for .top-right-actions.",
    );
}

if (!/top-right-actions/.test(overlaySource)) {
    throw new Error(
        "OnboardingOverlay should anchor one pane to App.svelte .top-right-actions.",
    );
}

for (const localePath of [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
]) {
    const localeSource = readFileSync(localePath, "utf8");
    if (!/"rootSection"/.test(localeSource)) {
        throw new Error(`${localePath}: onboarding.rootSection key is required.`);
    }
    if (!/"hudSection"/.test(localeSource)) {
        throw new Error(`${localePath}: onboarding.hudSection key is required.`);
    }
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
