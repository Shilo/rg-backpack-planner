import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

/**
 * Notch-based text size (Android 16 style).
 * Scales from MIN to MAX in STEP (0.1) increments.
 */
export const BASE_FONT_SIZE_PX = 16;

export const TEXT_SIZE_SCALE_MIN = 0.8;
export const TEXT_SIZE_SCALE_MAX = 5.0;
export const TEXT_SIZE_SCALE_STEP = 0.1;

function buildTextSizeScales(): number[] {
    const scales: number[] = [];
    for (
        let s = TEXT_SIZE_SCALE_MIN;
        s <= TEXT_SIZE_SCALE_MAX + 1e-9;
        s += TEXT_SIZE_SCALE_STEP
    ) {
        scales.push(Math.round(s * 10) / 10);
    }
    return scales;
}

const TEXT_SIZE_SCALES = buildTextSizeScales();

export const TEXT_SIZE_NOTCH_MIN = 0;
export const TEXT_SIZE_NOTCH_MAX = TEXT_SIZE_SCALES.length - 1;

/** Notch index for scale 1 (default). */
const defaultNotchIndex = TEXT_SIZE_SCALES.findIndex(
    (scale) => scale >= 1 - 1e-9,
);
export const DEFAULT_TEXT_SIZE_NOTCH =
    defaultNotchIndex >= 0 ? defaultNotchIndex : Math.floor(TEXT_SIZE_SCALES.length / 2);

export function getTextSizeScale(notchIndex: number): number {
    const i = Math.max(
        TEXT_SIZE_NOTCH_MIN,
        Math.min(TEXT_SIZE_NOTCH_MAX, notchIndex),
    );
    return TEXT_SIZE_SCALES[i] ?? TEXT_SIZE_SCALES[DEFAULT_TEXT_SIZE_NOTCH];
}

export function isTextSizeNotchIndex(value: number): value is number {
    return (
        Number.isInteger(value) &&
        value >= TEXT_SIZE_NOTCH_MIN &&
        value <= TEXT_SIZE_NOTCH_MAX
    );
}

function parseStoredNotch(stored: string | null): number | null {
    if (stored === null) return null;
    const parsed = Number.parseInt(stored, 10);
    return isTextSizeNotchIndex(parsed) ? parsed : null;
}

function getTextSizeNotch(): number {
    const stored = parseStoredNotch(getItem("text-size"));
    return stored ?? DEFAULT_TEXT_SIZE_NOTCH;
}

function setTextSizeNotch(notch: number) {
    setItem("text-size", String(notch));
}

function applyTextSizeToDocument(notch: number): void {
    if (typeof document === "undefined") return;
    const scale = getTextSizeScale(notch);
    const root = document.documentElement;
    root.style.fontSize = `${BASE_FONT_SIZE_PX * scale}px`;
    root.style.setProperty("--text-scale", String(scale));
}

function createTextSizeStore() {
    const initialNotch = getTextSizeNotch();
    applyTextSizeToDocument(initialNotch);
    const { subscribe, set } = writable(initialNotch);

    subscribe(applyTextSizeToDocument);

    return {
        subscribe,
        set: (value: number) => {
            if (!isTextSizeNotchIndex(value)) return;
            setTextSizeNotch(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("text-size");
            setTextSizeNotch(DEFAULT_TEXT_SIZE_NOTCH);
            set(DEFAULT_TEXT_SIZE_NOTCH);
        },
    };
}

export const textSize = createTextSizeStore();
