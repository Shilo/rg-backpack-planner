import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const captureServiceSource = readFileSync(captureServicePath, "utf8");
const captureServiceNormalized = captureServiceSource.replace(/\s+/g, " ");

const captureStylesPath = resolve("src/lib/buildImageExport/captureStyles.css");
const captureStylesSource = readFileSync(captureStylesPath, "utf8");
const captureStylesNormalized = captureStylesSource.replace(/\s+/g, " ");

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

if (!/html\.snapdom-capture\s+\.node-flash\s*\{[^}]*display:\s*none\s*!important/.test(captureStylesNormalized)) {
    throw new Error(
        "captureStyles.css should hide .node-flash elements during capture (display: none !important) to prevent mid-animation flash artifacts.",
    );
}
