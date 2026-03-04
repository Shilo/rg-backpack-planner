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

/**
 * Scroll the nearest `.modal-shell` ancestor so that `inputEl` is
 * vertically centred within it.  Only scrolls when the input midpoint
 * is more than 1/4 of the shell's height away from the shell midpoint,
 * avoiding unnecessary jitter for inputs that are already in view.
 */
export function scrollInputVisible(inputEl: HTMLElement | null): void {
    if (!inputEl) return;
    const shell = inputEl.closest(".modal-shell");
    if (!shell) return;
    const shellRect = shell.getBoundingClientRect();
    const inputRect = inputEl.getBoundingClientRect();
    const inputMid = inputRect.top + inputRect.height / 2;
    const shellMid = shellRect.top + shellRect.height / 2;
    const offset = inputMid - shellMid;
    if (Math.abs(offset) > shellRect.height / 4) {
        shell.scrollBy({ top: offset, behavior: "smooth" });
    }
}

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
        const isKeyboardOpen = keyboardHeight > 0 ? 1 : 0;

        root.style.setProperty("--vv-height", `${vv.height}px`);
        root.style.setProperty("--vv-offset-top", `${vv.offsetTop}px`);
        root.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
        root.style.setProperty("--is-keyboard-open", `${isKeyboardOpen}`);
    }

    /**
     * In windowed-browser mode the browser already accounts for left/right
     * safe-area insets, but env(safe-area-inset-*) still returns non-zero
     * values.  Override --safe-left/--safe-right to 0px to prevent
     * double-spacing.  In fullscreen mode, remove the overrides so the
     * CSS :root env() values take effect.
     */
    function updateSafeArea() {
        if (document.fullscreenElement) {
            root.style.removeProperty("--safe-left");
            root.style.removeProperty("--safe-right");
        } else {
            root.style.setProperty("--safe-left", "0px");
            root.style.setProperty("--safe-right", "0px");
        }
    }

    if (vv) {
        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
    }

    // React to fullscreen changes
    document.addEventListener("fullscreenchange", updateSafeArea);

    let orientationTimer: ReturnType<typeof setTimeout> | undefined;
    const handleOrientation = () => {
        clearTimeout(orientationTimer);
        // Browsers may fire orientationchange before the reflow finishes;
        // debounce so the layout has settled before we re-measure.
        orientationTimer = setTimeout(update, 200);
    };
    window.addEventListener("orientationchange", handleOrientation);

    // Initial measurements
    update();
    updateSafeArea();

    teardown = () => {
        vv?.removeEventListener("resize", update);
        vv?.removeEventListener("scroll", update);
        document.removeEventListener("fullscreenchange", updateSafeArea);
        window.removeEventListener("orientationchange", handleOrientation);
        clearTimeout(orientationTimer);
        root.style.removeProperty("--vv-height");
        root.style.removeProperty("--vv-offset-top");
        root.style.removeProperty("--keyboard-height");
        root.style.removeProperty("--is-keyboard-open");
        root.style.removeProperty("--safe-left");
        root.style.removeProperty("--safe-right");
    };
}
