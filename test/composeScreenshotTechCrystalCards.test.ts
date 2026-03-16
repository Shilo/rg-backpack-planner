import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/ComposeScreenshotContent.svelte"),
    "utf8",
);
const normalized = source.replace(/\s+/g, " ");

if (!/import\s*\{\s*formatNumber,\s*t\s*\}\s*from\s*"svelte-whisper"/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should import formatNumber for tech crystal screenshot cards.",
    );
}

if (!/techCrystalsSpent,\s*techCrystalsSpentGuardian,\s*techCrystalsSpentVanguard,\s*techCrystalsSpentCannon/.test(source)) {
    throw new Error(
        "ComposeScreenshotContent should read total and per-tree tech crystal stores for screenshot cards.",
    );
}

if (!/treeCards:\s*\[/.test(normalized) || !/buildCard:\s*\{/.test(normalized)) {
    throw new Error(
        "ComposeScreenshotContent should pass treeCards and buildCard metadata into captureAllTreeImages.",
    );
}

if (
    !/formatNumber\(\$techCrystalsSpentGuardian\)/.test(source) ||
    !/formatNumber\(\$techCrystalsSpentVanguard\)/.test(source) ||
    !/formatNumber\(\$techCrystalsSpentCannon\)/.test(source) ||
    !/formatNumber\(\$techCrystalsSpent\)/.test(source)
) {
    throw new Error(
        "ComposeScreenshotContent should format each screenshot tech crystal amount with formatNumber.",
    );
}

if (
    !/\$techCrystalsSpentGuardian > 0\s*\?\s*formatNumber\(\$techCrystalsSpentGuardian\)\s*:\s*undefined/.test(source) ||
    !/\$techCrystalsSpentVanguard > 0\s*\?\s*formatNumber\(\$techCrystalsSpentVanguard\)\s*:\s*undefined/.test(source) ||
    !/\$techCrystalsSpentCannon > 0\s*\?\s*formatNumber\(\$techCrystalsSpentCannon\)\s*:\s*undefined/.test(source) ||
    !/\$techCrystalsSpent > 0\s*\?\s*formatNumber\(\$techCrystalsSpent\)\s*:\s*undefined/.test(source)
) {
    throw new Error(
        "ComposeScreenshotContent should omit zero-tech-crystal screenshot rows instead of formatting them as visible zero values.",
    );
}
