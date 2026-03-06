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

if (
    !/if \(\s*dismissFocusedTextEntryWithin\("\.color-picker-card"\)\s*\|\|\s*shouldIgnoreBackdropTapForKeyboardDismiss\(\)\s*\)\s*\{[\s\S]*?shouldIgnoreBackdropClick = true;[\s\S]*?isPointerDownOnBackdrop = false;[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "ColorPickerDialog should suppress backdrop close when dismissing focused text entry or when mobile keyboard state is open.",
    );
}
