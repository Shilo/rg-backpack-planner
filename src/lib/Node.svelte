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
        --filter-locked: var(--node-brightness-locked);
        --filter-available: var(--node-brightness-available);

        /* Locked state colors (grayscale, same for all regions) */
        --bg-locked: var(--node-locked-bg);
        --border-color-locked: var(--node-locked-border);
        --text-color-locked: var(--node-locked-text);

        /* Default region color variables (blue accent) */
        --bg-available: color-mix(
            in srgb,
            var(--accent) 18%,
            color-mix(in srgb, var(--bg) 70%, var(--surface))
        );
        --bg-active: color-mix(
            in srgb,
            var(--accent) 28%,
            color-mix(in srgb, var(--bg) 40%, var(--surface))
        );
        --bg-maxed: color-mix(in srgb, var(--accent-light) 35%, var(--surface));
        --border-color: var(--accent);
        --border-color-active: var(--accent-light);
        --border-color-maxed: var(--accent-light);
        --text-color: color-mix(in srgb, var(--accent) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-light) 45%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-light) 35%, white);
        --hex-clip: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
        );
        --hex-border-width: 2px;
        --hex-fill: var(--surface);
        --hex-border-color: var(--border);

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
        box-shadow: var(--shadow);
    }

    /* Top-left region (Orange theme) */
    :global(.button.node.region-top-left) {
        --bg-available: color-mix(
            in srgb,
            var(--accent-orange) 22%,
            color-mix(in srgb, var(--bg) 70%, var(--surface))
        );
        --bg-active: color-mix(
            in srgb,
            var(--accent-orange) 32%,
            color-mix(in srgb, var(--bg) 40%, var(--surface))
        );
        --bg-maxed: color-mix(
            in srgb,
            var(--accent-orange) 42%,
            var(--surface)
        );
        --border-color: var(--accent-orange);
        --border-color-active: var(--accent-orange);
        --border-color-maxed: var(--accent-orange-light);
        --text-color: color-mix(in srgb, var(--accent-orange) 55%, white);
        --text-color-active: color-mix(
            in srgb,
            var(--accent-orange) 55%,
            white
        );
        --text-color-maxed: color-mix(in srgb, var(--accent-orange) 35%, white);
    }

    /* Bottom-left region (Yellow theme) */
    :global(.button.node.region-bottom-left) {
        --bg-available: color-mix(
            in srgb,
            var(--accent-yellow) 22%,
            color-mix(in srgb, var(--bg) 70%, var(--surface))
        );
        --bg-active: color-mix(
            in srgb,
            var(--accent-yellow) 32%,
            color-mix(in srgb, var(--bg) 40%, var(--surface))
        );
        --bg-maxed: color-mix(
            in srgb,
            var(--accent-yellow) 42%,
            var(--surface)
        );
        --border-color: var(--accent-yellow);
        --border-color-active: var(--accent-yellow);
        --border-color-maxed: var(--accent-yellow-light);
        --text-color: color-mix(in srgb, var(--accent-yellow) 55%, white);
        --text-color-active: color-mix(
            in srgb,
            var(--accent-yellow) 55%,
            white
        );
        --text-color-maxed: color-mix(in srgb, var(--accent-yellow) 35%, white);
    }

    /* Right region (Blue theme) */
    :global(.button.node.region-right) {
        --bg-available: color-mix(
            in srgb,
            var(--accent-blue) 22%,
            color-mix(in srgb, var(--bg) 70%, var(--surface))
        );
        --bg-active: color-mix(
            in srgb,
            var(--accent-blue) 32%,
            color-mix(in srgb, var(--bg) 40%, var(--surface))
        );
        --bg-maxed: color-mix(in srgb, var(--accent-blue) 42%, var(--surface));
        --border-color: var(--accent-blue);
        --border-color-active: var(--accent-blue);
        --border-color-maxed: var(--accent-blue-light);
        --text-color: color-mix(in srgb, var(--accent-blue) 55%, white);
        --text-color-active: color-mix(in srgb, var(--accent-blue) 55%, white);
        --text-color-maxed: color-mix(in srgb, var(--accent-blue) 35%, white);
    }

    /* Hexagon shape for leaf nodes - flat top and bottom, all sides equal */
    :global(.button.node.node-hexagon) {
        border-radius: 0;
        border: none;
        position: relative;
        overflow: visible;
        background: transparent;
        clip-path: var(--hex-clip);
        isolation: isolate;
    }

    /* Create border using pseudo-element that follows the hexagon shape */
    :global(.button.node.node-hexagon::before) {
        content: "";
        position: absolute;
        inset: 0;
        clip-path: var(--hex-clip);
        background: var(--hex-border-color);
        z-index: 0;
        pointer-events: none;
    }

    /* Inner fill to create a true hexagon stroke */
    :global(.button.node.node-hexagon::after) {
        content: "";
        position: absolute;
        inset: var(--hex-border-width);
        clip-path: var(--hex-clip);
        background: var(--hex-fill);
        z-index: 0;
        pointer-events: none;
    }

    /* Hexagon border (::before) state styles */
    :global(.button.node.node-hexagon.locked::before) {
        background: var(--hex-border-color);
        filter: var(--filter-locked);
    }

    :global(.button.node.node-hexagon.available::before) {
        background: var(--hex-border-color);
        filter: var(--filter-available);
    }

    :global(.button.node.node-hexagon.active::before) {
        background: var(--hex-border-color);
    }

    :global(.button.node.node-hexagon.maxed::before) {
        background: var(--hex-border-color);
    }

    /* Hexagon element glow state styles */
    :global(.button.node.node-hexagon.available) {
        filter: var(--filter-available);
    }

    :global(.button.node.node-hexagon .node-icon) {
        z-index: 1;
    }

    :global(.button.node.node-hexagon) .node-level {
        z-index: 1;
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
        font-weight: var(--weight-bold);
        color: white;
        text-shadow: var(--shadow-text);
        background: rgba(0, 0, 0, 0.4);
        padding: 2px 4px;
        border-radius: var(--radius);
        transform-origin: center bottom;
    }

    /* Node state styles */
    :global(.button.node.locked) {
        background: var(--bg-locked);
        border-color: var(--border-color-locked);
        color: var(--text-color-locked);
        filter: var(--filter-locked);
        --hex-fill: var(--bg-locked);
        --hex-border-color: var(--border-color-locked);
    }

    :global(.button.node.available) {
        background: var(--bg-available);
        border-color: var(--border-color);
        color: var(--text-color);
        filter: var(--filter-available);
        --hex-fill: var(--bg-available);
        --hex-border-color: var(--border-color);
    }

    :global(.button.node.active) {
        background: var(--bg-active);
        border-color: var(--border-color-active);
        color: var(--text-color-active);
        --hex-fill: var(--bg-active);
        --hex-border-color: var(--border-color-active);
    }

    :global(.button.node.maxed) {
        background: var(--bg-maxed);
        border-color: var(--border-color-maxed);
        color: var(--text-color-maxed);
        --hex-fill: var(--bg-maxed);
        --hex-border-color: var(--border-color-maxed);
    }
</style>
