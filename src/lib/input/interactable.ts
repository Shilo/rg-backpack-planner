import type { ActionReturn } from "svelte/action";
import type { InputAction } from "./inputAction";
import { inputStore } from "./inputStore";
import { resolveModifier, resolveAction } from "./resolveAction";
import { triggerHaptic } from "../hapticsStore";
import {
    startLongPress,
    clearLongPress,
    suppressNextPointerUp,
    isLongPressMovement,
    type LongPressState,
} from "./longPress";
import { get } from "svelte/store";

/**
 * use:primary — fires on click (button 0).
 * Mouse: resolves modifier from inputStore.
 * Touch: modifier always "none".
 */
export function primary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    function onClick(event: MouseEvent) {
        const pointerType = (event as PointerEvent).pointerType || "mouse";
        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(event.button, modifier, pointerType);
        if (!action || action.type !== "primary") return;
        triggerHaptic();
        handler(action);
    }

    node.addEventListener("click", onClick);

    return {
        destroy() {
            node.removeEventListener("click", onClick);
        },
    };
}

/**
 * use:secondary — fires on contextmenu (mouse) or long-press (all pointer types).
 * Click/contextmenu suppressed after long-press fires via longPress.ts.
 * Touch modifier always "none" even if physical modifier held.
 *
 * Handler may return false to indicate it declined the action (e.g. target
 * was not relevant). When false, haptic and pointerup suppression are skipped.
 */
export function secondary(
    node: HTMLElement,
    handler: (action: InputAction) => boolean | void,
): ActionReturn {
    const pressState: LongPressState = { timer: null, fired: false };
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;
    let globalCleanup: ((event: PointerEvent) => void) | null = null;

    function clearActive() {
        clearLongPress(pressState);
        activePointerId = null;
        detachGlobalCleanup();
    }

    /** Attach window capture-phase listeners so cleanup runs even when
     *  another element has pointer capture (e.g. Tree.svelte viewport). */
    function attachGlobalCleanup(pointerId: number) {
        detachGlobalCleanup();
        globalCleanup = (event: PointerEvent) => {
            if (event.pointerId !== pointerId) return;
            clearActive();
        };
        window.addEventListener("pointerup", globalCleanup, true);
        window.addEventListener("pointercancel", globalCleanup, true);
    }

    function detachGlobalCleanup() {
        if (!globalCleanup) return;
        window.removeEventListener("pointerup", globalCleanup, true);
        window.removeEventListener("pointercancel", globalCleanup, true);
        globalCleanup = null;
    }

    function onContextMenu(event: Event) {
        event.preventDefault();
        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(2, modifier, "mouse");
        if (!action) return;
        handler(action);
    }

    function onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;

        attachGlobalCleanup(event.pointerId);
        startLongPress(pressState, () => {
            detachGlobalCleanup();
            const device = event.pointerType === "touch" ? "touch" : "mouse";
            const modifier = device === "touch" ? "none" : resolveModifier(get(inputStore));
            const action = resolveAction(2, modifier, device);
            if (!action) return false;
            if (handler(action) === false) return false;
            suppressNextPointerUp(event.pointerId);
        });
    }

    function onPointerMove(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        if (isLongPressMovement(startX, startY, event.clientX, event.clientY)) {
            clearActive();
        }
    }

    node.addEventListener("contextmenu", onContextMenu);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);

    return {
        destroy() {
            clearActive();
            node.removeEventListener("contextmenu", onContextMenu);
            node.removeEventListener("pointerdown", onPointerDown);
            node.removeEventListener("pointermove", onPointerMove);
        },
    };
}

/**
 * use:auxiliary — fires on auxclick (button 1, mouse only).
 * Never fires on touch. Includes Safari double-fire guard (50ms dedup).
 */
export function auxiliary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    let lastFireTime = 0;
    const DEDUP_MS = 50;

    function fire(event: Event) {
        const now = Date.now();
        if (now - lastFireTime < DEDUP_MS) return;
        lastFireTime = now;

        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(1, modifier, "mouse");
        if (!action) return;
        event.preventDefault();
        triggerHaptic();
        handler(action);
    }

    function onAuxClick(event: MouseEvent) {
        if (event.button !== 1) return;
        fire(event);
    }

    function onPointerUp(event: PointerEvent) {
        if (event.pointerType !== "mouse" || event.button !== 1) return;
        fire(event);
    }

    node.addEventListener("auxclick", onAuxClick);
    node.addEventListener("pointerup", onPointerUp);

    return {
        destroy() {
            node.removeEventListener("auxclick", onAuxClick);
            node.removeEventListener("pointerup", onPointerUp);
        },
    };
}
