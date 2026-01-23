<script lang="ts">
  import type { ComponentType } from "svelte";
  export let checked = false;
  export let label = "";
  export let ariaLabel: string | undefined = undefined;
  export let tooltipText: string | undefined = undefined;
  export let icon: ComponentType | null = null;
  export let iconClass = "toggle-icon";
  export let onToggle: (() => void) | null = null;
  import { triggerHaptic } from "./haptics";
  import { tooltip } from "./tooltip";
</script>

<button
  class="toggle-row"
  type="button"
  on:click={() => {
    onToggle?.();
    triggerHaptic();
  }}
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel ?? label}
  use:tooltip={tooltipText}
>
  {#if icon}
    <svelte:component this={icon} class={iconClass} aria-hidden="true" />
  {/if}
  {#if label}
    <span class="toggle-row__label">{label}</span>
  {/if}
  <div class="toggle-switch" class:active={checked}>
    <div class="toggle-switch__thumb"></div>
  </div>
</button>

<style>
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    height: 40px;
    padding: 10px 12px;
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    border-radius: 12px;
    color: #d4e1ff;
    font-size: 0.85rem;
    line-height: 1.1;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease,
      transform 0.12s ease,
      filter 0.12s ease;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  .toggle-row:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .toggle-row:hover {
      filter: brightness(1.18);
    }
  }

  .toggle-row:active {
    transform: scale(0.97);
    filter: brightness(1.2);
  }

  .toggle-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: currentColor;
  }

  .toggle-row__label {
    flex: 1;
    user-select: none;
  }

  .toggle-switch {
    position: relative;
    width: 50px;
    height: 30px;
    border-radius: 15px;
    background: rgba(44, 60, 97, 0.8);
    border: 1px solid rgba(44, 60, 97, 0.9);
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
    flex-shrink: 0;
  }

  .toggle-switch.active {
    background: rgba(74, 144, 226, 0.9);
    border-color: rgba(74, 144, 226, 1);
  }

  .toggle-switch__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #ffffff;
    transition: transform 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-switch.active .toggle-switch__thumb {
    transform: translateX(20px);
  }
</style>
