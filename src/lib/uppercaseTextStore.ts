import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

export const DEFAULT_UPPERCASE_TEXT = false;

function getUppercaseText(): boolean {
    const stored = getItem("uppercase-text");
    if (stored === null) return DEFAULT_UPPERCASE_TEXT;
    return stored === "true";
}

function setUppercaseText(value: boolean) {
    setItem("uppercase-text", value.toString());
}

function createUppercaseTextStore() {
    const { subscribe, set } = writable(getUppercaseText());

    return {
        subscribe,
        set: (value: boolean) => {
            setUppercaseText(value);
            set(value);
        },
        setWithoutPersistence: (value: boolean) => {
            set(value);
        },
        resetToDefault: () => {
            removeItem("uppercase-text");
            set(DEFAULT_UPPERCASE_TEXT);
        },
    };
}

export const uppercaseText = createUppercaseTextStore();
