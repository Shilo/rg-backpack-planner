import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");

if (!/\$:\s*\{[\s\S]*?void\s+\$treeZoomScale;[\s\S]*?focusViewState\s*=\s*computeFocusViewState\(\);/.test(source)) {
    throw new Error(
        "Tree focusViewState reactive computation should depend on $treeZoomScale.",
    );
}

if (!/\$:\s*\{[\s\S]*?void\s+\$showSkillName;[\s\S]*?focusViewState\s*=\s*computeFocusViewState\(\);/.test(source)) {
    throw new Error(
        "Tree focusViewState reactive computation should depend on $showSkillName.",
    );
}

if (!/\$:\s*\{[\s\S]*?void\s+\$showTier;[\s\S]*?focusViewState\s*=\s*computeFocusViewState\(\);/.test(source)) {
    throw new Error(
        "Tree focusViewState reactive computation should depend on $showTier.",
    );
}
