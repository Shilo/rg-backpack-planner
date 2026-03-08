/**
 * Overlay history: hooks into the browser back button (and iOS/Android back)
 * so that back closes modals/context menus instead of navigating away.
 *
 * When an overlay opens, call pushOverlay(closeCallback). When the user
 * closes it (e.g. tap outside, Escape), call popOverlay() before closing.
 * On back/popstate we pop the stack and run the close callback.
 *
 * We run in capture phase so we handle back before hashchange/other listeners.
 * We never modify the URL or hash so preview/build # URLs and back/forward
 * between previewed builds keep working. We rely on a unique state object so
 * the browser creates a new history entry. When other code (e.g. URL sync)
 * replaceState's the current entry, we re-push if the stack is non-empty.
 */

type CloseCallback = () => void;
const stack: CloseCallback[] = [];
let closingProgrammatically = false;
let overlayId = 0;

function makeOverlayState() {
    return { overlay: true as const, id: ++overlayId };
}

function onPopState() {
    if (closingProgrammatically) {
        closingProgrammatically = false;
        return;
    }
    const close = stack.pop();
    close?.();
    if (stack.length > 0) {
        const url = window.location.href;
        window.history.pushState(makeOverlayState(), "", url);
    }
}

if (typeof window !== "undefined") {
    window.addEventListener("popstate", onPopState, true);
}

/**
 * True when at least one overlay has pushed a history entry.
 * Other code (e.g. URL sync) should skip replaceState while this is true
 * so the back button closes the overlay instead of navigating away.
 */
export function hasOverlays(): boolean {
    return stack.length > 0;
}

/**
 * Call when opening an overlay (modal, context menu, etc.).
 * Pushes a history entry so the next back will close this overlay.
 */
export function pushOverlay(close: CloseCallback): void {
    const url = window.location.href;
    window.history.pushState(makeOverlayState(), "", url);
    stack.push(close);
}

/**
 * Call when closing an overlay by user action (not by back).
 * Pops the overlay from the stack and runs history.back() so the
 * stack stays in sync.
 * @param skipClose - If true, only pop stack and history.back(); do not run the close callback (use when you already closed and ran a different action, e.g. confirm).
 */
export function popOverlay(skipClose?: boolean): void {
    const close = stack.pop();
    if (close == null) return;
    closingProgrammatically = true;
    if (!skipClose) close();
    window.history.back();
}
