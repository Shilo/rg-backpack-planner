import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

export interface ThemeColor {
    h: number;
    c: number;
    l?: number;
}

/** Default source color: vibrant blue */
const DEFAULT_THEME_COLOR: ThemeColor = { h: 264, c: 0.19 };

function getThemeColor(): ThemeColor {
    const stored = getItem("theme-color");
    if (stored === null) return DEFAULT_THEME_COLOR;
    try {
        const parsed = JSON.parse(stored);
        if (
            typeof parsed.h === "number" &&
            typeof parsed.c === "number" &&
            parsed.h >= 0 &&
            parsed.h <= 360 &&
            parsed.c >= 0 &&
            parsed.c <= 0.5
        ) {
            const result: ThemeColor = { h: parsed.h, c: parsed.c };
            if (typeof parsed.l === "number" && parsed.l >= 0 && parsed.l <= 1) {
                result.l = parsed.l;
            }
            return result;
        }
    } catch {
        // ignore malformed data
    }
    return DEFAULT_THEME_COLOR;
}

function setThemeColor(value: ThemeColor) {
    setItem("theme-color", JSON.stringify(value));
}

function createThemeColorStore() {
    const { subscribe, set } = writable(getThemeColor());

    return {
        subscribe,
        set: (value: ThemeColor) => {
            setThemeColor(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("theme-color");
            setThemeColor(DEFAULT_THEME_COLOR);
            set(DEFAULT_THEME_COLOR);
        },
    };
}

export const themeColor = createThemeColorStore();
