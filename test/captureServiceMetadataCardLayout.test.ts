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

if (!/if \(!titleText && !valueText\) \{\s*return null;?\s*\}/.test(source)) {
    throw new Error(
        "captureService should skip measuring and drawing metadata cards when both the title and tech crystal row are absent.",
    );
}

if (!/\(titleText && valueText \? titleFontSize \+ rowGap : 0\)/.test(source)) {
    throw new Error(
        "captureService should only add title-to-value spacing when both metadata rows are present.",
    );
}

if (!/if \(metrics\.valueText\) \{[\s\S]*drawTechCrystalIcon\(/.test(source)) {
    throw new Error(
        "captureService should draw the tech crystal row only when that row has content.",
    );
}
