import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageViewerPath = resolve("src/lib/ImageViewer.svelte");
const source = readFileSync(imageViewerPath, "utf8");

if (!/let multiTouchGestureActive = false;/.test(source)) {
    throw new Error(
        "ImageViewer should track multi-touch gesture state explicitly, like Tree, to keep pinch interactions out of the single-pointer pan path.",
    );
}

if (
    !/else if \(pointers\.size === 2\) \{[\s\S]*?multiTouchGestureActive = true;[\s\S]*?pinchStart = \{/m.test(
        source,
    )
) {
    throw new Error(
        "ImageViewer should mark two-finger interactions as multi-touch before initializing pinch state.",
    );
}

if (
    !/const dxTotal = event\.clientX - \(primaryStart\?\.x \?\? event\.clientX\);[\s\S]*?const dyTotal = event\.clientY - \(primaryStart\?\.y \?\? event\.clientY\);/m.test(
        source,
    )
) {
    throw new Error(
        "ImageViewer should use the primary pointer's original start position when deciding whether to arm pan, matching Tree's gesture threshold behavior.",
    );
}

if (
    !/event\.pointerType === "touch" &&[\s\S]*?!multiTouchGestureActive/m.test(
        source,
    )
) {
    throw new Error(
        "ImageViewer should suppress tap and double-tap handling after a multi-touch gesture in the same interaction.",
    );
}

if (
    !/else if \(pointers\.size === 0\) \{[\s\S]*?multiTouchGestureActive = false;[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "ImageViewer should only clear multi-touch gesture tracking after all pointers are released.",
    );
}
