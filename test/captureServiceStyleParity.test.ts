import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const captureServiceSource = readFileSync(captureServicePath, "utf8");
const captureServiceNormalized = captureServiceSource.replace(/\s+/g, " ");

if (/preserveNodeVisualStyles\(/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should not manually rewrite node styles when capturing live DOM.",
    );
}

if (/preserveTreeLinkStrokeStyles\(/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should not manually rewrite link styles when capturing live DOM.",
    );
}

if (!/const treeCanvas = await waitForStableTreeCanvas\(/.test(captureServiceNormalized)) {
    throw new Error(
        "captureService should capture from the current live tree canvas element.",
    );
}

if (
    !/exclude:\s*\[[^\]]*"\.tooltip"[^]*"\.overlay"[^]*\]/.test(
        captureServiceNormalized,
    )
) {
    throw new Error(
        "captureService should exclude transient overlays/tooltips from snapdom capture.",
    );
}
