import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");

if (!/<slot \/>/.test(source)) {
    throw new Error(
        "ImageViewer should expose a slot so compose overlays can share its gesture surface.",
    );
}

if (
    !/pointers\.size === 0 && isGestureIgnoredTarget\(event\.target\)/.test(
        source,
    )
) {
    throw new Error(
        "ImageViewer should ignore first-touch overlay button presses instead of starting a pan gesture.",
    );
}

if (!/if \(!pointers\.has\(event\.pointerId\)\) return;/.test(source)) {
    throw new Error(
        "ImageViewer should ignore pointerup events for untracked overlay touches.",
    );
}
