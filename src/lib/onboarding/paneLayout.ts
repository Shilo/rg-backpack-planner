export type Rect = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

export type Direction = "up" | "down" | "left" | "right";

type PaneSize = {
    width: number;
    height: number;
};

type ComputePaneRectOptions = {
    anchorRect: Rect;
    paneSize: PaneSize;
    direction: Direction;
    viewportWidth: number;
    viewportHeight: number;
    edgePadding: number;
    bottomEdgePadding: number;
    ownSpotlightRect?: Rect;
    avoidRects?: Rect[];
    gap?: number;
};

const DIRECTION_FALLBACKS: Record<Direction, Direction[]> = {
    up: ["up", "down", "left", "right"],
    down: ["down", "up", "right", "left"],
    left: ["left", "right", "down", "up"],
    right: ["right", "left", "down", "up"],
};

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function rectWidth(rect: Rect) {
    return rect.right - rect.left;
}

function rectHeight(rect: Rect) {
    return rect.bottom - rect.top;
}

function createRect(left: number, top: number, width: number, height: number): Rect {
    return {
        top,
        bottom: top + height,
        left,
        right: left + width,
    };
}

function clampRect(
    rect: Rect,
    width: number,
    height: number,
    viewportWidth: number,
    viewportHeight: number,
    edgePadding: number,
    bottomEdgePadding: number,
) {
    const effectiveBottomPad = Math.max(edgePadding, bottomEdgePadding);
    const maxLeft = Math.max(edgePadding, viewportWidth - width - edgePadding);
    const maxTop = Math.max(
        edgePadding,
        viewportHeight - height - effectiveBottomPad,
    );
    const left = clamp(rect.left, edgePadding, maxLeft);
    const top = clamp(rect.top, edgePadding, maxTop);
    return createRect(left, top, width, height);
}

function getRectCenter(rect: Rect) {
    return {
        x: (rect.left + rect.right) / 2,
        y: (rect.top + rect.bottom) / 2,
    };
}

function getBaseRectForDirection(
    anchorRect: Rect,
    paneSize: PaneSize,
    direction: Direction,
    gap: number,
) {
    const anchorCenter = getRectCenter(anchorRect);
    switch (direction) {
        case "up":
            return createRect(
                anchorCenter.x - paneSize.width / 2,
                anchorRect.top - gap - paneSize.height,
                paneSize.width,
                paneSize.height,
            );
        case "down":
            return createRect(
                anchorCenter.x - paneSize.width / 2,
                anchorRect.bottom + gap,
                paneSize.width,
                paneSize.height,
            );
        case "left":
            return createRect(
                anchorRect.left - gap - paneSize.width,
                anchorCenter.y - paneSize.height / 2,
                paneSize.width,
                paneSize.height,
            );
        case "right":
            return createRect(
                anchorRect.right + gap,
                anchorCenter.y - paneSize.height / 2,
                paneSize.width,
                paneSize.height,
            );
    }
}

function dedupeNumbers(values: number[]) {
    const unique = new Map<string, number>();
    values.forEach((value) => {
        unique.set(String(Math.round(value * 100) / 100), value);
    });
    return Array.from(unique.values());
}

function getAxisCandidates(
    direction: Direction,
    baseRect: Rect,
    paneSize: PaneSize,
    edgePadding: number,
    bottomEdgePadding: number,
    viewportWidth: number,
    viewportHeight: number,
    avoidRects: Rect[],
    gap: number,
) {
    if (direction === "left" || direction === "right") {
        const maxTop = Math.max(
            edgePadding,
            viewportHeight -
                paneSize.height -
                Math.max(edgePadding, bottomEdgePadding),
        );
        const positions = [baseRect.top, edgePadding, maxTop];
        avoidRects.forEach((rect) => {
            positions.push(rect.top - paneSize.height - gap);
            positions.push(rect.bottom + gap);
            positions.push((rect.top + rect.bottom) / 2 - paneSize.height / 2);
        });
        return dedupeNumbers(positions);
    }

    const maxLeft = Math.max(
        edgePadding,
        viewportWidth - paneSize.width - edgePadding,
    );
    const positions = [baseRect.left, edgePadding, maxLeft];
    avoidRects.forEach((rect) => {
        positions.push(rect.left - paneSize.width - gap);
        positions.push(rect.right + gap);
        positions.push((rect.left + rect.right) / 2 - paneSize.width / 2);
    });
    return dedupeNumbers(positions);
}

