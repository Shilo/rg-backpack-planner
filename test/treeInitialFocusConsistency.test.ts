import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("src/App.svelte");
const source = readFileSync(appPath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (
    !/await initializeFromUrl\(\);[\s\S]*?await tick\(\);[\s\S]*?tabsRef\?\.focusActiveTreeInView\?\.\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "App initialization should refocus the active tree after URL/preset state settles.",
    );
}
