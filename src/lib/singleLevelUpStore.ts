import { writable } from "svelte/store";

const STORAGE_KEY = "rg-backpack-planner-single-level-up";

/** Default when no stored preference */
const DEFAULT_SINGLE_LEVEL_UP = false;

function getSingleLevelUp(): boolean {
    if (typeof window === "undefined") return DEFAULT_SINGLE_LEVEL_UP;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true" ? true : DEFAULT_SINGLE_LEVEL_UP;
}

function setSingleLevelUp(value: boolean) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value.toString());
}

function createSingleLevelUpStore() {
    const { subscribe, set, update } = writable(getSingleLevelUp());

    return {
        subscribe,
        set: (value: boolean) => {
            setSingleLevelUp(value);
            set(value);
        },
        resetToDefault: () => {
            if (typeof window === "undefined") return;
            localStorage.removeItem(STORAGE_KEY);
            setSingleLevelUp(DEFAULT_SINGLE_LEVEL_UP);
            set(DEFAULT_SINGLE_LEVEL_UP);
        },
        toggle: () => {
            update((value) => {
                const next = !value;
                setSingleLevelUp(next);
                return next;
            });
        },
    };
}

export const singleLevelUp = createSingleLevelUpStore();
