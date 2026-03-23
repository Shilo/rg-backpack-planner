/**
 * Physics utilities for the skill tree canvas:
 * - Momentum pan (flick-to-scroll with deceleration)
 * - Smooth animated view transitions (focus, zoom)
 */

// ── Momentum Pan ─────────────────────────────────────────────────────

const FRICTION = 0.92;
const MIN_VELOCITY = 0.05; // px/ms
const VELOCITY_SAMPLE_WINDOW = 80; // ms — only use recent movement for velocity

type VelocitySample = { x: number; y: number; time: number };

export type MomentumTracker = ReturnType<typeof createMomentumTracker>;

export function createMomentumTracker() {
    let samples: VelocitySample[] = [];
    let animationId: number | null = null;

    function track(x: number, y: number) {
        const now = performance.now();
        samples.push({ x, y, time: now });
        // Keep only recent samples within the window
        const cutoff = now - VELOCITY_SAMPLE_WINDOW;
        samples = samples.filter((s) => s.time >= cutoff);
    }

    function computeVelocity(): { vx: number; vy: number } {
        if (samples.length < 2) return { vx: 0, vy: 0 };
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = last.time - first.time;
        if (dt < 1) return { vx: 0, vy: 0 };
        return {
            vx: (last.x - first.x) / dt,
            vy: (last.y - first.y) / dt,
        };
    }

    function release(
        onUpdate: (dx: number, dy: number) => void,
        onDone?: () => void,
    ) {
        let { vx, vy } = computeVelocity();
        samples = [];

        if (Math.hypot(vx, vy) < MIN_VELOCITY) {
            onDone?.();
            return;
        }

        let lastTime = performance.now();

        function step() {
            const now = performance.now();
            const dt = now - lastTime;
            lastTime = now;

            // Apply friction per-frame, scaled to dt
            const friction = Math.pow(FRICTION, dt / 16);
            vx *= friction;
            vy *= friction;

            if (Math.hypot(vx, vy) < MIN_VELOCITY) {
                animationId = null;
                onDone?.();
                return;
            }

            onUpdate(vx * dt, vy * dt);
            animationId = requestAnimationFrame(step);
        }

        animationId = requestAnimationFrame(step);
    }

    function cancel() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        samples = [];
    }

    function isActive() {
        return animationId !== null;
    }

    function reset() {
        samples = [];
    }

    return { track, release, cancel, reset, isActive };
}

// ── Smooth View Animation ────────────────────────────────────────────

export type ViewState = {
    offsetX: number;
    offsetY: number;
    scale: number;
};

/**
 * Easing: fast start, gentle settle — feels physical.
 * cubic-bezier(0.25, 1, 0.5, 1) approximation.
 */
function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

/**
 * Animate from one view state to another.
 * Returns a cancel function.
 */
export function animateView(
    from: ViewState,
    to: ViewState,
    durationMs: number,
    onUpdate: (state: ViewState) => void,
    onDone?: () => void,
): () => void {
    let animationId: number | null = null;
    const start = performance.now();

    function step(now: number) {
        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        const ease = easeOutQuart(t);

        onUpdate({
            offsetX: from.offsetX + (to.offsetX - from.offsetX) * ease,
            offsetY: from.offsetY + (to.offsetY - from.offsetY) * ease,
            scale: from.scale + (to.scale - from.scale) * ease,
        });

        if (t < 1) {
            animationId = requestAnimationFrame(step);
        } else {
            animationId = null;
            onDone?.();
        }
    }

    animationId = requestAnimationFrame(step);

    return () => {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    };
}

// ── Zoom Chase (smooth wheel zoom) ──────────────────────────────────

const ZOOM_LERP_SPEED = 0.18; // fraction of remaining distance per 16ms frame
const ZOOM_SETTLE_SCALE = 0.0005;
const ZOOM_SETTLE_POS = 0.5; // px

export type ZoomChaser = ReturnType<typeof createZoomChaser>;

export function createZoomChaser() {
    let animationId: number | null = null;
    let target: ViewState = { offsetX: 0, offsetY: 0, scale: 1 };
    let getCurrentFn: (() => ViewState) | null = null;
    let onUpdateFn: ((state: ViewState) => void) | null = null;

    function startLoop() {
        if (animationId !== null) return;
        let lastTime = performance.now();

        function step() {
            const now = performance.now();
            const dt = now - lastTime;
            lastTime = now;

            if (!getCurrentFn || !onUpdateFn) {
                animationId = null;
                return;
            }

            const current = getCurrentFn();
            const factor = 1 - Math.pow(1 - ZOOM_LERP_SPEED, dt / 16);

            const nextScale =
                current.scale + (target.scale - current.scale) * factor;
            const nextOffsetX =
                current.offsetX + (target.offsetX - current.offsetX) * factor;
            const nextOffsetY =
                current.offsetY + (target.offsetY - current.offsetY) * factor;

            const scaleDiff = Math.abs(target.scale - nextScale);
            const posDiff = Math.hypot(
                target.offsetX - nextOffsetX,
                target.offsetY - nextOffsetY,
            );

            if (scaleDiff < ZOOM_SETTLE_SCALE && posDiff < ZOOM_SETTLE_POS) {
                onUpdateFn({ ...target });
                animationId = null;
                return;
            }

            onUpdateFn({
                offsetX: nextOffsetX,
                offsetY: nextOffsetY,
                scale: nextScale,
            });
            animationId = requestAnimationFrame(step);
        }

        animationId = requestAnimationFrame(step);
    }

    /** Set or update zoom target. Called on each wheel tick. */
    function chase(
        newTarget: ViewState,
        getCurrent: () => ViewState,
        onUpdate: (state: ViewState) => void,
    ) {
        target = { ...newTarget };
        getCurrentFn = getCurrent;
        onUpdateFn = onUpdate;
        startLoop();
    }

    /** Get current target (for computing next wheel tick from accumulated state). */
    function getTarget(): ViewState {
        return { ...target };
    }

    function cancel() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function isActive() {
        return animationId !== null;
    }

    return { chase, getTarget, cancel, isActive };
}

// ── Reduced Motion ───────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}
