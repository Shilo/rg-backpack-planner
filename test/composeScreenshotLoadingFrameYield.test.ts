import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/ComposeScreenshotContent.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/function waitForNextPaint\(/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should define waitForNextPaint() so loading UI can paint before capture work starts.",
    );
}

if (
    !/isLoading\s*=\s*true\s*;[\s\S]*await\s+waitForNextPaint\(\s*\)\s*;[\s\S]*await\s+import\(\s*"\.\/buildImageExport\/captureService"\s*\)/.test(
        source,
    )
) {
    throw new Error(
        "ComposeScreenshotContent should await waitForNextPaint() after enabling loading state and before importing captureService.",
    );
}

