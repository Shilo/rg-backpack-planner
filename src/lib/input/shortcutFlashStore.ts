import { writable, readable } from "svelte/store";
import type { Readable } from "svelte/store";
import type { KeyboardActionType } from "./keyboardAction";

export const FLASH_DURATION_MS = 250;

const store = writable<KeyboardActionType | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export const shortcutFlash = { subscribe: store.subscribe };

export function triggerShortcutFlash(action: KeyboardActionType): void {
    if (timer != null) clearTimeout(timer);
    store.set(action);
    timer = setTimeout(() => {
        store.set(null);
        timer = null;
    }, FLASH_DURATION_MS);
}

const FALSE_STORE: Readable<boolean> = readable(false);

/**
 * Returns a readable boolean store that is true when the given action
 * is the currently flashing shortcut. Returns a static false store
 * when action is undefined, avoiding any subscription overhead.
 */
export function shortcutFlashFor(action: KeyboardActionType | undefined): Readable<boolean> {
    if (!action) return FALSE_STORE;
    return { subscribe: (fn) => shortcutFlash.subscribe((v) => fn(v === action)) };
}
