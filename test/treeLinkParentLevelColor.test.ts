import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");
const treeNormalized = treeSource.replace(/\s+/g, " ");

if (!/const parentLevel = link\.from === undefined \? 0 : getLevelFrom\(levels,\s*link\.from\);/.test(treeNormalized)) {
    throw new Error(
        "Tree link rendering should derive parentLevel from the link parent index.",
    );
}

if (!/const state = link\.from === undefined \|\| parentLevel > 0 \? to\.state : "locked";/.test(treeNormalized)) {
    throw new Error(
        "Tree links should allow root-first links and parent-level>0 links to use colored states.",
    );
}
