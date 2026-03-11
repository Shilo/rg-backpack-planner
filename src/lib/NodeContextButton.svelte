<script lang="ts">
    import type { Component } from "svelte";
    import { TechCrystalIcon } from "./customIcons";
    import { triggerHaptic } from "./hapticsStore";
    import { showToast } from "./toast";
    import { formatNumber } from "./mathUtil";

    export let icon: Component | null = null;
    export let label: string;
    export let crystalValue: number | null = null;
    export let positive = false;
    export let negative = false;
    export let disabled: boolean | undefined = undefined;
    export let toastMessage: string | undefined = undefined;
    export let toastNegative = false;
    export let onClick: (() => void) | null = null;
</script>

<button
    class="node-ctx-btn"
    class:positive
    class:negative
    {disabled}
    on:click={() => {
        if (onClick || toastMessage) triggerHaptic();
        if (onClick) onClick();
        if (toastMessage) {
            showToast(toastMessage, {
                tone: toastNegative ? "negative" : "positive",
            });
        }
    }}
>
    <span class="btn-grid" class:has-crystal={crystalValue != null}>
        <span class="icon-cell action-icon">
            {#if icon}
                <svelte:component this={icon} size={18} aria-hidden="true" />
            {/if}
        </span>
        <span class="action-label">{label}</span>
        {#if crystalValue != null}
            <span class="icon-cell crystal-icon">
                <TechCrystalIcon size={14} weight="fill" aria-hidden="true" />
            </span>
            <span class="crystal-value">{formatNumber(crystalValue)}</span>
        {/if}
    </span>
</button>

<style>
    .node-ctx-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 2px;
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        border-radius: var(--radius);
        padding: var(--spacing-sm) var(--spacing-md);
        min-height: 48px;
        cursor: pointer;
        transition:
            transform var(--ease),
            filter var(--ease);
        line-height: var(--leading-none);
    }

    .node-ctx-btn.positive {
        border-color: var(--success-border);
        background: var(--success-bg);
    }

    .node-ctx-btn.negative {
        border-color: var(--danger-border);
        background: var(--danger-bg);
    }

    .node-ctx-btn:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-disabled);
        filter: none;
        transform: none;
    }

    .node-ctx-btn:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .node-ctx-btn:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .node-ctx-btn:not(:disabled):active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .btn-grid {
        display: grid;
        grid-template-columns: 18px 1fr;
        gap: 0 var(--spacing-sm);
        align-items: center;
    }

    .btn-grid.has-crystal {
        grid-template-rows: auto auto;
    }

    .icon-cell {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .action-label {
        font-size: var(--font-base);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
    }

    .crystal-value {
        font-size: var(--font-base);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .crystal-icon :global(svg) {
        color: var(--text-muted);
    }

    .positive .action-label,
    .positive .action-icon :global(svg) {
        color: var(--success-text);
    }

    .negative .action-label,
    .negative .action-icon :global(svg) {
        color: var(--danger-text);
    }

    :disabled .action-label,
    :disabled .action-icon :global(svg) {
        color: var(--text-disabled);
    }
</style>
