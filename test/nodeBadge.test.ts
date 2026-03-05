import { readFileSync } from "node:fs";

const nodeComponent = readFileSync(
    new URL("../src/lib/Node.svelte", import.meta.url),
    "utf8",
);

const starBadgeUsesMaxedState =
    /\{#if\s+state\s*===\s*"maxed"\s*\}\s*<span class="node-badge node-badge-star"/m;

if (!starBadgeUsesMaxedState.test(nodeComponent)) {
    throw new Error(
        "Expected Node star badge to be shown when state is maxed.",
    );
}

const starBadgeStillLeafGated =
    /\{#if\s+isLeaf\s*\}\s*<span class="node-badge node-badge-star"/m;

if (starBadgeStillLeafGated.test(nodeComponent)) {
    throw new Error(
        "Expected Node star badge logic to stop using leaf-only gating.",
    );
}