function buildCandidatesForDirection(
    anchorRect: Rect,
    paneSize: PaneSize,
    direction: Direction,
    viewportWidth: number,
    viewportHeight: number,
    edgePadding: number,
    bottomEdgePadding: number,
    avoidRects: Rect[],
    gap: number,
) {
    const baseRect = getBaseRectForDirection(anchorRect, paneSize, direction, gap);
    const axisCandidates = getAxisCandidates(
        direction,
        baseRect,
        paneSize,
        edgePadding,
        bottomEdgePadding,
        viewportWidth,
        viewportHeight,
        avoidRects,
        gap,
    );

    const candidates = axisCandidates.map((axisValue) => {
        const rect =
            direction === "left" || direction === "right"
                ? createRect(baseRect.left, axisValue, paneSize.width, paneSize.height)
                : createRect(axisValue, baseRect.top, paneSize.width, paneSize.height);
        return clampRect(
            rect,
            paneSize.width,
            paneSize.height,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
        );
    });

    const unique = new Map<string, Rect>();
    candidates.forEach((candidate) => {
        const key = `${Math.round(candidate.left)}:${Math.round(candidate.top)}`;
        unique.set(key, candidate);
    });

    return {
        baseRect: clampRect(
            baseRect,
            paneSize.width,
            paneSize.height,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
        ),
        candidates: Array.from(unique.values()),
    };
}

export function overlapArea(a: Rect, b: Rect) {
    const dx = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const dy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return dx * dy;
}

function totalOverlap(candidate: Rect, rects: Rect[]) {
    return rects.reduce((total, rect) => total + overlapArea(candidate, rect), 0);
}

export function computePaneRect({
    anchorRect,
    paneSize,
    direction,
    viewportWidth,
    viewportHeight,
    edgePadding,
    bottomEdgePadding,
    ownSpotlightRect = anchorRect,
    avoidRects = [],
    gap = 14,
}: ComputePaneRectOptions) {
    if (
        paneSize.width <= 0 ||
        paneSize.height <= 0 ||
        viewportWidth <= 0 ||
        viewportHeight <= 0
    ) {
        return createRect(anchorRect.left, anchorRect.top, paneSize.width, paneSize.height);
    }

    const directions = DIRECTION_FALLBACKS[direction];
    let bestRect = createRect(anchorRect.left, anchorRect.top, paneSize.width, paneSize.height);
    let bestScore:
        | {
              ownOverlap: number;
              avoidOverlap: number;
              distance: number;
              directionRank: number;
          }
        | null = null;

    directions.forEach((candidateDirection, directionRank) => {
        const { baseRect, candidates } = buildCandidatesForDirection(
            anchorRect,
            paneSize,
            candidateDirection,
            viewportWidth,
            viewportHeight,
            edgePadding,
            bottomEdgePadding,
            avoidRects,
            gap,
        );

        candidates.forEach((candidate) => {
            const score = {
                ownOverlap: overlapArea(candidate, ownSpotlightRect),
                avoidOverlap: totalOverlap(candidate, avoidRects),
                distance:
                    Math.abs(candidate.left - baseRect.left) +
                    Math.abs(candidate.top - baseRect.top),
                directionRank,
            };

            const isBetter =
                !bestScore ||
                score.ownOverlap < bestScore.ownOverlap ||
                (score.ownOverlap === bestScore.ownOverlap &&
                    (score.avoidOverlap < bestScore.avoidOverlap ||
                        (score.avoidOverlap === bestScore.avoidOverlap &&
                            (score.distance < bestScore.distance ||
                                (score.distance === bestScore.distance &&
                                    score.directionRank < bestScore.directionRank)))));

            if (isBetter) {
                bestRect = candidate;
                bestScore = score;
            }
        });
    });

    return bestRect;
}

export function rectFromBounds(left: number, top: number, width: number, height: number) {
    return createRect(left, top, width, height);
}

export function rectDimensions(rect: Rect) {
    return {
        width: rectWidth(rect),
        height: rectHeight(rect),
    };
}
