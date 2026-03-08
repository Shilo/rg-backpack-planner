import assert from "node:assert";
import {
    getTreeViewportPadding,
    getTreeWorldBounds,
    TREE_BADGE_VERTICAL_OVERFLOW_PX,
    TREE_BASE_VIEWPORT_PADDING_PX,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
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
assert.strictEqual(padding.top, padding.vertical);
assert.strictEqual(padding.bottom, padding.vertical);

const noBadgePadding = getTreeViewportPadding({
    showSkillName: false,
    showTier: false,
    hasLeveledNodes: false,
});
assert.strictEqual(
    noBadgePadding.horizontal,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);
assert.strictEqual(
    noBadgePadding.vertical,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);
assert.strictEqual(noBadgePadding.top, TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX);
assert.strictEqual(
    noBadgePadding.bottom,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);

const tierBadgePadding = getTreeViewportPadding({
    showSkillName: true,
    showTier: true,
    hasLeveledNodes: true,
});
assert.strictEqual(
    tierBadgePadding.top,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);
assert.strictEqual(
    tierBadgePadding.bottom,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);
assert.strictEqual(
    tierBadgePadding.vertical,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
);
assert.strictEqual(
    tierBadgePadding.horizontal,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
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

const dynamicNode = {
    x: 0,
    y: 0,
    radius: 0.8,
    level: 10,
    maxLevel: 50,
    skillId: "global_def",
};

const allBadgesBounds = getTreeWorldBounds([dynamicNode], {
    showSkillName: true,
    showTier: true,
});
const nameHiddenBounds = getTreeWorldBounds([dynamicNode], {
    showSkillName: false,
    showTier: true,
});
const tierHiddenBounds = getTreeWorldBounds([dynamicNode], {
    showSkillName: true,
    showTier: false,
});
const noLevelBadgeBounds = getTreeWorldBounds(
    [{ ...dynamicNode, level: 0 }],
    {
        showSkillName: true,
        showTier: true,
    },
);

assert.ok(allBadgesBounds, "Expected bounds with all badges");
assert.ok(nameHiddenBounds, "Expected bounds when skill name is hidden");
assert.ok(tierHiddenBounds, "Expected bounds when tier row is hidden");
assert.ok(noLevelBadgeBounds, "Expected bounds when level badge is hidden");

assert.ok(
    allBadgesBounds.minY < nameHiddenBounds.minY,
    "Expected top bound to extend further when skill names are shown.",
);
assert.ok(
    allBadgesBounds.maxY > tierHiddenBounds.maxY,
    "Expected bottom bound to extend further when tier stars are shown.",
);
assert.ok(
    noLevelBadgeBounds.maxY < tierHiddenBounds.maxY,
    "Expected bottom bound to shrink when level is zero (no level badge).",
);
almostEqual(noLevelBadgeBounds.maxY, dynamicNode.y + 0.8 * 32);
