import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

export const TREE_ZOOM_FIT = 100;
export const TREE_ZOOM_CLOSE_UP = 150;

const VALID_TREE_ZOOM_SCALES = new Set([TREE_ZOOM_FIT, TREE_ZOOM_CLOSE_UP]);

/** Default when no stored preference: close-up on touch-primary devices, fit on pointer devices */
function getDefaultTreeZoomScale(): number {
    if (typeof window === "undefined") return TREE_ZOOM_FIT;
    return window.matchMedia("(pointer: coarse)").matches
        ? TREE_ZOOM_CLOSE_UP
        : TREE_ZOOM_FIT;
}

function parseTreeZoomScale(storedValue: string | null): number | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    if (!Number.isInteger(parsed)) return null;
    return VALID_TREE_ZOOM_SCALES.has(parsed) ? parsed : null;
}

function getTreeZoomScale(): number {
    const stored = parseTreeZoomScale(getItem("tree-zoom-scale"));
    if (stored !== null) {
        return stored;
    }

    return getDefaultTreeZoomScale();
}

function setTreeZoomScale(value: number) {
    setItem("tree-zoom-scale", value.toString());
}

function createTreeZoomScaleStore() {
    const { subscribe, set } = writable(getTreeZoomScale());
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
        set: (value: number) => {
            if (!VALID_TREE_ZOOM_SCALES.has(value)) return;
            setTreeZoomScale(value);
            set(value);
            notifyChange();
        },
        resetToDefault: () => {
            removeItem("tree-zoom-scale");
            const defaultValue = getDefaultTreeZoomScale();
            setTreeZoomScale(defaultValue);
            set(defaultValue);
            notifyChange();
        },
    };
}

export const treeZoomScale = createTreeZoomScaleStore();
