<script lang="ts">
  import { tooltip } from "./tooltip";

  export let available = 0;
  export let owned: number = 0;

  $: hasOwned = owned > 0;
  $: availableText = `${available}`;
  $: ownedText = `${owned}`;

  const tooltipPrefix = "Tech Crystals";
  $: tooltipText = hasOwned
    ? `${tooltipPrefix} available / owned`
    : `${tooltipPrefix} spent`;
</script>

<button
  class="currency-display"
  type="button"
  aria-label="Tech Crystals"
  use:tooltip={tooltipText}
>
  <span
    class="currency-available"
    class:is-negative={available < 0 && hasOwned}
  >
    {availableText}
  </span>
  {#if hasOwned}
    <span class="currency-separator"> / </span>
    <span class="currency-owned">{ownedText}</span>
  {/if}
  <span class="currency-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" role="img" focusable="false">
      <path d="M12 2l6 6-6 14-6-14 6-6z" fill="currentColor" />
    </svg>
  </span>
</button>

<style>
  .currency-display {
    border: 1px solid rgba(92, 126, 200, 0.6);
    background: rgba(17, 27, 45, 0.7);
    cursor: default;
    font: inherit;
    color: inherit;
    padding: 6px 10px 6px 12px;
    text-align: left;
    -webkit-user-select: none;
    user-select: none;
    appearance: none;
    -webkit-appearance: none;
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 25;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border-radius: 999px;
    box-shadow: none;
    font-weight: 600;
    font-size: 0.95rem;
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

  .currency-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #7dd3fc;
  }

  .currency-icon svg {
    width: 100%;
    height: 100%;
  }
</style>
