import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/showTier\.subscribe\([\s\S]*?focusTreeInView\(false\)/.test(normalized)) {
    throw new Error(
        "Tree should refocus in view when showTier changes to apply updated bounds.",
    );
}

if (
    !/showSkillName\.subscribe\([\s\S]*?focusTreeInView\(false\)/.test(
        normalized,
    )
) {
    throw new Error(
        "Tree should refocus in view when showSkillName changes to apply updated bounds.",
    );
}
