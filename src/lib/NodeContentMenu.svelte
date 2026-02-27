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

    const stateIcons = {
        locked: LockIcon,
        available: PlusIcon,
        active: CheckCircleIcon,
        maxed: CrownIcon,
    } as const;

    $: NodeIcon = stateIcons[state] ?? LockIcon;
</script>

<ContextMenu {x} {y} {isOpen} title={"Node"} ariaLabel="Node actions" {onClose}>
    <div class="node-stats">
        <div class="node-icon-wrapper">
            <svelte:component this={NodeIcon} />
        </div>
        <div class="node-stats-content">
            <div class="stat-row">
                <span class="stat-label">DB & Val ATK Bonus</span>
                <span class="stat-value">30,000%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Levels:</span>
                <span class="stat-value"
                    >{formatNumber(level)} / {formatNumber(maxLevel)}</span
                >
            </div>
            <div class="level-progress">
                <div
                    class="level-progress-bar"
                    style={`width: ${maxLevel > 0 ? (level / maxLevel) * 100 : 0}%`}
                ></div>
            </div>
        </div>
    </div>
    <div class="button-grid">
        <Button
            on:click={() => {
                if (nodeIndex === null || !onIncrement) return;
                onIncrement(nodeIndex);
            }}
            disabled={nodeIndex === null || level >= maxLevel}
            icon={CaretUpIcon}
            positive
        >
            +1
        </Button>
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
        <Button
            on:click={() => {
                if (nodeIndex === null || !onDecrement) return;
                onDecrement(nodeIndex);
            }}
            disabled={nodeIndex === null || level <= 0}
            icon={CaretDownIcon}
            negative
        >
            -1
        </Button>
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
    }

    .level-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent-light));
        border-radius: 4px;
        transition: width var(--ease);
        position: relative;
    }

    .level-progress::after {
        content: "";
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent calc(20% - 0.5px),
            rgba(0, 0, 0, 0.35) calc(20% - 0.5px),
            rgba(0, 0, 0, 0.35) 20%
        );
        pointer-events: none;
    }

    .button-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--spacing-md);
    }
</style>
