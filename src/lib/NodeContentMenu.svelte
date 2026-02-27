<script lang="ts">
    import {
        ArrowCounterClockwiseIcon,
        CaretDownIcon,
        CaretDoubleDownIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
        CaretUpIcon,
        CheckCircleIcon,
        CrownIcon,
        LockIcon,
        PlusIcon,
    } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import { formatNumber } from "./mathUtil";
    import type { NodeIndex } from "../types/tree";

    export let nodeIndex: NodeIndex | null = null;
    export let x = 0;
    export let y = 0;
    export let isOpen = false;
    export let onClose: (() => void) | null = null;
    export let onMax: ((index: NodeIndex) => void) | null = null;
    export let onReset: ((index: NodeIndex) => void) | null = null;
    export let onDecrement: ((index: NodeIndex) => void) | null = null;
    export let onIncrement: ((index: NodeIndex) => void) | null = null;
    export let onIncrementBy10: ((index: NodeIndex) => void) | null = null;
    export let level: number = 0;
    export let maxLevel: number = 0;
    export let state: "locked" | "available" | "active" | "maxed" = "locked";
    export let skillId: string | null = null;

    $: isSingleLevel = maxLevel <= 1;

    const stateIcons = {
        locked: LockIcon,
        available: PlusIcon,
        active: CheckCircleIcon,
        maxed: CrownIcon,
    } as const;

    $: NodeIcon = stateIcons[state] ?? LockIcon;

    const tickGradient = (max: number) => {
        if (max <= 1) return "";
        const size = Math.ceil(max / 5);
        const positions = [1, 2, 3, 4].map((t) => (t * size * 100) / max);
        const thickness = "3px";
        const color = "var(--bg-panel)";
        return positions
            .map(
                (p) =>
                    `linear-gradient(90deg, transparent calc(${p}% - ${thickness}), ${color} calc(${p}% - ${thickness}), ${color} calc(${p}% + ${thickness}), transparent calc(${p}% + ${thickness}))`,
            )
            .join(", ");
    };

    $: tickImage = tickGradient(maxLevel);
</script>

<ContextMenu
    {x}
    {y}
    {isOpen}
    title={skillId ?? "Node"}
    ariaLabel="Node actions"
    {onClose}
>
    <div class="node-stats">
        <div class="node-icon-wrapper">
            <svelte:component this={NodeIcon} />
        </div>
        <div class="node-stats-content">
            <div class="stat-row">
                <span class="stat-label">Bonus</span>
                <span class="stat-value">30,000%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Level</span>
                <span class="stat-value"
                    >{formatNumber(level)} / {formatNumber(maxLevel)}</span
                >
            </div>
            <div class="stat-row">
                <span class="stat-label">Tier</span>
                <span class="stat-value">
                    {(() => {
                        const totalTiers = maxLevel > 1 ? 5 : 1;
                        const displayMax =
                            totalTiers === 1 ? 1 : totalTiers - 1; // 4 for multi-tier, 1 for single-tier
                        if (totalTiers === 1)
                            return Math.min(1, level > 0 ? 1 : 0);
                        const chunk = Math.ceil(maxLevel / 5);
                        return Math.min(displayMax, Math.floor(level / chunk));
                    })()}
                    /
                    {maxLevel > 1 ? 4 : 1}
                </span>
            </div>
            <div
                class="level-progress"
                style={`--tick-gradient:${tickImage}; --tick-thickness: 3px;`}
            >
                <div
                    class="level-progress-bar"
                    style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}
                ></div>
                {#if tickImage}
                    <div class="level-progress-ticks"></div>
                {/if}
            </div>
        </div>
    </div>
    <div class="button-grid" class:stacked={isSingleLevel}>
        <Button
            on:click={() => {
                if (nodeIndex === null || !onIncrement) return;
                onIncrement(nodeIndex);
            }}
            disabled={nodeIndex === null || level >= maxLevel}
            icon={isSingleLevel ? CaretLineUpIcon : CaretUpIcon}
            positive
        >
            {isSingleLevel ? "Max" : "+1"}
        </Button>
        {#if !isSingleLevel}
            <Button
                on:click={() => {
                    if (nodeIndex === null || !onIncrementBy10) return;
                    onIncrementBy10(nodeIndex);
                }}
                disabled={nodeIndex === null || level >= maxLevel}
                icon={CaretDoubleUpIcon}
                positive
            >
                +10
            </Button>
            <Button
                on:click={() => {
                    if (nodeIndex === null || !onMax) return;
                    onMax(nodeIndex);
                }}
                disabled={nodeIndex === null || level >= maxLevel}
                icon={CaretLineUpIcon}
                positive
            >
                Max
            </Button>
        {/if}
        <Button
            on:click={() => {
                if (nodeIndex === null || !onDecrement) return;
                onDecrement(nodeIndex);
            }}
            disabled={nodeIndex === null || level <= 0}
            icon={isSingleLevel ? ArrowCounterClockwiseIcon : CaretDownIcon}
            negative
        >
            {isSingleLevel ? "Reset" : "−1"}
        </Button>
        {#if !isSingleLevel}
            <Button
                on:click={() => {
                    if (nodeIndex === null || !onDecrement) return;
                    for (let i = 0; i < 10; i++) onDecrement(nodeIndex);
                }}
                disabled={nodeIndex === null || level <= 0}
                icon={CaretDoubleDownIcon}
                negative
            >
                −10
            </Button>
            <Button
                on:click={() => {
                    if (nodeIndex === null || !onReset) return;
                    onReset(nodeIndex);
                }}
                toastMessage={nodeIndex !== null && onReset
                    ? `Reset node`
                    : undefined}
                toastNegative
                disabled={nodeIndex === null || level <= 0}
                icon={ArrowCounterClockwiseIcon}
                negative
            >
                Reset
            </Button>
        {/if}
    </div>
</ContextMenu>

<style>
    .node-stats {
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: var(--border-width) solid var(--border-subtle);
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-lg);
    }

    .node-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        flex-shrink: 0;
    }

    .node-icon-wrapper :global(svg) {
        width: 24px;
        height: 24px;
        opacity: var(--opacity-disabled);
    }

    .node-stats-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md);
        font-size: var(--font-base);
    }

    .stat-label {
        color: var(--text-muted);
    }

    .stat-value {
        color: var(--text);
        font-weight: var(--weight-bold);
    }

    .level-progress {
        width: 100%;
        height: 10px;
        background: var(--bg-raised);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 2px;
        position: relative;
        clip-path: inset(0 round 4px);
    }

    .level-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        transition: width var(--ease);
        position: relative;
        border-radius: 0;
    }

    .level-progress-ticks {
        position: absolute;
        inset: 0;
        background-image: var(--tick-gradient, none);
        pointer-events: none;
    }

    .button-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--spacing-md);
    }

    .button-grid.stacked {
        grid-template-columns: 1fr;
    }
</style>
