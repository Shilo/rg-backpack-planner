import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function clampOffsets\(/.test(source)) {
    throw new Error("ImageViewer should define clampOffsets().");
}

if (
    !/contentW <= viewportWidth && contentH <= viewportHeight/.test(normalized)
) {
    throw new Error(
        "ImageViewer should lock pan at fit scale when both axes fit in the viewport.",
    );
}

if (!/x: \(viewportWidth - contentW\) \/ 2/.test(normalized)) {
    throw new Error(
        "ImageViewer should center-fit horizontal offset using (viewportWidth - contentW) / 2.",
    );
}

if (!/y: \(viewportHeight - contentH\) \/ 2/.test(normalized)) {
    throw new Error(
        "ImageViewer should center-fit vertical offset using (viewportHeight - contentH) / 2.",
    );
}

if (!/contentW <= viewportWidth \? \(viewportWidth - contentW\) \/ 2/.test(normalized)) {
    throw new Error(
        "ImageViewer should lock horizontal pan to centered position when image width fits viewport.",
    );
}

if (!/contentH <= viewportHeight \? \(viewportHeight - contentH\) \/ 2/.test(normalized)) {
    throw new Error(
        "ImageViewer should lock vertical pan to centered position when image height fits viewport.",
    );
}
