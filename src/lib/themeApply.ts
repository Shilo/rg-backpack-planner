import { get } from "svelte/store";
import { themeColor } from "./themeColorStore";
import { darkMode } from "./darkModeStore";
import { applyTheme, oklchToHex, BG_L, SURFACE_L } from "./themeEngine";

/**
 * Update the browser theme-color meta tag.
 *
 * Uses remove-then-create instead of setAttribute because Chrome Android's
 * standalone PWA mode does not reliably repaint the status bar when only the
 * content attribute is mutated on an existing element.
 *
 * Platform caveats:
 * - Android Chrome (dark mode): forces black status bar regardless of
 *   theme-color. Chromium bug https://issues.chromium.org/issues/40634649
 *   (filed 2019, still open). No web-platform workaround exists.
 * - iOS Safari 26+: ignores theme-color meta; derives bar color from the
 *   page's background-color. With black-translucent this is a non-issue
 *   since the bar is transparent and the body bg shows through.
 * - Samsung Internet: fully supports dynamic theme-color updates with no
 *   known dark-mode override.
 */
function syncThemeColorMeta(bgHex: string): void {
    const existing = document.querySelector('meta[name="theme-color"]');
    if (existing) existing.remove();

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = bgHex;
    document.head.appendChild(meta);
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
        const bgL = isDark ? BG_L.dark : BG_L.light;
        const surfaceL = isDark ? SURFACE_L.dark : SURFACE_L.light;
        // Approximate the radial gradient color near the status bar.
        // The gradient center (~50% viewport height) blends --surface into
        // --bg; at the top edge the color is roughly 85% --bg / 15% --surface.
        const themeL = bgL * 0.85 + surfaceL * 0.15;

        const doApply = () => {
            applyTheme(color, isDark ? "dark" : "light");
            syncThemeColorMeta(oklchToHex(themeL, neutralC, color.h));
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
