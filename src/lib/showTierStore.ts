import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_SHOW_TIER = false;

function parseShowTier(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getShowTier(): boolean {
    const stored = parseShowTier(getItem("show-tier"));
    return stored ?? DEFAULT_SHOW_TIER;
}

function setShowTier(value: boolean) {
    setItem("show-tier", String(value));
}

function createShowTierStore() {
    const { subscribe, set } = writable(getShowTier());

    return {
        subscribe,
        set: (value: boolean) => {
            setShowTier(value);
            set(value);
        },
        setWithoutPersistence: (value: boolean) => {
            set(value);
        },
        resetToDefault: () => {
            setShowTier(DEFAULT_SHOW_TIER);
            set(DEFAULT_SHOW_TIER);
        },
    };
}

export const showTier = createShowTierStore();
