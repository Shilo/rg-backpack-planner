import { get } from "svelte/store";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme, oklchToHex } from "./themeEngine";

function syncThemeColorMeta(bgHex: string): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bgHex);
}

/** Subscribe to both theme stores and reapply theme on any change. */
export function initThemeReactivity(): void {
    function apply() {
        const color = get(themeColor);
        const isDark = get(darkMode);
        applyTheme(color, isDark ? "dark" : "light");

        const neutralC = color.c * (isDark ? 0.14 : 0.12);
        const bgL = isDark ? 0.15 : 0.96;
        syncThemeColorMeta(oklchToHex(bgL, neutralC, color.h));
    }

    apply();
    themeColor.subscribe(apply);
    darkMode.subscribe(apply);
}
