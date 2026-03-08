import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treePath = resolve("src/lib/Tree.svelte");
const source = readFileSync(treePath, "utf8");
const normalized = source.replace(/\s+/g, " ");

if (!/let\s+allowReactiveFocus\s*=\s*false;/.test(source)) {
    throw new Error(
        "Tree should track whether reactive focus-in-view behavior is currently allowed.",
    );
}

if (!/export function focusTreeInView[\s\S]*?allowReactiveFocus\s*=\s*true;/.test(source)) {
    throw new Error(
        "Focusing in view should enable reactive focus updates for future layout changes.",
    );
}

if (!/function onWheel[\s\S]*?allowReactiveFocus\s*=\s*false;/.test(source)) {
    throw new Error(
        "Manual wheel zoom should disable reactive focus updates.",
    );
}

if (
    !/function onPointerMove[\s\S]*?panActive[\s\S]*?allowReactiveFocus\s*=\s*false;/.test(
        source,
    )
) {
    throw new Error(
        "Manual panning should disable reactive focus updates.",
    );
}

if (
    !/function onPointerMove[\s\S]*?pointers\.size === 2[\s\S]*?allowReactiveFocus\s*=\s*false;/.test(
        source,
    )
) {
    throw new Error(
        "Manual pinch zoom should disable reactive focus updates.",
    );
}

if (
    !/\$: if \(hasMounted && bottomInset !== lastAppliedBottomInset\)\s*\{[\s\S]*?if \(allowReactiveFocus\)\s*\{[\s\S]*?focusTreeInView\(false\);[\s\S]*?\}/.test(
        normalized,
    )
) {
    throw new Error(
        "Reactive bottom inset refocus should only run when reactive focus mode is enabled.",
    );
}

if (
    !/textSize\.subscribe\(\(\)\s*=>\s*\{[\s\S]*?if \(!allowReactiveFocus\)\s*return;[\s\S]*?focusTreeInView\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "Reactive text-size refocus should be gated by reactive focus mode.",
    );
}

if (
    !/showTier\.subscribe\(\(\)\s*=>\s*\{[\s\S]*?if \(!allowReactiveFocus\)\s*return;[\s\S]*?focusTreeInView\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "Reactive showTier refocus should be gated by reactive focus mode.",
    );
}

if (
    !/showSkillName\.subscribe\(\(\)\s*=>\s*\{[\s\S]*?if \(!allowReactiveFocus\)\s*return;[\s\S]*?focusTreeInView\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "Reactive showSkillName refocus should be gated by reactive focus mode.",
    );
}

if (
    !/treeZoomScale\.setOnChange\(\(\)\s*=>\s*\{[\s\S]*?focusTreeInView\(false\);/.test(
        normalized,
    )
) {
    throw new Error(
        "Tree zoom mode changes should always refocus in view.",
    );
}
