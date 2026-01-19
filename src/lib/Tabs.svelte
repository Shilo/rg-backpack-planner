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

  let activeIndex = 0;
  let topInset = 0;
  let tabsBarEl: HTMLDivElement | null = null;

  onMount(() => {
    if (!tabsBarEl) return;
    const observer = new ResizeObserver(() => {
      topInset = tabsBarEl ? tabsBarEl.offsetHeight : 0;
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/2d7cab1a-a0b0-46a8-8740-af356464e2e8",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "Tabs.svelte:resizeObserver",
            message: "tabsBar resize",
            data: {
              topInset,
              hasEl: !!tabsBarEl,
              height: tabsBarEl?.offsetHeight,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "post-fix",
            hypothesisId: "A",
          }),
        },
      ).catch(() => {});
      // #endregion agent log
    });
    observer.observe(tabsBarEl);
    topInset = tabsBarEl.offsetHeight;
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/2d7cab1a-a0b0-46a8-8740-af356464e2e8", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Tabs.svelte:onMount",
        message: "tabsBar init",
        data: { topInset, hasEl: !!tabsBarEl, height: tabsBarEl?.offsetHeight },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "post-fix",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion agent log
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
    <button
      class="menu-button"
      aria-label="Menu"
      on:click={() => onMenuClick?.()}
    >
      ☰
    </button>
  </div>

  <div class="tabs-content">
    {#if tabs[activeIndex]}
      <Tree nodes={tabs[activeIndex].nodes} {topInset} />
    {/if}
  </div>
</div>

<style>
  .tabs-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: radial-gradient(circle at top, #162238, #0c1425 75%);
    position: relative;
  }

  .tabs-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 0;
    background: transparent;
    z-index: 5;
  }

  .tab-buttons {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .tab-buttons button {
    border: 1px solid #2c3c61;
    background: #111b2d;
    color: #8fa4ce;
    font-size: 0.75rem;
    padding: 8px 10px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .tab-buttons button.active {
    background: #223152;
    color: #e7efff;
    border-color: #4f6fbf;
  }

  .menu-button {
    border: 1px solid #2c3c61;
    background: #111b2d;
    color: #c9d6f5;
    width: 40px;
    height: 36px;
    border-radius: 10px;
    font-size: 1rem;
  }

  .tabs-content {
    flex: 1;
    min-height: 0;
  }
</style>
