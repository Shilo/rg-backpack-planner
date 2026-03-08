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

if (!/const CAPTURE_BOUNDS_PIXEL_BUFFER_PX = 2;/.test(source)) {
    throw new Error(
        "captureService should include a small pixel buffer when building export bounds.",
    );
}

if (!/const TREE_VISIBLE_BOUNDS = buildCenteredCaptureBounds\(\);/.test(source)) {
    throw new Error(
        "captureService should initialize TREE_VISIBLE_BOUNDS from buildCenteredCaptureBounds().",
    );
}
