import { writable } from "svelte/store";
import {
    readLocalStorage,
    writeLocalStorage,
    removeLocalStorage,
} from "./storage";

const STORAGE_KEY = "rg-backpack-planner-close-up-view";

/** Default when no stored preference: true on touch-primary devices, false on pointer devices */
function getDefaultCloseUpView(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
}

function getCloseUpView(): boolean {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored !== null) {
        return stored === "true";
    }

    return getDefaultCloseUpView();
}

function setCloseUpView(value: boolean) {
    writeLocalStorage(STORAGE_KEY, value.toString());
}

function createCloseUpViewStore() {
    const { subscribe, set, update } = writable(getCloseUpView());
    let onChangeCallback: (() => void) | null = null;

    const notifyChange = () => {
        queueMicrotask(() => {
            onChangeCallback?.();
        });
    };

    return {
        subscribe,
        setOnChange: (callback: (() => void) | null) => {
            onChangeCallback = callback;
        },
        set: (value: boolean) => {
            setCloseUpView(value);
            set(value);
            notifyChange();
        },
        resetToDefault: () => {
            removeLocalStorage(STORAGE_KEY);
            const defaultValue = getDefaultCloseUpView();
            setCloseUpView(defaultValue);
            set(defaultValue);
            notifyChange();
        },
        toggle: () => {
            update((value) => {
                const next = !value;
                setCloseUpView(next);
                return next;
            });
            notifyChange();
        },
    };
}

export const closeUpView = createCloseUpViewStore();
