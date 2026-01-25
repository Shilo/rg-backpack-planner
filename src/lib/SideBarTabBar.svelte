<script lang="ts">
  import { ChartBarIcon, GameControllerIcon, GearSixIcon } from "phosphor-svelte";
  import { triggerHaptic } from "./haptics";
  import { tooltip } from "./tooltip";
  import { getActiveTab, setActiveTab, type SideMenuTab } from "./sideMenuActiveTabStore";

  export let activeTab: SideMenuTab = getActiveTab();

  // Sync with store when activeTab changes (for localStorage persistence)
  $: {
    setActiveTab(activeTab);
  }

  function handleTabClick(tab: SideMenuTab) {
    activeTab = tab;
    triggerHaptic();
  }
</script>

<div class="side-bar-tab-bar">
  <div class="side-bar-tab-bar__tabs">
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === "statistics"}
      aria-label="Statistics"
      use:tooltip={"View skills, levels, and tech crystal data"}
      on:click={() => handleTabClick("statistics")}
      type="button"
    >
      <svelte:component
        this={ChartBarIcon}
        class="side-bar-tab-bar__tab-icon"
        aria-hidden="true"
      />
      <span class="side-bar-tab-bar__tab-label">Statistics</span>
    </button>
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === "settings"}
      aria-label="Settings"
      use:tooltip={"View options"}
      on:click={() => handleTabClick("settings")}
      type="button"
    >
      <svelte:component
        this={GearSixIcon}
        class="side-bar-tab-bar__tab-icon"
        aria-hidden="true"
      />
      <span class="side-bar-tab-bar__tab-label">Settings</span>
    </button>
    <button
      class="side-bar-tab-bar__tab-button"
      class:active={activeTab === "controls"}
      aria-label="Controls"
      use:tooltip={"View input mapping"}
      on:click={() => handleTabClick("controls")}
      type="button"
    >
      <svelte:component
        this={GameControllerIcon}
        class="side-bar-tab-bar__tab-icon"
        aria-hidden="true"
      />
      <span class="side-bar-tab-bar__tab-label">Controls</span>
    </button>
  </div>
</div>

<style>
  .side-bar-tab-bar {
    width: 100%;
    height: var(--side-menu-tab-height);
  }

  .side-bar-tab-bar__tabs {
    display: flex;
    align-items: stretch;
    gap: 0;
    padding: 0;
    flex: 1;
    min-width: 0;
    height: var(--side-menu-tab-height);
    pointer-events: none;
  }

  .side-bar-tab-bar__tab-button {
    flex: 1;
    min-width: var(--side-menu-tab-min-width, 72px);
    border: 1px solid #2c3c61;
    background: transparent;
    color: #8fa4ce;
    border-radius: 0;
    height: var(--side-menu-tab-height);
    padding: 4px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
    pointer-events: auto;
  }

  :global(.side-bar-tab-bar__tab-icon) {
    width: 20px;
    height: 20px;
    flex: 0 0 auto;
  }

  .side-bar-tab-bar__tab-label {
    font-size: 0.65rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
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
</style>
