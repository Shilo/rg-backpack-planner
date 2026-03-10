<script lang="ts">
    import { CaretDownIcon, CaretRightIcon } from "phosphor-svelte";
    import { createEventDispatcher } from "svelte";
    import { triggerHaptic } from "./hapticsStore";

    export let title = "";
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
        <span class="accordion-title">{title}</span>
        <span class="accordion-arrow">
            {#if isOpen}
                <CaretDownIcon size={12} weight="bold" />
            {:else}
                <CaretRightIcon size={12} weight="bold" />
            {/if}
        </span>
    </button>
    {#if isOpen}
        <div class="accordion-content">
            <slot />
        </div>
    {/if}
</div>

<style>
    .accordion {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .accordion-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        cursor: pointer;
        text-align: left;
        transition:
            transform var(--ease),
            filter var(--ease),
            border-color var(--ease);
    }

    .accordion-header:hover {
        filter: var(--brightness-hover);
        border-color: var(--border-subtle);
    }

    .accordion-header:active {
        transform: scale(0.98);
        filter: var(--brightness-hover);
    }

    .accordion-title {
        flex: 1;
        font-weight: var(--weight-bold);
        color: var(--text);
    }

    .accordion-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        color: var(--text-muted);
    }

    .accordion-content {
        padding: var(--spacing-md) 0;
        display: grid;
        gap: var(--spacing-md);
    }
</style>
