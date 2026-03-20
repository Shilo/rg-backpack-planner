import { writable } from "svelte/store";
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
