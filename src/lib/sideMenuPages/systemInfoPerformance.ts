export type FpsSnapshot = {
    currentFps: number | null;
    averageFps: number | null;
    lowestFps: number | null;
};

type FpsSample = {
    fps: number;
    at: number;
};

export const FPS_UI_UPDATE_INTERVAL_MS = 250;
export const FPS_SAMPLE_WINDOW_MS = 5000;

export function formatFps(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
        return "—";
    }

    return String(Math.max(0, Math.round(value)));
}

export function startFpsMonitor(
    onUpdate: (snapshot: FpsSnapshot) => void,
): () => void {
    let animationFrameId = 0;
    let lastFrameAt = 0;
    let lastUiUpdateAt = 0;
    let fpsSamples: FpsSample[] = [];

    const step = (now: number) => {
        if (document.visibilityState !== "visible") {
            lastFrameAt = 0;
            animationFrameId = requestAnimationFrame(step);
            return;
        }

        if (lastFrameAt > 0) {
            const frameDelta = now - lastFrameAt;
            if (frameDelta > 0) {
                const fps = 1000 / frameDelta;
                fpsSamples.push({ fps, at: now });

                const cutoff = now - FPS_SAMPLE_WINDOW_MS;
                while (fpsSamples.length > 0 && fpsSamples[0].at < cutoff) {
                    fpsSamples.shift();
                }

                if (
                    lastUiUpdateAt === 0 ||
                    now - lastUiUpdateAt >= FPS_UI_UPDATE_INTERVAL_MS
                ) {
                    lastUiUpdateAt = now;
                    onUpdate({
                        currentFps: fps,
                        averageFps:
                            fpsSamples.reduce((sum, sample) => sum + sample.fps, 0) /
                            fpsSamples.length,
                        lowestFps: fpsSamples.reduce(
                            (min, sample) => Math.min(min, sample.fps),
                            fpsSamples[0].fps,
                        ),
                    });
                }
            }
        }

        lastFrameAt = now;
        animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
}
