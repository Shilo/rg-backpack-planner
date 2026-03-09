import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/import \{ baseTree \} from "\.\.\/\.\.\/config\/baseTree";/.test(source)) {
    throw new Error(
        "captureService should derive capture bounds from baseTree coordinates.",
    );
}

if (!/function buildCenteredCaptureBounds\(\): TreeCaptureBounds/.test(source)) {
    throw new Error("captureService should define buildCenteredCaptureBounds().");
}

if (
    !/getTreeWorldBounds\(nodes, \{ showSkillName: true, showTier: true,? \}\)/.test(
        normalized,
    )
) {
    throw new Error(
        "captureService should derive bounds using getTreeWorldBounds with skill name and tier badges enabled.",
    );
}

if (!/CAPTURE_BOUNDS_CROP_PX/.test(source)) {
    throw new Error(
        "captureService should define CAPTURE_BOUNDS_CROP_PX for bounds control.",
    );
}

if (!/const TREE_VISIBLE_BOUNDS = buildCenteredCaptureBounds\(\);/.test(source)) {
    throw new Error(
        "captureService should initialize TREE_VISIBLE_BOUNDS from buildCenteredCaptureBounds().",
    );
}
