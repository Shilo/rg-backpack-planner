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

export function syncImageViewerFit(
    state: ImageViewerFitState,
): ImageViewerFitState {
    const nextFitScale = computeFitScale(state);
    if (nextFitScale === null) {
        return state;
    }

    const nextMinScale = Math.max(nextFitScale * 0.5, 0.1);
    if (!state.hasInitialFit) {
        return {
            ...state,
            fitScale: nextFitScale,
            minScale: nextMinScale,
            scale: nextFitScale,
            offsetX: (state.viewportWidth - state.naturalWidth * nextFitScale) / 2,
            offsetY: (state.viewportHeight - state.naturalHeight * nextFitScale) / 2,
            hasInitialFit: true,
        };
    }

    return {
        ...state,
        fitScale: nextFitScale,
        minScale: nextMinScale,
    };
}
