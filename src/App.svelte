<script lang="ts">
    import { onMount, tick } from "svelte";
    import TreeTabs from "./lib/TreeTabs.svelte";
    import type { TabConfig } from "./types/tree";
    import SideMenu from "./lib/SideMenu.svelte";
    import AppTitleDisplay from "./lib/AppTitleDisplay.svelte";
    import ActiveTreeResetButton from "./lib/ActiveTreeResetButton.svelte";
    import TechCrystalDisplay from "./lib/TechCrystalDisplay.svelte";
    import PreviewBuildIndicator from "./lib/PreviewBuildIndicator.svelte";
    import Tooltip from "./lib/Tooltip.svelte";
    import Toasts from "./lib/Toasts.svelte";
    import ModalHost from "./lib/ModalHost.svelte";
    import type { TreeViewState } from "./lib/Tree.svelte";
    import { ensureInstallListeners } from "./lib/buttons/InstallPwaButton.svelte";
    import { t } from "svelte-whisper";
    import {
        treeLevels,
        sumLevels,
    } from "./lib/treeLevelsStore";
    import {
        isNewVersion,
        markVersionAsSeen,
        getStoredVersion,
        getCurrentVersion,
    } from "./lib/latestUsedVersionStore";
    import {
        getActiveTab,
        setActiveTabWithoutPersist,
    } from "./lib/sideMenuActiveTabStore";

    import {
        initTechCrystalTrees,
        techCrystalsOwned,
    } from "./lib/techCrystalStore";
    import { applyBuildFromUrl, applyBuildData } from "./lib/buildData/applier";
    import { shareBuildAsImage } from "./lib/buildData/share";
    import { getEncodedFromUrl, getBasePath } from "./lib/buildData/url";
    import {
        decodeBuildData,
        encodeBuildData,
        type BuildData,
    } from "./lib/buildData/encoder";
    import { guardianTree } from "./config/guardianTree";
    import { vanguardTree } from "./config/vanguardTree";
    import { cannonTree } from "./config/cannonTree";
    import {
        loadPresetsFromStorage,
        updateActivePresetBuildCode,
    } from "./lib/buildPresetsStore";
    import { setPreviewMode, isPreviewMode } from "./lib/previewModeStore";
    import {
        clearPreviewBuildName,
        previewBuildName,
        getPreviewTitle,
    } from "./lib/previewBuildNameStore";
    import { updateUrlWithCurrentBuild } from "./lib/buildData/url";
    import {
        showToastDelayed,
        tryShowStoppedPreviewToast,
        tryShowClonedBuildToast,
    } from "./lib/toast";
    import { closeModal } from "./lib/modalStore";
    import { get } from "svelte/store";
    import { tr } from "svelte-whisper";

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

    function closeTransientUiForPreview() {
        closeModal();
        closeMenu();
        if (typeof document !== "undefined") {
            document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape" }),
            );
        }
    }

    // Check if we should show controls tab on initial load
    const previousVersion = getStoredVersion();
    const shouldShowControls = (() => {
        const isNew = isNewVersion();
        if (isNew) {
            // Set active tab so SideMenu initializes with controls (without persisting)
            setActiveTabWithoutPersist("controls");
        }
        return isNew;
    })();

    const baseTabs: Array<{ id: "guardian" | "vanguard" | "cannon"; nodes: TabConfig["nodes"] }> = [
        { id: "guardian", nodes: guardianTree },
        { id: "vanguard", nodes: vanguardTree },
        { id: "cannon", nodes: cannonTree },
    ];

    const tabsForInit: TabConfig[] = baseTabs.map((tab) => ({
        ...tab,
        label: tr(`trees.${tab.id}`),
    }));
    initTechCrystalTrees(tabsForInit);

    let tabs: TabConfig[] = tabsForInit;
    $: tabs = baseTabs.map((tab) => ({
        ...tab,
        label: $t(`trees.${tab.id}`),
    }));
    $: if (!activeTreeName && tabs.length > 0) {
        activeTreeName = tabs[0].label;
    }

    $: appName = $t("app.name");
    $: gameName = $t("app.gameName");
    $: appVersion = getCurrentVersion();
    $: appVersionLabel = appVersion === "unknown" ? "" : `v${appVersion}`;
    $: appTitle =
        appVersionLabel.length > 0
            ? $t("app.titleFullWithVersion", {
                  appName,
                  gameName,
                  version: appVersionLabel,
              })
            : $t("app.titleFull", {
                  appName,
                  gameName,
              });
    $: if (typeof document !== "undefined") {
        document.title = appTitle;
    }

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

    function openControlsFromTitle() {
        isMenuOpen = true;
        sideMenuRef?.openTab?.("controls");
    }

    /**
     * Selects the first tab that has nodes leveled > 0.
     * If no tab has levels, leaves the active tab unchanged.
     */
    function selectFirstTabWithLevels() {
        const currentTrees = get(treeLevels);
        const firstTabWithLevels = currentTrees.findIndex(
            (levels) => sumLevels(levels) > 0,
        );
        if (firstTabWithLevels !== -1) {
            activeTreeIndex = firstTabWithLevels;
        }
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

    // Subscriptions for preview mode and persistence, reused across URL re-initializations
    let unsubscribeTreeLevels: (() => void) | null = null;
    let unsubscribeTechCrystals: (() => void) | null = null;

    /**
     * Initialize app state based on the current URL.
     * Can safely be called multiple times (e.g. on initial load and on history navigation).
     */
    async function initializeFromUrl(): Promise<void> {
        const hashAtStart =
            typeof window !== "undefined" ? window.location.hash : "";
        let didNormalizeShareUrl = false;

        // Ensure trees are initialized before applying any build data
        await tick();

        // If hash changed during async work, abort - another hashchange will have triggered a fresh run
        if (
            typeof window !== "undefined" &&
            window.location.hash !== hashAtStart
        ) {
            return;
        }

        // Clean up any existing subscriptions before re-initializing
        unsubscribeTreeLevels?.();
        unsubscribeTreeLevels = null;
        unsubscribeTechCrystals?.();
        unsubscribeTechCrystals = null;

        // Check if there's a build in the URL (hash-based: /{base}#{encoded})
        // Only enter preview mode if we can actually decode valid build data
        const encoded = getEncodedFromUrl();
        let buildData: BuildData | null = null;
        let hasUrlBuild = false;

        if (encoded !== null) {
            // Try to decode the encoded data
            buildData = decodeBuildData(encoded);
            if (buildData === null) {
                // Invalid build data detected - clean it up
                if (typeof window !== "undefined") {
                    const basePath = getBasePath();
                    window.history.replaceState({}, "", basePath);
                    didNormalizeShareUrl = true;
                    // Show toast to inform user
                    showToastDelayed($t("preview.invalidShareLinkToast"), {
                        tone: "negative",
                    });
                }
            } else {
                hasUrlBuild = true;
            }
        }

        let shouldUsePreviewMode = false;
        if (hasUrlBuild && buildData) {
            // Stale check: hash may have changed (e.g. user navigated) - don't overwrite
            if (
                typeof window !== "undefined" &&
                window.location.hash !== hashAtStart &&
                !didNormalizeShareUrl
            ) {
                return;
            }

            // Apply build from URL (pass already-loaded buildData to avoid duplicate loading)
            const buildLoaded = applyBuildFromUrl(tabs, buildData);
            if (buildLoaded) {
                // Preview mode: Public build from URL
                shouldUsePreviewMode = true;
                setPreviewMode(true);

                // Select the first tab that has nodes leveled > 0
                selectFirstTabWithLevels();

                // Show toast about preview mode
                const title = getPreviewTitle(get(previewBuildName));
                closeTransientUiForPreview();
                showToastDelayed(
                    $t("preview.viewingBuildToast", {
                        name: title,
                    }),
                );
            } else {
                // Treat unapplicable shared builds as invalid preview links
                setPreviewMode(false);
                clearPreviewBuildName();
                if (typeof window !== "undefined") {
                    const basePath = getBasePath();
                    window.history.replaceState({}, "", basePath);
                    didNormalizeShareUrl = true;
                }
                showToastDelayed($t("preview.invalidShareLinkToast"), { tone: "negative" });
            }
        }

        if (shouldUsePreviewMode) {
            // Don't load from localStorage in preview mode
            // Don't initialize persistence in preview mode (changes update URL instead)

            // Subscribe to changes in preview mode to update URL
            unsubscribeTreeLevels = treeLevels.subscribe(() => {
                if (get(isPreviewMode)) {
                    updateUrlWithCurrentBuild();
                }
            });

            unsubscribeTechCrystals = techCrystalsOwned.subscribe(() => {
                if (get(isPreviewMode)) {
                    updateUrlWithCurrentBuild();
                }
            });
        } else {
            // Stale check: hash may have changed (e.g. user navigated) - don't overwrite
            if (
                typeof window !== "undefined" &&
                window.location.hash !== hashAtStart &&
                !didNormalizeShareUrl
            ) {
                return;
            }
            // Personal mode: Private build from presets (localStorage)
            setPreviewMode(false);
            clearPreviewBuildName();

            // Load from presets: apply active preset to treeLevels and techCrystalsOwned
            const presetsData = loadPresetsFromStorage();
            const activePreset = presetsData.presets.find(
                (p) => p.id === presetsData.active,
            );

            // Check if we just stopped preview mode or cloned build
            tryShowStoppedPreviewToast(activePreset?.name);
            tryShowClonedBuildToast();

            const fallbackBuildData: BuildData = {
                trees: tabs.map(() => []),
                owned: 0,
            };
            if (activePreset) {
                const buildData = decodeBuildData(activePreset.buildCode);
                if (!buildData) {
                    applyBuildData(tabs, fallbackBuildData);
                } else {
                    applyBuildData(tabs, buildData);
                }
            } else {
                applyBuildData(tabs, fallbackBuildData);
            }

            // Persist personal mode changes to active preset (subscribe to treeLevels and techCrystalsOwned)
            const persistToActivePreset = () => {
                if (get(isPreviewMode)) return;
                const levels = get(treeLevels);
                const owned = get(techCrystalsOwned);
                updateActivePresetBuildCode(
                    encodeBuildData({ trees: levels, owned }),
                );
            };
            unsubscribeTreeLevels = treeLevels.subscribe(persistToActivePreset);
            unsubscribeTechCrystals = techCrystalsOwned.subscribe(
                persistToActivePreset,
            );
        }
    }

    onMount(() => {
        ensureInstallListeners();

        // Global hotkeys: F9 to share, Escape to toggle menu
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;

            if (e.key === "Escape" && !e.defaultPrevented && e.isTrusted) {
                e.preventDefault();
                toggleMenu();
            } else if (e.key === "F9") {
                e.preventDefault();
                shareBuildAsImage();
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        let hasRunVersionCheck = false;

        async function runInitialization() {
            await initializeFromUrl();

            // New-version controls behavior is tied to initial load, not history navigation
            if (shouldShowControls && !hasRunVersionCheck) {
                hasRunVersionCheck = true;
                markVersionAsSeen();
                if (previousVersion) {
                    showToastDelayed(
                        $t("toast.updatedVersionToast", {
                            version: getCurrentVersion(),
                        }),
                    );
                }
                await tick();
                // Ensure controls tab is active (backup in case component initialized before localStorage was set)
                // Don't persist this change since it's for new version notification
                sideMenuRef?.openTab?.("controls", false);
                // Reset transition flag after menu is shown so future opens have transitions
                setTimeout(() => {
                    skipMenuTransition = false;
                }, 200);
            }
        }

        // Initial URL-based initialization
        void runInitialization();

        function handleHashchange() {
            void runInitialization();
        }

        if (typeof window !== "undefined") {
            window.addEventListener("hashchange", handleHashchange);
        }

        // Cleanup subscriptions and listeners on component destroy
        return () => {
            unsubscribeTreeLevels?.();
            unsubscribeTechCrystals?.();

            if (typeof window !== "undefined") {
                window.removeEventListener("hashchange", handleHashchange);
                window.removeEventListener("keydown", handleKeyDown);
            }
        };
    });
</script>

<div
    class="app-shell"
    class:menu-open={isMenuOpen}
    role="application"
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
    <div class="hud-safe-area">
        <div class="top-left-actions">
            {#key $isPreviewMode}
                <PreviewBuildIndicator />
            {/key}
            <AppTitleDisplay onClick={openControlsFromTitle} {isMenuOpen} />
        </div>
        <div class="top-right-actions">
            <TechCrystalDisplay />
            <ActiveTreeResetButton
                onReset={() => tabsRef?.resetActiveTree?.()}
                treeLabel={activeTreeName}
                canReset={canResetActiveTree}
            />
        </div>
    </div>
    <main class="app-main">
        <TreeTabs
            bind:this={tabsRef}
            bind:activeLabel={activeTreeName}
            bind:activeIndex={activeTreeIndex}
            bind:activeViewState={activeTreeViewState}
            bind:activeFocusViewState={activeTreeFocusViewState}
            {tabs}
            onMenuClick={toggleMenu}
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

    .top-left-actions,
    .top-right-actions {
        position: absolute;
        top: 0;
        display: inline-flex;
        flex-direction: column;
        gap: var(--spacing-lg);
        pointer-events: none;
    }

    .top-left-actions {
        left: 0;
        align-items: flex-start;
        transition: left 0.15s ease;
    }

    .top-right-actions {
        right: 0;
        align-items: flex-end;
        transition: right 0.15s ease;
    }

    @media (min-width: 768px) {
        .top-left-actions,
        .top-right-actions {
            z-index: var(--z-index-hud-over-side-menu-backdrop);
        }

        .app-shell.menu-open .top-right-actions {
            right: calc(var(--side-menu-width) + 10px);
        }
    }

    .top-left-actions > :global(*),
    .top-right-actions > :global(*) {
        pointer-events: auto;
    }
</style>
