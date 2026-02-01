import { writable } from "svelte/store";

const STORAGE_KEY = "rg-backpack-planner-close-up-view";

/** Default when no stored preference: true on touch-primary devices, false on pointer devices */
function getDefaultCloseUpView(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
}

function getCloseUpView(): boolean {
    if (typeof window === "undefined") return false;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
        return stored === "true";
    }

    return getDefaultCloseUpView();
}

function setCloseUpView(value: boolean) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value.toString());
}

function createCloseUpViewStore() {
    const { subscribe, set, update } = writable(getCloseUpView());
    let onChangeCallback: (() => void) | null = null;

    const notifyChange = () => {
        // Use setTimeout to ensure store update has propagated before calling callback
        setTimeout(() => {
            onChangeCallback?.();
        }, 0);
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
            if (typeof window === "undefined") return;
            localStorage.removeItem(STORAGE_KEY);
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
