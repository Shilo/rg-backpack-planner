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
    export let tier: number = 0;
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
    class={`node-wrapper ${isLeaf ? "node-wrapper-hex" : ""}`}
    style="left: {x}px; top: {y}px;"
>
    <Button
        class={`node ${state} region-${region} ${isLeaf ? "node-hexagon" : ""}`}
        aria-label={label || String(id)}
        data-node-id={String(id)}
        icon={NodeIcon}
        iconClass="node-icon"
        style={`width: ${64 * radius}px; height: ${64 * radius}px; --icon-scale: ${radius}; --tier-border-width: ${2 * (tier + 1)}px; --hex-border-width: ${2 * (tier + 1)}px;`}
    >
        {#if level > 0}
            <span
                class="node-level"
                style={`transform: translate(-50%, 50%) scale(${1 / scale});`}
                >{formatNumber(level)}</span
            >
            <span
                class="node-tier"
                style={`transform: translate(-50%, -120%) scale(${1 / scale});`}
                >T{tier}</span
            >
        {/if}
    </Button>
</div>

<style>
    .node-wrapper {
        position: absolute;
        transform: translate(-50%, -50%);
    }

    .node-wrapper.node-wrapper-hex {
        filter: drop-shadow(var(--shadow-node-hex));
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
        --hex-border-width: var(--tier-border-width, 3px);
        --hex-fill: var(--surface);
        --hex-border-color: var(--border);

        /* Base node styles */
        position: relative;
        width: 64px;
        height: 64px;
        border-radius: var(--radius-full);
        border: var(--tier-border-width, 2px) solid transparent;
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
    :global(.button.node.region-top-left) {
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
    :global(.button.node.region-bottom-left) {
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
    :global(.button.node.region-right) {
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
    :global(.button.node.node-hexagon) {
        border-radius: 0;
        border: none;
        position: relative;
        overflow: visible;
        box-shadow: none;
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
        padding: var(--spacing-sm);
        border-radius: var(--radius);
        transform-origin: center bottom;
    }

    .node-tier {
        position: absolute;
        top: 0;
        left: 50%;
        pointer-events: none;
        white-space: nowrap;
        line-height: 1.2;
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        color: white;
        text-shadow: var(--shadow-text);
        background: rgba(0, 0, 0, 0.5);
        padding: 2px 6px;
        border-radius: var(--radius);
        transform-origin: center top;
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
