<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        computeImageViewerFitTransform,
        syncImageViewerFit,
    } from "./imageViewerLayout";

    export let blob: Blob | null = null;

    let viewportEl: HTMLDivElement | null = null;
    let imgEl: HTMLImageElement | null = null;
    let objectUrl: string | null = null;
    let imageLoaded = false;
    let hasInitialFit = false;
    let naturalWidth = 0;
    let naturalHeight = 0;

    // Transform state
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    // Scale bounds
    let minScale = 0.1;
    const maxScale = 5.0;
    let fitScale = 1;

    // Viewport size (tracked by ResizeObserver)
    let viewportWidth = 0;
    let viewportHeight = 0;

    // Pointer tracking
    const pointers = new Map<number, { x: number; y: number }>();
    let panStart: {
        x: number;
        y: number;
        offsetX: number;
        offsetY: number;
    } | null = null;
    let panActive = false;
    let primaryPointerId: number | null = null;
    let pinchStart: {
        distance: number;
        worldX: number;
        worldY: number;
        scale: number;
    } | null = null;

    const PAN_THRESHOLD = 8;
    const DOUBLE_TAP_MAX_DELAY_MS = 300;
    const DOUBLE_TAP_MAX_DISTANCE_PX = 24;
    let touchGestureActive = false;
    let lastTouchTap: { time: number; x: number; y: number } | null = null;

    // Blob -> objectURL (reactive)
    $: if (blob) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        imageLoaded = false;
        hasInitialFit = false;
        naturalWidth = 0;
        naturalHeight = 0;
    } else {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        imageLoaded = false;
        hasInitialFit = false;
        naturalWidth = 0;
        naturalHeight = 0;
    }

    onDestroy(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resizeObserver?.disconnect();
    });

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    function screenToWorld(x: number, y: number) {
        return { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
    }

    function syncFitState() {
        // Race-condition guard:
        // `img.onload` can fire before ResizeObserver reports viewport dimensions when
        // the compose modal first mounts. We centralize fit updates here so initial
        // centering happens only once *after* both image + viewport sizes are known,
        // and later resizes only refresh fit/min bounds without resetting user pan/zoom.
        const next = syncImageViewerFit({
            viewportWidth,
            viewportHeight,
            naturalWidth,
            naturalHeight,
            scale,
            offsetX,
            offsetY,
            fitScale,
            minScale,
            hasInitialFit,
        });
        fitScale = next.fitScale;
        minScale = next.minScale;
        scale = next.scale;
        offsetX = next.offsetX;
        offsetY = next.offsetY;
        hasInitialFit = next.hasInitialFit;
    }

    function handleImageLoad() {
        if (!imgEl) return;
        naturalWidth = imgEl.naturalWidth;
        naturalHeight = imgEl.naturalHeight;
        imageLoaded = true;
        syncFitState();
    }

    function resetToFit() {
        const fitTransform = computeImageViewerFitTransform({
            viewportWidth,
            viewportHeight,
            naturalWidth,
            naturalHeight,
        });
        if (!fitTransform) return;

        fitScale = fitTransform.scale;
        minScale = Math.max(fitScale * 0.5, 0.1);
        scale = fitTransform.scale;
        offsetX = fitTransform.offsetX;
        offsetY = fitTransform.offsetY;
        hasInitialFit = true;
    }

    function clampOffsets(nextX: number, nextY: number, s: number) {
        if (!viewportWidth || !viewportHeight) return { x: nextX, y: nextY };
        const margin = 48;
        const contentW = naturalWidth * s;
        const contentH = naturalHeight * s;

        // When the fitted image is fully visible on an axis, keep it centered and
        // block panning on that axis. This prevents accidental "broken-looking"
        // offsets while browsing captures at fit scale.
        // Verified by test/imageViewerClampAtFit.test.ts.
        // Known limitation (unfixed): centering is based on full image dimensions,
        // not non-transparent content bounds. If the exported PNG itself contains
        // asymmetric transparent padding, the visible tree can still look off-center
        // even though the bitmap is mathematically centered in the viewer.
        if (contentW <= viewportWidth && contentH <= viewportHeight) {
            return {
                x: (viewportWidth - contentW) / 2,
                y: (viewportHeight - contentH) / 2,
            };
        }

        return {
            x:
                contentW <= viewportWidth
                    ? (viewportWidth - contentW) / 2
                    : clamp(nextX, viewportWidth - margin - contentW, margin),
            y:
                contentH <= viewportHeight
                    ? (viewportHeight - contentH) / 2
                    : clamp(nextY, viewportHeight - margin - contentH, margin),
        };
    }

    // ResizeObserver
    let resizeObserver: ResizeObserver | null = null;

    $: if (viewportEl && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
            if (viewportEl) {
                const previousViewportWidth = viewportWidth;
                const previousViewportHeight = viewportHeight;
                const rect = viewportEl.getBoundingClientRect();
                viewportWidth = rect.width;
                viewportHeight = rect.height;
                if (!imageLoaded) return;

                const sizeChanged =
                    previousViewportWidth > 0 &&
                    previousViewportHeight > 0 &&
                    (Math.abs(viewportWidth - previousViewportWidth) > 0.5 ||
                        Math.abs(viewportHeight - previousViewportHeight) >
                            0.5);

                if (sizeChanged) {
                    resetToFit();
                    return;
                }

                syncFitState();
            }
        });
        resizeObserver.observe(viewportEl);
    }

    // Pointer handlers
    function onPointerDown(event: PointerEvent) {
        if (event.pointerType === "mouse" && event.button === 1) {
            event.preventDefault();
            resetToFit();
            return;
        }

        viewportEl?.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (event.pointerType === "touch" && pointers.size > 1) {
            touchGestureActive = true;
        }

        if (pointers.size === 1) {
            primaryPointerId = event.pointerId;
            panStart = {
                x: event.clientX,
                y: event.clientY,
                offsetX,
                offsetY,
            };
            panActive = false;
        } else if (pointers.size === 2) {
            const [p1, p2] = Array.from(pointers.values());
            const centerX = (p1.x + p2.x) / 2;
            const centerY = (p1.y + p2.y) / 2;
            const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const rect = viewportEl!.getBoundingClientRect();
            const world = screenToWorld(
                centerX - rect.left,
                centerY - rect.top,
            );
            pinchStart = {
                distance,
                worldX: world.x,
                worldY: world.y,
                scale,
            };
            panStart = null;
            panActive = false;
        }
    }

    function onPointerMove(event: PointerEvent) {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        if (
            pointers.size === 1 &&
            panStart &&
            primaryPointerId === event.pointerId
        ) {
            const dx = event.clientX - panStart.x;
            const dy = event.clientY - panStart.y;
            const distance = Math.hypot(dx, dy);
            if (!panActive && distance > PAN_THRESHOLD) {
                panActive = true;
                if (event.pointerType === "touch") {
                    touchGestureActive = true;
                }
            }
            if (panActive) {
                const nextX = panStart.offsetX + dx;
                const nextY = panStart.offsetY + dy;
                const clamped = clampOffsets(nextX, nextY, scale);
                offsetX = clamped.x;
                offsetY = clamped.y;
            }
        } else if (pointers.size === 2 && pinchStart) {
            touchGestureActive = true;
            const [p1, p2] = Array.from(pointers.values());
            const centerX = (p1.x + p2.x) / 2;
            const centerY = (p1.y + p2.y) / 2;
            const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const rect = viewportEl!.getBoundingClientRect();
            const nextScale = clamp(
                pinchStart.scale * (distance / pinchStart.distance),
                minScale,
                maxScale,
            );
            scale = nextScale;
            const nextX = centerX - rect.left - pinchStart.worldX * scale;
            const nextY = centerY - rect.top - pinchStart.worldY * scale;
            const clamped = clampOffsets(nextX, nextY, nextScale);
            offsetX = clamped.x;
            offsetY = clamped.y;
        }
    }

    function onPointerUp(event: PointerEvent) {
        pointers.delete(event.pointerId);
        viewportEl?.releasePointerCapture(event.pointerId);
        const shouldHandleTouchTap =
            event.pointerType === "touch" &&
            pointers.size === 0 &&
            !panActive &&
            !touchGestureActive;

        if (pointers.size === 0) {
            panStart = null;
            panActive = false;
            pinchStart = null;
            primaryPointerId = null;
            touchGestureActive = false;
        } else if (pointers.size === 1) {
            pinchStart = null;
            const [id, pos] = Array.from(pointers.entries())[0];
            primaryPointerId = id;
            panStart = { x: pos.x, y: pos.y, offsetX, offsetY };
            panActive = false;
        }

        if (shouldHandleTouchTap) {
            const now = event.timeStamp;
            if (lastTouchTap) {
                const elapsed = now - lastTouchTap.time;
                const distance = Math.hypot(
                    event.clientX - lastTouchTap.x,
                    event.clientY - lastTouchTap.y,
                );
                if (
                    elapsed <= DOUBLE_TAP_MAX_DELAY_MS &&
                    distance <= DOUBLE_TAP_MAX_DISTANCE_PX
                ) {
                    resetToFit();
                    lastTouchTap = null;
                    return;
                }
            }

            lastTouchTap = {
                time: now,
                x: event.clientX,
                y: event.clientY,
            };
        } else if (pointers.size === 0) {
            lastTouchTap = null;
        }
    }

    function onWheel(event: WheelEvent) {
        if (!viewportEl || pointers.size > 0) return;
        event.preventDefault();
        const rect = viewportEl.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        const world = screenToWorld(localX, localY);
        const zoomFactor = Math.exp(-event.deltaY * 0.002);
        const nextScale = clamp(scale * zoomFactor, minScale, maxScale);
        scale = nextScale;
        const nextX = localX - world.x * scale;
        const nextY = localY - world.y * scale;
        const clamped = clampOffsets(nextX, nextY, nextScale);
        offsetX = clamped.x;
        offsetY = clamped.y;
    }

    function onDoubleClick(event: MouseEvent) {
        if (event.button !== 0) return;
        event.preventDefault();
        resetToFit();
    }
</script>

<div
    class="image-viewer"
    role="group"
    aria-label="Image viewer"
    bind:this={viewportEl}
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}
    on:pointercancel={onPointerUp}
    on:pointerleave={onPointerUp}
    on:wheel|preventDefault={onWheel}
    on:dblclick={onDoubleClick}
>
    {#if objectUrl}
        <img
            bind:this={imgEl}
            src={objectUrl}
            alt=""
            class="image-viewer__img"
            style="transform: translate({offsetX}px, {offsetY}px) scale({scale}); transform-origin: 0 0;"
            on:load={handleImageLoad}
            draggable="false"
        />
    {/if}
</div>

<style>
    .image-viewer {
        width: 100%;
        height: 100%;
        overflow: hidden;
        touch-action: none;
        overscroll-behavior: contain;
        cursor: grab;
        user-select: none;
    }

    .image-viewer:active {
        cursor: grabbing;
    }

    .image-viewer__img {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }
</style>
