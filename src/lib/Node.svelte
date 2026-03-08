<script lang="ts" context="module">
    export type NodeState = "locked" | "available" | "active" | "maxed";
    export const NODE_RADIUS_PX = 32;
    export const NODE_DIAMETER_PX = NODE_RADIUS_PX * 2;
</script>

<script lang="ts">
    import type { Component } from "svelte";
    import type { SkillId } from "../types/tree";
    import Button from "./Button.svelte";
    import NodeFlash from "./NodeFlash.svelte";
    import { SKILL_NODE_ICONS } from "../config/skillNodeIcons";
    import { formatNumber } from "./mathUtil";
    import {
        getPrimaryActionCost,
        nodePrimaryAction,
        shiftKeyHeld,
    } from "./nodePrimaryActionStore";
    import { t } from "svelte-whisper";
    import { tooltip } from "./tooltip";
    import { CrownIcon } from "phosphor-svelte";

    export let id: number;
    export let x: number = 0;
    export let y: number = 0;
    export let label: string = "";
    export let level: number = 0;
    export let tier: number = 0;
    export let state: NodeState = "locked";
    export let showTier = true;
    export let showSkillName = true;
    export let radius: number = 1;
    export let scale: number = 1;
    export let region: "top-left" | "bottom-left" | "right" = "right";
    export let isLeaf: boolean = false;
    /** When true, node is locked due to GLOBAL_LEVELED_LEAF_NODE_CAP; tooltip should not show cost. */
    export let isGlobalIncrementLocked: boolean = false;
    export let skillId: SkillId | null = null;
    export let maxLevel: number = 1;

    /**
     * Optional icon override. When unset and skillId is set, the icon from
     * src/assets/nodes/*.svelte (mapped by skillId) is used; it fills the node
     * and uses the node border color (currentColor via --node-icon-color).
     */
    export let icon: Component | null = null;

    $: nodeIcon =
        icon ?? (skillId != null ? (SKILL_NODE_ICONS[skillId] ?? null) : null);

    /** Last 3 nodes per branch: global_* and final_damage_boost use important icon size */
    $: isImportantNode =
        skillId != null &&
        (skillId.startsWith("global_") || skillId.startsWith("final_"));

    $: isRefund = $shiftKeyHeld;
    $: primaryActionCost = getPrimaryActionCost(
        $nodePrimaryAction,
        skillId,
        level,
        maxLevel,
        isRefund,
    );

    /** When showSkillName is on, name is on the badge so tooltip omits it. */
    $: tooltipLine1 = showSkillName ? "" : label || String(id);
    $: tooltipText =
        primaryActionCost != null &&
        !(state === "locked" && isGlobalIncrementLocked)
            ? {
                  line1: tooltipLine1,
                  costLine: formatNumber(primaryActionCost),
                  costLineRefund: isRefund,
              }
            : tooltipLine1;

    $: tooltipParam =
        tooltipText == null
            ? undefined
            : { content: tooltipText, hoverOnly: true };

    /** Name badge text: short skill name when skillId is set, else label (tooltip/aria use full label). */
    $: badgeLabel =
        skillId != null ? $t(`skills.short.${skillId}`) || label : label;

    $: isMaxed = level >= maxLevel && maxLevel > 0;

    /** Show not-allowed cursor when user cannot level (maxed or leaf locked by global cap). */
    $: cursorNotAllowed = isMaxed || (isLeaf && isGlobalIncrementLocked);
</script>

<div
    class="node-wrapper badge-{region} {state} region-{region} {isLeaf
        ? 'node-wrapper-hex'
        : ''} {isImportantNode
        ? 'node-wrapper-important'
        : ''} {cursorNotAllowed ? 'cursor-not-allowed' : ''}"
    data-node-id={String(id)}
    style="left: {x - NODE_RADIUS_PX * radius}px; top: {y -
        NODE_RADIUS_PX * radius}px; width: {NODE_DIAMETER_PX *
        radius}px; height: {NODE_DIAMETER_PX *
        radius}px; --node-radius: {radius}; --icon-scale: {radius}; --node-diameter-px: {NODE_DIAMETER_PX *
        radius}px;"
    use:tooltip={tooltipParam}
