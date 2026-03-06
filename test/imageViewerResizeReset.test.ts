import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/const previousViewportWidth = viewportWidth/.test(source)) {
    throw new Error(
        "ImageViewer resize handling should compare against the previous viewport width.",
    );
}

if (!/const previousViewportHeight = viewportHeight/.test(source)) {
    throw new Error(
        "ImageViewer resize handling should compare against the previous viewport height.",
    );
}

if (!/const sizeChanged =/.test(source)) {
    throw new Error(
        "ImageViewer should detect whether viewport size actually changed.",
    );
}

if (
    !/if\s*\(\s*sizeChanged\s*\)\s*\{\s*resetToFit\(\);\s*return;\s*\}/.test(
        normalized,
    )
) {
    throw new Error(
        "ImageViewer should reset pan/zoom to fit when viewport size changes.",
    );
}
