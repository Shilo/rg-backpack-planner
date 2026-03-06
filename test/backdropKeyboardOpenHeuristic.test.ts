import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/useBackdropTextEntryDismiss.ts");
const source = readFileSync(sourcePath, "utf8");

if (!/export function shouldIgnoreBackdropTapForKeyboardDismiss\(\): boolean/.test(source)) {
    throw new Error(
        "Backdrop dismissal helper should expose a keyboard-open heuristic for touch devices.",
    );
}

if (!/window\.matchMedia\("\(pointer: coarse\)"\)\.matches/.test(source)) {
    throw new Error(
        "Keyboard-open heuristic should be limited to coarse-pointer devices.",
    );
}

if (
    !/getPropertyValue\("--is-keyboard-open"\)/.test(source) &&
    !/window\.innerHeight - \(viewport\.height \+ viewport\.offsetTop\)/.test(source)
) {
    throw new Error(
        "Keyboard-open heuristic should read keyboard visibility from viewport state.",
    );
}
