import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");

if (!/on:dblclick=\{onDoubleClick\}/.test(source)) {
    throw new Error(
        "ImageViewer should reset pan/zoom when the viewport is double-clicked.",
    );
}

if (!/event\.pointerType === "touch"/.test(source)) {
    throw new Error(
        "ImageViewer should detect touch pointer taps for double-tap reset behavior.",
    );
}

if (!/event\.pointerType === "mouse" && event\.button === 1/.test(source)) {
    throw new Error(
        "ImageViewer should detect middle mouse button input for reset behavior.",
    );
}

if (!/resetToFit\(\);/.test(source)) {
    throw new Error(
        "ImageViewer should call resetToFit() when a reset interaction is detected.",
    );
}
