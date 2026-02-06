<script lang="ts">
    import { HexagonIcon } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { openTechCrystalsOwnedModal } from "./techCrystalModal";
    import { techCrystalsSpent, techCrystalsOwned } from "./techCrystalStore";
    import { formatNumber } from "./mathUtil";

    $: hasOwned = $techCrystalsOwned > 0;

    const tooltipPrefix = "Tech Crystals\n";
    $: tooltipText = `${tooltipPrefix} spent` + (hasOwned ? ` / owned` : "");
</script>

<Button
    class="currency-display"
    type="button"
    aria-label="Tech Crystals"
    {tooltipText}
    on:click={() => openTechCrystalsOwnedModal($techCrystalsOwned)}
>
    <span
        class="currency-spent"
        class:is-negative={$techCrystalsSpent > $techCrystalsOwned && hasOwned}
    >
        {formatNumber($techCrystalsSpent)}
    </span>
    {#if hasOwned}
        <span class="currency-separator"> / </span>
        <span class="currency-owned">{formatNumber($techCrystalsOwned)}</span>
    {/if}
    <HexagonIcon size={26} weight="fill" aria-hidden="true" />
</Button>

<style>
    :global(.currency-display) {
        border-radius: var(--radius-full) !important;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 6px 10px 6px 12px;
        font-weight: var(--weight-bold);
        font-size: var(--font-xl) !important;
        letter-spacing: var(--tracking);
    }

    :global(.currency-display .button-text) {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        line-height: var(--leading-none);
    }

    :global(.currency-display svg) {
        display: block;
    }

    .currency-spent {
        text-align: right;
        color: white;
    }

    .currency-spent.is-negative {
        color: var(--accent-danger);
    }

    .currency-separator {
        color: var(--text-muted);
    }

    .currency-owned {
        color: var(--text);
    }
</style>
