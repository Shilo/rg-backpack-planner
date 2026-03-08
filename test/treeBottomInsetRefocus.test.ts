import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (
    !/\$: if \(\s*hasMounted[\s\S]*?bottomInset\s*!==\s*lastAppliedBottomInset[\s\S]*?focusTreeInView\(false\)/.test(
        normalized,
    )
) {
    throw new Error(
        "Tree should re-focus in view when bottomInset changes after mount (for tab bar/text-size layout changes).",
    );
}
