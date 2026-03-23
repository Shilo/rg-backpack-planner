<script lang="ts">
    import type { Component } from "svelte";
    import { CaretDownIcon } from "phosphor-svelte";
    import { createEventDispatcher } from "svelte";
    import { triggerHaptic } from "./hapticsStore";

    export let title = "";
    export let icon: Component | null = null;
    export let isOpen = false;

    const dispatch = createEventDispatcher<{
        toggle: { isOpen: boolean };
    }>();

    function toggle() {
        isOpen = !isOpen;
        triggerHaptic();
        dispatch("toggle", { isOpen });
    }
</script>

<div class="accordion" class:is-open={isOpen}>
    <button class="accordion-header" on:click={toggle} aria-expanded={isOpen}>
        {#if icon}
            <span class="accordion-icon">
                <svelte:component this={icon} size={20} weight="bold" />
            </span>
        {/if}
        <span class="accordion-title">{title}</span>
        <span class="accordion-arrow">
            <CaretDownIcon size={12} weight="bold" />
        </span>
    </button>
    <div class="accordion-body" aria-hidden={!isOpen}>
        <div class="accordion-content">
            <slot />
        </div>
    </div>
</div>

<style>
    .accordion {
        display: flex;
        flex-direction: column;
        width: 100%;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .accordion-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: var(--font-base);
        cursor: pointer;
        text-align: left;
        -webkit-tap-highlight-color: transparent;
        transition:
            transform var(--ease),
            background var(--ease);
    }

    @media (hover: hover) {
        .accordion-header:hover {
            background: color-mix(in srgb, var(--text) 8%, transparent);
        }
    }

    .accordion-header:active {
        background: color-mix(in srgb, var(--text) 12%, transparent);
    }

    .accordion-header:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: -2px;
    }

    .accordion-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        flex-shrink: 0;
        color: var(--text-muted);
        opacity: 0.7;
    }

    .accordion-title {
        flex: 1;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--text-muted);
    }

    .accordion-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        color: var(--text-muted);
        transform: rotate(-90deg);
        transition: transform var(--ease-standard);
    }

    .is-open .accordion-arrow {
        transform: rotate(0deg);
    }

    .is-open .accordion-header {
        border-bottom: var(--border-width) solid var(--border);
    }

    .accordion-body {
        display: grid;
        grid-template-rows: 0fr;
        overflow: hidden;
        background: var(--surface);
        transition: grid-template-rows var(--ease-emphasis);
    }

    .is-open .accordion-body {
        grid-template-rows: 1fr;
    }

    .accordion-content {
        min-height: 0;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .is-open .accordion-content {
        opacity: 1;
        transition: opacity 0.2s 0.05s ease;
    }

    @media (prefers-reduced-motion: reduce) {
        .accordion-arrow,
        .accordion-body,
        .accordion-content {
            transition: none;
        }
    }
</style>
