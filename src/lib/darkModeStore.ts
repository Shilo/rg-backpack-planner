import { writable } from "svelte/store";
import {
    readLocalStorage,
    writeLocalStorage,
    removeLocalStorage,
} from "./storage";

const STORAGE_KEY = "rg-backpack-planner-dark-mode";

/** Default when no stored preference */
const DEFAULT_DARK_MODE = true;

function getDarkMode(): boolean {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored === null) return DEFAULT_DARK_MODE;
    return stored === "true";
}

function setDarkMode(value: boolean) {
    writeLocalStorage(STORAGE_KEY, value.toString());
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
            removeLocalStorage(STORAGE_KEY);
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
