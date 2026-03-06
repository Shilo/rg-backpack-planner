<script lang="ts" context="module">
    export type NodeState = "locked" | "available" | "active" | "maxed";
</script>

<script lang="ts">
    import {
        CheckCircleIcon,
        CrownIcon,
        LockIcon,
        PlusIcon,
        StarIcon,
    } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import NodeFlash from "./NodeFlash.svelte";
    import { formatNumber } from "./mathUtil";

    export let id: number;
    export let x: number = 0;
    export let y: number = 0;
    export let label: string = "";
    export let level: number = 0;
    export let tier: number = 0;
    export let state: NodeState = "locked";
    export let showTier = true;
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

<div
    class="node-wrapper badge-{region}"
    style="left: {x - 32 * radius}px; top: {y - 32 * radius}px; width: {64 *
        radius}px; height: {64 * radius}px;"
>
    <Button
        class={`node ${state} region-${region} ${isLeaf ? "node-hexagon" : ""}`}
        aria-label={label || String(id)}
        data-node-id={String(id)}
        icon={NodeIcon}
        iconClass="node-icon"
        style={`width: ${64 * radius}px; height: ${64 * radius}px; --icon-scale: ${radius};`}
    >
        <NodeFlash {level} {isLeaf} />
    </Button>
    {#if showTier && level > 0 && state !== "maxed"}
        <span
            class="node-tier-badge-anchor"
            data-node-id={String(id)}
            style={`transform: scale(${Math.max(1 / scale, 1)});`}
            ><span class="node-badge">T{tier}</span></span
        >
    {/if}
    {#if level > 0}
        <span
            class="node-badge-anchor"
            data-node-id={String(id)}
            style={`transform: scale(${Math.max(1 / scale, 1)});`}
            >{#if state === "maxed"}<span class="node-badge node-badge-star"
                    ><StarIcon size={12} weight="fill" /></span
                >{:else}<span class="node-badge">{formatNumber(level)}</span
                >{/if}</span
        >
    {/if}
</div>

<style>
    .node-wrapper {
        --z-index-badge: 4;

        position: absolute;
    }

    /* CSS Custom Properties - Scoped to .node-wrapper to avoid global leakage */
    .node-wrapper :global(.button.node) {
        /* Filter values for unleveled states */
        --filter-locked: var(--node-brightness-locked);
        --filter-available: var(--node-brightness-available);

        /* Locked state colors (grayscale, same for all regions) */
        --bg-locked: var(--node-locked-bg);
        --border-color-locked: var(--node-locked-border);
        --text-color-locked: var(--node-locked-text);

        /* Default region color variables (blue — matches region-right) */
        --bg-available: var(--region-blue-bg-available);
        --bg-active: var(--region-blue-bg-active);
        --bg-maxed: var(--region-blue-bg-maxed);
        --border-color: var(--region-blue-accent);
        --border-color-active: var(--region-blue-accent);
        --border-color-maxed: var(--region-blue-light);
        --text-color: var(--region-blue-text);
        --text-color-active: var(--region-blue-text);
        --text-color-maxed: var(--region-blue-text-maxed);
        --hex-clip: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
        );
        --hex-border-width: 3px;
        --hex-fill: var(--surface);
        --hex-border-color: var(--border);

        /* Base node styles */
        position: relative;
        overflow: hidden;
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
        box-shadow: var(--shadow-node);
    }

    /* Top-left region (Orange theme) */
    .node-wrapper :global(.button.node.region-top-left) {
        --bg-available: var(--region-orange-bg-available);
        --bg-active: var(--region-orange-bg-active);
        --bg-maxed: var(--region-orange-bg-maxed);
        --border-color: var(--region-orange-accent);
        --border-color-active: var(--region-orange-accent);
        --border-color-maxed: var(--region-orange-light);
        --text-color: var(--region-orange-text);
        --text-color-active: var(--region-orange-text);
        --text-color-maxed: var(--region-orange-text-maxed);
    }

    /* Bottom-left region (Yellow theme) */
    .node-wrapper :global(.button.node.region-bottom-left) {
        --bg-available: var(--region-yellow-bg-available);
        --bg-active: var(--region-yellow-bg-active);
        --bg-maxed: var(--region-yellow-bg-maxed);
        --border-color: var(--region-yellow-accent);
        --border-color-active: var(--region-yellow-accent);
        --border-color-maxed: var(--region-yellow-light);
        --text-color: var(--region-yellow-text);
        --text-color-active: var(--region-yellow-text);
        --text-color-maxed: var(--region-yellow-text-maxed);
    }

    /* Right region (Blue theme) */
    .node-wrapper :global(.button.node.region-right) {
        --bg-available: var(--region-blue-bg-available);
        --bg-active: var(--region-blue-bg-active);
        --bg-maxed: var(--region-blue-bg-maxed);
        --border-color: var(--region-blue-accent);
        --border-color-active: var(--region-blue-accent);
        --border-color-maxed: var(--region-blue-light);
        --text-color: var(--region-blue-text);
        --text-color-active: var(--region-blue-text);
        --text-color-maxed: var(--region-blue-text-maxed);
    }

    /* Hexagon shape for leaf nodes - flat top and bottom, all sides equal */
    .node-wrapper :global(.button.node.node-hexagon) {
        border-radius: 0;
        border: none;
        position: relative;
        overflow: visible;
        box-shadow: none;
        background: transparent;
        clip-path: var(--hex-clip);
        isolation: isolate;
        filter: drop-shadow(var(--shadow-node-hex));
    }

    /* Create border using pseudo-element that follows the hexagon shape */
    .node-wrapper :global(.button.node.node-hexagon::before) {
        content: "";
        position: absolute;
        inset: 0;
        clip-path: var(--hex-clip);
        background: var(--hex-border-color);
        z-index: 0;
        pointer-events: none;
    }

    /* Inner fill to create a true hexagon stroke */
    .node-wrapper :global(.button.node.node-hexagon::after) {
        content: "";
        position: absolute;
        inset: var(--hex-border-width);
        clip-path: var(--hex-clip);
        background: var(--hex-fill);
        z-index: 0;
        pointer-events: none;
    }

    .node-wrapper :global(.button.node.node-hexagon .node-icon) {
        z-index: 1;
    }

    .node-wrapper :global(.button.node.with-icon) {
        display: grid;
        justify-content: center;
        gap: 0;
        place-items: center;
        grid-template-areas: "stack";
    }

    .node-wrapper :global(.button.node:focus),
    .node-wrapper :global(.button.node:focus-visible) {
        outline: none;
        outline-offset: 0;
    }

    .node-wrapper :global(.node-icon) {
        width: calc(32px * var(--icon-scale, 1));
        height: calc(32px * var(--icon-scale, 1));
        opacity: 0.7;
        grid-area: stack;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .node-wrapper :global(.button.node .button-text) {
        grid-area: stack;
        display: contents;
    }

    .node-badge-anchor,
    .node-tier-badge-anchor {
        position: absolute;
        left: 50%;
        width: 0;
        height: 0;
        z-index: var(--z-index-badge);
        cursor: pointer;
        touch-action: none;
    }

    .node-badge-anchor {
        bottom: 0;
        z-index: calc(var(--z-index-badge) + 1);
    }

    .node-tier-badge-anchor {
        top: 0;
    }

    .node-badge {
        position: absolute;
        left: 0;
        top: 0;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        transition:
            filter var(--ease),
            transform var(--ease),
            box-shadow var(--ease);

        font-size: 12px;
        font-weight: bold;
        font-family:
            system-ui,
            -apple-system,
            "Segoe UI",
            sans-serif;
        line-height: 1;
        letter-spacing: 0.01em;
        font-variant-numeric: tabular-nums;
        color: var(--node-badge-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;

        min-height: 15px;
        padding: 0 4px;
        border-radius: var(--radius-full);
        min-width: 18px;
        text-align: center;

        background: var(--region-blue-accent);
        box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 6px 2px rgba(0, 0, 0, 0.15);
    }

    .badge-top-left .node-badge {
        background: var(--region-orange-accent);
    }

    .badge-bottom-left .node-badge {
        background: var(--region-yellow-accent);
    }

    .badge-right .node-badge {
        background: var(--region-blue-accent);
    }

    @media (hover: hover) {
        .node-wrapper:hover .node-badge {
            filter: var(--brightness-hover);
        }

        .node-wrapper:hover :global(.button.node:not(:disabled)) {
            filter: var(--brightness-hover);
        }
    }

    .node-wrapper:active .node-badge {
        filter: var(--brightness-hover);
        transform: translate(-50%, -50%) scale(0.9);
    }

    .node-wrapper:active :global(.button.node:not(:disabled)) {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .node-badge-star {
        min-width: 0;
        padding: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .node-badge-star :global(svg) {
        display: block;
    }

    /* Node state styles */
    .node-wrapper :global(.button.node.locked) {
        background: var(--bg-locked);
        border-color: var(--border-color-locked);
        color: var(--text-color-locked);
        filter: var(--filter-locked);
        --hex-fill: var(--bg-locked);
        --hex-border-color: var(--border-color-locked);
    }

    .node-wrapper :global(.button.node.available) {
        background: var(--bg-available);
        border-color: var(--border-color);
        color: var(--text-color);
        filter: var(--filter-available);
        --hex-fill: var(--bg-available);
        --hex-border-color: var(--border-color);
    }

    .node-wrapper :global(.button.node.active) {
        background: var(--bg-active);
        border-color: var(--border-color-active);
        color: var(--text-color-active);
        --hex-fill: var(--bg-active);
        --hex-border-color: var(--border-color-active);
    }

    .node-wrapper :global(.button.node.maxed) {
        background: var(--bg-maxed);
        border-color: var(--border-color-maxed);
        color: var(--text-color-maxed);
        --hex-fill: var(--bg-maxed);
        --hex-border-color: var(--border-color-maxed);
    }
</style>
