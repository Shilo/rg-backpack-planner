/**
 * DOM and input helpers for use across tree, keyboard, and other utils.
 */

const FORM_FIELD_SELECTOR =
    "input, textarea, select, [contenteditable='true']";

/**
 * Returns true if the element is or is inside an input, textarea, select, or contenteditable.
 * Use to avoid handling keyboard shortcuts when the user is typing.
 */
export function isFormField(el: Element | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return !!el.closest(FORM_FIELD_SELECTOR);
}

/**
 * Returns true if the element can receive keyboard input (form field or contenteditable).
 * Alias for isFormField for use in keyboard/focus utils.
 */
export function isEditableElement(el: Element | null): boolean {
    return isFormField(el);
}

/**
 * Returns true when a full-screen overlay (e.g. onboarding tutorial) is active
 * and should block all other keyboard shortcuts.
 */
export function hasOnboardingOverlay(): boolean {
    return !!document.querySelector(".onboarding-overlay");
}

/**
 * Returns true when a keyboard shortcut should be handled: focus is inside root
 * (or on document/body) and the focused element is not a form field.
 * Use for tree-level shortcuts (e.g. Tab to cycle tabs, Backspace to reset).
 */
export function isKeyboardShortcutTarget(
    activeElement: Element | null,
    root: Element | null,
): boolean {
    if (!activeElement || !root) return false;
    const inRoot =
        root.contains(activeElement) ||
        activeElement === document.body ||
        activeElement === document.documentElement;
    if (!inRoot) return false;
    if (isFormField(activeElement)) return false;
    return true;
}
