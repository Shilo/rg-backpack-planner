<script lang="ts">
    /** Controls which button owns the shared border between items.
     *  "left" (default): the left button keeps its right border.
     *  "right": the right button keeps its left border instead. */
    export let separatorSide: "left" | "right" = "left";

    let restClass: string | undefined = undefined;
    let groupProps: Record<string, unknown> = {};
    $: ({ class: restClass, ...groupProps } = $$restProps);
    $: classes = ["button-group", separatorSide === "right" ? "button-group-border-right" : "", restClass].filter(Boolean).join(" ");
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
