import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("src/lib/RootNodeQuickSettings.svelte");
const source = readFileSync(sourcePath, "utf8");

if (/shouldIgnoreBackdropClick/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should not rely on an initial backdrop-click suppression flag once root opening is moved to the correct input phase.",
    );
}

if (
    /<button[^>]*class="qs-backdrop"[^>]*aria-hidden="true"/m.test(source)
) {
    throw new Error(
        "RootNodeQuickSettings backdrop should not hide itself from assistive technology while it can still receive focus.",
    );
}

if (!/aria-label=\{\$t\("common\.close"\)\}/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings backdrop should use the existing common.close localization for its accessible label.",
    );
}

if (!/on:click(?:\|preventDefault)?=\{\(\) => onClose\?\.\(\)\}/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings backdrop should close directly on click once root opens after the triggering gesture completes.",
    );
}
