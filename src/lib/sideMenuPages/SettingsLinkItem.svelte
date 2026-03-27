<script lang="ts">
    import type { Component } from "svelte";
    import { ArrowSquareOutIcon, CaretRightIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";

    export let icon: Component | null = null;
    export let label = "";
    export let value = "";
    export let external = false;
    export let onClick: (() => void) | null = null;
</script>

<button
    class="settings-link-item"
    type="button"
    on:click={() => {
        triggerHaptic();
        onClick?.();
    }}
>
    {#if icon}
        <span class="settings-link-icon" aria-hidden="true">
            <svelte:component this={icon} size={20} />
        </span>
    {/if}
    <span class="settings-link-label">{label}</span>
    {#if value}
        <span class="settings-link-value">{value}</span>
    {/if}
    {#if external}
        <ArrowSquareOutIcon class="settings-link-arrow" size={14} aria-hidden="true" />
    {:else}
        <CaretRightIcon class="settings-link-arrow" size={12} aria-hidden="true" />
    {/if}
</button>

<style>
    .settings-link-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-raised);
        border: none;
        border-bottom: var(--border-width) solid var(--border);
        color: var(--text-muted);
        font-size: var(--font-base);
        text-align: left;
        cursor: pointer;
        line-height: var(--leading-none);
        transition:
            transform var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .settings-link-item:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-link-item:hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-link-item:active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .settings-link-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .settings-link-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .settings-link-label {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .settings-link-value {
        color: var(--text-disabled);
        flex-shrink: 0;
    }

    :global(.settings-link-arrow) {
        flex: 0 0 auto;
        opacity: 0.5;
    }
</style>
