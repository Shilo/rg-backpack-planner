import { getTreeViewportPadding } from "./treeLayout";

export type ImageViewerFitState = {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    fitScale: number;
    minScale: number;
    hasInitialFit: boolean;
};

export type ImageViewerFitTransform = {
    scale: number;
    offsetX: number;
    offsetY: number;
};

type ImageViewerClampParams = {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    offsetX: number;
    offsetY: number;
    scale: number;
    margin?: number;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getImageViewerFitViewport(params: {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
}): {
    fitViewportWidth: number;
    fitViewportHeight: number;
    padding: ReturnType<typeof getTreeViewportPadding>;
} | null {
    const { viewportWidth, viewportHeight, naturalWidth, naturalHeight } = params;
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    if (naturalWidth <= 0 || naturalHeight <= 0) return null;

    const padding = getTreeViewportPadding();
    return {
        fitViewportWidth: Math.max(viewportWidth - padding.horizontal * 2, 1),
        fitViewportHeight: Math.max(viewportHeight - padding.vertical * 2, 1),
        padding,
    };
}

export function computeImageViewerFitTransform(params: {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
}): ImageViewerFitTransform | null {
    const fitViewport = getImageViewerFitViewport(params);
    if (!fitViewport) {
        return null;
    }

    const fitScale = Math.min(
        fitViewport.fitViewportWidth / params.naturalWidth,
        fitViewport.fitViewportHeight / params.naturalHeight,
    );

    return {
        scale: fitScale,
        offsetX:
            fitViewport.padding.horizontal +
            (fitViewport.fitViewportWidth - params.naturalWidth * fitScale) / 2,
        offsetY:
            fitViewport.padding.vertical +
            (fitViewport.fitViewportHeight - params.naturalHeight * fitScale) / 2,
    };
}

export function syncImageViewerFit(
    state: ImageViewerFitState,
): ImageViewerFitState {
    const fitTransform = computeImageViewerFitTransform(state);
    if (fitTransform === null) {
        return state;
    }

    const nextFitScale = fitTransform.scale;
    const nextMinScale = Math.max(nextFitScale * 0.5, 0.1);
    if (!state.hasInitialFit) {
        return {
            ...state,
            fitScale: nextFitScale,
            minScale: nextMinScale,
            ...fitTransform,
            hasInitialFit: true,
        };
    }

    return {
        ...state,
        fitScale: nextFitScale,
        minScale: nextMinScale,
    };
}

export function clampImageViewerOffsets(params: ImageViewerClampParams): {
    x: number;
    y: number;
} {
    const {
        viewportWidth,
        viewportHeight,
        naturalWidth,
        naturalHeight,
        offsetX,
        offsetY,
        scale,
        margin = 48,
    } = params;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
        return { x: offsetX, y: offsetY };
    }

    if (naturalWidth <= 0 || naturalHeight <= 0 || scale <= 0) {
        return { x: offsetX, y: offsetY };
    }

    const contentW = naturalWidth * scale;
    const contentH = naturalHeight * scale;

    return {
        x: clamp(offsetX, margin - contentW, viewportWidth - margin),
        y: clamp(offsetY, margin - contentH, viewportHeight - margin),
    };
}
