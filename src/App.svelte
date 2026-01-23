<script lang="ts">
    import { onMount } from "svelte";
    import Tabs, { type TabConfig } from "./lib/Tabs.svelte";
    import SideMenu from "./lib/SideMenu.svelte";
    import AppTitleDisplay from "./lib/AppTitleDisplay.svelte";
    import ActiveTreeResetButton from "./lib/ActiveTreeResetButton.svelte";
    import TechCrystalDisplay from "./lib/TechCrystalDisplay.svelte";
    import Tooltip from "./lib/Tooltip.svelte";
    import Toasts from "./lib/Toasts.svelte";
    import ModalHost from "./lib/ModalHost.svelte";
    import type { TreeViewState } from "./lib/Tree.svelte";
    import { openHelpModal } from "./lib/helpModal";
    import { ensureInstallListeners } from "./lib/buttons/InstallPwaButton.svelte";
    import { treeLevels, sumLevels } from "./lib/treeLevelsStore";
    import packageInfo from "../package.json";

    import {
        initTechCrystalTrees,
        applyTechCrystalDeltaForTree,
    } from "./lib/techCrystalStore";
    import { guardianTree } from "./config/guardianTree";
    import { vanguardTree } from "./config/vanguardTree";
    import { cannonTree } from "./config/cannonTree";

    let isMenuOpen = false;
    let tabsRef: {
        focusActiveTreeInView?: (announce?: boolean) => void;
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
    const appVersion = packageInfo.version ?? "unknown";
    const helpStorageKey = "rg-backpack-planner-help-seen-version";
    let showAppTitle = true;
    $: activeTreeLevelsTotal = sumLevels($treeLevels?.[activeTreeIndex]);
    $: canResetActiveTree = activeTreeLevelsTotal > 0;

    const tabs: TabConfig[] = [
        { id: "guardian", label: "Guardian", nodes: guardianTree },
        { id: "vanguard", label: "Vanguard", nodes: vanguardTree },
        { id: "cannon", label: "Cannon", nodes: cannonTree },
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
        ensureInstallListeners();
        try {
            if (localStorage.getItem(helpStorageKey) !== appVersion) {
                showAppTitle = false;
                openHelpModal({
                    onClose: () => {
                        showAppTitle = true;
                    },
                });
                localStorage.setItem(helpStorageKey, appVersion);
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
        onFocusInView={() => tabsRef?.focusActiveTreeInView?.(true)}
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
    <div class="top-right-actions">
        <TechCrystalDisplay />
        <ActiveTreeResetButton
            onReset={() => tabsRef?.resetActiveTree?.()}
            treeLabel={activeTreeName}
            canReset={canResetActiveTree}
        />
    </div>
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

    .top-right-actions {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 6;
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
    }
</style>
