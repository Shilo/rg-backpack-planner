import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ModalHost.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/let shouldIgnoreBackdropClick = false;/.test(source)) {
    throw new Error(
        "ModalHost should track when a backdrop tap is only dismissing the virtual keyboard.",
    );
}

if (
    !/dismissFocusedTextEntryWithin[\s\S]*shouldIgnoreBackdropTapForKeyboardDismiss[\s\S]*from "\.\/useBackdropTextEntryDismiss";/m.test(
        source,
    )
) {
    throw new Error(
        "ModalHost should use shared text-entry and keyboard-open dismissal logic for backdrop taps.",
    );
}

if (
    !/if \(shouldIgnoreBackdropClick\) \{\s*shouldIgnoreBackdropClick = false;\s*isMouseDownOnBackdrop = false;\s*return;\s*\}/m.test(
        source,
    )
) {
    throw new Error(
        "ModalHost should ignore the immediate backdrop click after keyboard-dismiss taps.",
    );
}

// Implementation: dismissKeyboardFromBackdropTap checks $modalStore, calls dismissFocusedTextEntryWithin,
// then either (didDismissFocusedInput + isTouch) or shouldIgnoreBackdropTapForKeyboardDismiss sets shouldIgnoreBackdropClick.
if (!/if \(!\$modalStore\) return false;/.test(source)) {
    throw new Error(
        "ModalHost should guard backdrop tap with $modalStore check.",
    );
}
if (!/dismissFocusedTextEntryWithin\("\.modal-shell"\)/.test(source)) {
    throw new Error(
        "ModalHost should dismiss focused text entry within .modal-shell on backdrop tap.",
    );
}
if (!/shouldIgnoreBackdropTapForKeyboardDismiss\(\)/.test(source)) {
    throw new Error(
        "ModalHost should use shouldIgnoreBackdropTapForKeyboardDismiss for keyboard-open heuristic.",
    );
}
if (!/shouldIgnoreBackdropClick = true;[\s\S]*?isMouseDownOnBackdrop = false/.test(source)) {
    throw new Error(
        "ModalHost should set shouldIgnoreBackdropClick and reset isMouseDownOnBackdrop when suppressing cancel.",
    );
}
