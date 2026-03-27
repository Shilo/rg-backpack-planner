<script lang="ts" context="module">
    import type { TreeViewState } from "./Tree.svelte";
    import type { TabConfig } from "../types/tree";
</script>

<script lang="ts">
    import { ListIcon } from "phosphor-svelte";
    import { getTreeIcon, TechCrystalIcon } from "./customIcons";
    import type { Component } from "svelte";
    import { onMount, tick } from "svelte";
    import { get } from "svelte/store";

    import FullscreenToggle from "./buttons/FullscreenToggle.svelte";
    import Button from "./Button.svelte";
    import Tree from "./Tree.svelte";
    import {
        registerTreeBridge,
        unregisterTreeBridge,
        SNAPDOM_CAPTURE_CLASS,
    } from "./buildImageExport/treeBridge";
    import TreeContextMenu from "./TreeContextMenu.svelte";
    import Starfield from "./Starfield.svelte";
    import RootNodeQuickSettings from "./RootNodeQuickSettings.svelte";
    import { secondary, getKeyboardActionLabel, getDeviceInputLabels, resolveKeyboardAction, isKeyboardAction, getCycleDirection, onKeyDown, triggerShortcutFlash } from "./input";
    import {
        ensureTreeLevels,
        resetAllTreeLevels,
        resetTreeBranchLevels,
        resetTreeLevels,
        setTreeLevels,
        sumLevels,
        sumTreeBranchLevels,
        treeLevels,
    } from "./treeLevelsStore";
    import type { TreeBranchKey } from "./treeLevelsStore";
    import { openResetTreeChoicesModal } from "./resetTreeModal";
    import { modalStore } from "./modalStore";
    import { isKeyboardShortcutTarget, isFormField, hasOnboardingOverlay } from "./domUtil";
    import { isComposeScreenshotOpen } from "./ComposeScreenshot.svelte";
    import { countGlobalLeveledLeafNodesOutsideActiveTree } from "./globalLeafCap";
    import { showToast } from "./toast";
    import { hideTooltip } from "./tooltip";
    import { activeTabId, getActiveTabId } from "./activeTabStore";
    import { techCrystalsSpentByTree, techCrystalsOwned } from "./techCrystalStore";
    import { openTechCrystalsOwnedModal } from "./techCrystalModal";
    import { formatNumber } from "svelte-whisper";
    import { t } from "svelte-whisper";
    import { treeContextMenuOpen } from "./buildContextMenuOverlayRaiseStore";
    import { undoHistory } from "./undoHistoryStore";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
        isNodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import { triggerHaptic } from "./hapticsStore";

    export let tabs: TabConfig[] = [];
    export let onMenuClick: (() => void) | null = null;

    function getTabIcon(id: string): Component | null {
        return getTreeIcon(id);
    }
    /** When true, Tab key cycles side menu tabs instead of tree tabs. */
    export let isMenuOpen = false;
    export let activeLabel = "";
    export let activeIndex = 0;
    export let activeViewState: TreeViewState | null = null;
    export let activeFocusViewState: TreeViewState | null = null;
    export let activeOnboardingReady: boolean = false;
    export let onboardingActive = false;
    let bottomInset = 0;
    let tabsBarEl: HTMLDivElement | null = null;
    let tabsRootEl: HTMLDivElement | null = null;
    let treeRef: {
        focusTreeInView?: (announce?: boolean) => void;
        focusTreeInViewForCapture?: () => void;
        resetAllNodes?: () => void;
        triggerFade?: () => void;
        cancelGestures?: () => void;
        getViewState?: () => TreeViewState;
        getFocusViewState?: () => TreeViewState | null;
        getTreeCanvas?: () => HTMLDivElement | null;
        restoreViewState?: (view: TreeViewState | null) => void;
        getWorldBoundsForCapture?: () => {
            width: number;
            height: number;
        } | null;
    } | null = null;
    let tabContextMenu: {
        id: string;
        label: string;
        x: number;
        y: number;
        index: number;
        hideViewOptions: boolean;
    } | null = null;
    let lastTabContextMenuIndex: number | null = null;
    let quickSettings: { x: number; y: number } | null = null;
    let hasMounted = false;
    let lastActiveTabId = "";
    let isInitialRestore = true;
    let lastBackgroundPointerPos = { x: 0, y: 0 };
    let lastBackgroundPointerTarget: EventTarget | null = null;
    let lastViewState: TreeViewState | null = null;
    let globalLeveledLeafNodesOutsideActiveTreeCount = 0;
    const TAB_CYCLE_REPEAT_MS = 400;
    let lastTabCycleAt = 0;
    let previousOnboardingTreeId = "";
    let onboardingRestoreIndex: number | null = null;

    function handleGlobalKeydown(event: KeyboardEvent) {
        const action = resolveKeyboardAction(event);
        if (!action) return;
        if (hasOnboardingOverlay()) return;

        switch (action) {
            case "cycle": {
                if (!tabsRootEl || tabs.length <= 1) return;
                if (isMenuOpen || $isComposeScreenshotOpen) return;
                if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl)) return;
                if (event.repeat) {
                    const now = performance.now();
                    if (now - lastTabCycleAt < TAB_CYCLE_REPEAT_MS) {
                        event.preventDefault();
                        return;
                    }
                }
                event.preventDefault();
                lastTabCycleAt = performance.now();
                const delta = getCycleDirection(event);
                const next = (activeIndex + delta + tabs.length) % tabs.length;
                setActive(next);
                break;
            }
            case "back": {
                if (!tabsRootEl) return;
                if (isMenuOpen) return;
                if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl)) return;
                const levels = $treeLevels[activeIndex] ?? [];
                if (sumLevels(levels) === 0) return;
                if (event.repeat) return;
                event.preventDefault();
                openResetChoicesForActiveTab();
                break;
            }
            case "console": {
                if (!tabsRootEl) return;
                if (isMenuOpen || $isComposeScreenshotOpen || $modalStore) return;
                if (isFormField(document.activeElement)) return;
                if (event.repeat) return;
                event.preventDefault();
                if (quickSettings) {
                    quickSettings = null;
                    return;
                }
                const rootEl = tabsRootEl.querySelector('[data-node-id="root"]');
                if (!rootEl) return;
                const rect = rootEl.getBoundingClientRect();
                openRootQuickSettings(rect.left + rect.width / 2, rect.top);
                break;
            }
            case "budget": {
                if (isMenuOpen || $isComposeScreenshotOpen || $modalStore) return;
                if (isFormField(document.activeElement)) return;
                if (event.repeat) return;
                event.preventDefault();
                openTechCrystalsOwnedModal($techCrystalsOwned, undefined, activeIndex);
                break;
            }
            case "cyclePrimaryAction": {
                if ($isComposeScreenshotOpen || $modalStore) return;
                if (isFormField(document.activeElement)) return;
                if (event.repeat) return;
                event.preventDefault();
                const current = get(nodePrimaryAction);
                const next = ((current + 1) % 3) as NodePrimaryAction;
                if (!isNodePrimaryAction(next)) return;
                nodePrimaryAction.set(next);
                triggerHaptic();
                triggerShortcutFlash("cyclePrimaryAction");
                break;
            }
        }
    }

    onKeyDown(handleGlobalKeydown);

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
        if (!tabsBarEl) {
            return;
        }
        const observer = new ResizeObserver(() => {
            bottomInset = tabsBarEl ? tabsBarEl.offsetHeight : 0;
        });
        observer.observe(tabsBarEl);
        bottomInset = tabsBarEl.offsetHeight;
        return () => {
            observer.disconnect();
        };
    });
    function clampIndex(index: number) {
        if (index < 0) return 0;
        if (index > tabs.length - 1) return tabs.length - 1;
        return index;
    }

    function setActive(index: number) {
        if (index === activeIndex) return;

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

    function handleOnboardingReadyChange(ready: boolean) {
        activeOnboardingReady = ready;
    }

    $: {
        const nextId = tabs[activeIndex]?.id ?? "";
        if (hasMounted && nextId && nextId !== lastActiveTabId) {
            lastActiveTabId = nextId;
            if (!isCaptureInProgress()) {
                void tick().then(() => treeRef?.triggerFade?.());
            }
        }
    }

    $: if (tabs.length > 0) {
        activeLabel = tabs[activeIndex]?.label ?? tabs[0].label;
    }

    $: {
        const currentTreeId = tabs[activeIndex]?.id ?? "";
        if (currentTreeId !== previousOnboardingTreeId) {
            previousOnboardingTreeId = currentTreeId;
            activeOnboardingReady = false;
        }
    }

    $: if (tabs.length > 0) {
        if (onboardingActive && onboardingRestoreIndex === null) {
            onboardingRestoreIndex = activeIndex;
            setActive(0);
        } else if (!onboardingActive && onboardingRestoreIndex !== null) {
            setActive(onboardingRestoreIndex);
            onboardingRestoreIndex = null;
        }
    }

    $: mouse = getDeviceInputLabels("mouse", $t);
    $: ensureTreeLevels(tabs);
    $: globalLeveledLeafNodesOutsideActiveTreeCount =
        countGlobalLeveledLeafNodesOutsideActiveTree(
            tabs,
            $treeLevels,
            activeIndex,
        );

    $: if (tabContextMenu && typeof tabContextMenu.index === "number") {
        lastTabContextMenuIndex = tabContextMenu.index;
    }

    $: treeContextMenuOpen.set(!!tabContextMenu);

    function isContextMenuTarget(target: EventTarget | null) {
        return (
            target instanceof Element &&
            (!!target.closest(".context-menu") ||
                !!target.closest(".context-menu-backdrop"))
        );
    }

    function isNodeTarget(target: EventTarget | null) {
        if (!(target instanceof Element)) return false;
        const nodeEl = target.closest("[data-node-id]");
        if (!nodeEl) return false;
        const nodeId = nodeEl.getAttribute("data-node-id");
        return nodeId !== null && nodeId !== "root";
    }

    function isRootTarget(target: EventTarget | null) {
        if (!(target instanceof Element)) return false;
        const nodeEl = target.closest("[data-node-id]");
        if (!nodeEl) return false;
        const nodeId = nodeEl.getAttribute("data-node-id");
        return nodeId === "root";
    }

    const ROOT_QUICK_SETTINGS_PAD = 32;
    const TREE_MENU_GAP = 16;
    function openRootQuickSettings(centerX: number, rootTop: number) {
        quickSettings = { x: centerX, y: rootTop - ROOT_QUICK_SETTINGS_PAD };
        treeRef?.cancelGestures?.();
    }

    function handleBackgroundSecondary(): boolean | void {
        if (
            isContextMenuTarget(lastBackgroundPointerTarget) ||
            isNodeTarget(lastBackgroundPointerTarget) ||
            isRootTarget(lastBackgroundPointerTarget)
        )
            return false;
        const activeTab = tabs[activeIndex];
        if (!activeTab) return false;
        hideTooltip();
        tabContextMenu = {
            id: activeTab.id,
            label: activeTab.label,
            x: lastBackgroundPointerPos.x,
            y: lastBackgroundPointerPos.y - TREE_MENU_GAP,
            index: activeIndex,
            hideViewOptions: false,
        };
        treeRef?.cancelGestures?.();
    }

    function openTabMenu(_event: Event, tab: TabConfig, index: number) {
        hideTooltip();
        const buttons = tabsRootEl?.querySelectorAll(".tab-btn");
        const el = buttons?.[index] instanceof HTMLElement ? buttons[index] : null;
        const rect = el?.getBoundingClientRect();
        const menuX = rect ? rect.left + rect.width / 2 : 0;
        const menuY = rect ? rect.top - TREE_MENU_GAP : 0;
        tabContextMenu = {
            id: tab.id,
            label: tab.label,
            x: menuX,
            y: menuY,
            index,
            hideViewOptions: true,
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

    function resetLevelsForTab(index: number) {
        resetTreeLevels(index, tabs);
        undoHistory.pushSnapshot(index);
        treeRef?.triggerFade?.();
    }

    function getBranchName(branch: TreeBranchKey) {
        return $t(`theme.colorNames.${branch}`);
    }

    function resetBranchByIndex(index: number, branch: TreeBranchKey) {
        resetTreeBranchLevels(index, branch);
        undoHistory.pushSnapshot(index);
        treeRef?.triggerFade?.();
        showToast(
            $t("tree.resetBranchToast", {
                branchName: getBranchName(branch),
            }),
            { tone: "negative" },
        );
    }

    function resetTreeByIndex(index: number) {
        resetLevelsForTab(index);
        const tabLabel = tabs[index].label;
        showToast(
            $t("tree.resetTreeToast", {
                treeLabel: tabLabel,
            }),
            { tone: "negative" },
        );
    }

    function resetTabTree(tabId: string) {
        const index = tabs.findIndex((tab) => tab.id === tabId);
        if (index === -1) return;
        resetTreeByIndex(index);
        closeTabMenu();
    }

    function openResetChoicesForActiveTab() {
        const tab = tabs[activeIndex];
        if (!tab) return;
        const levels = $treeLevels[activeIndex];
        if (sumLevels(levels) === 0) return;
        openResetTreeChoicesModal(
            $t,
            tab.label,
            levels,
            {
                onResetTree: () => resetTabTree(tab.id),
                onResetBranch: (branch) =>
                    resetBranchByIndex(activeIndex, branch),
            },
            tab.nodes,
            getTreeIcon(tab.id),
        );
    }

    export function resetActiveTree() {
        if (!tabs[activeIndex]) return;
        resetTreeByIndex(activeIndex);
    }

    export function resetActiveBranch(branch: TreeBranchKey) {
        if (!tabs[activeIndex]) return;
        const levels = $treeLevels[activeIndex] ?? [];
        if (sumTreeBranchLevels(levels, branch) === 0) return;
        resetBranchByIndex(activeIndex, branch);
    }

    export function resetAllTrees() {
        if (tabs.length === 0) return;
        resetAllTreeLevels(tabs);
        undoHistory.pushSnapshot(activeIndex);
        showToast($t("tree.resetAllTreesToast"), { tone: "negative" });
        treeRef?.triggerFade?.();
        closeTabMenu();
    }

    function onTabClick(index: number) {
        setActive(index);
    }

    function isCaptureInProgress() {
        return document.documentElement.classList.contains(
            SNAPDOM_CAPTURE_CLASS,
        );
    }

    function handleLevelsChange(nextLevels: number[]) {
        setTreeLevels(activeIndex, [...nextLevels]);
        undoHistory.pushSnapshot(activeIndex);
    }

    function restoreAfterCapture(index: number, viewState: TreeViewState) {
        if (index === activeIndex) {
            treeRef?.restoreViewState?.(viewState);
            return;
        }
        // Set lastViewState BEFORE switching so Tree remounts with the correct initialViewState.
        lastViewState = viewState;
        activeIndex = clampIndex(index);
        if (!isInitialRestore) {
            const tab = tabs[activeIndex];
            if (tab) activeTabId.set(tab.id);
        }
    }

    function bridgeAction(_node: HTMLElement) {
        const bridge = {
            setActive,
            getActive: () => activeIndex,
            getTreeCanvas: () => treeRef?.getTreeCanvas?.(),
            focusActiveTreeInView: () =>
                treeRef?.focusTreeInViewForCapture
                    ? treeRef.focusTreeInViewForCapture()
                    : treeRef?.focusTreeInView?.(false),
            getViewState: () => treeRef?.getViewState?.() ?? null,
            restoreAfterCapture,
            getWorldBoundsForCapture: () =>
                treeRef?.getWorldBoundsForCapture?.() ?? null,
        };
        registerTreeBridge(bridge);
        return { destroy: () => unregisterTreeBridge(bridge) };
    }
</script>

<div class="tabs-root" bind:this={tabsRootEl}>
    <Starfield />
    <div class="tabs-bar-spacer" bind:this={tabsBarEl} aria-hidden="true"></div>

    <div class="hud-safe-area">
        <div class="tabs-bar">
            <FullscreenToggle iconButton={true} class="fullscreen-button" />
            <div class="tab-buttons">
                {#each tabs as tab, index}
                    <Button
                        class="tab-btn {index === activeIndex ? 'active' : ''}"
                        icon={getTabIcon(tab.id)}
                        iconSize={18}
                        iconClass="tree-tab-icon"
                        tooltipText={$t("trees.named", { label: tab.label })}
                        shortcut={mouse.secondary}
                        on:click={() => onTabClick(index)}
                        on:contextmenu={(event: Event) =>
                            openTabMenu(event, tab, index)}
                    >
                        <span class="tab-label">{tab.label}</span>
                        <span class="tree-tab-crystals">
                            <TechCrystalIcon size={12} weight="fill" />
                            {formatNumber($techCrystalsSpentByTree[index] || 0)}
                        </span>
                    </Button>
                {/each}
            </div>
        </div>
        <Button
            class="menu-button"
            aria-label="Menu"
            tooltipText={$t("tree.menuButtonTooltip")}
            shortcut={getKeyboardActionLabel("dismiss", $t)}
            on:click={() => onMenuClick?.()}
            icon={ListIcon}
            iconClass="menu-button-icon"
            iconSize={26}
        ></Button>
    </div>

    <div
        class="tabs-content"
        role="presentation"
        use:secondary={handleBackgroundSecondary}
        on:pointerdown={(e) => { lastBackgroundPointerPos = { x: e.clientX, y: e.clientY }; lastBackgroundPointerTarget = e.target; }}
        on:pointermove={(e) => { lastBackgroundPointerPos = { x: e.clientX, y: e.clientY }; }}
        use:bridgeAction
    >
        {#if tabs[activeIndex]}
            {#key tabs[activeIndex].id}
                <Tree
                    bind:this={treeRef}
                    nodes={tabs[activeIndex].nodes}
                    tabId={tabs[activeIndex].id}
                    levelsById={$treeLevels[activeIndex] ?? null}
                    globalLeveledLeafNodesOutsideTreeCount={globalLeveledLeafNodesOutsideActiveTreeCount}
                    onLevelsChange={handleLevelsChange}
                    {bottomInset}
                    gesturesDisabled={!!tabContextMenu || !!quickSettings}
                    initialViewState={lastViewState}
                    onViewStateChange={handleViewStateChange}
                    onFocusViewStateChange={handleFocusViewStateChange}
                    onOnboardingReadyChange={handleOnboardingReadyChange}
                    onRootNodeClick={openRootQuickSettings}
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
        nodes={tabContextMenu?.index !== undefined
            ? (tabs[tabContextMenu.index]?.nodes ?? [])
            : []}
        levelsById={$treeLevels[tabContextMenu?.index ?? -1] ?? null}
        viewState={tabContextMenu?.index === activeIndex
            ? activeViewState
            : null}
        focusViewState={tabContextMenu?.index === activeIndex
            ? activeFocusViewState
            : null}
        hideViewOptions={tabContextMenu?.hideViewOptions ?? false}
        onClose={closeTabMenu}
        onFocusInView={focusTabInView}
        onReset={resetTabTree}
        onResetBranch={(branch) => {
            const idx = lastTabContextMenuIndex;
            if (idx != null) resetBranchByIndex(idx, branch);
        }}
    />

    <RootNodeQuickSettings
        x={quickSettings?.x ?? 0}
        y={quickSettings?.y ?? 0}
        isOpen={!!quickSettings}
        treeLabel={activeLabel}
        activeLevels={$treeLevels[activeIndex] ?? null}
        onResetBranch={(branch) => resetBranchByIndex(activeIndex, branch)}
        onResetTree={() => resetTreeByIndex(activeIndex)}
        onClose={() => {
            quickSettings = null;
        }}
    />
</div>

<style>
    .tabs-root {
        --menu-width: 38px;
        --menu-gap: var(--spacing-sm);
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: radial-gradient(
                circle at 50%
                    calc(50% - (var(--tab-height) + var(--bar-pad)) / 2),
                var(--surface),
                var(--bg) 100%
            );
        position: relative;
    }

    .tabs-bar-spacer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: calc(
            var(--tab-height) + max(var(--bar-pad), var(--safe-bottom, 0px))
        );
        pointer-events: none;
        visibility: hidden;
        z-index: -1;
    }

    .tabs-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        gap: var(--menu-gap);
        padding: 0 calc(var(--menu-width) + var(--menu-gap)) 0 0;
        background: transparent;
        min-width: 0;
    }

    .tab-buttons {
        flex: 1;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--menu-gap);
        min-width: 0;
        position: relative;
        z-index: var(--z-index-hud);
        transition: opacity 250ms ease;
    }


    /* Two-class specificity (0,2,0) reliably beats Button.svelte's scoped
       `button.svelte-hash` (0,1,1), so !important is not needed here. */
    :global(.tab-buttons .tab-btn) {
        color: var(--text-muted);
        padding: var(--spacing-xs) var(--spacing-sm);
        min-height: var(--tab-height);
        border-radius: var(--radius);
        letter-spacing: normal;
        font-size: var(--font-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
        min-width: 0;
        overflow: hidden;
        container-type: inline-size;
        container-name: tab;
    }

    :global(.tab-buttons .tab-btn .button-text) {
        display: contents;
    }

    /* Tighter label tracking as tab narrows. (130px -> 8.125rem) */
    @container tab (max-width: 8.125rem) {
        .tab-label {
            letter-spacing: 0.02em;
        }
    }

    @container tab (max-width: 4.6875rem) {
        :global(.tree-tab-icon) {
            display: none !important;
        }
    }

    @container tab (max-width: 11rem) {
        .tree-tab-crystals {
            display: none !important;
        }
    }

    @container tab (max-width: 5.9375rem) {
        .tab-label {
            letter-spacing: 0.01em;
        }
    }

    .tab-label {
        /* Scale to the actual tab width while keeping tiny tabs readable. */
        font-size: clamp(
            calc(8px / var(--text-scale, 1)),
            calc(0.205rem + 6.9cqw),
            var(--font-sm)
        );
        line-height: 1.1;
        letter-spacing: 0.03em;
        min-width: 0;
        max-width: 100%;
        flex: 0 1 auto;
        display: block;
        text-align: center;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        text-wrap: balance;
    }

    .tree-tab-crystals {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: 0.85em;
        color: var(--text-muted);
        background: color-mix(in srgb, var(--surface) 60%, transparent);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        line-height: 1;
    }

    :global(.tab-buttons .tab-btn.active .tree-tab-crystals) {
        background: color-mix(in srgb, var(--bg) 60%, transparent);
    }

    :global(.tree-tab-crystals svg) {
        color: var(--accent);
    }

    :global(.tab-buttons .tab-btn.active) {
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
        color: var(--text-muted);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    }

    :global(.fullscreen-button) {
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        color: var(--text-muted);
        width: var(--tab-height);
        height: var(--tab-height);
        border-radius: var(--radius);
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        z-index: var(--z-index-hud-over-side-menu-backdrop);
    }

    :global(.fullscreen-button .button-icon) {
        width: 26px;
        height: 26px;
    }

    :global(.menu-button) {
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        color: var(--text-muted);
        width: var(--tab-height);
        height: var(--tab-height);
        border-radius: var(--radius);
        font-size: var(--font-lg);
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        right: 0;
        bottom: 0;
        z-index: var(--z-index-hud);
    }

    :global(.menu-button-icon) {
        width: 26px;
        height: 26px;
    }

    .tabs-content {
        flex: 1;
        min-height: 0;
    }

</style>
