<script lang="ts" context="module">
  import type { TreeNode, TreeViewState } from "./Tree.svelte";

  export type TabConfig = {
    id: string;
    label: string;
    nodes: TreeNode[];
  };
</script>

<script lang="ts">
  import { Menu } from "lucide-svelte";
  import { onMount, tick } from "svelte";
  import { get } from "svelte/store";
  import Button from "./Button.svelte";
  import Tree from "./Tree.svelte";
  import TreeContextMenu from "./TreeContextMenu.svelte";
  import {
    clearLongPress,
    isLongPressMovement,
    startLongPress,
    type LongPressState,
  } from "./longPress";
  import {
    ensureTreeLevels,
    resetAllTreeLevels,
    resetTreeLevels,
    setTreeLevels,
    treeLevels,
  } from "./treeLevelsStore";
  import { techCrystalsSpentByTree } from "./techCrystalStore";
  import { showToast } from "./toast";
  import { hideTooltip, suppressTooltip, tooltip } from "./tooltip";
  import { activeTabId, getActiveTabId } from "./activeTabStore";

  export let tabs: TabConfig[] = [];
  export let onMenuClick: (() => void) | null = null;
  export let activeLabel = "";
  export let activeIndex = 0;
  export let activeViewState: TreeViewState | null = null;
  export let activeFocusViewState: TreeViewState | null = null;
  export let onNodeLevelChange:
    | ((tabIndex: number, techCrystalDelta: number, nodeId?: string) => void)
    | null = null;

  let bottomInset = 0;
  let tabsBarEl: HTMLDivElement | null = null;
  let treeRef: {
    focusTreeInView?: (announce?: boolean) => void;
    resetAllNodes?: () => void;
    triggerFade?: () => void;
    cancelGestures?: () => void;
    getViewState?: () => TreeViewState;
    getFocusViewState?: () => TreeViewState | null;
  } | null = null;
  let tabContextMenu: {
    id: string;
    label: string;
    x: number;
    y: number;
    index: number;
    hideView0ptions: boolean;
  } | null = null;
  let hasMounted = false;
  let lastActiveTabId = "";
  let isInitialRestore = true;
  const tabPressState: LongPressState = { timer: null, fired: false };
  let tabPressStart: { x: number; y: number } | null = null;
  let tabPressPoint: { x: number; y: number } | null = null;
  let tabPressPointerId: number | null = null;
  const backgroundPressState: LongPressState = { timer: null, fired: false };
  let backgroundPressStart: { x: number; y: number } | null = null;
  let backgroundPressPoint: { x: number; y: number } | null = null;
  let backgroundPressPointerId: number | null = null;
  let lastViewState: TreeViewState | null = null;

  function getPointerEvent(event: Event) {
    const detail = (event as CustomEvent<PointerEvent>).detail;
    if (detail && typeof detail.clientX === "number") {
      return detail;
    }
    return event as PointerEvent;
  }

  function getMouseEvent(event: Event) {
    const detail = (event as CustomEvent<MouseEvent>).detail;
    if (detail && typeof detail.clientX === "number") {
      return detail;
    }
    return event as MouseEvent;
  }

  onMount(() => {
    hasMounted = true;
    // Restore active tab from localStorage (only set index, don't call setActive to avoid interfering with tree positioning)
    if (tabs.length > 0) {
      const storedTabId = getActiveTabId();
      const storedIndex = tabs.findIndex((tab) => tab.id === storedTabId);
      if (storedIndex !== -1 && storedIndex !== activeIndex) {
        activeIndex = clampIndex(storedIndex);
      }
    }
    // Mark that initial restore is complete
    isInitialRestore = false;
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
    lastViewState = treeRef?.getViewState?.() ?? lastViewState;
    activeIndex = clampIndex(index);
    // Persist active tab ID to localStorage (only if not initial restore)
    if (!isInitialRestore) {
      const tab = tabs[activeIndex];
      if (tab) {
        activeTabId.set(tab.id);
      }
    }
  }

  $: if (treeRef) {
    activeViewState = treeRef.getViewState?.() ?? activeViewState;
    activeFocusViewState =
      treeRef.getFocusViewState?.() ?? activeFocusViewState;
  }

  function handleViewStateChange(next: TreeViewState) {
    activeViewState = next;
  }

  function handleFocusViewStateChange(next: TreeViewState | null) {
    activeFocusViewState = next;
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

  $: ensureTreeLevels(tabs);

  function clearTabPress() {
    clearLongPress(tabPressState);
    tabPressStart = null;
    tabPressPoint = null;
    tabPressPointerId = null;
  }

  function startTabPress(event: PointerEvent, tab: TabConfig, index: number) {
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
        index,
        hideView0ptions: true,
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
    return target instanceof Element && !!target.closest(".context-menu");
  }

  function isNodeTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    const nodeEl = target.closest("[data-node-id]");
    if (!nodeEl) return false;
    const nodeId = nodeEl.getAttribute("data-node-id");
    // Root node should not be treated as a regular node - allow background press
    return nodeId !== "root";
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
        index: activeIndex,
        hideView0ptions: false,
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
      index: activeIndex,
      hideView0ptions: false,
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

  function openTabMenu(event: MouseEvent, tab: TabConfig, index: number) {
    event.preventDefault();
    hideTooltip();
    tabContextMenu = {
      id: tab.id,
      label: tab.label,
      x: event.clientX,
      y: event.clientY,
      index,
      hideView0ptions: true,
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
    focusActiveTreeInView(true);
    closeTabMenu();
  }

  export function focusActiveTreeInView(announce = false) {
    if (!treeRef?.focusTreeInView) return;
    treeRef.focusTreeInView(announce);
    treeRef.triggerFade?.();
  }

  function refundTreeSpent(index: number) {
    const spent = get(techCrystalsSpentByTree)[index] ?? 0;
    if (spent !== 0) {
      onNodeLevelChange?.(index, -spent, "all");
    }
  }

  function resetLevelsForTab(index: number) {
    resetTreeLevels(index, tabs);
    treeRef?.triggerFade?.();
  }

  function resetTreeByIndex(index: number) {
    resetLevelsForTab(index);
    refundTreeSpent(index);
    const tabLabel = tabs[index].label;
    showToast(`Reset ${tabLabel} tree`, { tone: "negative" });
  }

  function resetTabTree(tabId: string) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    resetTreeByIndex(index);
    closeTabMenu();
  }

  export function resetActiveTree() {
    if (!tabs[activeIndex]) return;
    resetTreeByIndex(activeIndex);
  }

  export function resetAllTrees() {
    if (tabs.length === 0) return;
    for (let index = 0; index < tabs.length; index += 1) {
      refundTreeSpent(index);
    }
    resetAllTreeLevels(tabs);
    showToast("Reset all trees", { tone: "negative" });
    treeRef?.triggerFade?.();

    closeTabMenu();
  }

  function onTabClick(index: number) {
    if (tabPressState.fired) {
      tabPressState.fired = false;
      return;
    }
    setActive(index);
  }

  function handleNodeLevelChange(techCrystalDelta: number, nodeId?: string) {
    if (!tabs[activeIndex]) return;
    onNodeLevelChange?.(activeIndex, techCrystalDelta, nodeId);
  }

  function handleLevelsChange(nextLevels: Record<string, number>) {
    setTreeLevels(activeIndex, { ...nextLevels });
  }
</script>

<div class="tabs-root">
  <div class="tabs-bar" bind:this={tabsBarEl}>
    <div class="tab-buttons">
      {#each tabs as tab, index}
        <Button
          class={index === activeIndex ? "active" : ""}
          on:click={() => onTabClick(index)}
          on:contextmenu={(event: Event) =>
            openTabMenu(getMouseEvent(event), tab, index)}
          on:pointerdown={(event: Event) =>
            startTabPress(getPointerEvent(event), tab, index)}
          on:pointermove={(event: Event) =>
            moveTabPress(getPointerEvent(event))}
          on:pointerup={clearTabPress}
          on:pointercancel={clearTabPress}
          on:pointerleave={clearTabPress}
        >
          <span class="tab-label">{tab.label}</span>
        </Button>
      {/each}
    </div>
  </div>
  <Button
    class="menu-button"
    aria-label="Menu"
    tooltipText="Open menu"
    on:click={() => onMenuClick?.()}
    icon={Menu}
    iconClass="menu-button-icon"
  ></Button>

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
        <Tree
          bind:this={treeRef}
          nodes={tabs[activeIndex].nodes}
          levelsById={$treeLevels[activeIndex] ?? {}}
          onLevelsChange={handleLevelsChange}
          {bottomInset}
          gesturesDisabled={!!tabContextMenu}
          initialViewState={lastViewState}
          onNodeLevelChange={handleNodeLevelChange}
          onViewStateChange={handleViewStateChange}
          onFocusViewStateChange={handleFocusViewStateChange}
          onOpenTreeContextMenu={(x, y) => {
            const activeTab = tabs[activeIndex];
            if (!activeTab) return;
            tabContextMenu = {
              id: activeTab.id,
              label: activeTab.label,
              x,
              y,
              index: activeIndex,
              hideView0ptions: false,
            };
            treeRef?.cancelGestures?.();
          }}
        />
      {/key}
    {/if}
  </div>

  <TreeContextMenu
    tabId={tabContextMenu?.id ?? ""}
    tabLabel={tabContextMenu?.label ?? ""}
    x={tabContextMenu?.x ?? 0}
    y={tabContextMenu?.y ?? 0}
    isOpen={!!tabContextMenu}
    tabIndex={tabContextMenu?.index ?? -1}
    nodes={tabContextMenu?.index !== undefined ? tabs[tabContextMenu.index]?.nodes ?? [] : []}
    levelsById={$treeLevels[tabContextMenu?.index ?? -1] ?? null}
    viewState={tabContextMenu?.index === activeIndex ? activeViewState : null}
    focusViewState={tabContextMenu?.index === activeIndex
      ? activeFocusViewState
      : null}
    hideView0ptions={tabContextMenu?.hideView0ptions ?? false}
    onClose={closeTabMenu}
    onFocusInView={focusTabInView}
    onReset={resetTabTree}
  />
</div>

<style>
  .tabs-root {
    --menu-width: 38px;
    --menu-gap: 6px;
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
    gap: 6px;
    min-width: 0;
  }

  :global(.tab-buttons button) {
    color: #8fa4ce;
    padding: 0 10px;
    height: var(--tab-height);
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .tab-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    max-width: 100%;
    flex: 1 1 auto;
  }

  :global(.tab-buttons button.active) {
    background: rgba(34, 49, 82, 0.78);
    color: #e7efff;
    border-color: #4f6fbf;
  }

  :global(.menu-button) {
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
    z-index: 8;
  }

  :global(.menu-button-icon) {
    width: 24px;
    height: 24px;
  }

  .tabs-content {
    flex: 1;
    min-height: 0;
  }
</style>
