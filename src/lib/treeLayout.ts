export type TreeLayoutNode = {
    x: number;
    y: number;
    radius?: number;
    level?: number;
    maxLevel?: number;
    skillId?: string | null;
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
    top: number;
    bottom: number;
};

export type TreeViewportPaddingOptions = {
    showSkillName: boolean;
    showTier: boolean;
    hasLeveledNodes?: boolean;
};

export type TreeWorldBoundsOptions = {
    showSkillName: boolean;
    showTier: boolean;
};

export const TREE_NODE_RADIUS_UNIT_PX = 32;
export const TREE_BASE_VIEWPORT_PADDING_PX = 10;
export const TREE_BADGE_VERTICAL_OVERFLOW_PX = 10;
export const TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX = 12;

const DEFAULT_ROOT_FONT_SIZE_PX = 16;
const NODE_BADGE_MIN_HEIGHT_PX = 15;
const NODE_BADGE_ICON_GAP_PX = 2;
const NODE_NAME_BADGE_FONT_REM = 0.6;
const NODE_LEVEL_BADGE_FONT_REM = 0.8;
const NODE_DEFAULT_ICON_SIZE_RATIO = 0.5;
const NODE_IMPORTANT_ICON_SIZE_RATIO = 0.65;
const TREE_VIEWPORT_EDGE_SPACING_CSS_VARIABLE = "--spacing-lg";

function getRootFontSizePx(): number {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return DEFAULT_ROOT_FONT_SIZE_PX;
    }

    const raw = window.getComputedStyle(document.documentElement).fontSize;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0
        ? parsed
        : DEFAULT_ROOT_FONT_SIZE_PX;
}

function getBadgeHeightPx(lines: number, fontRem: number): number {
    const lineHeightPx = getRootFontSizePx() * fontRem;
    return Math.max(NODE_BADGE_MIN_HEIGHT_PX, lineHeightPx * lines);
}

function getTreeViewportEdgeSpacingPx(): number {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX;
    }

    const rawValue = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(TREE_VIEWPORT_EDGE_SPACING_CSS_VARIABLE);
    const parsed = Number.parseFloat(rawValue);
    return Number.isFinite(parsed) && parsed > 0
        ? parsed
        : TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX;
}

function isImportantSkill(skillId?: string | null): boolean {
    return (
        typeof skillId === "string" &&
        (skillId.startsWith("global_") || skillId.startsWith("final_"))
    );
}

function getNodeIconSizeRatio(node: TreeLayoutNode): number {
    return isImportantSkill(node.skillId)
        ? NODE_IMPORTANT_ICON_SIZE_RATIO
        : NODE_DEFAULT_ICON_SIZE_RATIO;
}

function getBadgeOverflowPx(params: {
    radiusPx: number;
    iconSizeRatio: number;
    badgeHeightPx: number;
}): number {
    const diameter = params.radiusPx * 2;
    const edgeInset = (diameter * (1 - params.iconSizeRatio)) / 2;
    return Math.max(
        0,
        params.badgeHeightPx + NODE_BADGE_ICON_GAP_PX - edgeInset,
    );
}

function getNameBadgeOverflowPx(node: TreeLayoutNode): number {
    const radiusPx = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;
    return getBadgeOverflowPx({
        radiusPx,
        iconSizeRatio: getNodeIconSizeRatio(node),
        badgeHeightPx: getBadgeHeightPx(1, NODE_NAME_BADGE_FONT_REM),
    });
}

function getLevelBadgeOverflowPx(
    node: TreeLayoutNode,
    showTier: boolean,
): number {
    const level = node.level;
    const hasLevelBadge = level === undefined ? true : level > 0;
    if (!hasLevelBadge) {
        return 0;
    }

    const isMaxed =
        typeof level === "number" &&
        typeof node.maxLevel === "number" &&
        level >= node.maxLevel;
    const lines = showTier && !isMaxed ? 2 : 1;
    const radiusPx = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;

    return getBadgeOverflowPx({
        radiusPx,
        iconSizeRatio: getNodeIconSizeRatio(node),
        badgeHeightPx: getBadgeHeightPx(lines, NODE_LEVEL_BADGE_FONT_REM),
    });
}

export function getTreeViewportPadding(
    options?: TreeViewportPaddingOptions,
): TreeViewportPadding {
    if (!options) {
        const legacyVerticalPadding =
            TREE_BASE_VIEWPORT_PADDING_PX + TREE_BADGE_VERTICAL_OVERFLOW_PX;
        return {
            horizontal: TREE_BASE_VIEWPORT_PADDING_PX,
            vertical: legacyVerticalPadding,
            top: legacyVerticalPadding,
            bottom: legacyVerticalPadding,
        };
    }

    const edgeSpacing = getTreeViewportEdgeSpacingPx();
    return {
        horizontal: edgeSpacing,
        vertical: edgeSpacing,
        top: edgeSpacing,
        bottom: edgeSpacing,
    };
}

export function getTreeWorldBounds(
    nodes: ReadonlyArray<TreeLayoutNode>,
    options?: TreeWorldBoundsOptions,
): TreeWorldBounds | null {
    if (nodes.length === 0) {
        return null;
    }

    const nodeBounds = nodes.map((node) => {
        const radiusPx = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;
        if (!options) {
            return {
                minX: node.x - radiusPx,
                maxX: node.x + radiusPx,
                minY: node.y - radiusPx - TREE_BADGE_VERTICAL_OVERFLOW_PX,
                maxY: node.y + radiusPx + TREE_BADGE_VERTICAL_OVERFLOW_PX,
            };
        }

        const topBadgeOverflow = options.showSkillName
            ? Math.ceil(getNameBadgeOverflowPx(node))
            : 0;
        const bottomBadgeOverflow = Math.ceil(
            getLevelBadgeOverflowPx(node, options.showTier),
        );

        return {
            minX: node.x - radiusPx,
            maxX: node.x + radiusPx,
            minY: node.y - radiusPx - topBadgeOverflow,
            maxY: node.y + radiusPx + bottomBadgeOverflow,
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
