<script lang="ts">
    import type { Component } from "svelte";
    import { CaretRightIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";

    export let icon: Component | null = null;
    export let title = "";
    export let description = "";
    export let onClick: (() => void) | null = null;
    export let disabled: boolean | undefined = undefined;
</script>

<button
    class="settings-nav-button"
    type="button"
    {disabled}
    {...$$restProps}
    on:click={() => {
        triggerHaptic();
        onClick?.();
    }}
>
    {#if icon}
        <svelte:component this={icon} class="settings-nav-icon" aria-hidden={true} size={26} />
    {/if}
    <div class="settings-nav-text">
        <span class="settings-nav-title">{title}</span>
        {#if description}
            <span class="settings-nav-description">{description}</span>
        {/if}
    </div>
    <CaretRightIcon class="settings-nav-arrow" size={12} aria-hidden={true} />
</button>

<style>
    .settings-nav-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
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

    .settings-nav-button:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-disabled);
        filter: none;
        transform: none;
    }

    .settings-nav-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-nav-button:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-nav-button:not(:disabled):active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .settings-nav-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .settings-nav-title {
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .settings-nav-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    :global(.settings-nav-arrow) {
        flex: 0 0 auto;
        opacity: 0.5;
    }
</style>
