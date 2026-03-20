import { writable } from "svelte/store";

export type InputState = {
    shiftKey: boolean;
    ctrlKey: boolean;
};

const initialState: InputState = {
    shiftKey: false,
    ctrlKey: false,
};

/** Global input state (modifier keys). Updated by useInputStore. */
export const inputStore = writable<InputState>({ ...initialState });

/** Only attach key listeners when device likely has a keyboard. */
function hasKeyboard(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function syncModifiers(shiftKey: boolean, ctrlKey: boolean) {
    inputStore.update((s) =>
        s.shiftKey === shiftKey && s.ctrlKey === ctrlKey
            ? s
            : { ...s, shiftKey, ctrlKey },
    );
}

/**
 * Svelte action: attaches window key and pointer listeners and updates inputStore.
 * Pointer events sync Shift and Ctrl on click/move; key events sync on press/release
 * but may not fire until after a user activation (first click). Only attaches key listeners
 * on devices with fine pointer; no-op on touch-only.
 * Use on a root element (e.g. app shell) so the store is updated while mounted.
 */
export function useInputStore(_node: HTMLElement): void | { destroy(): void } {
    const onPointer = (e: PointerEvent) => syncModifiers(e.shiftKey, e.ctrlKey);
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
        if (e.key === "Shift") inputStore.update((s) => (s.shiftKey ? s : { ...s, shiftKey: true }));
        if (e.key === "Control") inputStore.update((s) => (s.ctrlKey ? s : { ...s, ctrlKey: true }));
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") inputStore.update((s) => (!s.shiftKey ? s : { ...s, shiftKey: false }));
        if (e.key === "Control") inputStore.update((s) => (!s.ctrlKey ? s : { ...s, ctrlKey: false }));
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
