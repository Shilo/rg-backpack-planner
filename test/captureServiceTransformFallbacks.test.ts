import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (/cloneNode\(\s*true\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should avoid clone-based capture paths.",
    );
}

if (!/function withCaptureState<\w+>\(/.test(source)) {
    throw new Error(
        "captureService should wrap exports with capture state toggling.",
    );
}

if (!/rootEl\?\.classList\.add\(SNAPDOM_CAPTURE_CLASS\)/.test(normalized)) {
    throw new Error(
        "captureService should mark document root during capture to stabilize transitions.",
    );
}

if (!/rootEl\?\.classList\.remove\(SNAPDOM_CAPTURE_CLASS\)/.test(normalized)) {
    throw new Error(
        "captureService should remove capture state class after capture completes.",
    );
}

if (!/cache:\s*"disabled"\s+as const/.test(source)) {
    throw new Error(
        "captureService should disable snapdom cache for deterministic exports.",
    );
}
