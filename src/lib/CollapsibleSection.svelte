<script lang="ts">
    import { CaretDownIcon } from "phosphor-svelte";
    import { triggerHaptic } from "./hapticsStore";

    export let title = "";
    export let isOpen = false;
</script>

<div class="section" class:is-open={isOpen}>
    <button
        class="section-header"
        on:click={() => { isOpen = !isOpen; triggerHaptic(); }}
        aria-expanded={isOpen}
    >
        <span class="section-title">{title}</span>
        <span class="section-arrow">
            <CaretDownIcon size={12} weight="bold" />
        </span>
    </button>
    <div class="section-body" aria-hidden={!isOpen}>
        <div class="section-content">
            <slot />
        </div>
    </div>
</div>

<style>
    .section {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: color-mix(in srgb, var(--surface) 80%, var(--text));
        border-top: var(--border-width) solid var(--border-subtle);
        border-bottom: var(--border-width) solid var(--border-subtle);
        border-left: none;
        border-right: none;
        color: var(--text-muted);
        cursor: pointer;
        text-align: left;
        position: sticky;
        top: 0;
        z-index: 1;
    }

    .section-header:hover {
        filter: var(--brightness-hover);
    }

    .section-title {
        flex: 1;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--text-muted);
    }

    .section-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;
        color: var(--text-muted);
        transform: rotate(-90deg);
        transition: transform var(--ease-standard);
    }

    .is-open .section-arrow {
        transform: rotate(0deg);
    }

    .section-body {
        display: grid;
        grid-template-rows: 0fr;
        overflow: hidden;
        transition: grid-template-rows var(--ease-emphasis);
    }

    .is-open .section-body {
        grid-template-rows: 1fr;
    }

    .section-content {
        min-height: 0;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .is-open .section-content {
        opacity: 1;
        transition: opacity 0.2s 0.05s ease;
    }

    @media (prefers-reduced-motion: reduce) {
        .section-arrow,
        .section-body,
        .section-content {
            transition: none;
        }
    }
</style>
