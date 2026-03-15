import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/TreeTabs.svelte");
const source = readFileSync(sourcePath, "utf8");

if (
    !/function isRootTarget\(target: EventTarget \| null\) \{[\s\S]*?const nodeEl = target\.closest\("\[data-node-id\]"\);[\s\S]*?const nodeId = nodeEl\.getAttribute\("data-node-id"\);[\s\S]*?return nodeId === "root";[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "TreeTabs should detect the root node separately from background presses.",
    );
}

if (
    !/function openRootQuickSettings\(x: number, y: number\) \{[\s\S]*?quickSettings = \{ x, y \};[\s\S]*?treeRef\?\.cancelGestures\?\.\(\);[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "TreeTabs should centralize opening root quick settings so every root interaction uses the same path.",
    );
}

if (
    !/const rootTarget = isRootTarget\(event\.target\);[\s\S]*?if \(rootTarget\) \{[\s\S]*?openRootQuickSettings\(point\.x, point\.y\);[\s\S]*?return true;[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "TreeTabs background long-press should open root quick settings instead of the tree context menu.",
    );
}

if (
    !/const rootTarget = isRootTarget\(event\.target\);[\s\S]*?if \(rootTarget\) \{[\s\S]*?openRootQuickSettings\(event\.clientX, event\.clientY\);[\s\S]*?return;[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "TreeTabs right-click handling should open root quick settings instead of the tree context menu.",
    );
}
