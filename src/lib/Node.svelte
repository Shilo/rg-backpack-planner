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
        --filter-locked: brightness(0.4);
        --filter-available: brightness(0.5);

        /* Locked state colors (grayscale, same for all regions) */
        --bg-locked: #2a2a35;
        --border-color-locked: #55556a;
        --text-color-locked: #8888a0;

        /* Default color variables (overridden by region-specific rules) */
        --bg-available: #1c2f52;
        --bg-active: #2a3f73;
        --bg-maxed: #4a2e0a;
        --border-color: #4c6fff;
        --border-color-active: #5aa6ff;
        --border-color-maxed: #ffb347;
        --text-color: #cdd7ff;
        --text-color-active: #e1f0ff;
        --text-color-maxed: #ffe8c7;
        --hex-bg: #2a3441;

        /* Base node styles */
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: 999px;
        border: 2px solid transparent;
        display: grid;
        place-items: center;
        background: #1f2a44;
        color: #e8eefc;
        font-family: inherit;
        cursor: pointer;
        touch-action: none;
        user-select: none;
        padding: 0;
        text-align: center;
    }

    /* Top-left region (Orange theme) */
    :global(.button.node.region-top-left) {
        --bg-available: #6b3f1f;
        --bg-active: #8b4f2f;
        --bg-maxed: #ab5f3f;
        --border-color: #ff6b35;
        --border-color-active: #ff6b35;
        --border-color-maxed: #ff8c5a;
        --text-color: #ffd4b8;
        --text-color-active: #ffd4b8;
        --text-color-maxed: #ffe8d4;
    }

    /* Bottom-left region (Yellow theme) */
    :global(.button.node.region-bottom-left) {
        --bg-available: #3d3d0a;
        --bg-active: #5a5a1a;
        --bg-maxed: #6a6a2a;
        --border-color: #ffd700;
        --border-color-active: #ffd700;
        --border-color-maxed: #ffeb3b;
        --text-color: #fff9cc;
        --text-color-active: #fff9cc;
        --text-color-maxed: #fffdd0;
    }

    /* Right region (Blue theme) */
    :global(.button.node.region-right) {
        --bg-available: #1c2f52;
        --bg-active: #2a3f73;
        --bg-maxed: #3a4f83;
        --border-color: #4a90e2;
        --border-color-active: #4a90e2;
        --border-color-maxed: #6bb6ff;
        --text-color: #b8d9ff;
        --text-color-active: #c8e5ff;
        --text-color-maxed: #e1f0ff;
    }

    /* Hexagon background colors per region */
    :global(.button.node.region-top-left.node-hexagon) {
        --hex-bg: #2f2e2a;
    }

    :global(.button.node.region-bottom-left.node-hexagon) {
        --hex-bg: #2f2f2a;
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
        font-size: 0.75rem;
        font-weight: 600;
        color: #ffffff;
        text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.9),
            0 0 4px rgba(0, 0, 0, 0.6),
            1px 0 2px rgba(0, 0, 0, 0.9),
            -1px 0 2px rgba(0, 0, 0, 0.9);
        background: rgba(0, 0, 0, 0.4);
        padding: 2px 4px;
        border-radius: 8px;
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
