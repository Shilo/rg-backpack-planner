<script lang="ts">
    import { HexagonIcon } from "phosphor-svelte";
    import Button from "./Button.svelte";
    import { openTechCrystalsOwnedModal } from "./techCrystalModal";
    import { techCrystalsSpent, techCrystalsOwned } from "./techCrystalStore";
    import { formatNumber } from "./mathUtil";
    import { t } from "svelte-whisper";

    $: hasOwned = $techCrystalsOwned > 0;
    $: tooltipText = hasOwned
        ? $t("techCrystals.displayTooltipSpentOwned")
        : $t("techCrystals.displayTooltipSpentOnly");
</script>

<Button
    class="currency-display"
    type="button"
    aria-label={$t("techCrystals.displayTooltipSpentOwned")}
    {tooltipText}
    on:click={() => openTechCrystalsOwnedModal($techCrystalsOwned)}
    arrow="right"
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
    <HexagonIcon
        size={26}
        weight="fill"
        aria-hidden="true"
        style="color: var(--text-muted);"
    />
</Button>

<style>
    :global(.currency-display) {
        border-radius: var(--radius-lg) !important;
        display: inline-flex;
        align-items: center;
        gap: 2px !important;
        padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm)
            var(--spacing-lg);
        font-weight: var(--weight-bold);
        font-size: var(--font-lg) !important;
        letter-spacing: var(--tracking);
    }

    :global(.currency-display .button-text) {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        line-height: var(--leading-none);
    }

    :global(.currency-display svg) {
        display: block;
    }

    .currency-spent {
        text-align: right;
        color: var(--text);
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
