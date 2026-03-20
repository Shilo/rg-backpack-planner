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
 */
export function secondary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    const pressState: LongPressState = { timer: null, fired: false };
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;

    function onContextMenu(event: Event) {
        event.preventDefault();
        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(2, modifier, "mouse");
        if (!action) return;
        triggerHaptic();
        handler(action);
    }

    function onPointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;

        startLongPress(pressState, () => {
            suppressNextPointerUp(event.pointerId);
            const device = event.pointerType === "touch" ? "touch" : "mouse";
            const modifier = device === "touch" ? "none" : resolveModifier(get(inputStore));
            const action = resolveAction(2, modifier, device);
            if (!action) return false;
            triggerHaptic();
            handler(action);
        });
    }

    function onPointerMove(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        if (isLongPressMovement(startX, startY, event.clientX, event.clientY)) {
            clearLongPress(pressState);
            activePointerId = null;
        }
    }

    function onPointerUp(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        clearLongPress(pressState);
        activePointerId = null;
    }

    function onPointerCancel(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        clearLongPress(pressState);
        activePointerId = null;
    }

    node.addEventListener("contextmenu", onContextMenu);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);

    return {
        destroy() {
            clearLongPress(pressState);
            node.removeEventListener("contextmenu", onContextMenu);
            node.removeEventListener("pointerdown", onPointerDown);
            node.removeEventListener("pointermove", onPointerMove);
            node.removeEventListener("pointerup", onPointerUp);
            node.removeEventListener("pointercancel", onPointerCancel);
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
