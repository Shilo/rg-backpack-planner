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

function computeFitScale(params: {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
}): number | null {
    const { viewportWidth, viewportHeight, naturalWidth, naturalHeight } = params;
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    if (naturalWidth <= 0 || naturalHeight <= 0) return null;
    return Math.min(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
}

export function computeImageViewerFitTransform(params: {
    viewportWidth: number;
    viewportHeight: number;
    naturalWidth: number;
    naturalHeight: number;
}): ImageViewerFitTransform | null {
    const fitScale = computeFitScale(params);
    if (fitScale === null) {
        return null;
    }

    return {
        scale: fitScale,
        offsetX: (params.viewportWidth - params.naturalWidth * fitScale) / 2,
        offsetY: (params.viewportHeight - params.naturalHeight * fitScale) / 2,
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
