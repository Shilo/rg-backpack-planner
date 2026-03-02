import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

/** Default when no stored preference */
const DEFAULT_DARK_MODE = true;

function getDarkMode(): boolean {
    if (typeof window === "undefined") return DEFAULT_DARK_MODE;
    const stored = getItem("dark-mode");
    if (stored === null) return DEFAULT_DARK_MODE;
    return stored === "true";
}

function setDarkMode(value: boolean) {
    if (typeof window === "undefined") return;
    setItem("dark-mode", value.toString());
}

function createDarkModeStore() {
    const { subscribe, set, update } = writable(getDarkMode());

    return {
        subscribe,
        set: (value: boolean) => {
            setDarkMode(value);
            set(value);
        },
        resetToDefault: () => {
            if (typeof window === "undefined") return;
            removeItem("dark-mode");
            setDarkMode(DEFAULT_DARK_MODE);
            set(DEFAULT_DARK_MODE);
        },
        toggle: () => {
            update((value) => {
                const next = !value;
                setDarkMode(next);
                return next;
            });
        },
    };
}

export const darkMode = createDarkModeStore();
