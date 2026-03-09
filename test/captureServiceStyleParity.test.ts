import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const captureServiceSource = readFileSync(captureServicePath, "utf8");
const captureServiceNormalized = captureServiceSource.replace(/\s+/g, " ");

if (/clone\.style\.filter\s*=\s*"none"/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should not clear clone filter styles, because that alters runtime visual parity.",
    );
}

if (/clone\.style\.boxShadow\s*=\s*"none"/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should not clear clone box shadows, because that alters runtime visual parity.",
    );
}

if (!/function syncCaptureBackground\(/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should define syncCaptureBackground() so captured trees keep runtime background context.",
    );
}

if (
    !/syncCaptureBackground\(\s*parent\s*,\s*element\s*\)/.test(
        captureServiceNormalized,
    )
) {
    throw new Error(
        "captureService should apply runtime background styles to the offscreen capture parent.",
    );
}

if (!/function preserveNodeVisualStyles\(/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should define preserveNodeVisualStyles() for node border/fill parity.",
    );
}

if (!/preserveNodeVisualStyles\([^)]*clone\s*\)/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should preserve computed node styles on the cloned tree before exporting.",
    );
}
