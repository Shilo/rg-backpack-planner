import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const nodePath = resolve("src/lib/Node.svelte");
const source = readFileSync(nodePath, "utf8");

if (!/font-size:\s*12px;/.test(source)) {
    throw new Error(
        "Node badge should use 12px font size for cross-platform stability.",
    );
}

if (!/font-weight:\s*bold;/.test(source)) {
    throw new Error("Node badge should use bold font weight.");
}

if (!/display:\s*inline-flex;/.test(source)) {
    throw new Error("Node badge should use inline-flex for stable text centering.");
}

if (!/align-items:\s*center;/.test(source)) {
    throw new Error(
        "Node badge should vertically center text with align-items: center.",
    );
}

if (!/justify-content:\s*center;/.test(source)) {
    throw new Error(
        "Node badge should horizontally center text with justify-content: center.",
    );
}

if (!/font-variant-numeric:\s*tabular-nums;/.test(source)) {
    throw new Error("Node badge should use tabular numerals for stable number widths.");
}

if (
    !/font-family:\s*system-ui,\s*-apple-system,\s*"Segoe UI",\s*sans-serif;/.test(
        source,
    )
) {
    throw new Error("Node badge should use an explicit system font stack.");
}
