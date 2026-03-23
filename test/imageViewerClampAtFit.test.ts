import assert from "node:assert";
import { clampImageViewerOffsets } from "../src/lib/imageViewerLayout.ts";

const viewportWidth = 1000;
const viewportHeight = 700;
const naturalWidth = 1000;
const naturalHeight = 700;

// Regression: crossing the "image now fits the viewport" threshold should not
// force the image to snap back to a centered offset. Tree view keeps the clamp
// continuous here, and ImageViewer should match that behavior.
const clampedJustAboveFit = clampImageViewerOffsets({
    viewportWidth,
    viewportHeight,
    naturalWidth,
    naturalHeight,
    offsetX: 32,
    offsetY: -24,
    scale: 1.01,
});
assert.strictEqual(clampedJustAboveFit.x, 32);
assert.strictEqual(clampedJustAboveFit.y, -24);

const clampedJustBelowFit = clampImageViewerOffsets({
    viewportWidth,
    viewportHeight,
    naturalWidth,
    naturalHeight,
    offsetX: 32,
    offsetY: -24,
    scale: 0.99,
});
assert.strictEqual(
    clampedJustBelowFit.x,
    32,
    "Expected ImageViewer to preserve a valid horizontal offset instead of snapping to center when width shrinks back under the viewport",
);
assert.strictEqual(
    clampedJustBelowFit.y,
    -24,
    "Expected ImageViewer to preserve a valid vertical offset instead of snapping to center when height shrinks back under the viewport",
);

// Even when the scaled image is smaller than the viewport, clamp against the
// same margin-based bounds as Tree instead of replacing the user's position
// with a hard centered transform.
const clampedPastEdge = clampImageViewerOffsets({
    viewportWidth,
    viewportHeight,
    naturalWidth,
    naturalHeight,
    offsetX: 980,
    offsetY: 710,
    scale: 0.8,
});
assert.deepStrictEqual(clampedPastEdge, {
    x: viewportWidth - 48,
    y: viewportHeight - 48,
});
