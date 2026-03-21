<script lang="ts">
    /**
     * Unified input combo chip with inset dividers.
     * Renders an input combination as a single cohesive pill
     * with thin border dividers between segments.
     *
     * Parses " + " to identify individual parts within one combo.
     * Works for any input type: keyboard, mouse, touch.
     *
     * Optional `tint` applies a subtle color coding by input type:
     *   "keyboard" → cool blue
     *   "mouse"    → green
     *   "touch"    → warm amber
     *   undefined  → neutral (no color coding)
     *
     * Examples:
     *   "Tab"          → [Tab]
     *   "Ctrl + Z"     → [Ctrl│Z]
     *   "Ctrl + Click" → [Ctrl│Click]
     *   "Tap"          → [Tap]
     */
    export let keys: string;
    export let tint: "keyboard" | "mouse" | "touch" | undefined = undefined;

    $: segments = keys.split(" + ");
</script>

<span
    class="kc"
    class:kc--keyboard={tint === "keyboard"}
    class:kc--mouse={tint === "mouse"}
    class:kc--touch={tint === "touch"}
    role="img"
    aria-label={keys}
>
    {#each segments as key, i}
        <span
            class="kc-seg"
            class:kc-mod={segments.length > 1 && i < segments.length - 1}
        >{key}</span>
    {/each}
</span>

<style>
    .kc {
        --kc-tint: transparent;
        display: inline-flex;
        align-items: center;
        font-family: inherit;
        font-size: inherit;
        line-height: var(--leading-none);
        border: var(--border-width) solid color-mix(in srgb, var(--border) 60%, transparent);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--surface) 60%, var(--bg-input));
        overflow: hidden;
        white-space: nowrap;
        vertical-align: baseline;
    }

    /* ── Input-type color coding ── */

    .kc--keyboard {
        --kc-tint: oklch(0.72 0.14 260);
        background: color-mix(in srgb, var(--kc-tint) 6%, var(--surface) 60%);
        border-color: color-mix(in srgb, var(--kc-tint) 20%, var(--border) 40%);
    }

    .kc--mouse {
        --kc-tint: oklch(0.75 0.12 145);
        background: color-mix(in srgb, var(--kc-tint) 6%, var(--surface) 60%);
        border-color: color-mix(in srgb, var(--kc-tint) 20%, var(--border) 40%);
    }

    .kc--touch {
        --kc-tint: oklch(0.75 0.12 75);
        background: color-mix(in srgb, var(--kc-tint) 6%, var(--surface) 60%);
        border-color: color-mix(in srgb, var(--kc-tint) 20%, var(--border) 40%);
    }

    /* ── Segments ── */

    .kc-seg {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px var(--spacing-sm);
        color: var(--text-disabled);
    }

    .kc--keyboard .kc-seg,
    .kc--mouse .kc-seg,
    .kc--touch .kc-seg {
        color: color-mix(in srgb, var(--kc-tint) 40%, var(--text-disabled));
    }

    .kc-seg + .kc-seg {
        border-left: var(--border-width) solid color-mix(in srgb, var(--kc-tint, var(--border)) 35%, transparent);
    }

    .kc-mod {
        opacity: 0.72;
    }
</style>
