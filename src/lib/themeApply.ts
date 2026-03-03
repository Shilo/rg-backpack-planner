import { get } from "svelte/store";
import type { ThemeColor } from "./themeColorStore";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme, oklchToHex } from "./themeEngine";

function syncThemeColorMeta(bgHex: string): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bgHex);
}

const TRANSITION_CLASS = "theme-transitioning";
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function applyWithTransition(fn: () => void): void {
    const root = document.documentElement;
    // Clear any pending removal so rapid calls don't cut the animation short
    if (transitionTimer !== null) clearTimeout(transitionTimer);
    root.classList.add(TRANSITION_CLASS);
    fn();
    // Remove after the transition window (keep in sync with --theme-switch-duration)
    transitionTimer = setTimeout(() => {
        root.classList.remove(TRANSITION_CLASS);
        transitionTimer = null;
    }, 400);
}

/** Subscribe to both theme stores and reapply theme on any change. */
export function initThemeReactivity(): () => void {
    // Transitions are disabled until after the first frame so that initial
    // subscription callbacks (which fire synchronously) don't flash.
    let ready = false;
    requestAnimationFrame(() => {
        ready = true;
    });

    function apply() {
        const color = get(themeColor);
        const isDark = get(darkMode);

        const neutralC = color.c * (isDark ? 0.14 : 0.12);
        const bgL = isDark ? 0.15 : 0.96;

        const doApply = () => {
            applyTheme(color, isDark ? "dark" : "light");
            syncThemeColorMeta(oklchToHex(bgL, neutralC, color.h));
        };

        if (ready) {
            applyWithTransition(doApply);
        } else {
            doApply();
        }
    }

    // Apply immediately with current values
    apply();

    // Subscribe to future changes
    const unsubscribeThemeColor = themeColor.subscribe(apply);
    const unsubscribeDarkMode = darkMode.subscribe(apply);

    return () => {
        unsubscribeThemeColor();
        unsubscribeDarkMode();
    };
}
