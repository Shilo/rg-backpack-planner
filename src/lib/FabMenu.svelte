<script context="module" lang="ts">
    import type { Component as FabMenuComponent } from "svelte";

    export type FabMenuAction = {
        id: string;
        icon: FabMenuComponent;
        label: string;
        onClick: () => void | Promise<void>;
        ariaLabel?: string;
        disabled?: boolean;
    };
</script>

<script lang="ts">
    import type { Component } from "svelte";
    import { triggerHaptic } from "./hapticsStore";

    type FabMenuAction = {
        id: string;
        icon: Component;
        label: string;
        onClick: () => void | Promise<void>;
        ariaLabel?: string;
        disabled?: boolean;
    };

    export let actions: FabMenuAction[] = [];
    export let ariaLabel = "Floating action menu";
    export let iconSize = 24;

    async function handleActionClick(action: FabMenuAction): Promise<void> {
        if (action.disabled) return;
        triggerHaptic();
        await action.onClick();
    }
</script>

<div class="fab-menu" role="toolbar" aria-label={ariaLabel}>
    {#each actions as action (action.id)}
        <button
            type="button"
            class="fab-menu__action"
            aria-label={action.ariaLabel ?? action.label}
            disabled={action.disabled}
            on:click={() => handleActionClick(action)}
        >
            <span class="fab-menu__label">{action.label}</span>
            <span class="fab-menu__icon" aria-hidden={true}>
                <svelte:component this={action.icon} size={iconSize} />
            </span>
        </button>
    {/each}
</div>

<style>
    .fab-menu {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-md);
    }

    .fab-menu__action {
        min-width: 144px;
        min-height: 38px;
        border-radius: var(--radius);
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 36%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 20%, var(--bg-raised)) !important;
        color: var(--text);
        box-shadow: var(--shadow-node, var(--shadow));
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-lg);
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        text-transform: none;
        cursor: pointer;
        transition:
            transform var(--ease),
            filter var(--ease),
            background var(--ease),
            border-color var(--ease);
        animation: fab-action-in 0.18s cubic-bezier(0.05, 0.7, 0.1, 1) both;
    }

    .fab-menu__action:nth-child(1) { animation-delay: 0ms; }
    .fab-menu__action:nth-child(2) { animation-delay: 25ms; }
    .fab-menu__action:nth-child(3) { animation-delay: 50ms; }
    .fab-menu__action:nth-child(4) { animation-delay: 75ms; }
    .fab-menu__action:nth-child(5) { animation-delay: 100ms; }

    .fab-menu__icon {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
    }

    .fab-menu__label {
        line-height: 1;
        font-weight: 600;
        white-space: nowrap;
    }

    .fab-menu__action:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .fab-menu__action:hover:not(:disabled) {
            filter: var(--brightness-hover);
        }
    }

    .fab-menu__action:active:not(:disabled) {
        transform: scale(0.97);
        filter: var(--brightness-hover);
    }

    .fab-menu__action:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
    }
</style>
