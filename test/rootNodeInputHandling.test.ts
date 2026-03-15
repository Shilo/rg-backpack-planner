import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootNodePath = resolve("src/lib/RootNode.svelte");
const rootNodeSource = readFileSync(rootNodePath, "utf8");

if (!/function handleClick\(event: MouseEvent\)/.test(rootNodeSource)) {
    throw new Error(
        "RootNode should define a click handler so the native button controls root opening after the gesture completes.",
    );
}

if (!/on:click(?:\|stopPropagation)?=\{handleClick\}/.test(rootNodeSource)) {
    throw new Error(
        "RootNode should open quick settings from the native button click event.",
    );
}

if (!/function handleContextMenu\(event: MouseEvent\)/.test(rootNodeSource)) {
    throw new Error(
        "RootNode should define a dedicated contextmenu handler so right-click on the root always opens quick settings directly.",
    );
}

if (
    !/on:contextmenu\|preventDefault\|stopPropagation=\{handleContextMenu\}/.test(
        rootNodeSource,
    )
) {
    throw new Error(
        "RootNode should handle native contextmenu on the button itself instead of relying on outer tree routing.",
    );
}

if (/on:keydown=\{handleKeydown\}/.test(rootNodeSource)) {
    throw new Error(
        "RootNode should not duplicate native button activation with a custom keydown opener.",
    );
}

const treePath = resolve("src/lib/Tree.svelte");
const treeSource = readFileSync(treePath, "utf8");

if (
    /if \(pointer\.isRoot\) \{[\s\S]*?onRootNodeClick\(/m.test(treeSource)
) {
    throw new Error(
        "Tree pointerup should no longer open root quick settings directly once RootNode owns click/tap activation.",
    );
}

if (
    !/if \(!info\?\.isRoot\) \{\s*viewportEl\.setPointerCapture\(event\.pointerId\);\s*\}/m.test(
        treeSource,
    )
) {
    throw new Error(
        "Tree should skip pointer capture for root presses so the native root click/tap event can still fire.",
    );
}
