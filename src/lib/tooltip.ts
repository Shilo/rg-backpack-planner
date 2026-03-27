import { writable } from "svelte/store";
import { LONG_PRESS_MOVE_THRESHOLD, LONG_PRESS_MS } from "./input/longPress";

export type TooltipSection =
    | { type: "text"; value: string }
    | { type: "shortcut"; value: string }
    | {
          type: "action-preview";
          direction: "up" | "down";
          targetLevel: number;
          crystalCost: string;
      };

export type TooltipContent = string | TooltipSection[];

export type TooltipParam =
    | TooltipContent
    | { content: TooltipContent; hoverOnly?: boolean; touchPreviewMs?: number };

type TooltipState = {
    isOpen: boolean;
    sections: TooltipSection[];
    x: number;
    y: number;
};

type Point = { x: number; y: number };

const PRESS_DELAY_MS = LONG_PRESS_MS + 60;
const HOVER_DELAY_MS = LONG_PRESS_MS;

export const tooltipStore = writable<TooltipState>({
    isOpen: false,
    sections: [],
    x: 0,
    y: 0,
});

const suppressedPointerIds = new Set<number>();
let currentOwner: HTMLElement | null = null;

function showTooltip(
    owner: HTMLElement,
    sections: TooltipSection[],
    point: Point,
) {
    currentOwner = owner;
    tooltipStore.set({
        isOpen: true,
        sections,
        x: point.x,
        y: point.y,
    });
}

function updateTooltipText(
    owner: HTMLElement,
    sections: TooltipSection[],
) {
    if (currentOwner !== owner) return;
    tooltipStore.update((state) =>
        state.isOpen ? { ...state, sections } : state,
    );
}

export function hideTooltip(owner?: HTMLElement) {
    if (owner && currentOwner !== owner) return;
    currentOwner = null;
    tooltipStore.set({
        isOpen: false,
        sections: [],
        x: 0,
        y: 0,
    });
}

export function suppressTooltip(pointerId: number | null) {
    if (pointerId === null) return;
    suppressedPointerIds.add(pointerId);
}

export function clearTooltipSuppression(pointerId: number | null) {
    if (pointerId === null) return;
    suppressedPointerIds.delete(pointerId);
}

function isSuppressed(pointerId: number | null) {
    return pointerId !== null && suppressedPointerIds.has(pointerId);
}

function normalizeContent(value?: TooltipContent): TooltipSection[] {
    if (value == null) return [];
    if (typeof value === "string") {
        return value === "" ? [] : [{ type: "text", value }];
    }
    return value;
}

function parseTooltipParam(value?: TooltipParam): {
    sections: TooltipSection[];
    hoverOnly: boolean;
    touchPreviewMs: number | null;
} {
    if (value == null) return { sections: [], hoverOnly: false, touchPreviewMs: null };
    if (typeof value === "object" && "content" in value) {
        const { content, hoverOnly = false, touchPreviewMs } = value;
        return { sections: normalizeContent(content), hoverOnly, touchPreviewMs: touchPreviewMs ?? null };
    }
    return { sections: normalizeContent(value as TooltipContent), hoverOnly: false, touchPreviewMs: null };
}

