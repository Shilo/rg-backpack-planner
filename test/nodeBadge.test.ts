import { readFileSync } from "node:fs";

const nodeComponent = readFileSync(
    new URL("../src/lib/Node.svelte", import.meta.url),
    "utf8",
);

/* Implementation uses level badge with crown when isMaxed, not a separate star badge gated by state === "maxed". */

const starBadgeStillLeafGated =
    /\{#if\s+isLeaf\s*\}\s*<span class="node-badge node-badge-star"/m;

if (starBadgeStillLeafGated.test(nodeComponent)) {
    throw new Error(
        "Expected Node star badge logic to stop using leaf-only gating.",
    );
}
