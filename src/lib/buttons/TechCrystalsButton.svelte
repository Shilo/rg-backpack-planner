<script lang="ts">
  import { HexagonIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import { formatNumber } from "../mathUtil";
  import { openTechCrystalsOwnedModal } from "../techCrystalModal";
  import {
    techCrystalsAvailable,
    techCrystalsOwned,
  } from "../techCrystalStore";

  export let disabled: boolean | undefined = false;

  $: hasOwned = $techCrystalsOwned > 0;
</script>

<Button
  on:click={() => {
    openTechCrystalsOwnedModal($techCrystalsOwned);
  }}
  tooltipText={"Change your Tech Crystal owned (budget)"}
  icon={HexagonIcon}
  iconClass="button-icon button-icon-filled"
  iconWeight="fill"
  {disabled}
>
  Tech Crystals spent:<br />
  <span
    class="tech-crystals-available"
    class:is-negative={$techCrystalsAvailable < 0 && hasOwned}
  >
    {formatNumber($techCrystalsAvailable)}
  </span>
  <span class="tech-crystals-separator"> / </span>
  <span class="tech-crystals-owned">{formatNumber($techCrystalsOwned)}</span>
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
