<script lang="ts">
  import { HexagonIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import { formatNumber } from "../mathUtil";
  import { openTechCrystalsOwnedModal } from "../techCrystalModal";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
    getTechCrystalsOwnedFromStorage,
    getTechCrystalsAvailableFromStorage,
  } from "../techCrystalStore";

  export let disabled: boolean | undefined = false;
  export let tooltipSubject: string = "your";

  // Store localStorage values when disabled to avoid re-reading on every reactive update
  let storageOwned = 0;
  let storageAvailable = 0;

  // Update storage values only when disabled changes to true
  $: if (disabled) {
    storageOwned = getTechCrystalsOwnedFromStorage();
    storageAvailable = getTechCrystalsAvailableFromStorage();
  }

  // When disabled, use storage values from localStorage (non-reactive)
  // When enabled, use reactive stores
  $: owned = disabled ? storageOwned : $techCrystalsOwned;
  $: available = disabled ? storageAvailable : $techCrystalsAvailable;
  $: hasOwned = owned > 0;
</script>

<Button
  on:click={() => {
    openTechCrystalsOwnedModal(owned);
  }}
  tooltipText={`Change ${tooltipSubject} Tech Crystal owned (budget)`}
  icon={HexagonIcon}
  iconClass="button-icon button-icon-filled"
  iconWeight="fill"
  {disabled}
>
  Tech Crystals spent:<br />
  <span
    class="tech-crystals-available"
    class:is-negative={available < 0 && hasOwned}
  >
    {formatNumber(available)}
  </span>
  <span class="tech-crystals-separator"> / </span>
  <span class="tech-crystals-owned">{formatNumber(owned)}</span>
</Button>

<style>
  .tech-crystals-available {
    color: #ffffff;
  }

  .tech-crystals-available.is-negative {
    color: #f87171;
  }

  .tech-crystals-separator {
    color: #c7d6ff;
  }

  .tech-crystals-owned {
    color: #e6f0ff;
  }

  :global(.button-icon-filled) {
    fill: currentColor;
    stroke: none;
  }
</style>
