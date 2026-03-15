import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");

if (
    !/function isRootTarget\(target: EventTarget \| null\) \{[\s\S]*?return nodeId === "root";[\s\S]*?\}/m.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs should still detect the root separately from regular nodes.",
    );
}

if (
    !/function startBackgroundPress\(event: PointerEvent\) \{[\s\S]*?isRootTarget\(event\.target\)[\s\S]*?\)\s*return;/m.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs background long-press should ignore the root so root interactions are handled by the dedicated root logic.",
    );
}

if (
    !/function openBackgroundMenu\(event: MouseEvent\) \{[\s\S]*?isRootTarget\(event\.target\)[\s\S]*?\)\s*return;/m.test(
        treeTabsSource,
    )
) {
    throw new Error(
        "TreeTabs background context-menu handling should ignore the root so it never opens the old tree menu.",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (!/function startRootLongPress\(pointerId: number\)/.test(treeSource)) {
    throw new Error(
        "Tree should define a dedicated root long-press path that matches node-menu long-press behavior.",
    );
}

if (
    !/function startRootLongPress\(pointerId: number\) \{[\s\S]*?startLongPress\(longPressState, \(\) => \{[\s\S]*?suppressNextPointerUp\(pointerId\);[\s\S]*?openRootQuickSettings\(/m.test(
        treeSource,
    )
) {
    throw new Error(
        "Tree root long-press should reuse the same startLongPress and suppressNextPointerUp flow as node menus.",
    );
}

if (
    !/if \([\s\S]*?info[\s\S]*?!info\.isRoot[\s\S]*?info\.index !== null[\s\S]*?\) \{[\s\S]*?startNodeLongPress\(event\.pointerId\);[\s\S]*?\} else if \(info && info\.isRoot\) \{[\s\S]*?startRootLongPress\(event\.pointerId\);/m.test(
        treeSource,
    )
) {
    throw new Error(
        "Tree should route root long-press through the dedicated root long-press handler instead of the background handler.",
    );
}

if (
    !/function onContextMenu\(event: MouseEvent\) \{[\s\S]*?if \(!info\) return;[\s\S]*?if \(info\.isRoot\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?openRootQuickSettings\(/m.test(
        treeSource,
    )
) {
    throw new Error(
        "Tree right-click handling should open root quick settings directly.",
    );
}
