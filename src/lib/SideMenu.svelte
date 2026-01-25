<script lang="ts">
  import SideBarTabBar from "./SideBarTabBar.svelte";
  import SideMenuSettingsPage from "./sideMenuPages/SideMenuSettingsPage.svelte";
  import SideMenuStatisticsPage from "./sideMenuPages/SideMenuStatisticsPage.svelte";
  import SideMenuControlsPage from "./sideMenuPages/SideMenuControlsPage.svelte";
  import { triggerHaptic } from "./haptics";
  import type { TreeViewState } from "./Tree.svelte";

  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onShareBuild: (() => void) | null = null;
  export let onHelp: (() => void) | null = null;
  export let onResetAll: (() => void) | null = null;
  export let onResetTree: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;
  export let activeTreeName = "";
  export let activeTreeIndex = 0;
  export let activeTreeViewState: TreeViewState | null = null;
  export let activeTreeFocusViewState: TreeViewState | null = null;
  let backdropEl: HTMLButtonElement | null = null;
  let menuEl: HTMLElement | null = null;
  let activeTab: 'statistics' | 'settings' | 'controls' = 'statistics';
  $: if (!isOpen) {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      ((backdropEl && backdropEl.contains(active)) ||
        (menuEl && menuEl.contains(active)))
    ) {
      active.blur();
    }
  }

  function handleBackdropClick() {
    triggerHaptic();
    onClose?.();
  }
</script>

<button
  class={`menu-backdrop${isOpen ? " visible" : ""}`}
  aria-label="Close menu"
  bind:this={backdropEl}
  tabindex={isOpen ? 0 : -1}
  inert={!isOpen}
  on:click={handleBackdropClick}
  type="button"
></button>
<aside class="side-menu" class:open={isOpen} bind:this={menuEl} inert={!isOpen}>
  <div class="side-menu__scroll-area">
    <nav class="side-menu__content" aria-label="Primary">
      <div class="side-menu__content-inner">
        {#if activeTab === 'settings'}
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
        {:else if activeTab === 'statistics'}
          <SideMenuStatisticsPage />
        {:else if activeTab === 'controls'}
          <SideMenuControlsPage />
        {/if}
      </div>
      <div class="side-menu__scroll-fade" aria-hidden="true"></div>
    </nav>
  </div>
  <SideBarTabBar bind:activeTab />
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
    width: fit-content;
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

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__content {
    --side-menu-fade-height: 68px;
    display: block;
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
    scrollbar-gutter: stable;
  }

  .side-menu__content-inner {
    display: grid;
    gap: 10px;
    padding-bottom: var(--side-menu-fade-height);
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
    height: 100%;
  }

  .side-menu__scroll-fade {
    position: sticky;
    bottom: 0;
    height: var(--side-menu-fade-height);
    margin-top: calc(-1 * var(--side-menu-fade-height));
    background: linear-gradient(
      to bottom,
      rgba(10, 16, 28, 0) 0%,
      rgba(10, 16, 28, 1) 28%
    );
    pointer-events: none;
  }
</style>
