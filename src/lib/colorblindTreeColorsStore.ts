import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

const DEFAULT_COLORBLIND_TREE_COLORS = false;

function getColorblindTreeColors(): boolean {
    const stored = getItem("colorblind-tree-colors");
    if (stored === null) return DEFAULT_COLORBLIND_TREE_COLORS;
    return stored === "true";
}

function setColorblindTreeColors(value: boolean) {
    setItem("colorblind-tree-colors", value.toString());
}

function createColorblindTreeColorsStore() {
    const { subscribe, set } = writable(getColorblindTreeColors());

    return {
        subscribe,
        set: (value: boolean) => {
            setColorblindTreeColors(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("colorblind-tree-colors");
            set(DEFAULT_COLORBLIND_TREE_COLORS);
        },
    };
}

export const colorblindTreeColors = createColorblindTreeColorsStore();
