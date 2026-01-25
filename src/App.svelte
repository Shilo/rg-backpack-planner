<script lang="ts">
    import { onMount, tick } from "svelte";
    import Tabs, { type TabConfig } from "./lib/Tabs.svelte";
    import SideMenu from "./lib/SideMenu.svelte";
    import AppTitleDisplay from "./lib/AppTitleDisplay.svelte";
    import ActiveTreeResetButton from "./lib/ActiveTreeResetButton.svelte";
    import TechCrystalDisplay from "./lib/TechCrystalDisplay.svelte";
    import Tooltip from "./lib/Tooltip.svelte";
    import Toasts from "./lib/Toasts.svelte";
    import ModalHost from "./lib/ModalHost.svelte";
    import type { TreeViewState } from "./lib/Tree.svelte";
    import { ensureInstallListeners } from "./lib/buttons/InstallPwaButton.svelte";
    import {
        treeLevels,
        sumLevels,
        setTreeLevels,
    } from "./lib/treeLevelsStore";
    import {
        isNewVersion,
        markVersionAsSeen,
    } from "./lib/latestUsedVersionStore";
    import {
        getActiveTab,
        setActiveTabWithoutPersist,
    } from "./lib/sideMenuActiveTabStore";

    import {
        initTechCrystalTrees,
        applyTechCrystalDeltaForTree,
    } from "./lib/techCrystalStore";
    import { applyBuildFromUrl } from "./lib/shareManager";
    import { guardianTree } from "./config/guardianTree";
    import { vanguardTree } from "./config/vanguardTree";
    import { cannonTree } from "./config/cannonTree";
    import {
        loadTreeProgress,
        initTreeProgressPersistence,
    } from "./lib/treeProgressStore";
    import { get } from "svelte/store";

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
    $: activeTreeLevelsTotal = sumLevels($treeLevels?.[activeTreeIndex]);
    $: canResetActiveTree = activeTreeLevelsTotal > 0;

    // Check if we should show controls tab on initial load
    const shouldShowControls = (() => {
        const isNew = isNewVersion();
        if (isNew) {
            // Set active tab so SideMenu initializes with controls (without persisting)
            setActiveTabWithoutPersist("controls");
        }
        return isNew;
    })();

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
        if (openedMenuForNewVersion) {
            const tabToRestore = getActiveTab();
            // Restore active tab to persisted value so re-open doesn't show controls
            // Update both the store and the SideMenu component directly
            setActiveTabWithoutPersist(tabToRestore);
            sideMenuRef?.openTab?.(tabToRestore, false);
            openedMenuForNewVersion = false;
        }
        isMenuOpen = false;
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

    function openControlsFromTitle() {
        isMenuOpen = true;
        sideMenuRef?.openTab?.("controls");
    }

    let sideMenuRef: {
        openTab?: (
            tab: "statistics" | "settings" | "controls",
            persist?: boolean,
        ) => void;
    } | null = null;
    let skipMenuTransition = shouldShowControls;
    let isMenuOpen = shouldShowControls;
    /** True when menu was auto-opened for new-version notification; we reset tab on close. */
    let openedMenuForNewVersion = shouldShowControls;

    onMount(async () => {
        ensureInstallListeners();

        // Wait for trees to be initialized
        await tick();

        // Check if there's a build in the URL first
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlBuild = urlParams.has("build");

        // Load from localStorage only if there's no URL build
        // URL builds should take precedence over localStorage
        if (!hasUrlBuild) {
            const savedProgress = loadTreeProgress();
            if (savedProgress) {
                const currentTrees = get(treeLevels);
                // Only apply if the saved progress matches the current tree structure
                if (savedProgress.length === currentTrees.length) {
                    savedProgress.forEach((tree, index) => {
                        setTreeLevels(index, tree);
                    });
                }
            }
        }

        // Load build from URL if present (this will override localStorage if present)
        const buildLoaded = applyBuildFromUrl();
        if (buildLoaded) {
            // Clean up URL after loading to prevent re-loading on refresh
            const url = new URL(window.location.href);
            url.searchParams.delete("build");
            window.history.replaceState({}, "", url.toString());
        }

        // Initialize auto-save: subscribe to treeLevels changes
        initTreeProgressPersistence();

        if (shouldShowControls) {
            markVersionAsSeen();
            await tick();
            // Ensure controls tab is active (backup in case component initialized before localStorage was set)
            // Don't persist this change since it's for new version notification
            sideMenuRef?.openTab?.("controls", false);
            // Reset transition flag after menu is shown so future opens have transitions
            setTimeout(() => {
                skipMenuTransition = false;
            }, 200);
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
        bind:this={sideMenuRef}
        isOpen={isMenuOpen}
        skipTransition={skipMenuTransition}
        onClose={closeMenu}
        onFocusInView={() => tabsRef?.focusActiveTreeInView?.(true)}
        onResetTree={() => tabsRef?.resetActiveTree?.()}
        onResetAll={() => tabsRef?.resetAllTrees?.()}
        {activeTreeIndex}
        {activeTreeViewState}
        {activeTreeFocusViewState}
        {activeTreeName}
    />
    <AppTitleDisplay onClick={openControlsFromTitle} {isMenuOpen} />
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
        pointer-events: none;
        transition: right 0.15s ease;
    }

    @media (min-width: 768px) {
        .top-right-actions {
            z-index: 8;
        }

        .app-shell.menu-open .top-right-actions {
            right: calc(var(--side-menu-width) + 10px);
        }
    }

    .top-right-actions > :global(*) {
        pointer-events: auto;
    }
</style>
