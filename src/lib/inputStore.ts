import { derived, writable } from "svelte/store";

export type InputState = {
    shiftKey: boolean;
};

const initialState: InputState = {
    shiftKey: false,
};

/** Global input state (modifier keys, etc.). Updated by useInputStore. */
export const inputStore = writable<InputState>({ ...initialState });

/** True when Shift is held. Derived for convenience. */
export const shiftKeyHeld = derived(inputStore, (s) => s.shiftKey);

/** Only attach key listeners when device likely has a keyboard (avoids overhead on touch-only). */
function hasKeyboard(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function syncShiftKey(shiftKey: boolean) {
    inputStore.update((s) => (s.shiftKey === shiftKey ? s : { ...s, shiftKey }));
}

/**
 * Svelte action: attaches window key and pointer listeners and updates inputStore.
 * Pointer events sync Shift on click/move (e.g. Shift+click); key events sync on press/release
 * but may not fire until after a user activation (first click). Only attaches key listeners
 * on devices with fine pointer; no-op on touch-only.
 * Use on a root element (e.g. app shell) so the store is updated while mounted.
 */
export function useInputStore(_node: HTMLElement): void | { destroy(): void } {
    const onPointer = (e: PointerEvent) => syncShiftKey(e.shiftKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointer);
    window.addEventListener("pointermove", onPointer);

    if (!hasKeyboard()) {
        return {
            destroy() {
                window.removeEventListener("pointerdown", onPointer);
                window.removeEventListener("pointerup", onPointer);
                window.removeEventListener("pointermove", onPointer);
                inputStore.set({ ...initialState });
            },
        };
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") syncShiftKey(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") syncShiftKey(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return {
        destroy() {
            window.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("pointerup", onPointer);
            window.removeEventListener("pointermove", onPointer);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            inputStore.set({ ...initialState });
        },
    };
}
