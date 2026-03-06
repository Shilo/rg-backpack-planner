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

if (
    !/if \(!\$modalStore\) return false;[\s\S]*?const didDismissFocusedInput = dismissFocusedTextEntryWithin\("\.modal-shell"\);[\s\S]*?if \(!didDismissFocusedInput && !shouldIgnoreBackdropTapForKeyboardDismiss\(\)\) \{\s*return false;\s*\}[\s\S]*?shouldIgnoreBackdropClick = true;[\s\S]*?isMouseDownOnBackdrop = false;/m.test(
        source,
    )
) {
    throw new Error(
        "ModalHost should suppress modal cancel for any open modal when focused text entry is dismissed or the mobile keyboard is reported open.",
    );
}
