<script lang="ts">
    import { onMount, tick } from "svelte";
    import TreeTabs from "./lib/TreeTabs.svelte";
    import type { TabConfig } from "./types/tree";
    import SideMenu from "./lib/SideMenu.svelte";
    import AppTitleDisplay from "./lib/AppTitleDisplay.svelte";
    import UndoRedoToolbar from "./lib/UndoRedoToolbar.svelte";
    import TechCrystalDisplay from "./lib/TechCrystalDisplay.svelte";
    import PreviewBuildIndicator from "./lib/PreviewBuildIndicator.svelte";
    import PrimaryActionIndicator from "./lib/PrimaryActionIndicator.svelte";
    import OnboardingOverlay from "./lib/onboarding/OnboardingOverlay.svelte";
    import Tooltip from "./lib/Tooltip.svelte";
    import Toasts from "./lib/Toasts.svelte";
    import ModalHost from "./lib/ModalHost.svelte";
    import type { TreeViewState } from "./lib/Tree.svelte";
    import { ensureInstallListeners } from "./lib/buttons/InstallPwaButton.svelte";
    import { isFormField, hasOnboardingOverlay } from "./lib/domUtil";
    import { t, locale } from "svelte-whisper";
    import {
        treeLevels,
        setTreeLevels,
        sumLevels,
        type TreeBranchKey,
    } from "./lib/treeLevelsStore";
    import type { LevelsByIndex } from "./types/tree";
    import {
        markVersionAsSeen,
        getStoredVersion,
        getCurrentVersion,
        getVersionUpgradeState,
    } from "./lib/latestUsedVersionStore";

    import {
        initTechCrystalTrees,
        techCrystalsOwned,
        setTechCrystalsOwned,
    } from "./lib/techCrystalStore";
    import { applyBuildFromUrl, applyBuildData } from "./lib/buildData/applier";
    import ComposeScreenshot, {
        isComposeScreenshotOpen,
        openComposeScreenshot,
    } from "./lib/ComposeScreenshot.svelte";
    import { resolveShareTokenFromUrl, getBasePath } from "./lib/buildData/url";
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
    import { buildContextMenuOpenForOverlayRaise } from "./lib/buildContextMenuOverlayRaiseStore";
    import { setPreviewMode, isPreviewMode } from "./lib/previewModeStore";
    import {
        clearPreviewBuildName,
        setPreviewBuildName,
        previewBuildName,
        getPreviewTitle,
    } from "./lib/previewBuildNameStore";
    import { updateUrlWithCurrentBuild } from "./lib/buildData/url";
    import {
        showToastDelayed,
        tryShowStoppedPreviewToast,
        tryShowClonedBuildToast,
    } from "./lib/toast";
    import {
        completeOnboarding,
        onboardingSeen,
    } from "./lib/onboarding/onboardingStore";
    import { closeModal } from "./lib/modalStore";
    import { get } from "svelte/store";
    import { undoHistory, canUndo, canRedo } from "./lib/undoHistoryStore";
    import { tr } from "svelte-whisper";
    import { useInputStore } from "./lib/input/inputStore";
    import {
        resolveKeyboardAction,
        keyForAction,
        onKeyDown,
        triggerShortcutFlash,
    } from "./lib/input";
    import { recommendedBuilds } from "./lib/buildData/recommended";
    import { toggleFullscreen } from "./lib/fullscreen";

    let tabsRef: {
        focusActiveTreeInView?: (announce?: boolean) => void;
        resetActiveBranch?: (branch: TreeBranchKey) => void;
        resetActiveTree?: () => void;
        resetAllTrees?: () => void;
    } | null = null;
    let activeTreeName = "";
    let activeTreeIndex = 0;
    let activeTreeViewState: TreeViewState | null = null;
    let activeTreeFocusViewState: TreeViewState | null = null;
    let activeTreeOnboardingReady = false;
    let swipeStartX: number | null = null;
    let swipeStartY: number | null = null;
    let swipeLastX: number | null = null;
    let isSwiping = false;
    const swipeCloseThreshold = 70;
    function closeTransientUiForPreview() {
        closeModal();
        closeMenu();
        if (typeof document !== "undefined") {
            document.dispatchEvent(
                new KeyboardEvent("keydown", { key: keyForAction("dismiss") }),
            );
        }
    }

    // Mark version as seen on load (no longer auto-opens side menu)
    const previousVersion = getStoredVersion();
    const { hasVersionChange, shouldShowUpdatedToast } =
        getVersionUpgradeState(previousVersion);

    const baseTabs: Array<{
        id: "guardian" | "vanguard" | "cannon";
        nodes: TabConfig["nodes"];
    }> = [
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
        const el = event.target as HTMLElement | null;
        if (el?.closest(".slider-setting__body")) {
            return;
        }
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
            if (!sideMenuRef?.tryGoBack?.()) {
                closeMenu();
            }
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
        tryGoBack?: () => boolean;
    } | null = null;
    let isMenuOpen = false;

    // Temporary onboarding preview state
    let onboardingPreviewSetupDone = false;
    let onboardingOriginalState: {
        treeLevels: LevelsByIndex[];
        techCrystalsOwned: number;
        isPreview: boolean;
        buildName: string | null;
        hash: string;
        undoState: ReturnType<typeof undoHistory.getState>;
    } | null = null;

    function setupOnboardingPreview() {
        const currentLevels = get(treeLevels);
        const currentOwned = get(techCrystalsOwned);
        const currentPreviewMode = get(isPreviewMode);
        const currentBuildName = get(previewBuildName);
        const currentHash =
            typeof window !== "undefined" ? window.location.hash : "";

        onboardingOriginalState = {
            treeLevels: currentLevels.map((t) => [...t]),
            techCrystalsOwned: currentOwned,
            isPreview: currentPreviewMode,
            buildName: currentBuildName,
            hash: currentHash,
            undoState: undoHistory.getState(),
        };

        // Pause subscriptions to prevent persistence/URL updates during onboarding
        unsubscribeTreeLevels?.();
        unsubscribeTreeLevels = null;
        unsubscribeTechCrystals?.();
        unsubscribeTechCrystals = null;

        // Load recommended build 0 temporarily
        const build = recommendedBuilds[0];
        if (build) {
            const buildData = decodeBuildData(build.encoded);
            if (buildData) {
                applyBuildData(tabs, buildData);
                setPreviewMode(true);
                setPreviewBuildName(build.displayName);
                undoHistory.clearHistory(activeTreeIndex);
            }
        }
    }

    function teardownOnboardingPreview() {
        if (!onboardingOriginalState) return;
        const state = onboardingOriginalState;
        onboardingOriginalState = null;

        // Restore original build state
        state.treeLevels.forEach((levels, index) => {
            setTreeLevels(index, levels);
        });
        setTechCrystalsOwned(state.techCrystalsOwned);
        setPreviewMode(state.isPreview);
        if (state.buildName !== null) {
            setPreviewBuildName(state.buildName);
        } else {
            clearPreviewBuildName();
        }
        undoHistory.restoreState(state.undoState);

        // Restore URL hash
        if (typeof window !== "undefined") {
            const target = state.hash || "";
            if (window.location.hash !== target) {
                window.history.replaceState({}, "", target || getBasePath());
            }
        }

        // Re-establish subscriptions
        if (state.isPreview) {
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

    function handleOnboardingDismiss() {
        completeOnboarding();
        teardownOnboardingPreview();
        onboardingPreviewSetupDone = false;
    }

    $: if (
        !$onboardingSeen &&
        activeTreeOnboardingReady &&
        !onboardingPreviewSetupDone
    ) {
        onboardingPreviewSetupDone = true;
        setupOnboardingPreview();
    }

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

        // Check if there's a build in the URL (hash-based: /{base}#{recommended} or /{base}#/{custom})
        // Only enter preview mode if we can actually resolve valid build data.
        const hasUrlCandidate = hashAtStart.length > 1;
        const resolvedShareToken = hasUrlCandidate
            ? resolveShareTokenFromUrl()
            : null;
        let buildData: BuildData | null = resolvedShareToken?.buildData ?? null;
        let hasUrlBuild = resolvedShareToken !== null;

        if (
            resolvedShareToken?.shouldNormalize &&
            typeof window !== "undefined"
        ) {
            const canonicalPath = `${getBasePath()}#${resolvedShareToken.canonicalToken}`;
            const currentPathAndHash =
                window.location.pathname + window.location.hash;
            if (canonicalPath !== currentPathAndHash) {
                window.history.replaceState({}, "", canonicalPath);
                didNormalizeShareUrl = true;
            }
        }

        if (!resolvedShareToken && hasUrlCandidate) {
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
                showToastDelayed($t("preview.invalidShareLinkToast"), {
                    tone: "negative",
                });
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
        if (!undoHistory.restoreFromSession(activeTreeIndex)) {
            undoHistory.clearHistory(activeTreeIndex);
        }
    }

    // Global hotkeys: F9 to open screenshot composer, Escape/Backspace for menu navigation
    let undoRedoApplyGen = 0;
    let lastUndoRedoTime = 0;
    const UNDO_REDO_REPEAT_MS = 250;
    const handleKeyDown = (e: KeyboardEvent) => {
        const action = resolveKeyboardAction(e);
        if (!action) return;

        // Undo/Redo — special: allows e.repeat with throttling
        if (
            (action === "undo" || action === "redo") &&
            !isFormField(document.activeElement) &&
            !hasOnboardingOverlay()
        ) {
            if (action === "undo" && get(canUndo)) {
                e.preventDefault();
                if (
                    e.repeat &&
                    Date.now() - lastUndoRedoTime < UNDO_REDO_REPEAT_MS
                )
                    return;
                lastUndoRedoTime = Date.now();
                triggerShortcutFlash("undo");
                const result = undoHistory.undoDeferred();
                if (result != null) {
                    const switchedTab =
                        result.activeTreeIndex !== activeTreeIndex;
                    activeTreeIndex = result.activeTreeIndex;
                    const gen = ++undoRedoApplyGen;
                    const TREE_FADE_MS = 150;
                    tick().then(() => {
                        if (gen !== undoRedoApplyGen) return;
                        if (switchedTab) {
                            setTimeout(() => {
                                if (gen !== undoRedoApplyGen) return;
                                result.apply();
                            }, TREE_FADE_MS);
                        } else {
                            requestAnimationFrame(() => {
                                if (gen !== undoRedoApplyGen) return;
                                result.apply();
                            });
                        }
                    });
                }
                return;
            }
            if (action === "redo" && get(canRedo)) {
                e.preventDefault();
                if (
                    e.repeat &&
                    Date.now() - lastUndoRedoTime < UNDO_REDO_REPEAT_MS
                )
                    return;
                lastUndoRedoTime = Date.now();
                triggerShortcutFlash("redo");
                const result = undoHistory.redoDeferred();
                if (result != null) {
                    const switchedTab =
                        result.activeTreeIndex !== activeTreeIndex;
                    activeTreeIndex = result.activeTreeIndex;
                    const gen = ++undoRedoApplyGen;
                    const TREE_FADE_MS = 150;
                    tick().then(() => {
                        if (gen !== undoRedoApplyGen) return;
                        if (switchedTab) {
                            setTimeout(() => {
                                if (gen !== undoRedoApplyGen) return;
                                result.apply();
                            }, TREE_FADE_MS);
                        } else {
                            requestAnimationFrame(() => {
                                if (gen !== undoRedoApplyGen) return;
                                result.apply();
                            });
                        }
                    });
                }
                return;
            }
        }

        if (e.repeat) return;

        switch (action) {
            case "dismiss":
                if (e.defaultPrevented || !e.isTrusted) break;
                if (
                    $isComposeScreenshotOpen ||
                    document.querySelector(".context-menu") ||
                    document.querySelector(".qs-panel") ||
                    hasOnboardingOverlay()
                )
                    break;
                e.preventDefault();
                if (isMenuOpen) {
                    if (!sideMenuRef?.tryGoBack?.()) {
                        closeMenu();
                    }
                } else {
                    isMenuOpen = true;
                }
                break;
            case "back":
                if (!isMenuOpen || e.defaultPrevented || !e.isTrusted) break;
                if (
                    isFormField(document.activeElement) ||
                    hasOnboardingOverlay()
                )
                    break;
                e.preventDefault();
                if (!sideMenuRef?.tryGoBack?.()) {
                    closeMenu();
                }
                break;
            case "screenshot":
                if (hasOnboardingOverlay()) break;
                e.preventDefault();
                openComposeScreenshot();
                break;
            case "fullscreen":
                e.preventDefault();
                triggerShortcutFlash("fullscreen");
                toggleFullscreen();
                break;
        }
    };
    onKeyDown(handleKeyDown);

    onMount(() => {
        ensureInstallListeners();

        function handleCloseSideMenu() {
            closeMenu();
        }
        document.addEventListener("closeSideMenu", handleCloseSideMenu);

        let hasRunVersionCheck = false;

        async function runInitialization() {
            await initializeFromUrl();
            await tick();
            tabsRef?.focusActiveTreeInView?.(false);

            // Version-change behavior is tied to initial load, not history navigation
            if (hasVersionChange && !hasRunVersionCheck) {
                hasRunVersionCheck = true;
                markVersionAsSeen();
                if (shouldShowUpdatedToast) {
                    showToastDelayed(
                        $t("toast.updatedVersionToast", {
                            version: getCurrentVersion(),
                        }),
                    );
                }
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

            if (typeof document !== "undefined") {
                document.removeEventListener(
                    "closeSideMenu",
                    handleCloseSideMenu,
                );
            }
            if (typeof window !== "undefined") {
                window.removeEventListener("hashchange", handleHashchange);
            }
        };
    });
</script>

<div
    class="app app-shell locale-{$locale || 'en'}"
    class:menu-open={isMenuOpen}
    role="application"
    use:useInputStore
    on:touchstart|passive={handleTouchStart}
    on:touchmove|passive={handleTouchMove}
    on:touchend={handleTouchEnd}
    on:touchcancel={handleTouchEnd}
>
    <SideMenu
        bind:this={sideMenuRef}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        onFocusInView={() => tabsRef?.focusActiveTreeInView?.(true)}
        onResetTree={() => tabsRef?.resetActiveTree?.()}
        onResetAll={() => tabsRef?.resetAllTrees?.()}
        onResetBranch={(branch) => tabsRef?.resetActiveBranch?.(branch)}
        activeTreeNodes={tabs[activeTreeIndex]?.nodes ?? []}
        activeTreeId={tabs[activeTreeIndex]?.id ?? ""}
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
        <div
            class="top-right-actions"
            class:above-backdrop={$buildContextMenuOpenForOverlayRaise}
        >
            <TechCrystalDisplay {activeTreeIndex} />
        </div>
        <div class="bot-left-actions">
            <PrimaryActionIndicator />
        </div>
        <div
            class="bot-right-actions"
            class:above-backdrop={$buildContextMenuOpenForOverlayRaise}
        >
            <UndoRedoToolbar
                activeLevels={$treeLevels?.[activeTreeIndex] ?? null}
                {activeTreeIndex}
                forceShow={!$onboardingSeen && activeTreeOnboardingReady}
                onUndo={(idx) => {
                    activeTreeIndex = idx;
                }}
                onRedo={(idx) => {
                    activeTreeIndex = idx;
                }}
                onResetBranch={(branch) => tabsRef?.resetActiveBranch?.(branch)}
                onReset={() => tabsRef?.resetActiveTree?.()}
                treeNodes={tabs[activeTreeIndex]?.nodes ?? []}
                treeLabel={activeTreeName}
                treeId={tabs[activeTreeIndex]?.id ?? ""}
            />
        </div>
    </div>
    <main class="app-main">
        <h1 class="visually-hidden">
            {$t("app.titleFull", { appName, gameName })}
        </h1>
        <TreeTabs
            bind:this={tabsRef}
            bind:activeLabel={activeTreeName}
            bind:activeIndex={activeTreeIndex}
            bind:activeViewState={activeTreeViewState}
            bind:activeFocusViewState={activeTreeFocusViewState}
            bind:activeOnboardingReady={activeTreeOnboardingReady}
            {tabs}
            {isMenuOpen}
            onMenuClick={toggleMenu}
        />
    </main>
    {#if !$onboardingSeen && activeTreeOnboardingReady}
        <OnboardingOverlay
            onDismiss={handleOnboardingDismiss}
            nodes={tabs[activeTreeIndex]?.nodes ?? []}
            offsetX={activeTreeViewState?.offsetX ?? 0}
            offsetY={activeTreeViewState?.offsetY ?? 0}
            scale={activeTreeViewState?.scale ?? 1}
            targetNodeIndex={0}
            lockedNodeIndex={12}
        />
    {/if}
    <ComposeScreenshot />
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
        position: relative;
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
        z-index: var(--z-index-hud);
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
        .top-right-actions,
        .bot-left-actions {
            z-index: var(--z-index-hud-over-side-menu-backdrop);
        }

        .app-shell.menu-open .top-right-actions {
            right: calc(var(--side-menu-width) + 10px);
        }
    }

    .top-right-actions.above-backdrop,
    .bot-right-actions.above-backdrop {
        z-index: var(--z-index-hud-above-context-backdrop);
    }

    .bot-right-actions {
        position: absolute;
        bottom: calc(var(--tab-height) + var(--bar-pad));
        right: 0;
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        pointer-events: none;
        z-index: var(--z-index-hud);
    }

    .bot-left-actions {
        position: absolute;
        bottom: calc(var(--tab-height) + var(--bar-pad));
        left: 0;
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        pointer-events: none;
        z-index: var(--z-index-hud);
    }

    .top-left-actions > :global(*),
    .top-right-actions > :global(*),
    .bot-right-actions > :global(*),
    .bot-left-actions > :global(*) {
        pointer-events: auto;
    }
</style>
