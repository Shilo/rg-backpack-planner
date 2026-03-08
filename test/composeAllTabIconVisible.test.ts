import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const composeSource = readFileSync(
    resolve("src/lib/ComposeScreenshotContent.svelte"),
    "utf8",
);
const tabBarSource = readFileSync(resolve("src/lib/TabBar.svelte"), "utf8");

if (
    !/\{\s*id:\s*"all"[\s\S]*?label:\s*""[\s\S]*?icon:\s*SquaresFourIcon[\s\S]*?\}/.test(
        composeSource,
    )
) {
    throw new Error(
        'ComposeScreenshotContent should keep an icon-only "all" tab (empty label + icon).',
    );
}

if (!/tab-bar__tab-icon--always-visible/.test(tabBarSource)) {
    throw new Error(
        "TabBar should mark icon-only tabs with a class so narrow-width icon hiding does not remove their icon.",
    );
}

if (
    !/@container\s+tab-bar-tab\s*\(max-width:\s*72px\)\s*\{[\s\S]*tab-bar__tab-icon:not\(\.tab-bar__tab-icon--always-visible\)[\s\S]*display:\s*none;[\s\S]*\}/.test(
        tabBarSource,
    )
) {
    throw new Error(
        "TabBar should only hide icons at narrow widths when the icon is not marked as always-visible.",
    );
}
