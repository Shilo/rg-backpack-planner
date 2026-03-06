const NON_TEXT_INPUT_TYPES = new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
]);

function isTextEntryElement(element: Element): element is HTMLElement {
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLInputElement) {
        return !NON_TEXT_INPUT_TYPES.has(element.type);
    }
    return element instanceof HTMLElement && element.isContentEditable;
}

export function shouldIgnoreBackdropTapForKeyboardDismiss(): boolean {
    if (!window.matchMedia("(pointer: coarse)").matches) return false;

    const rootStyle = getComputedStyle(document.documentElement);
    const isKeyboardOpen =
        rootStyle.getPropertyValue("--is-keyboard-open").trim() === "1";
    if (isKeyboardOpen) return true;

    const keyboardHeight = Number.parseFloat(
        rootStyle.getPropertyValue("--keyboard-height"),
    );
    if (!Number.isNaN(keyboardHeight) && keyboardHeight > 0) return true;

    const viewport = window.visualViewport;
    if (!viewport) return false;

    const fallbackKeyboardHeight = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop),
    );
    return fallbackKeyboardHeight > 0;
}

export function dismissFocusedTextEntryWithin(containerSelector: string): boolean {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof Element) || !isTextEntryElement(activeElement)) {
        return false;
    }
    if (!activeElement.closest(containerSelector)) return false;

    activeElement.blur();
    return true;
}
