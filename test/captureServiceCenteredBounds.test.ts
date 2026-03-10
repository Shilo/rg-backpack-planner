import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (/cloneNode\(\s*true\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should not clone the tree DOM anymore.",
    );
}

if (/createAndAttachOffscreenParent\(/.test(normalized)) {
    throw new Error(
        "captureService should not rely on offscreen parent containers for capture.",
    );
}

if (!/await cropBlobToContent\(\s*blob\s*\)/.test(normalized)) {
    throw new Error(
        "captureService should crop captures to non-transparent content after snapdom export.",
    );
}

if (!/function captureThreeTreeBlobs\(/.test(source)) {
    throw new Error(
        "captureService should define captureThreeTreeBlobs() for compose exports.",
    );
}

if (!/for \(let i = 0; i < NUM_TREES; i \+= 1\)/.test(normalized)) {
    throw new Error(
        "captureService should capture each tree tab with a simple sequential loop.",
    );
}
