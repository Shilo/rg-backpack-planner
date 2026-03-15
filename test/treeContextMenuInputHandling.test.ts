import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (
    /function onContextMenu\(event: MouseEvent\) \{[\s\S]*?event\.button !== 2/m.test(
        treeSource,
    )
) {
    throw new Error(
        "Tree contextmenu handling should respond to the actual contextmenu event instead of assuming every valid secondary-action context menu reports button === 2.",
    );
}

const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");

if (
    /function openBackgroundMenu\(event: MouseEvent\) \{[\s\S]*?event\.button !== 2/m.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs background contextmenu handling should not reject valid secondary-action contextmenu events just because button metadata differs across devices.",
    );
}

if (
    /function openTabMenu\(event: MouseEvent, tab: TabConfig, index: number\) \{[\s\S]*?event\.button !== 2/m.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs tab contextmenu handling should use the contextmenu event itself instead of hard-coding button === 2.",
    );
}
