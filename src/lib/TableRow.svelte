<script lang="ts">
    export let title: string;
    export let description: string | undefined = undefined;
    export let onclick: (() => void) | undefined = undefined;

    $: interactive = !!onclick;

    let startY = 0;
    let scrolled = false;
    const SCROLL_THRESHOLD = 10;

    function handlePointerDown(e: PointerEvent) {
        startY = e.clientY;
        scrolled = false;
    }

    function handlePointerMove(e: PointerEvent) {
        if (Math.abs(e.clientY - startY) > SCROLL_THRESHOLD) {
            scrolled = true;
        }
    }

    function handleClick() {
        if (scrolled || !onclick) return;
        onclick();
    }
</script>

{#if interactive}
    <button
        class="table-row interactive"
        type="button"
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:click={handleClick}
    >
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
    </button>
{:else}
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
{/if}

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

    :global(.table-row-trailing:has(> :only-child)) {
        align-self: center;
    }

    /* Interactive button variant — active only when onclick is provided.
       Uses M3-style state layers (on-surface at 8%/12%) since brightness
       filter has no visible effect on a transparent background. */
    .interactive {
        border: none;
        border-bottom: var(--border-width) solid var(--border-subtle);
        background: transparent;
        font: inherit;
        color: inherit;
        text-align: left;
        width: 100%;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition:
            transform var(--ease),
            background var(--ease);
    }

    .interactive:last-child {
        border-bottom: none;
    }

    @media (hover: hover) {
        .interactive:hover {
            background: color-mix(in srgb, var(--text) 8%, transparent);
        }
    }

    .interactive:active {
        background: color-mix(in srgb, var(--text) 12%, transparent);
        transform: scale(0.96);
    }

    .interactive:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }
</style>
