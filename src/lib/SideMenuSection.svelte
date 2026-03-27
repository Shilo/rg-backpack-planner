<script lang="ts">
    export let title = "";
</script>

<section class="side-menu-section">
    <div class="side-menu-section__header">
        <h3 class="side-menu-section__title">{title}</h3>
        <div class="side-menu-section__action">
            <slot name="action" />
        </div>
    </div>
    <div class="side-menu-section__content">
        <slot />
    </div>
</section>

<style>
    .side-menu-section {
        display: grid;
        gap: var(--spacing-md);
    }

    .side-menu-section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
    }

    .side-menu-section__title {
        margin: 0;
        font-size: var(--font-xs);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--text-disabled);
        padding-left: var(--spacing-sm);
        border-left: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    }

    .side-menu-section__action {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .side-menu-section__action:empty {
        display: none;
    }

    .side-menu-section__content {
        display: grid;
        gap: var(--spacing-lg);
    }

    .side-menu-section__content > :global(.button:has(.button-text:not(:empty))),
    .side-menu-section__content > :global(.button-group) {
        min-width: 0;
    }
</style>
