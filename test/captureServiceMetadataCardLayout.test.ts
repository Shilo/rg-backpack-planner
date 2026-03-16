import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buildImageExport/captureService.ts"),
    "utf8",
);
const normalized = source.replace(/\s+/g, " ");

if (/const margin = Math\.round\(fontSize \* 0\.6\)/.test(source)) {
    throw new Error(
        "captureService should not rely on the old oversized fixed label margin for metadata cards.",
    );
}

if (
    !/function measureMetadataCard\(/.test(source) ||
    !/function computeMetadataCardPlacement\(/.test(source)
) {
    throw new Error(
        "captureService should measure metadata cards and compute their placement before drawing them.",
    );
}

if (!/if \(combined && textOptions\?\.buildCard\)/.test(normalized)) {
    throw new Error(
        "captureService should add the combined build metadata card whenever label text options are provided.",
    );
}

if (!/textOptions\.buildCard\.techCrystalsSpent/.test(source)) {
    throw new Error(
        "captureService should render total build tech crystals from the build card payload.",
    );
}
