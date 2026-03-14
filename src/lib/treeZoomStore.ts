import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export const TREE_ZOOM_SCALES = [100, 150, 200] as const;

export enum TreeZoomLevel {
    Fit = 0,
    CloseUp = 1,
    Detail = 2,
}

/** Default when no stored preference: close-up on touch-primary devices, fit on pointer devices */
function getDefaultTreeZoomLevel(): TreeZoomLevel {
    if (typeof window === "undefined") return TreeZoomLevel.Fit;
    return window.matchMedia("(pointer: coarse)").matches
        ? TreeZoomLevel.CloseUp
        : TreeZoomLevel.Fit;
}

export function isTreeZoomLevel(value: number): value is TreeZoomLevel {
    return Number.isInteger(value) && value in TreeZoomLevel;
}

export function getTreeZoomScaleValue(level: TreeZoomLevel): number {
    return TREE_ZOOM_SCALES[level] ?? TREE_ZOOM_SCALES[getDefaultTreeZoomLevel()];
}

function parseTreeZoomLevel(storedValue: string | null): TreeZoomLevel | null {
    if (storedValue === null) return null;
    const parsed = Number.parseInt(storedValue, 10);
    return isTreeZoomLevel(parsed) ? parsed : null;
}

function getTreeZoomLevel(): TreeZoomLevel {
    const stored = parseTreeZoomLevel(getItem("tree-zoom-scale"));
    if (stored !== null) {
        return stored;
    }

    return getDefaultTreeZoomLevel();
}

function setTreeZoomLevel(value: TreeZoomLevel) {
    setItem("tree-zoom-scale", String(value));
}

function createTreeZoomScaleStore() {
    const { subscribe, set } = writable(getTreeZoomLevel());
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
        set: (value: TreeZoomLevel) => {
            if (!isTreeZoomLevel(value)) return;
            setTreeZoomLevel(value);
            set(value);
            notifyChange();
        },
        resetToDefault: () => {
            const defaultValue = getDefaultTreeZoomLevel();
            setTreeZoomLevel(defaultValue);
            set(defaultValue);
            notifyChange();
        },
    };
}

export const treeZoomScale = createTreeZoomScaleStore();
