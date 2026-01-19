<script lang="ts">
  import Button from "./Button.svelte";
  import TechCrystalIcon from "./TechCrystalIcon.svelte";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
  } from "./techCrystalsStore";

  $: hasOwned = $techCrystalsOwned > 0;

  const tooltipPrefix = "Tech Crystals";
  $: tooltipText = hasOwned
    ? `${tooltipPrefix} available / owned`
    : `${tooltipPrefix} spent`;
</script>

<Button
  class="currency-display"
  type="button"
  small
  aria-label="Tech Crystals"
  {tooltipText}
>
  <span
    class="currency-available"
    class:is-negative={$techCrystalsAvailable < 0 && hasOwned}
  >
    {`${$techCrystalsAvailable}`}
  </span>
  {#if hasOwned}
    <span class="currency-separator"> / </span>
    <span class="currency-owned">{`${$techCrystalsOwned}`}</span>
  {/if}
  <TechCrystalIcon />
</Button>

<style>
  :global(.currency-display) {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 6;
    border-radius: 999px !important;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 6px 10px 6px 12px;
    font-weight: 600;
    font-size: 0.95rem !important;
    letter-spacing: 0.02em;
  }

  .currency-available {
    text-align: right;
    color: #e6f0ff;
  }

  .currency-available.is-negative {
    color: #f87171;
  }

  .currency-separator {
    color: #94a3c7;
  }

  .currency-owned {
    color: #c7d6ff;
  }
</style>
