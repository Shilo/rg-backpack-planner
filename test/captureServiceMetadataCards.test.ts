import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buildImageExport/captureService.ts"),
    "utf8",
);

if (!/type CaptureTreeCard = \{[\s\S]*title: string;[\s\S]*techCrystalsSpent: string;[\s\S]*\}/.test(source)) {
    throw new Error(
        "captureService should define a tree metadata card type with title and tech crystal text.",
    );
}

if (!/type CaptureBuildCard = \{[\s\S]*techCrystalsSpent: string;[\s\S]*\}/.test(source)) {
    throw new Error(
        "captureService should define a combined build metadata card type.",
    );
}

if (!/function drawMetadataCard\(/.test(source)) {
    throw new Error(
        "captureService should draw screenshot labels through a unified drawMetadataCard helper.",
    );
}

if (!/function drawTechCrystalIcon\(/.test(source)) {
    throw new Error(
        "captureService should draw a tech crystal icon for metadata cards.",
    );
}

if (!/anchor:\s*"top-right"\s*\|\s*"bottom-right"/.test(source)) {
    throw new Error(
        "captureService metadata cards should support explicit top-right and bottom-right anchors.",
    );
}
