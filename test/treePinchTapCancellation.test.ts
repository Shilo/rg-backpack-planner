import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");

if (!/let multiTouchGestureActive = false;/.test(source)) {
    throw new Error(
        "Tree should track whether a multi-touch gesture occurred during the active pointer sequence.",
    );
}

if (!/else if \(pointers\.size === 2\) \{[\s\S]*?multiTouchGestureActive = true;[\s\S]*?pinchStart = \{ distance, worldX: world\.x, worldY: world\.y, scale \};/m.test(source)) {
    throw new Error(
        "Tree should mark two-finger gestures as multi-touch before initializing pinch zoom state.",
    );
}

if (!/event\.pointerId === primaryPointerId &&[\s\S]*?!multiTouchGestureActive &&[\s\S]*?pointers\.size === 0/m.test(source)) {
    throw new Error(
        "Tree should not trigger node/root tap actions after a multi-touch gesture in the same interaction.",
    );
}

if (!/else if \(pointers\.size === 0\) \{[\s\S]*?multiTouchGestureActive = false;[\s\S]*?\}/m.test(source)) {
    throw new Error(
        "Tree should clear multi-touch gesture tracking after all pointers are released.",
    );
}