>
    <Button
        class={`node ${state} region-${region} ${isLeaf ? "node-hexagon" : ""}`}
        aria-label={label || String(id)}
        data-node-id={String(id)}
        icon={null}
        style="width: {NODE_DIAMETER_PX * radius}px; height: {NODE_DIAMETER_PX *
            radius}px;"
    >
        <NodeFlash {level} {isLeaf} />
    </Button>
    <div
        class="node-badge-icon-stack"
        style="--node-badge-scale: {Math.max(1 / scale, 1)}"
    >
        <span class="node-badge-slot node-badge-slot-name">
            {#if showSkillName && (badgeLabel || skillId)}
                <span class="node-badge" data-node-id={String(id)}
                    >{badgeLabel || skillId}</span
                >
            {/if}
        </span>
        <span class="node-icon-container" aria-hidden="true">
            {#if nodeIcon}
                <svelte:component
                    this={nodeIcon}
                    class="node-icon"
                    aria-hidden={true}
                />
            {/if}
        </span>
        <span class="node-badge-slot node-badge-slot-level">
            {#if level > 0}
                <span
                    class="node-badge node-level-badge {isMaxed
                        ? 'node-level-badge-max-container'
                        : ''}"
                    data-node-id={String(id)}
                >
                    {#if isMaxed}
                        <CrownIcon
                            class="node-level-badge-max"
                            weight="fill"
                            aria-label="max"
                        />
                    {:else}
                        {#if showTier}
                            <span>{"★".repeat(tier)}</span>
                        {/if}
                        <span>{formatNumber(level)}</span>
                    {/if}
                </span>
            {/if}
        </span>
    </div>
</div>

<style>
    .node-wrapper {
        --node-badge-max-width: 128px;
        --z-index-badge: 4;
        --border-width: 2px;
        --border-color-locked: var(--node-locked-border);
        --node-icon-size: 50%;
        --node-important-icon-size: 65%;
        --badge-mobile-y-offset: 0px;
        /* Contrast text: soft black/white so badge text is readable and not blinding */
        --badge-text-on-light: #1c1c1c;
        --badge-text-on-dark: #f2f2f2;
        --hex-border-width: 3px;
        /* Hexagon from FinalDamageBoost.svelte path (viewBox 365×316, flat top/bottom) */
        --hex-clip: polygon(
            12.4932% 71.6438%,
            0% 50%,
            12.4932% 28.3562%,
            24.9863% 6.7123%,
            75.0137% 6.7123%,
            87.5068% 28.3562%,
            100% 50%,
            87.5068% 71.6438%,
            75.0137% 93.2877%,
            24.9863% 93.2877%
        );
        position: absolute;
        cursor: pointer;
    }

    .node-wrapper.cursor-not-allowed,
    .node-wrapper.cursor-not-allowed :global(.button.node),
    .node-wrapper.cursor-not-allowed .node-badge-slot {
        cursor: not-allowed;
    }

    /* Icon layer (sibling of button) needs same variables as button */
    .node-wrapper.region-right {
        --border-color: var(--region-blue-accent);
        --border-color-active: var(--region-blue-accent);
        --border-color-maxed: var(--region-blue-light);
        --text-color: var(--region-blue-text);
        --text-color-active: var(--region-blue-text);
        --text-color-maxed: var(--region-blue-text-maxed);
    }
    .node-wrapper.region-top-left {
        --border-color: var(--region-orange-accent);
        --border-color-active: var(--region-orange-accent);
        --border-color-maxed: var(--region-orange-light);
        --text-color: var(--region-orange-text);
        --text-color-active: var(--region-orange-text);
        --text-color-maxed: var(--region-orange-text-maxed);
    }
    .node-wrapper.region-bottom-left {
        --border-color: var(--region-yellow-accent);
        --border-color-active: var(--region-yellow-accent);
        --border-color-maxed: var(--region-yellow-light);
        --text-color: var(--region-yellow-text);
        --text-color-active: var(--region-yellow-text);
        --text-color-maxed: var(--region-yellow-text-maxed);
    }
    .node-wrapper.locked {
        --node-icon-color: var(--border-color-locked);
    }
    .node-wrapper.available {
        --node-icon-color: var(--border-color);
    }
    .node-wrapper.active {
        --node-icon-color: var(--border-color-active);
    }
    .node-wrapper.maxed {
        /* Maxed uses same color as active so it never looks different */
        --border-color-maxed: var(--border-color-active);
        --text-color-maxed: var(--text-color-active);
        --node-icon-color: var(--border-color-active);
    }

    /* Name badge: background per state; text color is contrast-based (see 
    .node-badge) */
    .node-wrapper.locked .node-badge-slot-name .node-badge {
        --badge-bg: var(--border-color-locked);
        background: var(--badge-bg);
    }
    .node-wrapper.locked .node-badge-slot {
        z-index: calc(var(--z-index-badge) - 1);
    }
    .node-wrapper.available .node-badge-slot-name .node-badge {
        --badge-bg: var(--border-color);
        background: var(--badge-bg);
    }
    .node-wrapper.active .node-badge-slot-name .node-badge {
        --badge-bg: var(--border-color-active);
        background: var(--badge-bg);
    }
    .node-wrapper.maxed .node-badge-slot-name .node-badge {
        --badge-bg: var(--border-color-active);
        background: var(--badge-bg);
    }

    .node-wrapper.node-wrapper-important {
        --node-icon-size: var(--node-important-icon-size);
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
        --node-icon-color: var(--border-color);
        --text-color: var(--region-blue-text);
        --text-color-active: var(--region-blue-text);
        --text-color-maxed: var(--region-blue-text-maxed);
        --hex-fill: var(--surface);
        --hex-border-color: var(--border);

        /* Base node styles */
        position: relative;
        overflow: hidden;
        width: var(--node-diameter-px);
        height: var(--node-diameter-px);
        border-radius: var(--radius-full);
        border: var(--border-width) solid transparent;
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
        transition:
            background 0.25s ease,
            border-color 0.25s ease,
            color 0.25s ease,
            filter 0.25s ease,
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.25s ease;
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

    /* Hexagon shape for leaf nodes - pointy top/bottom to match icon (flat left/right) */
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

    .node-wrapper :global(.button.node.with-icon) {
        display: grid;
        justify-content: center;
        gap: 0;
        place-items: center;
        grid-template-areas: "stack";
    }

    :global(.button.node:focus),
    :global(.button.node:focus-visible) {
        outline: none;
        outline-offset: 0;
    }

    /* Order: name badge → icon → level badge. Icon centered in node; badges aligned to icon edges. */
    .node-badge-icon-stack {
        position: absolute;
        inset: 0;
        --badge-icon-gap: 2px;
        pointer-events: none;
    }

    .node-badge-slot {
        pointer-events: auto;
        position: absolute;
        left: 50%;
        display: flex;
        justify-content: center;
        cursor: pointer;
        touch-action: none;
        z-index: var(--z-index-badge);
    }

    /* Name: slot bottom = top of icon (minus gap); badge sits above, bottom of badge aligns with top of icon */
    .node-badge-slot-name {
        bottom: calc(
            50% + (var(--node-icon-size) / 2) + var(--badge-icon-gap) -
                var(--badge-mobile-y-offset)
        );
        transform: translateX(-50%);
        align-items: flex-end;
    }

    /* Level: slot top = bottom of icon (plus gap); badge sits below, top of badge aligns with bottom of icon */
    .node-badge-slot-level {
        top: calc(
            50% + (var(--node-icon-size) / 2) + var(--badge-icon-gap) +
                var(--badge-mobile-y-offset)
        );
        transform: translateX(-50%);
        align-items: flex-start;
    }

    /* Icon container: center is always the node center (origin) */
    .node-icon-container {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--node-icon-size);
        height: var(--node-icon-size);
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter var(--ease);
        z-index: 0;
    }

    .node-wrapper:active .node-icon-container {
        transform: translate(-50%, -50%) scale(0.88);
        transition-duration: 0.1s;
    }

    .node-wrapper-hex .node-icon-container {
        border-radius: 0;
        clip-path: var(--hex-clip);
    }

    .node-wrapper :global(.node-icon) {
        width: 100%;
        height: 100%;
        display: block;
        color: var(--node-icon-color, currentColor);
    }

    .node-wrapper :global(.button.node .button-text) {
        grid-area: stack;
        display: contents;
    }

    .node-badge {
        --badge-bg: var(--region-blue-accent);
        transform: scale(var(--node-badge-scale, 1));
        width: max-content;
        max-width: var(--node-badge-max-width);
        min-width: 15px;
        overflow: hidden;
        white-space: normal;
        overflow-wrap: normal;
        transition:
            filter var(--ease),
            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow var(--ease),
            background 0.25s ease;

        font-size: var(--font-xxs);
        font-weight: bold;
        font-family:
            system-ui,
            -apple-system,
            "Segoe UI",
            sans-serif;
        line-height: var(--leading-none);
        letter-spacing: 0;
        font-variant-numeric: tabular-nums;
        /* Dynamic contrast: soft black/white vs badge background; fallback when color-contrast() unsupported */
        color: var(--node-badge-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;

        min-height: 15px;
        padding: 0px calc(var(--radius-sm) / 2);
        border-radius: var(--radius-sm);
        text-align: center;

        background: var(--badge-bg);
        box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 6px 2px rgba(0, 0, 0, 0.15);
    }

    @supports (color: color-contrast(red vs red)) {
        .node-badge {
            color: color-contrast(
                var(--badge-bg) vs var(--badge-text-on-light)
                    var(--badge-text-on-dark)
            );
        }
    }

    .badge-top-left .node-badge {
        --badge-bg: var(--region-orange-accent);
        background: var(--badge-bg);
    }

    .badge-bottom-left .node-badge {
        --badge-bg: var(--region-yellow-accent);
        background: var(--badge-bg);
    }

    .badge-right .node-badge {
        --badge-bg: var(--region-blue-accent);
        background: var(--badge-bg);
    }

    @media (hover: none) and (pointer: coarse) {
        .node-wrapper {
            --badge-mobile-y-offset: 1px;
        }
    }

    @media (hover: hover) {
        .node-wrapper:hover .node-badge {
            filter: var(--brightness-hover);
        }

        .node-wrapper:hover :global(.button.node:not(:disabled)) {
            filter: var(--brightness-hover);
        }

        .node-wrapper:hover .node-icon-container {
            filter: var(--brightness-hover);
        }
    }

    .node-wrapper:active .node-badge {
        filter: var(--brightness-hover);
        transform: scale(calc(var(--node-badge-scale, 1) * 0.88));
        transition-duration: 0.1s;
    }

    .node-wrapper:active :global(.button.node:not(:disabled)) {
        filter: var(--brightness-hover);
        transform: scale(0.93);
        transition-duration: 0.1s;
    }

    .node-level-badge {
        display: flex;
        flex-direction: column;
        gap: 0;
        font-size: var(--font-sm);
    }

    .node-level-badge-max {
        width: 1em;
        height: 1em;
        display: block;
        color: currentColor;
    }

    .node-level-badge-max-container {
        border-radius: 50%;
        aspect-ratio: 1;
    }

    /* Node state styles */
    .node-wrapper :global(.button.node.locked) {
        background: var(--bg-locked);
        border-color: var(--border-color-locked);
        color: var(--text-color-locked);
        filter: var(--filter-locked);
        --hex-fill: var(--bg-locked);
        --hex-border-color: var(--border-color-locked);
        --node-icon-color: var(--border-color-locked);
    }

    .node-wrapper :global(.button.node.available) {
        background: var(--bg-available);
        border-color: var(--border-color);
        color: var(--text-color);
        filter: var(--filter-available);
        --hex-fill: var(--bg-available);
        --hex-border-color: var(--border-color);
        --node-icon-color: var(--border-color);
    }

    .node-wrapper :global(.button.node.active) {
        background: var(--bg-active);
        border-color: var(--border-color-active);
        color: var(--text-color-active);
        --hex-fill: var(--bg-active);
        --hex-border-color: var(--border-color-active);
        --node-icon-color: var(--border-color-active);
        box-shadow:
            var(--shadow-node),
            0 0 8px color-mix(in srgb, var(--border-color-active) 30%, transparent);
    }

    .node-wrapper :global(.button.node.maxed) {
        background: var(--bg-active);
        border-color: var(--border-color-active);
        color: var(--text-color-active);
        --hex-fill: var(--bg-active);
        --hex-border-color: var(--border-color-active);
        --node-icon-color: var(--border-color-active);
        box-shadow:
            var(--shadow-node),
            0 0 12px color-mix(in srgb, var(--border-color-active) 40%, transparent);
    }
</style>
