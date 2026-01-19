<script lang="ts" context="module">
  import type { TreeNode } from "./Tree.svelte";

  export type TabConfig = {
    id: string;
    label: string;
    nodes: TreeNode[];
  };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import Tree from "./Tree.svelte";

  export let tabs: TabConfig[] = [];
  export let onMenuClick: (() => void) | null = null;
  export let isMenuOpen = false;

  let activeIndex = 0;
  let bottomInset = 0;
  let tabsBarEl: HTMLDivElement | null = null;

  onMount(() => {
    if (!tabsBarEl) return;
    const observer = new ResizeObserver(() => {
      bottomInset = tabsBarEl ? tabsBarEl.offsetHeight : 0;
    });
    observer.observe(tabsBarEl);
    bottomInset = tabsBarEl.offsetHeight;
    return () => observer.disconnect();
  });
  function clampIndex(index: number) {
    if (index < 0) return 0;
    if (index > tabs.length - 1) return tabs.length - 1;
    return index;
  }

  function setActive(index: number) {
    activeIndex = clampIndex(index);
  }
</script>

<div class="tabs-root">
  <div class="tabs-bar" bind:this={tabsBarEl}>
    <div class="tab-buttons">
      {#each tabs as tab, index}
        <button
          class:active={index === activeIndex}
          on:click={() => setActive(index)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>
  <button
    class="menu-button"
    aria-label={isMenuOpen ? "Close menu" : "Menu"}
    on:click={() => onMenuClick?.()}
  >
    {isMenuOpen ? "✕" : "⋮"}
  </button>

  <div class="tabs-content">
    {#if tabs[activeIndex]}
      <Tree nodes={tabs[activeIndex].nodes} {bottomInset} />
    {/if}
  </div>
</div>

<style>
  .tabs-root {
    --bar-pad: 10px;
    --menu-width: 32px;
    --menu-gap: 10px;
    --tab-height: 32px;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: radial-gradient(circle at top, #162238, #0c1425 75%);
    position: relative;
  }

  .tabs-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: var(--menu-gap);
    padding: 0 calc(var(--bar-pad) + var(--menu-width) + var(--menu-gap))
      var(--bar-pad) var(--bar-pad);
    background: transparent;
    min-width: 0;
    z-index: 6;
  }

  .tab-buttons {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
  }

  .tab-buttons button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #8fa4ce;
    font-size: 0.75rem;
    padding: 0 10px;
    height: var(--tab-height);
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-buttons button.active {
    background: rgba(34, 49, 82, 0.78);
    color: #e7efff;
    border-color: #4f6fbf;
  }

  .menu-button {
    border: 1px solid #2c3c61;
    background: rgba(17, 27, 45, 0.7);
    color: #c9d6f5;
    width: var(--tab-height);
    height: var(--tab-height);
    border-radius: 10px;
    font-size: 1.35rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    right: var(--bar-pad);
    bottom: var(--bar-pad);
    z-index: 12;
  }

  .tabs-content {
    flex: 1;
    min-height: 0;
  }
</style>
