import { writable } from "svelte/store";

const STORAGE_KEY = "rg-backpack-planner-dark-mode";

/** Default when no stored preference */
const DEFAULT_DARK_MODE = true;

function getDarkMode(): boolean {
    if (typeof window === "undefined") return DEFAULT_DARK_MODE;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return DEFAULT_DARK_MODE;
    return stored === "true";
}

function setDarkMode(value: boolean) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value.toString());
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
            localStorage.removeItem(STORAGE_KEY);
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
