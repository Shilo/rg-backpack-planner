import assert from "node:assert";
import {
    clampImageViewerOffsets,
    computeImageViewerFitTransform,
    syncImageViewerFit,
    type ImageViewerFitState,
} from "../src/lib/imageViewerLayout.ts";
import { getTreeViewportPadding } from "../src/lib/treeLayout.ts";

function buildState(overrides: Partial<ImageViewerFitState> = {}): ImageViewerFitState {
    return {
        viewportWidth: 0,
        viewportHeight: 0,
        naturalWidth: 2167,
        naturalHeight: 694,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        fitScale: 1,
        minScale: 0.1,
        hasInitialFit: false,
        ...overrides,
    };
}

function almostEqual(actual: number, expected: number, epsilon = 1e-6): void {
    assert.ok(
        Math.abs(actual - expected) <= epsilon,
        `Expected ${actual} to be within ${epsilon} of ${expected}`,
    );
}

const fitTransform = computeImageViewerFitTransform({
    viewportWidth: 1800,
    viewportHeight: 900,
    naturalWidth: 2167,
    naturalHeight: 694,
});
assert.ok(
    fitTransform,
    "Expected computeImageViewerFitTransform to return transform for valid dimensions",
);
const viewportPadding = getTreeViewportPadding();
almostEqual(
    fitTransform.scale,
    (1800 - viewportPadding.horizontal * 2) / 2167,
);
almostEqual(fitTransform.offsetX, viewportPadding.horizontal);
almostEqual(
    fitTransform.offsetY,
    viewportPadding.vertical +
        (900 - viewportPadding.vertical * 2 - 694 * fitTransform.scale) / 2,
);

const tallFitTransform = computeImageViewerFitTransform({
    viewportWidth: 800,
    viewportHeight: 800,
    naturalWidth: 600,
    naturalHeight: 900,
});
assert.ok(
    tallFitTransform,
    "Expected tall image fit transform to exist for valid dimensions",
);
almostEqual(
    tallFitTransform.scale,
    (800 - viewportPadding.vertical * 2) / 900,
);
almostEqual(
    tallFitTransform.offsetX,
    viewportPadding.horizontal +
        (800 - viewportPadding.horizontal * 2 - 600 * tallFitTransform.scale) /
            2,
);
almostEqual(tallFitTransform.offsetY, viewportPadding.vertical);

const invalidFitTransform = computeImageViewerFitTransform({
    viewportWidth: 0,
    viewportHeight: 900,
    naturalWidth: 2167,
    naturalHeight: 694,
});
assert.strictEqual(
    invalidFitTransform,
    null,
    "Expected null transform when viewport dimensions are invalid",
);

// Regression: if image metadata arrives before viewport sizing, the first
// ResizeObserver measurement must still apply the initial fit transform.
const imageLoadedBeforeViewport = buildState();
const preViewport = syncImageViewerFit(imageLoadedBeforeViewport);
assert.strictEqual(preViewport.hasInitialFit, false);
assert.strictEqual(preViewport.scale, 1);

const firstViewportMeasure = syncImageViewerFit(
    buildState({
        ...preViewport,
        viewportWidth: 1800,
        viewportHeight: 900,
    }),
);

assert.strictEqual(firstViewportMeasure.hasInitialFit, true);
almostEqual(firstViewportMeasure.scale, firstViewportMeasure.fitScale);
almostEqual(firstViewportMeasure.offsetX, viewportPadding.horizontal);
assert.ok(
    firstViewportMeasure.offsetY > 0,
    `Expected positive centered Y offset, got ${firstViewportMeasure.offsetY}`,
);
assert.ok(
    firstViewportMeasure.minScale <= firstViewportMeasure.fitScale,
    "Expected minScale to stay at or below fitScale",
);

// Once the user has already adjusted the view, viewport updates should refresh
// fit bounds but preserve the user's transform.
const userAdjusted = buildState({
    ...firstViewportMeasure,
    hasInitialFit: true,
    scale: firstViewportMeasure.scale * 1.8,
    offsetX: 140,
    offsetY: 55,
});
const resizedAfterUserAdjust = syncImageViewerFit(
    buildState({
        ...userAdjusted,
        viewportWidth: 1600,
        viewportHeight: 800,
    }),
);
assert.strictEqual(resizedAfterUserAdjust.scale, userAdjusted.scale);
assert.strictEqual(resizedAfterUserAdjust.offsetX, userAdjusted.offsetX);
assert.strictEqual(resizedAfterUserAdjust.offsetY, userAdjusted.offsetY);
assert.notStrictEqual(
    resizedAfterUserAdjust.fitScale,
    userAdjusted.fitScale,
    "Expected fitScale bounds to refresh after viewport resize",
);

const clampedOversizedHigh = clampImageViewerOffsets({
    viewportWidth: 1000,
    viewportHeight: 700,
    naturalWidth: 1200,
    naturalHeight: 900,
    offsetX: 1400,
    offsetY: 900,
    scale: 1.1,
});
assert.deepStrictEqual(
    clampedOversizedHigh,
    { x: 1000 - 48, y: 700 - 48 },
    "Expected oversized images to clamp to the maximum tree-style visible margin",
);

const clampedOversizedLow = clampImageViewerOffsets({
    viewportWidth: 1000,
    viewportHeight: 700,
    naturalWidth: 1200,
    naturalHeight: 900,
    offsetX: -1400,
    offsetY: -1100,
    scale: 1.1,
});
assert.deepStrictEqual(
    clampedOversizedLow,
    {
        x: 48 - 1200 * 1.1,
        y: 48 - 900 * 1.1,
    },
    "Expected oversized images to clamp to the minimum tree-style visible margin",
);

const preservedMixedAxisClamp = clampImageViewerOffsets({
    viewportWidth: 1000,
    viewportHeight: 700,
    naturalWidth: 900,
    naturalHeight: 1000,
    offsetX: 120,
    offsetY: -80,
    scale: 0.8,
});
assert.deepStrictEqual(
    preservedMixedAxisClamp,
    { x: 120, y: -80 },
    "Expected clampImageViewerOffsets to preserve valid offsets even when only one axis fits the viewport",
);

const passthroughInvalidClamp = clampImageViewerOffsets({
    viewportWidth: 0,
    viewportHeight: 700,
    naturalWidth: 1200,
    naturalHeight: 900,
    offsetX: 77,
    offsetY: -33,
    scale: 1.1,
});
assert.deepStrictEqual(
    passthroughInvalidClamp,
    { x: 77, y: -33 },
    "Expected invalid viewport dimensions to leave offsets unchanged",
);
