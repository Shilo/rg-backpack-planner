<script lang="ts">
  import Tabs, { type TabConfig } from "./lib/Tabs.svelte";
  import SideMenu from "./lib/SideMenu.svelte";
  import Tooltip from "./lib/Tooltip.svelte";

  let isMenuOpen = false;
  let tabsRef: {
    focusActiveTreeInView?: () => void;
    resetActiveTree?: () => void;
    resetAllTrees?: () => void;
  } | null = null;
  let activeTreeName = "";

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

  activeTreeName = tabs[0]?.label ?? "";

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  function closeMenu() {
    isMenuOpen = false;
  }
</script>

<div class="app-shell" role="application" on:contextmenu|preventDefault>
  <SideMenu
    isOpen={isMenuOpen}
    onClose={closeMenu}
    onFocusInView={() => tabsRef?.focusActiveTreeInView?.()}
    onResetTree={() => tabsRef?.resetActiveTree?.()}
    onResetAll={() => tabsRef?.resetAllTrees?.()}
    {activeTreeName}
  />
  <main class="app-main">
    <Tabs
      bind:this={tabsRef}
      bind:activeLabel={activeTreeName}
      {tabs}
      onMenuClick={toggleMenu}
      {isMenuOpen}
    />
  </main>
  <Tooltip />
</div>

<style>
  .app-shell {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .app-main {
    flex: 1;
    min-height: 0;
  }
</style>
