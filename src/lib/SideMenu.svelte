<script lang="ts">
  import packageInfo from "../../package.json";
  import SideMenuSection from "./SideMenuSection.svelte";
  import TreeContextMenuList from "./TreeContextMenuList.svelte";
  import { tooltip } from "./tooltip";

  export let isOpen = false;
  export let onClose: (() => void) | null = null;
  export let onLoadBuild: (() => void) | null = null;
  export let onSaveBuild: (() => void) | null = null;
  export let onResetNodes: (() => void) | null = null;
  export let onFocusInView: (() => void) | null = null;
  const title = packageInfo.name;

  let backdropEl: HTMLButtonElement | null = null;
  let menuEl: HTMLElement | null = null;

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
</script>

<button
  class="menu-backdrop"
  aria-label="Close menu"
  class:visible={isOpen}
  bind:this={backdropEl}
  tabindex={isOpen ? 0 : -1}
  inert={!isOpen}
  on:click={() => onClose?.()}
></button>
<aside class="side-menu" class:open={isOpen} bind:this={menuEl} inert={!isOpen}>
  <nav class="side-menu__content" aria-label="Primary">
    <SideMenuSection title="Build">
      <button class="button button-md" type="button" on:click={onLoadBuild}>
        Load build
      </button>
      <button class="button button-md" type="button" on:click={onSaveBuild}>
        Save build
      </button>
    </SideMenuSection>
    <SideMenuSection title="View">
      <TreeContextMenuList
        onFocusInView={() => {
          onFocusInView?.();
          onClose?.();
        }}
      />
    </SideMenuSection>
    <SideMenuSection title="Settings">
      <button
        class="button button-md"
        type="button"
        on:click={onResetNodes}
        use:tooltip={"Revert nodes to level 0 and refund Tech Crystals"}
      >
        Reset
      </button>
    </SideMenuSection>
  </nav>
  <h2 class="side-menu__title">{title}</h2>
</aside>

<style>
  .menu-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 15, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    border: none;
    padding: 10px 0 64px;
    z-index: 7;
  }

  .menu-backdrop.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .side-menu {
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    width: 78vw;
    max-width: 85%;
    width: min(260px, 85%);
    background: rgba(10, 16, 28, 0.98);
    border-left: 1px solid rgba(79, 111, 191, 0.35);
    transform: translateX(100%);
    transition: transform 0.25s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
    z-index: 9;
  }

  .side-menu.open {
    transform: translateX(0);
  }

  .side-menu__title {
    position: absolute;
    left: 10px;
    bottom: 10px;
    height: 32px;
    width: calc(100% - 10px - 32px - 10px);
    line-height: 32px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
    font-size: 1rem;
    color: #e7efff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .side-menu__content {
    display: grid;
    gap: 18px;
    overflow-y: auto;
    padding-left: 10px;
    padding-right: 10px;
    scrollbar-gutter: stable;
    max-height: calc(100% - 42px);
  }

  .side-menu__content::before {
    content: "";
    height: 0px;
    display: block;
  }

  .side-menu__content::after {
    content: "";
    height: 0px;
    display: block;
  }
</style>
