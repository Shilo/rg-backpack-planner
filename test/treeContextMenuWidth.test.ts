import { readFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("  treeContextMenuWidth");

const treeContextMenuPath = resolve("src/lib/TreeContextMenu.svelte");
const treeContextMenuSource = readFileSync(treeContextMenuPath, "utf8");

if (!/\.menu-content\s*\{[\s\S]*width:\s*min-content;/.test(treeContextMenuSource)) {
    throw new Error(
        "TreeContextMenu should size its menu content to min-content so action descriptions can still wrap.",
    );
}

if (/\.menu-content\s*\{[\s\S]*width:\s*max-content;/.test(treeContextMenuSource)) {
    throw new Error(
        "TreeContextMenu should not keep a max-content width on the menu content.",
    );
}

if (/\.menu-content\s*\{[\s\S]*min-width:\s*15rem;/.test(treeContextMenuSource)) {
    throw new Error(
        "TreeContextMenu should not keep a hard 15rem minimum width when the menu should hug the special skill labels.",
    );
}

console.log("    ✓ TreeContextMenu uses min-content sizing for its menu content");
console.log("  ✓ treeContextMenuWidth\n");
