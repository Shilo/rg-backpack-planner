import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/import\s+\{\s*textSize\s*\}\s+from\s+"\.\/textSizeStore"/.test(source)) {
    throw new Error("Tree should import textSize store for bounds reactivity.");
}

if (!/void\s+\$textSize;/.test(source)) {
    throw new Error(
        "Tree scale/bounds computation should depend on $textSize so layout math recomputes on text-size changes.",
    );
}

if (!/textSize\.subscribe\([\s\S]*?focusTreeInView\(false\)/.test(normalized)) {
    throw new Error(
        "Tree should refocus in view when textSize changes to apply updated bounds.",
    );
}
