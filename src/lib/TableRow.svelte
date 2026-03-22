<script lang="ts">
    export let title: string;
    export let description: string | undefined = undefined;
</script>

<li class="table-row">
    <span class="table-row-icon">
        <slot name="icon" />
    </span>
    <div class="table-row-text">
        <span class="table-row-title">{title}</span>
        {#if description}
            <span class="table-row-desc">{description}</span>
        {/if}
    </div>
    <div class="table-row-trailing">
        <slot />
    </div>
</li>

<style>
    .table-row {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: var(--border-width) solid var(--border-subtle);
    }

    .table-row:last-child {
        border-bottom: none;
    }

    .table-row-icon {
        width: 18px;
        height: 33px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        align-self: flex-start;
        color: var(--text-muted);
    }

    .table-row-icon :global(svg) {
        width: 18px;
        height: 18px;
        display: block;
    }

    .table-row-text {
        flex: 1;
        min-width: 0;
        overflow-wrap: break-word;
    }

    .table-row-title {
        display: block;
        font-size: var(--font-base);
        color: var(--text);
        line-height: var(--leading);
    }

    .table-row-desc {
        display: block;
        font-size: var(--font-xs);
        color: var(--text-disabled);
        margin-top: 1px;
        line-height: var(--leading);
    }

    .table-row-trailing {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 3px;
        flex-shrink: 0;
    }
</style>
