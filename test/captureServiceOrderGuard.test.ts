import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");

// Extract the body of captureLiveTreeBlob for order checks
const fnMatch = source.match(
    /async function captureLiveTreeBlob\s*\([^)]*\)[^{]*\{([\s\S]*?)^}/m,
);
if (!fnMatch) {
    throw new Error(
        "captureService should define captureLiveTreeBlob.",
    );
}
// Strip single-line comments to avoid false matches on commented-out code
const fnBody = fnMatch[1].replace(/\/\/[^\n]*/g, "");

if (!/waitForStableTreeCanvas/.test(fnBody)) {
    throw new Error(
        "captureLiveTreeBlob should call waitForStableTreeCanvas before capturing.",
    );
}

if (!/focusActiveTreeForCapture/.test(fnBody)) {
    throw new Error(
        "captureLiveTreeBlob should call focusActiveTreeForCapture before capturing.",
    );
}

const waitPos = fnBody.indexOf("waitForStableTreeCanvas");
const focusPos = fnBody.indexOf("focusActiveTreeForCapture");

if (waitPos >= focusPos) {
    throw new Error(
        "captureLiveTreeBlob must call waitForStableTreeCanvas BEFORE focusActiveTreeForCapture " +
        "to ensure initializeView has settled before the focus-fit transform is applied.",
    );
}

const capturePos = fnBody.indexOf("snapdom.toBlob");
if (capturePos < focusPos) {
    throw new Error(
        "captureLiveTreeBlob must call focusActiveTreeForCapture BEFORE snapdom.toBlob.",
    );
}
