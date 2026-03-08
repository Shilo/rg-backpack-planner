import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ColorPickerDialog.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/dismissFocusedTextEntryWithin/.test(source)) {
    throw new Error(
        "ColorPickerDialog should use shared text-entry dismissal logic for backdrop taps.",
    );
}

if (!/shouldIgnoreBackdropTapForKeyboardDismiss/.test(source)) {
    throw new Error(
        "ColorPickerDialog should also guard backdrop taps when mobile keyboard state is open.",
    );
}

// Implementation uses two branches: didDismissFocusedInput (with isTouch) and shouldIgnoreBackdropTapForKeyboardDismiss().
if (!/dismissFocusedTextEntryWithin\("\.color-picker-card"\)[\s\S]*?shouldIgnoreBackdropClick = true;[\s\S]*?isPointerDownOnBackdrop = false/.test(source)) {
    throw new Error(
        "ColorPickerDialog should set shouldIgnoreBackdropClick and isPointerDownOnBackdrop when dismissing text entry or keyboard.",
    );
}
if (!/shouldIgnoreBackdropTapForKeyboardDismiss\(\)[\s\S]*?shouldIgnoreBackdropClick = true;[\s\S]*?isPointerDownOnBackdrop = false/.test(source)) {
    throw new Error(
        "ColorPickerDialog should set shouldIgnoreBackdropClick and isPointerDownOnBackdrop when keyboard-dismiss heuristic applies.",
    );
}
