import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function waitForStableTreeCanvas\(/.test(source)) {
    throw new Error(
        "captureService should define waitForStableTreeCanvas() to avoid capturing before tab render settles.",
    );
}

if (
    !/waitForStableTreeCanvas\(\s*bridge\s*,\s*tabIndex\s*\)/.test(
        normalized,
    )
) {
    throw new Error(
        "captureTreeImageByIndex should await waitForStableTreeCanvas(bridge, tabIndex) before cloning.",
    );
}

if (!/clone\.style\.inset\s*=\s*"auto"/.test(normalized)) {
    throw new Error(
        "captureService should clear clone inset so left/top offsets do not conflict with .tree-canvas inset styles.",
    );
}

if (!/clone\.style\.right\s*=\s*"auto"/.test(normalized)) {
    throw new Error(
        "captureService should clear clone right positioning to avoid stretch/cropping drift across browsers.",
    );
}

if (!/clone\.style\.bottom\s*=\s*"auto"/.test(normalized)) {
    throw new Error(
        "captureService should clear clone bottom positioning to avoid stretch/cropping drift across browsers.",
    );
}

if (!/function normalizeBadgeAnchorScale\(/.test(source)) {
    throw new Error(
        "captureService should normalize badge anchor scale so badge placement does not race against live zoom state.",
    );
}

if (!/normalizeBadgeAnchorScale\(\s*clone\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should normalize badge anchors on the capture clone before exporting.",
    );
}

if (!/parent\.style\.backgroundColor\s*=\s*"transparent"/.test(normalized)) {
    throw new Error(
        "captureService should explicitly force transparent offscreen parent background for mobile parity.",
    );
}

if (!/canvas\.getContext\(\s*"2d"\s*,\s*\{\s*alpha:\s*true\s*\}\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should request a 2D context with alpha enabled so combined PNG transparency is preserved.",
    );
}
