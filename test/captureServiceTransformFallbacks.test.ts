import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const captureServicePath = resolve("src/lib/buildImageExport/captureService.ts");
const source = readFileSync(captureServicePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/function removeTransientNodeFlashOverlays\(/.test(source)) {
    throw new Error(
        "captureService should define removeTransientNodeFlashOverlays() to prevent capture-only flash artifacts.",
    );
}

if (!/function addSnapdomPseudoElementGuardStyle\(/.test(source)) {
    throw new Error(
        "captureService should define addSnapdomPseudoElementGuardStyle() to prevent pseudo-element duplication artifacts.",
    );
}

if (!/\.node-badge-icon-stack/.test(source)) {
    throw new Error(
        "captureService should target .node-badge-icon-stack when normalizing badge scale for capture clones.",
    );
}

if (
    !/removeTransientNodeFlashOverlays\(\s*clone\s*\)/.test(normalized)
) {
    throw new Error(
        "prepareTreeCloneInParent should remove transient node flash overlays from the capture clone.",
    );
}

if (
    !/addSnapdomPseudoElementGuardStyle\(\s*clone\s*\)/.test(normalized)
) {
    throw new Error(
        "prepareTreeCloneInParent should inject the pseudo-element guard style into the capture clone.",
    );
}

if (!/cache:\s*"disabled"\s+as const/.test(source)) {
    throw new Error(
        "captureService should disable snapdom cache for deterministic export snapshots.",
    );
}

if (!/data-snapdom-pseudo="::before"/.test(source)) {
    throw new Error(
        "captureService pseudo guard style should target snapdom generated ::before pseudo spans.",
    );
}

if (!/data-snapdom-pseudo="::after"/.test(source)) {
    throw new Error(
        "captureService pseudo guard style should target snapdom generated ::after pseudo spans.",
    );
}

if (!/querySelectorAll<HTMLElement>\(\"\.node-flash\"\)/.test(source)) {
    throw new Error(
        "captureService should remove .node-flash overlays from the capture clone.",
    );
}
