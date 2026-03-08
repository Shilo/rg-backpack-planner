import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/TREE_BADGE_VERTICAL_OVERFLOW_PX/.test(source)) {
    throw new Error(
        "captureService should use shared tree badge overflow constants for export bounds.",
    );
}

if (!/from "\.\.\/treeLayout"/.test(source)) {
    throw new Error(
        "captureService should import badge overflow constants from treeLayout.",
    );
}

if (!/const fallbackHeight = 694 \+ TREE_BADGE_VERTICAL_OVERFLOW_PX/.test(normalized)) {
    throw new Error(
        "captureService fallback export height should include bottom badge overflow padding.",
    );
}
