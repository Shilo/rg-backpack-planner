import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");

if (/on:pointerleave=\{onPointerUp\}/.test(source)) {
    throw new Error(
        "ImageViewer should not treat pointerleave as pointer release because touches can drift outside the viewport during a pinch.",
    );
}

if (!/on:lostpointercapture=\{onLostPointerCapture\}/.test(source)) {
    throw new Error(
        "ImageViewer should recover gesture state when pointer capture is revoked unexpectedly.",
    );
}

if (!/function onLostPointerCapture\(event: PointerEvent\)/.test(source)) {
    throw new Error(
        "ImageViewer should define lost pointer capture cleanup for orphaned touch state.",
    );
}
