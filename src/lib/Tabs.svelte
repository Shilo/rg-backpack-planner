<script lang="ts" context="module">
  import type { TreeNode } from "./Tree.svelte";

  export type TabConfig = {
    id: string;
    label: string;
    nodes: TreeNode[];
  };
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import Tree from "./Tree.svelte";
  import TreeContextMenu from "./TreeContextMenu.svelte";
  import {
    clearLongPress,
    isLongPressMovement,
    startLongPress,
    type LongPressState,
  } from "./longPress";
  import { hideTooltip, suppressTooltip, tooltip } from "./tooltip";

  export let tabs: TabConfig[] = [];
  export let onMenuClick: (() => void) | null = null;
  export let isMenuOpen = false;
  export let activeLabel = "";

  let activeIndex = 0;
  let bottomInset = 0;
  let tabsBarEl: HTMLDivElement | null = null;
  let treeRef: {
    focusTreeInView?: () => void;
    resetAllNodes?: () => void;
    triggerFade?: () => void;
    cancelGestures?: () => void;
  } | null = null;
  let tabContextMenu: {
    id: string;
    label: string;
    x: number;
    y: number;
  } | null = null;
  let hasMounted = false;
  let lastActiveTabId = "";
  const tabPressState: LongPressState = { timer: null, fired: false };
  let tabPressStart: { x: number; y: number } | null = null;
  let tabPressPoint: { x: number; y: number } | null = null;
  let tabPressPointerId: number | null = null;
  const backgroundPressState: LongPressState = { timer: null, fired: false };
  let backgroundPressStart: { x: number; y: number } | null = null;
  let backgroundPressPoint: { x: number; y: number } | null = null;
  let backgroundPressPointerId: number | null = null;

  onMount(() => {
    hasMounted = true;
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

  $: {
    const nextId = tabs[activeIndex]?.id ?? "";
    if (hasMounted && nextId && nextId !== lastActiveTabId) {
      lastActiveTabId = nextId;
      void tick().then(() => treeRef?.triggerFade?.());
    }
  }

  $: if (tabs.length > 0) {
    activeLabel = tabs[activeIndex]?.label ?? tabs[0].label;
  }

  function clearTabPress() {
    clearLongPress(tabPressState);
    tabPressStart = null;
    tabPressPoint = null;
    tabPressPointerId = null;
  }

  function startTabPress(event: PointerEvent, tab: TabConfig) {
    tabPressStart = { x: event.clientX, y: event.clientY };
    tabPressPoint = { x: event.clientX, y: event.clientY };
    tabPressPointerId = event.pointerId;
    startLongPress(tabPressState, () => {
      const point = tabPressPoint ?? tabPressStart;
      if (!point) return false;
      suppressTooltip(tabPressPointerId);
      hideTooltip();
      tabContextMenu = {
        id: tab.id,
        label: tab.label,
        x: point.x,
        y: point.y,
      };
      return true;
    });
  }

  function moveTabPress(event: PointerEvent) {
    if (!tabPressStart) return;
    tabPressPoint = { x: event.clientX, y: event.clientY };
    if (
      isLongPressMovement(
        tabPressStart.x,
        tabPressStart.y,
        event.clientX,
        event.clientY,
      )
    ) {
      clearTabPress();
    }
  }

  function clearBackgroundPress() {
    clearLongPress(backgroundPressState);
    backgroundPressStart = null;
    backgroundPressPoint = null;
    backgroundPressPointerId = null;
  }

  function isContextMenuTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && !!target.closest(".context-menu");
  }

  function isNodeTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && !!target.closest("[data-node-id]");
  }

  function startBackgroundPress(event: PointerEvent) {
    if (isContextMenuTarget(event.target) || isNodeTarget(event.target)) return;
    const activeTab = tabs[activeIndex];
    if (!activeTab) return;
    backgroundPressStart = { x: event.clientX, y: event.clientY };
    backgroundPressPoint = { x: event.clientX, y: event.clientY };
    backgroundPressPointerId = event.pointerId;
    startLongPress(backgroundPressState, () => {
      const point = backgroundPressPoint ?? backgroundPressStart;
      if (!point) return false;
      suppressTooltip(backgroundPressPointerId);
      hideTooltip();
      tabContextMenu = {
        id: activeTab.id,
        label: activeTab.label,
        x: point.x,
        y: point.y,
      };
      treeRef?.cancelGestures?.();
      return true;
    });
  }

  function openBackgroundMenu(event: MouseEvent) {
    if (isContextMenuTarget(event.target) || isNodeTarget(event.target)) return;
    const activeTab = tabs[activeIndex];
    if (!activeTab) return;
    event.preventDefault();
    hideTooltip();
    tabContextMenu = {
      id: activeTab.id,
      label: activeTab.label,
      x: event.clientX,
      y: event.clientY,
    };
    treeRef?.cancelGestures?.();
  }

  function moveBackgroundPress(event: PointerEvent) {
    if (!backgroundPressStart) return;
    backgroundPressPoint = { x: event.clientX, y: event.clientY };
    if (
      isLongPressMovement(
        backgroundPressStart.x,
        backgroundPressStart.y,
        event.clientX,
        event.clientY,
      )
    ) {
      clearBackgroundPress();
    }
  }

  function openTabMenu(event: MouseEvent, tab: TabConfig) {
    event.preventDefault();
    hideTooltip();
    tabContextMenu = {
      id: tab.id,
      label: tab.label,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function closeTabMenu() {
    tabContextMenu = null;
  }

  async function focusTabInView(tabId: string) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    setActive(index);
    await tick();
    focusActiveTreeInView();
    closeTabMenu();
  }

  export function focusActiveTreeInView() {
    treeRef?.focusTreeInView?.();
    treeRef?.triggerFade?.();
  }

  async function resetTabTree(tabId: string) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    setActive(index);
    await tick();
    resetActiveTree();
    closeTabMenu();
  }

  export function resetActiveTree() {
    treeRef?.resetAllNodes?.();
    treeRef?.triggerFade?.();
  }

  export function resetAllTrees() {
    // TODO
    resetActiveTree();
  }

  function onTabClick(index: number) {
    if (tabPressState.fired) {
      tabPressState.fired = false;
      return;
    }
    setActive(index);
  }
