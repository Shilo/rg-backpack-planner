<script lang="ts" context="module">
    export type NodeState = "locked" | "available" | "active" | "maxed";
</script>

<script lang="ts">
    import {
        CheckCircleIcon,
        CrownIcon,
        LockIcon,
        PlusIcon,
    } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { formatNumber } from "./mathUtil";

    export let id: number;
    export let x: number = 0;
    export let y: number = 0;
    export let label: string = "";
    export let level: number = 0;
    export let state: NodeState = "locked";
    export let radius: number = 1;
    export let scale: number = 1;
    export let region: "top-left" | "bottom-left" | "right" = "right";
    export let isLeaf: boolean = false;

    const stateIcons = {
        locked: LockIcon,
        available: PlusIcon,
        active: CheckCircleIcon,
        maxed: CrownIcon,
    } as const;

    $: NodeIcon = stateIcons[state] ?? LockIcon;
</script>

<div class="node-wrapper" style="left: {x}px; top: {y}px;">
    <Button
        class={`node ${state} region-${region} ${isLeaf ? "node-hexagon" : ""}`}
        aria-label={label || String(id)}
        data-node-id={String(id)}
        icon={NodeIcon}
        iconClass="node-icon"
        style={`width: ${64 * radius}px; height: ${64 * radius}px; --icon-scale: ${radius};`}
    >
        {#if level > 0}
            <span
                class="node-level"
                style={`transform: translate(-50%, 50%) scale(${1 / scale});`}
                >{formatNumber(level)}</span
            >
        {/if}
    </Button>
</div>

<style>
    .node-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
    }

    /* CSS Custom Properties - All color variables defined here */
    :global(.button.node) {
        /* Filter values for unleveled states */
        --filter-locked: var(--brightness-dim);
        --filter-available: var(--brightness-available);

        /* Locked state colors (grayscale, same for all regions) */
        --bg-locked: var(--node-locked-bg);
        --border-color-locked: var(--node-locked-border);
        --text-color-locked: var(--node-locked-text);

        /* Default region color variables (blue accent) */
        --bg-available: color-mix(in srgb, var(--accent) 18%, color-mix(in srgb, var(--bg) 70%, var(--surface)));
        --bg-active: color-mix(in srgb, var(--accent) 28%, color-mix(in srgb, var(--bg) 40%, var(--surface)));
        --bg-maxed: color-mix(in srgb, var(--accent-light) 35%, var(--surface));
        --border-color: var(--accent);
        --border-color-active: var(--accent-light);
        --border-color-maxed: var(--accent-light);
        --text-color: color-mix(in srgb, var(--accent) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-light) 45%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-light) 35%, white);
        --hex-bg: color-mix(in srgb, var(--accent) 8%, var(--surface));

        /* Base node styles */
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: var(--radius-full);
        border: 2px solid transparent;
        display: grid;
        place-items: center;
        background: var(--surface);
        color: var(--text);
        font-family: inherit;
        cursor: pointer;
        touch-action: none;
        user-select: none;
        padding: 0;
        text-align: center;
    }

    /* Top-left region (Orange theme) */
    :global(.button.node.region-top-left) {
        --bg-available: color-mix(in srgb, var(--accent-orange) 22%, color-mix(in srgb, var(--bg) 70%, var(--surface)));
        --bg-active: color-mix(in srgb, var(--accent-orange) 32%, color-mix(in srgb, var(--bg) 40%, var(--surface)));
        --bg-maxed: color-mix(in srgb, var(--accent-orange) 42%, var(--surface));
        --border-color: var(--accent-orange);
        --border-color-active: var(--accent-orange);
        --border-color-maxed: var(--accent-orange-light);
        --text-color: color-mix(in srgb, var(--accent-orange) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-orange) 55%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-orange) 35%, white);
        --hex-bg: color-mix(in srgb, var(--accent-orange) 8%, var(--surface));
    }

    /* Bottom-left region (Yellow theme) */
    :global(.button.node.region-bottom-left) {
        --bg-available: color-mix(in srgb, var(--accent-yellow) 22%, color-mix(in srgb, var(--bg) 70%, var(--surface)));
        --bg-active: color-mix(in srgb, var(--accent-yellow) 32%, color-mix(in srgb, var(--bg) 40%, var(--surface)));
        --bg-maxed: color-mix(in srgb, var(--accent-yellow) 42%, var(--surface));
        --border-color: var(--accent-yellow);
        --border-color-active: var(--accent-yellow);
        --border-color-maxed: var(--accent-yellow-light);
        --text-color: color-mix(in srgb, var(--accent-yellow) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-yellow) 55%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-yellow) 35%, white);
        --hex-bg: color-mix(in srgb, var(--accent-yellow) 8%, var(--surface));
    }

    /* Right region (Blue theme) */
    :global(.button.node.region-right) {
        --bg-available: color-mix(in srgb, var(--accent-blue) 22%, color-mix(in srgb, var(--bg) 70%, var(--surface)));
        --bg-active: color-mix(in srgb, var(--accent-blue) 32%, color-mix(in srgb, var(--bg) 40%, var(--surface)));
        --bg-maxed: color-mix(in srgb, var(--accent-blue) 42%, var(--surface));
        --border-color: var(--accent-blue);
        --border-color-active: var(--accent-blue);
        --border-color-maxed: var(--accent-blue-light);
        --text-color: color-mix(in srgb, var(--accent-blue) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-blue) 55%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-blue) 35%, white);
        --hex-bg: color-mix(in srgb, var(--accent-blue) 8%, var(--surface));
    }

    /* Hexagon shape for leaf nodes - flat top and bottom, all sides equal */
    :global(.button.node.node-hexagon) {
        border-radius: 0;
        border: none;
        position: relative;
        overflow: visible;
        background: var(--hex-bg) !important;
        clip-path: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
        );
    }

    /* Create border using pseudo-element that follows the hexagon shape */
    :global(.button.node.node-hexagon::before) {
        content: "";
        position: absolute;
        inset: -3px;
        clip-path: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
        );
        z-index: -1;
        pointer-events: none;
    }

    /* Create inner hexagon mask to show only the border */
    :global(.button.node.node-hexagon::after) {
        content: "";
        position: absolute;
        inset: 3px;
        clip-path: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
        );
        z-index: -1;
        pointer-events: none;
        background: var(--hex-bg);
    }

    /* Override hex-bg for locked hexagons so body is also grayscale */
    :global(.button.node.node-hexagon.locked) {
        --hex-bg: var(--bg-locked);
    }

    /* Hexagon border (::before) state styles */
    :global(.button.node.node-hexagon.locked::before) {
        background: var(--border-color-locked);
        filter: var(--filter-locked);
    }

    :global(.button.node.node-hexagon.available::before) {
        background: var(--border-color);
        filter: var(--filter-available)
            drop-shadow(
                0 0 4px color-mix(in srgb, var(--border-color) 40%, transparent)
            )
            drop-shadow(
                0 0 8px color-mix(in srgb, var(--border-color) 20%, transparent)
            );
    }

    :global(.button.node.node-hexagon.active::before) {
        background: var(--border-color);
        filter: drop-shadow(
                0 0 6px color-mix(in srgb, var(--border-color) 50%, transparent)
            )
            drop-shadow(
                0 0 12px
                    color-mix(in srgb, var(--border-color) 30%, transparent)
            );
    }

    :global(.button.node.node-hexagon.maxed::before) {
        background: var(--border-color-maxed);
        filter: drop-shadow(
                0 0 6px
                    color-mix(
                        in srgb,
                        var(--border-color-maxed) 50%,
                        transparent
                    )
            )
            drop-shadow(
                0 0 12px
                    color-mix(
                        in srgb,
                        var(--border-color-maxed) 30%,
                        transparent
                    )
            );
    }

    /* Hexagon element glow state styles */
    :global(.button.node.node-hexagon.available) {
        filter: var(--filter-available)
            drop-shadow(
                0 0 4px color-mix(in srgb, var(--border-color) 30%, transparent)
            )
            drop-shadow(
                0 0 8px color-mix(in srgb, var(--border-color) 15%, transparent)
            );
    }

    :global(.button.node.node-hexagon.active) {
        filter: drop-shadow(
                0 0 6px color-mix(in srgb, var(--border-color) 40%, transparent)
            )
            drop-shadow(
                0 0 12px
                    color-mix(in srgb, var(--border-color) 20%, transparent)
            );
    }

    :global(.button.node.node-hexagon.maxed) {
        filter: drop-shadow(
                0 0 6px
                    color-mix(
                        in srgb,
                        var(--border-color-maxed) 40%,
                        transparent
                    )
            )
            drop-shadow(
                0 0 12px
                    color-mix(
                        in srgb,
                        var(--border-color-maxed) 20%,
                        transparent
                    )
            );
    }

    :global(.button.node.with-icon) {
        display: grid;
        justify-content: center;
        gap: 0;
        place-items: center;
        grid-template-areas: "stack";
    }

    :global(.node-icon) {
        width: calc(32px * var(--icon-scale, 1));
        height: calc(32px * var(--icon-scale, 1));
        opacity: 0.7;
        grid-area: stack;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    :global(.button.node .button-text) {
        grid-area: stack;
        display: contents;
    }

    .node-level {
        position: absolute;
        bottom: 0;
        left: 50%;
        pointer-events: none;
        white-space: nowrap;
        line-height: 1.2;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        color: white;
        text-shadow: var(--shadow-text);
        background: rgba(0, 0, 0, 0.4);
        padding: 2px 4px;
        border-radius: var(--radius-sm);
        transform-origin: center bottom;
    }

    /* Node state styles */
    :global(.button.node.locked) {
        background: var(--bg-locked);
        border-color: var(--border-color-locked);
        color: var(--text-color-locked);
        filter: var(--filter-locked);
    }

    :global(.button.node.available) {
        background: var(--bg-available);
        border-color: var(--border-color);
        color: var(--text-color);
        filter: var(--filter-available);
        box-shadow: 0 0 0 2px
            color-mix(in srgb, var(--border-color) 20%, transparent);
    }

    :global(.button.node.active) {
        background: var(--bg-active);
        border-color: var(--border-color-active);
        color: var(--text-color-active);
        box-shadow: 0 0 0 2px
            color-mix(in srgb, var(--border-color-active) 30%, transparent);
    }

    :global(.button.node.maxed) {
        background: var(--bg-maxed);
        border-color: var(--border-color-maxed);
        color: var(--text-color-maxed);
        box-shadow: 0 0 0 2px
            color-mix(in srgb, var(--border-color-maxed) 35%, transparent);
    }
</style>
