import assert from "node:assert";
import {
    getTreeViewportPadding,
    getTreeWorldBounds,
    TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX,
} from "../src/lib/treeLayout.ts";

function almostEqual(actual: number, expected: number, epsilon = 1e-6): void {
    assert.ok(
        Math.abs(actual - expected) <= epsilon,
        `Expected ${actual} to be within ${epsilon} of ${expected}`,
    );
}

function withMockRootFontSize(fontSizePx: number, run: () => void): void {
    const globalWithDom = globalThis as {
        window?: unknown;
        document?: unknown;
    };

    const previousWindow = globalWithDom.window;
    const previousDocument = globalWithDom.document;

    globalWithDom.document = {
        documentElement: {},
        createElement: () => ({
            getContext: () => null,
        }),
    };

    globalWithDom.window = {
        getComputedStyle: () => ({
            fontSize: `${fontSizePx}px`,
            getPropertyValue: () => "",
        }),
    };

    try {
        run();
    } finally {
        globalWithDom.window = previousWindow;
        globalWithDom.document = previousDocument;
    }
}

const padding = getTreeViewportPadding();
assert.strictEqual(padding.horizontal, TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX);
assert.strictEqual(padding.vertical, TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX);
assert.strictEqual(padding.top, TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX);
assert.strictEqual(padding.bottom, TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX);

const singleNodeBounds = getTreeWorldBounds(
    [{ x: 0, y: 0, radius: 1 }],
    { showSkillName: false, showTier: false },
);
assert.ok(singleNodeBounds, "Expected single node bounds to exist");
almostEqual(singleNodeBounds.minX, -32);
almostEqual(singleNodeBounds.maxX, 32);
almostEqual(singleNodeBounds.minY, -32);
almostEqual(singleNodeBounds.maxY, 33);
almostEqual(singleNodeBounds.width, 64);
almostEqual(singleNodeBounds.height, 65);

const mixedNodeBounds = getTreeWorldBounds(
    [
        { x: -20, y: 40, radius: 0.8 },
        { x: 100, y: -30, radius: 1.2 },
    ],
    { showSkillName: false, showTier: false },
);
assert.ok(mixedNodeBounds, "Expected mixed-node bounds to exist");
almostEqual(mixedNodeBounds.minX, -45.6);
almostEqual(mixedNodeBounds.maxX, 138.4);
almostEqual(mixedNodeBounds.minY, -68.4);
almostEqual(mixedNodeBounds.maxY, 70.6);
almostEqual(mixedNodeBounds.width, 184);
almostEqual(mixedNodeBounds.height, 139);

assert.strictEqual(
    getTreeWorldBounds([], { showSkillName: false, showTier: false }),
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

const horizontalOverflowNode = {
    x: 0,
    y: 0,
    radius: 1,
    level: 10,
    maxLevel: 50,
    skillId: "global_def",
    nameLabel: "Critical Damage",
};

const nameBadgeHorizontalBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: true,
    showTier: false,
});
const nameHiddenHorizontalBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: false,
    showTier: false,
});

assert.ok(
    nameBadgeHorizontalBounds,
    "Expected horizontal bounds when skill names are shown.",
);
assert.ok(
    nameHiddenHorizontalBounds,
    "Expected horizontal bounds when skill names are hidden.",
);
assert.ok(
    nameBadgeHorizontalBounds.minX < nameHiddenHorizontalBounds.minX,
    "Expected left bound to extend further when skill names are shown.",
);
assert.ok(
    nameBadgeHorizontalBounds.maxX > nameHiddenHorizontalBounds.maxX,
    "Expected right bound to extend further when skill names are shown.",
);

let normalTextSizeBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: true,
    showTier: false,
});
let largeTextSizeBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: true,
    showTier: false,
});

withMockRootFontSize(16, () => {
    normalTextSizeBounds = getTreeWorldBounds([horizontalOverflowNode], {
        showSkillName: true,
        showTier: false,
    });
});

withMockRootFontSize(32, () => {
    largeTextSizeBounds = getTreeWorldBounds([horizontalOverflowNode], {
        showSkillName: true,
        showTier: false,
    });
});

assert.ok(
    normalTextSizeBounds && largeTextSizeBounds,
    "Expected bounds for both normal and large text sizes.",
);
assert.ok(
    largeTextSizeBounds.minX < normalTextSizeBounds.minX,
    "Expected larger text size to extend the left bound further.",
);
assert.ok(
    largeTextSizeBounds.maxX > normalTextSizeBounds.maxX,
    "Expected larger text size to extend the right bound further.",
);

const zoomedOutBadgeScaleBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: true,
    showTier: false,
    badgeScale: 0.5,
});
const zoomedInBadgeScaleBounds = getTreeWorldBounds([horizontalOverflowNode], {
    showSkillName: true,
    showTier: false,
    badgeScale: 1.5,
});

assert.ok(
    zoomedOutBadgeScaleBounds && nameBadgeHorizontalBounds,
    "Expected bounds for zoomed-out badge scale compensation.",
);
assert.ok(
    zoomedInBadgeScaleBounds && nameBadgeHorizontalBounds,
    "Expected bounds for zoomed-in badge scale compensation.",
);
assert.ok(
    zoomedOutBadgeScaleBounds.minX < nameBadgeHorizontalBounds.minX,
    "Expected zoomed-out bounds to expand left when badges are not shrinking.",
);
assert.ok(
    zoomedOutBadgeScaleBounds.maxX > nameBadgeHorizontalBounds.maxX,
    "Expected zoomed-out bounds to expand right when badges are not shrinking.",
);
assert.ok(
    zoomedInBadgeScaleBounds.minX >= nameBadgeHorizontalBounds.minX,
    "Expected zoomed-in bounds to avoid extra horizontal compensation.",
);
assert.ok(
    zoomedInBadgeScaleBounds.maxX <= nameBadgeHorizontalBounds.maxX,
    "Expected zoomed-in bounds to avoid extra horizontal compensation.",
);
