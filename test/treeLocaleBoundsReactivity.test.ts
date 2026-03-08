import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/import\s+\{\s*locale\s*,\s*t\s*\}\s+from\s+"svelte-whisper"/.test(source)) {
    throw new Error(
        "Tree should import locale store so bounds can react to language changes.",
    );
}

if (
    !/locale\.subscribe\(\(\)\s*=>\s*\{[\s\S]*?if \(!\$showSkillName\)\s*return;[\s\S]*?if \(!allowReactiveFocus\)\s*return;[\s\S]*?focusTreeInView\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "Tree should refocus on locale changes only when showSkillName is enabled and reactive focus mode is active.",
    );
}
