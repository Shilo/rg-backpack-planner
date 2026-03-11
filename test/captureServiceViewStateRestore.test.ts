import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

// Verify getViewState is saved before the capture loop
const fnMatch = source.match(
    /async function captureThreeTreeBlobs\s*\([^)]*\)[^{]*\{([\s\S]*?)^}/m,
);
if (!fnMatch) {
    throw new Error(
        "captureService should define captureThreeTreeBlobs.",
    );
}
const fnBody = fnMatch[1];

if (!/bridge\.getViewState\?\.\(\)/.test(fnBody)) {
    throw new Error(
        "captureThreeTreeBlobs should save bridge.getViewState?.() before the capture loop.",
    );
}

const savedViewStatePos = fnBody.indexOf("bridge.getViewState?.()");
const loopPos = fnBody.indexOf("for (");

if (savedViewStatePos >= loopPos) {
    throw new Error(
        "captureThreeTreeBlobs should save view state BEFORE the capture loop starts.",
    );
}

// Verify restoreAfterCapture is called in finally
if (!/bridge\.restoreAfterCapture\b/.test(fnBody)) {
    throw new Error(
        "captureThreeTreeBlobs finally block should call bridge.restoreAfterCapture to restore the user view state.",
    );
}

const finallyMatch = fnBody.match(/finally\s*\{([\s\S]*?)\}\s*$/);
if (!finallyMatch) {
    throw new Error(
        "captureThreeTreeBlobs should have a finally block.",
    );
}
// Strip single-line comments to avoid false matches on commented-out code
const finallyBody = finallyMatch[1].replace(/\/\/[^\n]*/g, "");

if (!/bridge\.restoreAfterCapture\b/.test(finallyBody)) {
    throw new Error(
        "captureThreeTreeBlobs finally block must call bridge.restoreAfterCapture.",
    );
}

// Verify focusActiveTreeForCapture is NOT called in the finally block
if (/focusActiveTreeForCapture/.test(finallyBody)) {
    throw new Error(
        "captureThreeTreeBlobs finally block must NOT call focusActiveTreeForCapture — " +
        "doing so would override the restored user view state.",
    );
}
