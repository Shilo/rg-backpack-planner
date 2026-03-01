import { get } from "svelte/store";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme } from "./themeEngine";

let cleanupThemeReactivity: (() => void) | null = null;

/** Subscribe to both theme stores and reapply theme on any change. */
export function initThemeReactivity(): void {
    cleanupThemeReactivity?.();

    // Apply immediately with current values
    applyTheme(get(themeColor), get(darkMode) ? "dark" : "light");

    // Subscribe to future changes
    const unsubscribeThemeColor = themeColor.subscribe((color) => {
        applyTheme(color, get(darkMode) ? "dark" : "light");
    });
    const unsubscribeDarkMode = darkMode.subscribe((isDark) => {
        applyTheme(get(themeColor), isDark ? "dark" : "light");
    });

    cleanupThemeReactivity = () => {
        unsubscribeThemeColor();
        unsubscribeDarkMode();
        cleanupThemeReactivity = null;
    };
}

export function disposeThemeReactivity(): void {
    cleanupThemeReactivity?.();
}
