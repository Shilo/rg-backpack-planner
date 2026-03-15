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

if (!/let backdropHadPointerDown = false;/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should track whether the backdrop actually received the initiating press before closing.",
    );
}

if (!/function handleBackdropPointerDown\(event: PointerEvent\)/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should capture backdrop pointerdown so post-open synthetic events do not count as a real close request.",
    );
}

if (
    !/function handleBackdropClick\(event: MouseEvent\) \{[\s\S]*?if \(!backdropHadPointerDown\) return;[\s\S]*?onClose\?\.\(\);/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should only close on click after the backdrop itself received the initiating press.",
    );
}

if (
    !/function handleBackdropContextMenu\(event: MouseEvent\) \{[\s\S]*?if \(!backdropHadPointerDown\) return;[\s\S]*?onClose\?\.\(\);/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings should ignore synthetic contextmenu events unless the backdrop itself received the initiating press.",
    );
}

if (
    !/on:pointerdown=\{handleBackdropPointerDown\}[\s\S]*?on:pointerup=\{handleBackdropPointerUp\}[\s\S]*?on:click=\{handleBackdropClick\}[\s\S]*?on:contextmenu=\{handleBackdropContextMenu\}/m.test(
        source,
    )
) {
    throw new Error(
        "RootNodeQuickSettings backdrop should use the same pointerdown-backed close wiring as the other context surfaces.",
    );
}

if (/on:contextmenu\|preventDefault=\{\(\) => onClose\?\.\(\)\}/.test(source)) {
    throw new Error(
        "RootNodeQuickSettings should not close from a raw backdrop contextmenu handler without verifying the backdrop received the initiating press.",
    );
}
