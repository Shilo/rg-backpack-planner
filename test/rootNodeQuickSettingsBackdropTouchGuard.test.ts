import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/RootNodeQuickSettings.svelte");
const source = readFileSync(sourcePath, "utf8");

if (!/let shouldIgnoreBackdropClick = false;/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should track when the first touch-open backdrop click needs to be ignored.",
    );
}

if (
    !/\$: if \(isOpen && !wasOpen\) \{[\s\S]*?shouldIgnoreBackdropClick = isTouchPlatform;[\s\S]*?tick\(\)\.then\(updatePosition\);/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should ignore the first backdrop click after opening on touch platforms.",
    );
}

if (
    !/\$: if \(!isOpen && wasOpen\) \{[\s\S]*?shouldIgnoreBackdropClick = false;[\s\S]*?\}/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should clear the initial backdrop-click guard when quick settings closes.",
    );
}

if (
    !/function handleBackdropClick\(event: MouseEvent\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?if \(shouldIgnoreBackdropClick\) \{[\s\S]*?shouldIgnoreBackdropClick = false;[\s\S]*?return;[\s\S]*?\}[\s\S]*?onClose\?\.\(\);/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings backdrop click handler should consume the synthetic touch click before allowing close.",
    );
}

if (!/on:click=\{handleBackdropClick\}/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings backdrop should use handleBackdropClick so touch-open synthetic clicks do not immediately close it.",
    );
}
