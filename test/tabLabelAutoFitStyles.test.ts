import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const treeTabsPath = resolve("src/lib/TreeTabs.svelte");
const treeTabsSource = readFileSync(treeTabsPath, "utf8");

const tabBarPath = resolve("src/lib/TabBar.svelte");
const tabBarSource = readFileSync(tabBarPath, "utf8");

if (/@container\s+tab\s*\([^)]*var\(--text-scale/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs should not use var(--text-scale) in @container query conditions because those conditions are ignored by browsers.",
    );
}

if (/text-overflow:\s*ellipsis;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs tab labels should not ellipsize; labels should wrap or scale down instead of truncating.",
    );
}

if (/white-space:\s*nowrap;/.test(treeTabsSource)) {
    throw new Error(
        "TreeTabs tab labels should not force nowrap; labels should be allowed to wrap on narrow tabs.",
    );
}

if (/@container\s+tab-bar-tab\s*\([^)]*var\(--text-scale/.test(tabBarSource)) {
    throw new Error(
        "TabBar should not use var(--text-scale) in @container query conditions because those conditions are ignored by browsers.",
    );
}

if (!/font-size:\s*clamp\(/.test(tabBarSource)) {
    throw new Error(
        "TabBar tab labels should use clamp() based fluid sizing for narrow containers and larger text scales.",
    );
}

if (!/overflow-wrap:\s*anywhere;/.test(tabBarSource)) {
    throw new Error(
        "TabBar tab labels should use overflow-wrap:anywhere to avoid truncation on narrow tabs.",
    );
}
