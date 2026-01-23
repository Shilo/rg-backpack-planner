<script lang="ts">
  import { Hexagon } from "lucide-svelte";
  import Button from "./Button.svelte";
  import { openTechCrystalsOwnedModal } from "./techCrystalModal";
  import { techCrystalsAvailable, techCrystalsOwned } from "./techCrystalStore";
  import { formatNumber } from "./mathUtil";

  $: hasOwned = $techCrystalsOwned > 0;

  const tooltipPrefix = "Tech Crystals\n";
  $: tooltipText = `${tooltipPrefix} available` + (hasOwned ? ` / owned` : "");
</script>

<Button
  class="currency-display"
  type="button"
  aria-label="Tech Crystals"
  {tooltipText}
  on:click={() => openTechCrystalsOwnedModal($techCrystalsOwned)}
>
  <span
    class="currency-available"
    class:is-negative={$techCrystalsAvailable < 0 && hasOwned}
  >
    {formatNumber($techCrystalsAvailable)}
  </span>
  {#if hasOwned}
    <span class="currency-separator"> / </span>
    <span class="currency-owned">{formatNumber($techCrystalsOwned)}</span>
  {/if}
  <Hexagon size={20} fill="currentColor" aria-hidden="true" />
</Button>

<style>
  :global(.currency-display) {
    border-radius: 999px !important;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 6px 10px 6px 12px;
    font-weight: 600;
    font-size: 1.25rem !important;
    letter-spacing: 0.02em;
  }

  :global(.currency-display .button-text) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    line-height: 1;
  }

  :global(.currency-display svg) {
    display: block;
  }

  .currency-available {
    text-align: right;
    color: #ffffff;
  }

  .currency-available.is-negative {
    color: #f87171;
  }

  .currency-separator {
    color: #c7d6ff;
  }

  .currency-owned {
    color: #e6f0ff;
  }
</style>
