import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buildImageExport/imageFormat.ts"),
    "utf8",
);

if (!/export const EXPORT_DPR\s*[=:]/.test(source)) {
    throw new Error("imageFormat.ts should export EXPORT_DPR.");
}

if (!/export const EXPORT_TARGET_LONG_EDGE_PX\s*[=:]/.test(source)) {
    throw new Error(
        "imageFormat.ts should export EXPORT_TARGET_LONG_EDGE_PX.",
    );
}

if (!/export const EXPORT_MAX_SCALE\s*[=:]/.test(source)) {
    throw new Error("imageFormat.ts should export EXPORT_MAX_SCALE.");
}
