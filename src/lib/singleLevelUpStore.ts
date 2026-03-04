import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

/** Default when no stored preference */
const DEFAULT_SINGLE_LEVEL_UP = false;

function getSingleLevelUp(): boolean {
    const stored = getItem("single-level-up");
    return stored === "true" ? true : DEFAULT_SINGLE_LEVEL_UP;
}

function setSingleLevelUp(value: boolean) {
    setItem("single-level-up", value.toString());
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
            removeItem("single-level-up");
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
