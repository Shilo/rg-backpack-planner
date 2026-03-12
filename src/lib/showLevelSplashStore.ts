import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export const DEFAULT_SHOW_LEVEL_SPLASH = true;

function parseShowLevelSplash(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getShowLevelSplash(): boolean {
    const stored = parseShowLevelSplash(getItem("show-level-splash"));
    return stored ?? DEFAULT_SHOW_LEVEL_SPLASH;
}

function setShowLevelSplash(value: boolean) {
    setItem("show-level-splash", String(value));
}

function createShowLevelSplashStore() {
    const { subscribe, set } = writable(getShowLevelSplash());

    return {
        subscribe,
        set: (value: boolean) => {
            setShowLevelSplash(value);
            set(value);
        },
        setWithoutPersistence: (value: boolean) => {
            set(value);
        },
        resetToDefault: () => {
            setShowLevelSplash(DEFAULT_SHOW_LEVEL_SPLASH);
            set(DEFAULT_SHOW_LEVEL_SPLASH);
        },
    };
}

export const showLevelSplash = createShowLevelSplashStore();
