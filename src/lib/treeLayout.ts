export type TreeLayoutNode = {
    x: number;
    y: number;
    radius?: number;
};

export type TreeWorldBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
};

export type TreeViewportPadding = {
    horizontal: number;
    vertical: number;
};

export const TREE_NODE_RADIUS_UNIT_PX = 32;
export const TREE_BASE_VIEWPORT_PADDING_PX = 10;
export const TREE_BADGE_VERTICAL_OVERFLOW_PX = 10;

export function getTreeViewportPadding(): TreeViewportPadding {
    return {
        horizontal: TREE_BASE_VIEWPORT_PADDING_PX,
        vertical:
            TREE_BASE_VIEWPORT_PADDING_PX + TREE_BADGE_VERTICAL_OVERFLOW_PX,
    };
}

export function getTreeWorldBounds(
    nodes: ReadonlyArray<TreeLayoutNode>,
): TreeWorldBounds | null {
    if (nodes.length === 0) {
        return null;
    }

    const nodeBounds = nodes.map((node) => {
        const radius = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;
        return {
            minX: node.x - radius,
            maxX: node.x + radius,
            minY: node.y - radius - TREE_BADGE_VERTICAL_OVERFLOW_PX,
            maxY: node.y + radius + TREE_BADGE_VERTICAL_OVERFLOW_PX,
        };
    });

    const minX = Math.min(...nodeBounds.map((bound) => bound.minX));
    const maxX = Math.max(...nodeBounds.map((bound) => bound.maxX));
    const minY = Math.min(...nodeBounds.map((bound) => bound.minY));
    const maxY = Math.max(...nodeBounds.map((bound) => bound.maxY));

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
