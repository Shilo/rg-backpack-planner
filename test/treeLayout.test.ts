import assert from "node:assert";
import {
    getTreeViewportPadding,
    getTreeWorldBounds,
    TREE_BADGE_VERTICAL_OVERFLOW_PX,
    TREE_BASE_VIEWPORT_PADDING_PX,
} from "../src/lib/treeLayout.ts";

function almostEqual(actual: number, expected: number, epsilon = 1e-6): void {
    assert.ok(
        Math.abs(actual - expected) <= epsilon,
        `Expected ${actual} to be within ${epsilon} of ${expected}`,
    );
}

const padding = getTreeViewportPadding();
assert.strictEqual(padding.horizontal, TREE_BASE_VIEWPORT_PADDING_PX);
assert.strictEqual(
    padding.vertical,
    TREE_BASE_VIEWPORT_PADDING_PX + TREE_BADGE_VERTICAL_OVERFLOW_PX,
);

const singleNodeBounds = getTreeWorldBounds([{ x: 0, y: 0, radius: 1 }]);
assert.ok(singleNodeBounds, "Expected single node bounds to exist");
almostEqual(singleNodeBounds.minX, -32);
almostEqual(singleNodeBounds.maxX, 32);
almostEqual(singleNodeBounds.minY, -42);
almostEqual(singleNodeBounds.maxY, 42);
almostEqual(singleNodeBounds.width, 64);
almostEqual(singleNodeBounds.height, 84);

const mixedNodeBounds = getTreeWorldBounds([
    { x: -20, y: 40, radius: 0.8 },
    { x: 100, y: -30, radius: 1.2 },
]);
assert.ok(mixedNodeBounds, "Expected mixed-node bounds to exist");
almostEqual(mixedNodeBounds.minX, -45.6);
almostEqual(mixedNodeBounds.maxX, 138.4);
almostEqual(mixedNodeBounds.minY, -78.4);
almostEqual(mixedNodeBounds.maxY, 75.6);
almostEqual(mixedNodeBounds.width, 184);
almostEqual(mixedNodeBounds.height, 154);

assert.strictEqual(
    getTreeWorldBounds([]),
    null,
    "Expected empty-node bounds to be null",
);
