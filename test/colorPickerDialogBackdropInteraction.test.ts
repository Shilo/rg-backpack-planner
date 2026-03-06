import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ColorPickerDialog.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/let isPointerDownOnBackdrop = false;/.test(source)) {
    throw new Error(
        "ColorPickerDialog should track backdrop pointerdown state so close can happen on click (touch up).",
    );
}

if (
    !/function handleBackdropPointerDown\(event: PointerEvent\) \{[\s\S]*?isPointerDownOnBackdrop = event\.target === event\.currentTarget;[\s\S]*?if \(!isPointerDownOnBackdrop\) return;/m.test(
        source,
    )
) {
    throw new Error(
        "ColorPickerDialog pointerdown handler should only mark backdrop presses and avoid immediate close.",
    );
}

if (
    !/function handleBackdropClick\(event: MouseEvent\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?if \(event\.target !== event\.currentTarget \|\| !isPointerDownOnBackdrop\)/m.test(
        source,
    )
) {
    throw new Error(
        "ColorPickerDialog click handler should consume backdrop taps and close only after a valid backdrop pointerdown.",
    );
}

if (!/on:click={handleBackdropClick}/.test(source)) {
    throw new Error(
        "ColorPickerDialog backdrop should handle click events to close on touch up.",
    );
}

if (!/\.color-picker-backdrop\s*\{[\s\S]*?pointer-events:\s*auto;/m.test(source)) {
    throw new Error(
        "ColorPickerDialog transparent backdrop should explicitly consume pointer events.",
    );
}
