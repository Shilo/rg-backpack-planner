<script lang="ts">
    /**
     * Reusable keyboard shortcut display.
     * Parses shortcut strings into individually badged keys.
     *
     * Separators:
     *   " / " → alternative keys (or), rendered as /
     *   " + " → modifier combos (and), rendered as +
     *
     * Examples:
     *   "A"                          → [A]
     *   "Ctrl + Z"                   → [Ctrl] + [Z]
     *   "Tab / Shift + Tab / ← / →" → [Tab] / [Shift] + [Tab] / [←] / [→]
     */
    export let keys: string;

    type KbdCombo = string[];
    type KbdToken = { type: "combo"; keys: KbdCombo } | { type: "or" };

    function parse(input: string): KbdToken[] {
        const orGroups = input.split(" / ");
        const tokens: KbdToken[] = [];
        for (let i = 0; i < orGroups.length; i++) {
            if (i > 0) tokens.push({ type: "or" });
            tokens.push({ type: "combo", keys: orGroups[i].split(" + ") });
        }
        return tokens;
    }

    $: tokens = parse(keys);
</script>

<span class="kbd-group">
    {#each tokens as token}
        {#if token.type === "or"}
            <span class="kbd-sep">/</span>
        {:else}
            {#each token.keys as key, i}
                {#if i > 0}
                    <span class="kbd-sep">+</span>
                {/if}
                <kbd class="kbd">{key}</kbd>
            {/each}
        {/if}
    {/each}
</span>
