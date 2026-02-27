import { get } from "svelte/store";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme } from "./themeEngine";

/** Subscribe to both theme stores and reapply theme on any change. */
export function initThemeReactivity(): void {
    // Apply immediately with current values
    applyTheme(get(themeColor), get(darkMode) ? "dark" : "light");

    // Subscribe to future changes
    themeColor.subscribe((color) => {
        applyTheme(color, get(darkMode) ? "dark" : "light");
    });
    darkMode.subscribe((isDark) => {
        applyTheme(get(themeColor), isDark ? "dark" : "light");
    });
}