export function tooltip(node: HTMLElement, value?: TooltipParam) {
    let { sections, hoverOnly, touchPreviewMs } = parseTooltipParam(value);
    let hoverTimer: number | null = null;
    let pressTimer: number | null = null;
    let activePointerId: number | null = null;
    let lastPoint: Point = { x: 0, y: 0 };
    let pressStart: Point | null = null;
    let globalPointerEnd: ((event: PointerEvent) => void) | null = null;
    let hoverSuppressed = false;
    let isPointerOver = false;
    /** True while a pointer button is physically held down. Distinguishes
     *  capture-induced leave (during press) from genuine leave (after release). */
    let pressActive = false;
    let pressEndCleanup: (() => void) | null = null;

    const canHover = () =>
        window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const clearHoverTimer = () => {
        if (hoverTimer !== null) {
            window.clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    };

    const clearPressTimer = () => {
        if (pressTimer !== null) {
            window.clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const hasContent = () => sections.length > 0;

    const scheduleHover = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        if (event.buttons !== 0) return;
        lastPoint = { x: event.clientX, y: event.clientY };
        if (hoverSuppressed) return;
        if (!canHover() || !hasContent()) return;
        clearHoverTimer();
        hoverTimer = window.setTimeout(() => {
            showTooltip(node, sections, lastPoint);
        }, HOVER_DELAY_MS);
    };

    const schedulePress = (event: PointerEvent) => {
        if (event.pointerType !== "touch") return;
        // For touch previews, skip the early content check — sections may arrive
        // via a reactive update after pointerdown but before the timer fires.
        if (touchPreviewMs === null && !hasContent()) return;
        activePointerId = event.pointerId;
        pressStart = { x: event.clientX, y: event.clientY };
        lastPoint = { x: event.clientX, y: event.clientY };
        clearPressTimer();
        const delayMs = touchPreviewMs ?? PRESS_DELAY_MS;
        pressTimer = window.setTimeout(() => {
            if (isSuppressed(activePointerId)) return;
            if (!hasContent()) return;
            showTooltip(node, sections, lastPoint);
        }, delayMs);
    };

    const handlePointerEnter = (event: PointerEvent) => {
        isPointerOver = true;
        scheduleHover(event);
    };

    const handlePointerMove = (event: PointerEvent) => {
        if (pressTimer !== null && pressStart) {
            const distance = Math.hypot(
                event.clientX - pressStart.x,
                event.clientY - pressStart.y,
            );
            if (distance > LONG_PRESS_MOVE_THRESHOLD) {
                clearPressTimer();
                pressStart = null;
            }
        }
        if (event.pointerType === "touch") {
            return;
        }
        lastPoint = { x: event.clientX, y: event.clientY };
    };

    const handlePointerLeave = () => {
        isPointerOver = false;
        // Only clear suppression on genuine leave (button already released).
        // Capture-induced leave fires while button is still held and must not unsuppress.
        if (!pressActive) {
            hoverSuppressed = false;
        }
        clearHoverTimer();
        // During a touch press (e.g. pointer capture by the viewport),
        // keep the tooltip alive so touch previews survive capture-induced leave.
        if (pressActive && pressTimer !== null) return;
        hideTooltip(node);
    };

    const handlePointerDown = (event: PointerEvent) => {
        pressActive = true;
        clearHoverTimer();
        hoverSuppressed = true;

        // Track press end globally — pointerup may fire on a different element
        // (e.g. viewport during pointer capture) so the local handler won't see it.
        pressEndCleanup?.();
        const pointerId = event.pointerId;
        const onEnd = (e: PointerEvent) => {
            if (e.pointerId !== pointerId) return;
            pressActive = false;
            cleanup();
        };
        const cleanup = () => {
            window.removeEventListener("pointerup", onEnd, true);
            window.removeEventListener("pointercancel", onEnd, true);
            pressEndCleanup = null;
        };
        pressEndCleanup = cleanup;
        window.addEventListener("pointerup", onEnd, true);
        window.addEventListener("pointercancel", onEnd, true);

        const shouldSchedulePress = !hoverOnly || (touchPreviewMs !== null && event.pointerType === "touch");
        if (shouldSchedulePress) schedulePress(event);
        if (event.pointerType === "touch") {
            attachGlobalPointerEnd(event.pointerId);
        }
    };

    const handlePointerUp = (event: PointerEvent) => {
        clearPressTimer();
        hideTooltip(node);
        clearTooltipSuppression(event.pointerId);
        activePointerId = null;
        pressStart = null;
    };

    const handlePointerCancel = (event: PointerEvent) => {
        clearPressTimer();
        hideTooltip(node);
        clearTooltipSuppression(event.pointerId);
        activePointerId = null;
        pressStart = null;
    };

    const attachGlobalPointerEnd = (pointerId: number) => {
        if (globalPointerEnd) {
            window.removeEventListener("pointerup", globalPointerEnd, true);
            window.removeEventListener("pointercancel", globalPointerEnd, true);
        }
        globalPointerEnd = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            handlePointerUp(event);
            if (globalPointerEnd) {
                window.removeEventListener("pointerup", globalPointerEnd, true);
                window.removeEventListener(
                    "pointercancel",
                    globalPointerEnd,
                    true,
                );
                globalPointerEnd = null;
            }
        };
        window.addEventListener("pointerup", globalPointerEnd, true);
        window.addEventListener("pointercancel", globalPointerEnd, true);
    };

    node.addEventListener("pointerenter", handlePointerEnter);
    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerleave", handlePointerLeave);
    node.addEventListener("pointerdown", handlePointerDown);
    node.addEventListener("pointerup", handlePointerUp);
    node.addEventListener("pointercancel", handlePointerCancel);
    return {
        update(nextValue?: TooltipParam) {
            const hadContent = hasContent();
            ({ sections, hoverOnly, touchPreviewMs } = parseTooltipParam(nextValue));
            if (currentOwner === node) {
                if (hasContent()) {
                    updateTooltipText(node, sections);
                } else {
                    hideTooltip(node);
                }
            } else if (!hadContent && hasContent() && isPointerOver && !hoverSuppressed && canHover()) {
                // Content became available while pointer is over element — schedule tooltip
                clearHoverTimer();
                hoverTimer = window.setTimeout(() => {
                    showTooltip(node, sections, lastPoint);
                }, HOVER_DELAY_MS);
            }
        },
        destroy() {
            clearHoverTimer();
            clearPressTimer();
            hideTooltip(node);
            pressStart = null;
            pressEndCleanup?.();
            if (globalPointerEnd) {
                window.removeEventListener("pointerup", globalPointerEnd, true);
                window.removeEventListener(
                    "pointercancel",
                    globalPointerEnd,
                    true,
                );
                globalPointerEnd = null;
            }
            node.removeEventListener("pointerenter", handlePointerEnter);
            node.removeEventListener("pointermove", handlePointerMove);
            node.removeEventListener("pointerleave", handlePointerLeave);
            node.removeEventListener("pointerdown", handlePointerDown);
            node.removeEventListener("pointerup", handlePointerUp);
            node.removeEventListener("pointercancel", handlePointerCancel);
        },
    };
}
