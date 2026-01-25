<script lang="ts">
  import { BarChart2, Gamepad2, Menu, Settings, X } from "lucide-svelte";
  import Button from "./Button.svelte";
  import { triggerHaptic } from "./haptics";
  import { tooltip } from "./tooltip";

  export let activeTab: 'statistics' | 'settings' | 'controls' = 'statistics';
  export let isOpen = false;
  export let onClose: (() => void) | null = null;

  function handleTabClick(tab: 'statistics' | 'settings' | 'controls') {
    activeTab = tab;
    triggerHaptic();
  }
</script>

<div class="side-bar-tab-bar">
  <div class="side-bar-tab-bar__tabs">
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === 'statistics'}
      aria-label="Statistics"
      use:tooltip={"Statistics"}
      on:click={() => handleTabClick('statistics')}
      type="button"
    >
      <svelte:component this={BarChart2} class="side-bar-tab-bar__tab-icon" aria-hidden="true" />
    </button>
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === 'settings'}
      aria-label="Settings"
      use:tooltip={"Settings"}
      on:click={() => handleTabClick('settings')}
      type="button"
    >
      <svelte:component this={Settings} class="side-bar-tab-bar__tab-icon" aria-hidden="true" />
    </button>
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === 'controls'}
      aria-label="Controls"
      use:tooltip={"Controls"}
      on:click={() => handleTabClick('controls')}
      type="button"
    >
      <svelte:component this={Gamepad2} class="side-bar-tab-bar__tab-icon" aria-hidden="true" />
    </button>
  </div>
  <Button
    class="side-bar-tab-bar__close-button"
    aria-label={isOpen ? "Close menu" : "Menu"}
    tooltipText={isOpen ? "Close menu" : "Open menu"}
    on:click={() => onClose?.()}
    icon={isOpen ? X : Menu}
    iconClass="menu-button-icon"
  ></Button>
</div>

<style>
  .side-bar-tab-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--side-menu-tab-height);
  }

  .side-bar-tab-bar__tabs {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: stretch;
    gap: 0;
    padding: 0;
    margin-right: calc(var(--side-menu-tab-height) + 10px);
    height: var(--side-menu-tab-height);
    pointer-events: none;
  }

  .side-bar-tab-bar__tab-button {
    flex: 1;
    border: 1px solid #2c3c61;
    background: transparent;
    color: #8fa4ce;
    border-radius: 0;
    height: var(--side-menu-tab-height);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
    pointer-events: auto;
    min-width: 0;
  }

  :global(.side-bar-tab-bar__tab-icon) {
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
  }

  .side-bar-tab-bar__tab-button:not(:first-child) {
    border-left: none;
  }

  .side-bar-tab-bar__tab-button.active {
    background: rgba(34, 49, 82, 0.78);
    color: #e7efff;
    border-color: #4f6fbf;
  }

  .side-bar-tab-bar__tab-button:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .side-bar-tab-bar__tab-button:not(.active):hover {
      filter: brightness(1.18);
    }
  }

  .side-bar-tab-bar__tab-button:active {
    transform: scale(0.97);
    filter: brightness(1.2);
  }

  :global(.side-bar-tab-bar__close-button) {
    border: 1px solid #2c3c61 !important;
    background: transparent !important;
    color: #8fa4ce !important;
    width: var(--side-menu-tab-height);
    height: var(--side-menu-tab-height);
    border-radius: 0 !important;
    font-size: 1.35rem;
    padding: 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    right: 10px;
    bottom: 0;
    z-index: 12;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
    min-width: 0 !important;
  }

  :global(.side-bar-tab-bar__close-button .menu-button-icon) {
    width: 24px;
    height: 24px;
  }

  @media (hover: hover) {
    :global(.side-bar-tab-bar__close-button:not(:disabled):hover) {
      filter: brightness(1.18) !important;
    }
  }

  :global(.side-bar-tab-bar__close-button:not(:disabled):active) {
    transform: scale(0.97) !important;
    filter: brightness(1.2) !important;
  }
</style>
