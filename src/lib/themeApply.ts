import { get } from "svelte/store";
import type { ThemeColor } from "./themeColorStore";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme, oklchToHex } from "./themeEngine";

function syncThemeColorMeta(bgHex: string): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bgHex);
}

/** Subscribe to both theme stores and reapply theme on any change. */
export function initThemeReactivity(): () => void {
    function apply(color: ThemeColor, isDark: boolean) {
        applyTheme(color, isDark ? "dark" : "light");

        const neutralC = color.c * (isDark ? 0.14 : 0.12);
        const bgL = isDark ? 0.15 : 0.96;
        syncThemeColorMeta(oklchToHex(bgL, neutralC, color.h));
    }

    // Apply immediately with current values
    apply(get(themeColor), get(darkMode));

    // Subscribe to future changes
    const unsubscribeThemeColor = themeColor.subscribe((color) => {
        apply(color, get(darkMode));
    });
    const unsubscribeDarkMode = darkMode.subscribe((isDark) => {
        apply(get(themeColor), isDark);
    });

    return () => {
        unsubscribeThemeColor();
        unsubscribeDarkMode();
    };
}
