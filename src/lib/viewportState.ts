/**
 * Centralised visual-viewport tracking.
 *
 * Publishes CSS custom properties on <html> so every fixed overlay
 * (modals, toasts, tooltips, color picker) can position itself within
 * the *visual* viewport — the rectangle actually visible to the user
 * when the on-screen keyboard or browser chrome is showing.
 *
 *   --vv-height        visual viewport height  (px)
 *   --vv-offset-top    visual viewport top offset from layout viewport (px)
 *   --keyboard-height  estimated on-screen keyboard height (px, 0 when closed)
 */

let teardown: (() => void) | null = null;

export function initViewportTracking(): void {
    if (teardown) return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    function update() {
        if (!vv) return;

        const keyboardHeight = Math.max(
            0,
            window.innerHeight - (vv.height + vv.offsetTop),
        );

        root.style.setProperty("--vv-height", `${vv.height}px`);
        root.style.setProperty("--vv-offset-top", `${vv.offsetTop}px`);
        root.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    }

    if (vv) {
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
    }

    let orientationTimer: ReturnType<typeof setTimeout> | undefined;
    const handleOrientation = () => {
        clearTimeout(orientationTimer);
        // Browsers may fire orientationchange before the reflow finishes;
        // debounce so the layout has settled before we re-measure.
        orientationTimer = setTimeout(update, 200);
    };
    window.addEventListener("orientationchange", handleOrientation);

    // Initial measurement
    update();

    teardown = () => {
        vv?.removeEventListener("resize", update);
        vv?.removeEventListener("scroll", update);
        window.removeEventListener("orientationchange", handleOrientation);
        clearTimeout(orientationTimer);
        root.style.removeProperty("--vv-height");
        root.style.removeProperty("--vv-offset-top");
        root.style.removeProperty("--keyboard-height");
    };
}
