<script lang="ts">
  import { onMount } from "svelte";
  import Tabs, { type TabConfig } from "./lib/Tabs.svelte";
  import SideMenu from "./lib/SideMenu.svelte";
  import AppTitleDisplay from "./lib/AppTitleDisplay.svelte";
  import TechCrystalDisplay from "./lib/TechCrystalDisplay.svelte";
  import Tooltip from "./lib/Tooltip.svelte";
  import Toasts from "./lib/Toasts.svelte";
  import ModalHost from "./lib/ModalHost.svelte";
  import type { TreeViewState } from "./lib/Tree.svelte";
  import { openHelpModal } from "./lib/helpModal";
  import {
    initTechCrystalTrees,
    applyTechCrystalDeltaForTree,
  } from "./lib/techCrystalStore";

  let isMenuOpen = false;
  let tabsRef: {
    focusActiveTreeInView?: () => void;
    resetActiveTree?: () => void;
    resetAllTrees?: () => void;
  } | null = null;
  let activeTreeName = "";
  let activeTreeIndex = 0;
  let activeTreeViewState: TreeViewState | null = null;
  let activeTreeFocusViewState: TreeViewState | null = null;
  let swipeStartX: number | null = null;
  let swipeStartY: number | null = null;
  let swipeLastX: number | null = null;
  let isSwiping = false;
  const swipeCloseThreshold = 70;
  const helpStorageKey = "rg-backpack-planner-help-seen";
  let showAppTitle = true;

  const baseTree = [
    { id: "core", x: 240, y: 220, maxLevel: 10, label: "Core" },
    {
      id: "atk-1",
      x: 160,
      y: 140,
      maxLevel: 5,
      label: "Atk",
      parentIds: ["core"],
    },
    {
      id: "atk-2",
      x: 320,
      y: 140,
      maxLevel: 5,
      label: "Atk",
      parentIds: ["core"],
    },
    {
      id: "def-1",
      x: 120,
      y: 240,
      maxLevel: 5,
      label: "Def",
      parentIds: ["core"],
    },
    {
      id: "def-2",
      x: 360,
      y: 240,
      maxLevel: 5,
      label: "Def",
      parentIds: ["core"],
    },
    {
      id: "sup-1",
      x: 200,
      y: 320,
      maxLevel: 5,
      label: "Sup",
      parentIds: ["def-1"],
    },
    {
      id: "sup-2",
      x: 280,
      y: 320,
      maxLevel: 5,
      label: "Sup",
      parentIds: ["def-2"],
    },
    {
      id: "ult-1",
      x: 240,
      y: 400,
      maxLevel: 3,
      label: "Ult",
      parentIds: ["sup-1", "sup-2"],
    },
  ];

  const tabs: TabConfig[] = [
    { id: "guardian", label: "Guardian", nodes: baseTree },
    {
      id: "vanguard",
      label: "Vanguard",
      nodes: baseTree.map((node) => ({
        ...node,
        id: `v-${node.id}`,
        parentIds: node.parentIds?.map((parentId) => `v-${parentId}`),
      })),
    },
    {
      id: "cannon",
      label: "Cannon",
      nodes: baseTree.map((node) => ({
        ...node,
        id: `c-${node.id}`,
        parentIds: node.parentIds?.map((parentId) => `c-${parentId}`),
      })),
    },
  ];

  initTechCrystalTrees(tabs);

  activeTreeName = tabs[0]?.label ?? "";

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }

  function openHelp() {
    openHelpModal();
  }

  function resetSwipeState() {
    swipeStartX = null;
    swipeStartY = null;
    swipeLastX = null;
    isSwiping = false;
  }

  function handleTouchStart(event: TouchEvent) {
    if (!isMenuOpen || event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeLastX = touch.clientX;
    isSwiping = false;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isMenuOpen || swipeStartX === null || swipeStartY === null) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    swipeLastX = touch.clientX;

    if (!isSwiping) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
        isSwiping = true;
      } else {
        return;
      }
    }
  }

  function handleTouchEnd() {
    if (!isMenuOpen || swipeStartX === null || swipeLastX === null) {
      resetSwipeState();
      return;
    }

    const deltaX = swipeLastX - swipeStartX;
    if (isSwiping && deltaX > swipeCloseThreshold) {
      closeMenu();
    }

    resetSwipeState();
  }

  function handleNodeLevelChange(
    tabIndex: number,
    techCrystalDelta: number,
    _nodeId?: string,
  ) {
    applyTechCrystalDeltaForTree(tabIndex, techCrystalDelta);
  }

  onMount(() => {
    try {
      if (!localStorage.getItem(helpStorageKey)) {
        showAppTitle = false;
        openHelpModal({
          onClose: () => {
            showAppTitle = true;
          },
        });
        localStorage.setItem(helpStorageKey, "true");
      }
    } catch {
      showAppTitle = false;
      openHelpModal({
        onClose: () => {
          showAppTitle = true;
        },
      });
    }
  });
</script>

<div
  class="app-shell"
  class:menu-open={isMenuOpen}
  role="application"
  on:contextmenu|preventDefault
  on:touchstart|passive={handleTouchStart}
  on:touchmove|passive={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:touchcancel={handleTouchEnd}
>
  <SideMenu
    isOpen={isMenuOpen}
    onClose={closeMenu}
    onFocusInView={() => tabsRef?.focusActiveTreeInView?.()}
    onResetTree={() => tabsRef?.resetActiveTree?.()}
    onResetAll={() => tabsRef?.resetAllTrees?.()}
    onHelp={openHelp}
    {activeTreeIndex}
    {activeTreeViewState}
    {activeTreeFocusViewState}
    {activeTreeName}
  />
  {#if showAppTitle}
    <AppTitleDisplay onHelp={openHelp} />
  {/if}
  <TechCrystalDisplay />
  <main class="app-main">
    <Tabs
      bind:this={tabsRef}
      bind:activeLabel={activeTreeName}
      bind:activeIndex={activeTreeIndex}
      bind:activeViewState={activeTreeViewState}
      bind:activeFocusViewState={activeTreeFocusViewState}
      {tabs}
      onMenuClick={toggleMenu}
      onNodeLevelChange={handleNodeLevelChange}
      {isMenuOpen}
    />
  </main>
  <Toasts />
  <ModalHost />
  <Tooltip />
</div>

<style>
  .app-shell {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .app-shell.menu-open {
    touch-action: pan-y;
  }

  .app-main {
    flex: 1;
    min-height: 0;
  }
</style>
