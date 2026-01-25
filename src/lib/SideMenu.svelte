<script lang="ts">
  import { X } from "lucide-svelte";
  import SideBarTabBar from "./SideBarTabBar.svelte";
  import SideMenuSettingsPage from "./sideMenuPages/SideMenuSettingsPage.svelte";
  import SideMenuStatisticsPage from "./sideMenuPages/SideMenuStatisticsPage.svelte";
  import SideMenuControlsPage from "./sideMenuPages/SideMenuControlsPage.svelte";
  import { triggerHaptic } from "./haptics";
  import { tooltip } from "./tooltip";
  import type { TreeViewState } from "./Tree.svelte";
  import {
    getActiveTab,
    setActiveTab,
    type SideMenuTab,
  } from "./sideMenuActiveTabStore";

  export let isOpen = false;
  export let skipTransition = false;
  export let onClose: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;
  export let activeTreeName = "";
  export let activeTreeIndex = 0;
  export let activeTreeViewState: TreeViewState | null = null;
  export let activeTreeFocusViewState: TreeViewState | null = null;
  let activeTab: SideMenuTab = getActiveTab();

  export function openTab(tab: SideMenuTab) {
    activeTab = tab;
    setActiveTab(tab);
  }

  function handleBackdropClick() {
    triggerHaptic();
    onClose?.();
  }
</script>

<button
  class={`menu-backdrop${isOpen ? " visible" : ""}${skipTransition ? " skip-transition" : ""}`}
  aria-label="Close menu"
  tabindex={isOpen ? 0 : -1}
  inert={!isOpen}
  on:click={handleBackdropClick}
  type="button"
></button>
<aside
  class="side-menu"
  class:open={isOpen}
  class:skip-transition={skipTransition}
  inert={!isOpen}
>
  <div class="side-menu__scroll-area">
    <nav class="side-menu__content" aria-label="Primary">
      <div class="side-menu__content-inner">
        {#if activeTab === "settings"}
          <SideMenuSettingsPage
            {activeTreeName}
            {activeTreeIndex}
            {activeTreeViewState}
            {activeTreeFocusViewState}
            {onClose}
            {onResetAll}
            {onResetTree}
            {onFocusInView}
          />
        {:else if activeTab === "statistics"}
          <SideMenuStatisticsPage />
        {:else if activeTab === "controls"}
          <SideMenuControlsPage />
        {/if}
      </div>
    </nav>
  </div>
  <div class="side-menu__tab-bar-wrapper">
    <SideBarTabBar bind:activeTab />
    <button
      class="side-menu__close-button"
      aria-label="Close menu"
      use:tooltip={"Close menu"}
      on:click={() => {
        triggerHaptic();
        onClose?.();
      }}
      type="button"
    >
      <svelte:component
        this={X}
        class="side-menu__close-button-icon"
        aria-hidden="true"
      />
    </button>
  </div>
</aside>

<style>
  :global(.menu-backdrop) {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 15, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    border: none;
    padding: 0;
    z-index: 7;
  }

  :global(.menu-backdrop.skip-transition) {
    transition: none;
  }

  :global(.menu-backdrop.visible) {
    opacity: 1;
    pointer-events: auto;
  }

  .side-menu {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    max-width: 100%;
    width: calc(
      3 * var(--side-menu-tab-min-width) + var(--side-menu-tab-height) + 10px
    );
    background: rgba(10, 16, 28, 0.98);
    border-left: 1px solid rgba(79, 111, 191, 0.35);
    transform: translateX(100%);
    transition: transform 0.15s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0px;
    overflow: hidden;
    z-index: 9;
  }

  .side-menu.skip-transition {
    transition: none;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__content {
    display: block;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    scrollbar-gutter: stable;
  }

  .side-menu__content-inner {
    display: grid;
    gap: 10px;
  }

  .side-menu__content-inner > :global(:first-child) {
    margin-top: 8px;
  }

  .side-menu__content-inner > :global(:last-child) {
    margin-bottom: 10px;
  }

  .side-menu__scroll-area {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .side-menu__tab-bar-wrapper {
    flex: 0 0 auto;
    width: 100%;
    display: flex;
    align-items: stretch;
    position: relative;
  }

  .side-menu__close-button {
    flex: 0 0 auto;
    width: var(--side-menu-tab-height);
    height: var(--side-menu-tab-height);
    border: 1px solid rgba(180, 72, 72, 0.9);
    background: rgba(84, 26, 32, 0.85);
    color: #ffd7d7;
    border-radius: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background 0.2s ease;
    border-left: none;
  }

  .side-menu__close-button:focus-visible {
    outline: 2px solid rgba(120, 156, 240, 0.9);
    outline-offset: 2px;
  }

  @media (hover: hover) {
    .side-menu__close-button:hover {
      filter: brightness(1.18);
    }
  }

  .side-menu__close-button:active {
    transform: scale(0.97);
    filter: brightness(1.2);
  }

  .side-menu__close-button-icon {
    width: 20px;
    height: 20px;
  }
</style>
