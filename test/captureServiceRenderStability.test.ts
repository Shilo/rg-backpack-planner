import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function waitForStableTreeCanvas\(/.test(source)) {
    throw new Error(
        "captureService should define waitForStableTreeCanvas() before snapshotting.",
    );
}

if (!/const CAPTURE_READY_MAX_FRAMES = \d+;/.test(source)) {
    throw new Error(
        "captureService should guard readiness with a max frame budget.",
    );
}

if (!/await waitForStableTreeCanvas\(\s*bridge\s*,\s*tabIndex\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should wait for stable tree DOM before calling snapdom.",
    );
}

if (!/await snapdom\.toBlob\(\s*captureRoot\s*,\s*SNAPDOM_OPTS\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should capture the live tree viewport/canvas directly with snapdom.toBlob.",
    );
}

if (!/await focusActiveTreeForCapture\(\s*bridge\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should focus-fit the active tree before capture to prevent clipping.",
    );
}
