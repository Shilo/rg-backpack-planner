<script lang="ts">
    import { CaretDownIcon } from "phosphor-svelte";
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

    .accordion-body {
        display: grid;
        grid-template-rows: 0fr;
        overflow: hidden;
        transition: grid-template-rows var(--ease-emphasis);
    }

    .is-open .accordion-body {
        grid-template-rows: 1fr;
    }

    .accordion-content {
        min-height: 0;
        display: grid;
        gap: var(--spacing-md);
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .is-open .accordion-content {
        padding-top: var(--spacing-md);
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
