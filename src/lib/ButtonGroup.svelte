<script lang="ts">
    /** Controls which button owns the shared border between items.
     *  "left" (default): the left button keeps its right border.
     *  "right": the right button keeps its left border instead. */
    export let separatorSide: "left" | "right" = "left";
    /** When true, children fill available space equally with text wrapping and icon collapse at small sizes. */
    export let fill = false;

    let restClass: string | undefined = undefined;
    let groupProps: Record<string, unknown> = {};
    $: ({ class: restClass, ...groupProps } = $$restProps);
    $: classes = ["button-group", separatorSide === "right" ? "button-group-border-right" : "", fill ? "button-group-fill" : "", restClass].filter(Boolean).join(" ");
</script>

<div class={classes} {...groupProps}>
    <slot />
</div>

<style>
    .button-group {
        display: flex;
        align-items: stretch;
        gap: 0;
    }

    .button-group > :global(*) {
        align-self: stretch;
    }

    .button-group-fill > :global(*) {
        flex: 1 1 auto;
        min-width: 0 !important;
        height: auto !important;
        min-height: 32px;
    }

    .button-group-fill :global(.button-text) {
        white-space: normal;
        overflow-wrap: break-word;
    }

    .button-group-fill :global(.button-icon) {
        flex: 0 0 auto !important;
    }

    .button-group > :global(:not(:last-child)) {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }

    .button-group > :global(:not(:first-child)) {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: var(--border-width) solid transparent;
    }

    .button-group:has(:global(:active)) > :global(:not(:first-child)) {
        border-left-color: var(--border);
    }

    .button-group-border-right > :global(:not(:last-child)) {
        border-right: var(--border-width) solid transparent;
    }

    .button-group-border-right > :global(:not(:first-child)) {
        border-left: var(--border-width) solid var(--border);
    }

    .button-group-border-right:has(:global(:active)) > :global(:not(:last-child)) {
        border-right-color: var(--border);
    }
</style>
