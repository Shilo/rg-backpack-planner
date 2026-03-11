import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function getImageContentBounds\(/.test(source)) {
    throw new Error(
        "captureService should compute non-transparent image bounds before trimming.",
    );
}

if (!/function cropBlobToContent\(/.test(source)) {
    throw new Error(
        "captureService should crop tree captures to content bounds.",
    );
}

if (!/canvas\.getContext\("2d", \{ alpha: true \}\)/.test(normalized)) {
    throw new Error(
        "captureService should use alpha-enabled canvas contexts so transparency and edge pixels are preserved.",
    );
}
