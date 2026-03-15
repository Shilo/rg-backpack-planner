import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/RootNodeQuickSettings.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/const TOUCH_EXTRA_OFFSET_Y = 32;/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should add a larger touch-only vertical offset so it appears higher above the finger.",
    );
}

if (
    !/const offsetY = OFFSET_Y \+ \(isTouchPlatform \? TOUCH_EXTRA_OFFSET_Y : 0\);[\s\S]*?let py = y - rect\.height - offsetY;/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should position itself higher on touch platforms while keeping desktop spacing unchanged.",
    );
}
