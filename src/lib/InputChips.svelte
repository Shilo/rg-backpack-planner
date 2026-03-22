<script lang="ts">
    import InputChip from "./InputChip.svelte";

    /**
     * Multi-shortcut display with unified combo chips.
     * Parses an input string into individual combo chips.
     * Works for any input type: keyboard, mouse, touch.
     *
     * Optional `tint` passes through to each chip for
     * input-type color coding. Omit for neutral styling.
     *
     * Separators:
     *   " / " → alternative inputs (separate chips)
     *   " + " → modifier combos (within a single chip)
     *
     * Examples:
     *   "A"                          → [A]
     *   "Ctrl + Z"                   → [Ctrl│Z]
     *   "Tab / Shift + Tab / ← / →" → [Tab] [Shift│Tab] [←] [→]
     *   "Tap / Long Press"           → [Tap] [Long Press]
     */
    export let keys: string;
    export let tint: "keyboard" | "mouse" | "touch" | undefined = undefined;
    /** Render chips in a row instead of stacked. */
    export let inline: boolean = false;

    $: combos = keys.split(" / ");
</script>

<span class="ks" class:ks--inline={inline} role="group" aria-label={keys}>
    {#each combos as combo}
        <InputChip keys={combo} {tint} />
    {/each}
</span>

<style>
    .ks {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-sm);
    }

    .ks--inline {
        flex-direction: row;
    }
</style>
