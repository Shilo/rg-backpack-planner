import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (/getTreeViewportPadding\(\{[^}]*hasLeveledNodes/.test(normalized)) {
    throw new Error(
        "Tree focus-fit padding should not depend on current leveled-node state, or center position drifts during leveling.",
    );
}

if (/level:\s*getLevelFrom\(\s*levels\s*,\s*index\s*\)/.test(normalized)) {
    throw new Error(
        "Tree focus-fit world bounds should not depend on per-node current levels, or center position drifts as levels change.",
    );
}