</script>

<div class="tabs-root">
  <div class="tabs-bar" bind:this={tabsBarEl}>
    <div class="tab-buttons">
      {#each tabs as tab, index}
        <button
          class="button button-sm"
          class:active={index === activeIndex}
          on:click={() => onTabClick(index)}
          on:contextmenu={(event) => openTabMenu(event, tab)}
          on:pointerdown={(event) => startTabPress(event, tab)}
          on:pointermove={moveTabPress}
          on:pointerup={clearTabPress}
          on:pointercancel={clearTabPress}
          on:pointerleave={clearTabPress}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>
  <button
    class="menu-button button-sm"
    aria-label={isMenuOpen ? "Close menu" : "Menu"}
    use:tooltip={isMenuOpen ? "Close menu" : "Open menu"}
    on:click={() => onMenuClick?.()}
  >
    {isMenuOpen ? "✕" : "⋮"}
  </button>

  <div
    class="tabs-content"
    role="presentation"
    on:contextmenu={openBackgroundMenu}
    on:pointerdown={startBackgroundPress}
    on:pointermove={moveBackgroundPress}
    on:pointerup={clearBackgroundPress}
    on:pointercancel={clearBackgroundPress}
    on:pointerleave={clearBackgroundPress}
  >
    {#if tabs[activeIndex]}
      {#key tabs[activeIndex].id}
        <div class="tree-stage">
          <Tree
            bind:this={treeRef}
            nodes={tabs[activeIndex].nodes}
            {bottomInset}
            gesturesDisabled={!!tabContextMenu}
          />
        </div>
      {/key}
    {/if}
  </div>

  <TreeContextMenu
    tabId={tabContextMenu?.id ?? ""}
    tabLabel={tabContextMenu?.label ?? ""}
    x={tabContextMenu?.x ?? 0}
    y={tabContextMenu?.y ?? 0}
    isOpen={!!tabContextMenu}
    onClose={closeTabMenu}
    onFocusInView={focusTabInView}
    onReset={resetTabTree}
  />
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
    color: #8fa4ce;
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

  .tree-stage {
    height: 100%;
  }
</style>
