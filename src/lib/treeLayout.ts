/**
 * Tree layout bounds + viewport padding helpers used by focus/fit logic.
 *
 * Behavior summary:
 * - Coordinates are in tree world-space; node circle size is derived from
 *   `radius * TREE_NODE_RADIUS_UNIT_PX`.
 * - `getTreeWorldBounds([], ...)` returns `null`.
 * - Top overflow comes from name badge height when skill names are shown;
 *   bottom overflow comes from level badge height (1 or 2 lines depending on
 *   `showTier` and whether the node is maxed). Level badge is hidden for
 *   `level <= 0`.
 * - Horizontal overflow comes from name badge width: width is measured from
 *   `nameLabel` (canvas when available, fallback heuristic otherwise),
 *   clamped to Node badge limits, and expanded beyond node radius on both
 *   left/right sides.
 * - `badgeScale` lets bounds reflect non-shrinking badges while zoomed out:
 *   for scales < 1, world-space badge width is inflated by `1 / scale`; for
 *   scales >= 1, no extra inflation is applied.
 * - Badge vertical offset depends on icon size ratio; "important" skills
 *   (`global_*`, `final_*`) use a larger icon ratio, reducing badge overhang.
 * - Root font size and viewport edge spacing are read from CSS when DOM exists;
 *   SSR/non-DOM paths use sane fallbacks.
 * - Name badge width measurements are cached by `{fontSize}|{label}`.
 * - `getTreeViewportPadding`: symmetric edge spacing from CSS variable
 *   `--spacing-lg` (with fallback), applied to top/bottom/left/right.
 */
export type TreeLayoutNode = {
    x: number;
    y: number;
    radius?: number;
    level?: number;
    maxLevel?: number;
    skillId?: string | null;
    nameLabel?: string | null;
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

export type TreeWorldBoundsOptions = {
    showSkillName: boolean;
    showTier: boolean;
    badgeScale?: number;
};

export const TREE_NODE_RADIUS_UNIT_PX = 32;
export const TREE_VIEWPORT_EDGE_SPACING_FALLBACK_PX = 12;

const DEFAULT_ROOT_FONT_SIZE_PX = 16;
const NODE_BADGE_MIN_HEIGHT_PX = 15;
const NODE_BADGE_ICON_GAP_PX = 2;
const NODE_NAME_BADGE_FONT_REM = 0.6;
const NODE_LEVEL_BADGE_FONT_REM = 0.8;
const NODE_DEFAULT_ICON_SIZE_RATIO = 0.5;
const NODE_IMPORTANT_ICON_SIZE_RATIO = 0.65;
const NODE_BADGE_HORIZONTAL_PADDING_PX = 3;
const NODE_BADGE_MIN_WIDTH_PX = 15;
const NODE_NAME_BADGE_MAX_WIDTH_PX = 128;
const NODE_NAME_BADGE_FONT_WEIGHT = 700;
const NODE_NAME_BADGE_FALLBACK_CHAR_WIDTH_RATIO = 0.62;
const TREE_VIEWPORT_EDGE_SPACING_CSS_VARIABLE = "--spacing-lg";

let nameBadgeTextMeasureContext: CanvasRenderingContext2D | null | undefined;
const nameBadgeWidthCache = new Map<string, number>();

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

function getNameBadgeTextMeasureContext():
    | CanvasRenderingContext2D
    | null {
    if (nameBadgeTextMeasureContext !== undefined) {
        return nameBadgeTextMeasureContext;
    }

    if (typeof document === "undefined") {
        nameBadgeTextMeasureContext = null;
        return nameBadgeTextMeasureContext;
    }

    const canvas = document.createElement("canvas");
    nameBadgeTextMeasureContext = canvas.getContext("2d");
    return nameBadgeTextMeasureContext;
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

function getNameBadgeWidthPx(node: TreeLayoutNode): number {
    const rawLabel = node.nameLabel?.trim();
    if (!rawLabel) {
        return NODE_NAME_BADGE_MAX_WIDTH_PX;
    }

    const fontSizePx = getRootFontSizePx() * NODE_NAME_BADGE_FONT_REM;
    const cacheKey = `${fontSizePx}|${rawLabel}`;
    const cached = nameBadgeWidthCache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const context = getNameBadgeTextMeasureContext();
    let textWidthPx = rawLabel.length * fontSizePx * NODE_NAME_BADGE_FALLBACK_CHAR_WIDTH_RATIO;

    if (context) {
        context.font = `${NODE_NAME_BADGE_FONT_WEIGHT} ${fontSizePx}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        textWidthPx = context.measureText(rawLabel).width;
    }

    const paddedWidthPx =
        textWidthPx + NODE_BADGE_HORIZONTAL_PADDING_PX * 2;
    const clampedWidthPx = Math.max(
        NODE_BADGE_MIN_WIDTH_PX,
        Math.min(paddedWidthPx, NODE_NAME_BADGE_MAX_WIDTH_PX),
    );

    nameBadgeWidthCache.set(cacheKey, clampedWidthPx);
    return clampedWidthPx;
}

function getNameBadgeHorizontalOverflowWithScalePx(
    node: TreeLayoutNode,
    badgeScale: number,
): number {
    const radiusPx = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;
    const safeBadgeScale =
        Number.isFinite(badgeScale) && badgeScale > 0 ? badgeScale : 1;
    // Node.svelte keeps badges from shrinking when scale < 1 by applying
    // --node-badge-scale = 1 / scale. Represent that in world-space bounds.
    const effectiveScale = safeBadgeScale < 1 ? safeBadgeScale : 1;
    const halfBadgeWidthWorldPx = getNameBadgeWidthPx(node) / (2 * effectiveScale);
    return Math.max(0, halfBadgeWidthWorldPx - radiusPx);
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

export function getTreeViewportPadding(): TreeViewportPadding {
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
    options: TreeWorldBoundsOptions,
): TreeWorldBounds | null {
    if (nodes.length === 0) {
        return null;
    }

    const nodeBounds = nodes.map((node) => {
        const radiusPx = (node.radius ?? 1) * TREE_NODE_RADIUS_UNIT_PX;
        const badgeScale =
            Number.isFinite(options.badgeScale) && (options.badgeScale ?? 0) > 0
                ? (options.badgeScale as number)
                : 1;
        const topBadgeOverflow = options.showSkillName
            ? Math.ceil(getNameBadgeOverflowPx(node))
            : 0;
        const horizontalNameOverflow = options.showSkillName
            ? Math.ceil(
                  getNameBadgeHorizontalOverflowWithScalePx(node, badgeScale),
              )
            : 0;
        const bottomBadgeOverflow = Math.ceil(
            getLevelBadgeOverflowPx(node, options.showTier),
        );

        return {
            minX: node.x - radiusPx - horizontalNameOverflow,
            maxX: node.x + radiusPx + horizontalNameOverflow,
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
