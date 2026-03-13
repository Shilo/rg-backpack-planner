<script lang="ts" context="module">
    import type { TreeViewState } from "./Tree.svelte";
    import type { TabConfig } from "../types/tree";
</script>

<script lang="ts">
    import { ListIcon } from "phosphor-svelte";
    import {
        GuardianIcon,
        VanguardIcon,
        CannonIcon,
        TechCrystalIcon,
    } from "./customIcons";
    import type { Component } from "svelte";
    import { onMount, tick } from "svelte";

    import FullscreenToggle from "./buttons/FullscreenToggle.svelte";
    import Button from "./Button.svelte";
    import Tree from "./Tree.svelte";
    import {
        registerTreeBridge,
        unregisterTreeBridge,
        SNAPDOM_CAPTURE_CLASS,
    } from "./buildImageExport/treeBridge";
    import TreeContextMenu from "./TreeContextMenu.svelte";
    import {
        clearLongPress,
        isLongPressMovement,
        startLongPress,
        suppressNextPointerUp,
        type LongPressState,
    } from "./longPress";
    import {
        ensureTreeLevels,
        resetAllTreeLevels,
        resetTreeLevels,
        setTreeLevels,
        sumLevels,
        treeLevels,
    } from "./treeLevelsStore";
    import { openResetTreeModal } from "./resetTreeModal";
    import { isKeyboardShortcutTarget, hasOnboardingOverlay } from "./domUtil";
    import { isComposeScreenshotOpen } from "./ComposeScreenshot.svelte";
    import { countGlobalLeveledLeafNodesOutsideActiveTree } from "./globalLeafCap";
    import { showToast } from "./toast";
    import { hideTooltip, suppressTooltip } from "./tooltip";
    import { activeTabId, getActiveTabId } from "./activeTabStore";
    import { techCrystalsSpentByTree } from "./techCrystalStore";
    import { formatNumber } from "svelte-whisper";
    import { t } from "svelte-whisper";

    export let tabs: TabConfig[] = [];
    export let onMenuClick: (() => void) | null = null;

    function getTabIcon(id: string): Component | null {
        if (id === "guardian") return GuardianIcon as unknown as Component;
        if (id === "vanguard") return VanguardIcon as unknown as Component;
        if (id === "cannon") return CannonIcon as unknown as Component;
        return null;
    }
    /** When true, Tab key cycles side menu tabs instead of tree tabs. */
    export let isMenuOpen = false;
    export let activeLabel = "";
    export let activeIndex = 0;
    export let activeViewState: TreeViewState | null = null;
    export let activeFocusViewState: TreeViewState | null = null;
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
    } | null = null;
    let tabContextMenu: {
        id: string;
        label: string;
        x: number;
        y: number;
        index: number;
        hideViewOptions: boolean;
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
    let globalLeveledLeafNodesOutsideActiveTreeCount = 0;
    const TAB_CYCLE_REPEAT_MS = 400;
    let lastTabCycleAt = 0;

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

    function handleTabKeydown(event: KeyboardEvent) {
        if (event.key !== "Tab" || !tabsRootEl || tabs.length <= 1) return;
        if (isMenuOpen || $isComposeScreenshotOpen) return;
        if (hasOnboardingOverlay()) return;
        if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl))
            return;

        if (event.repeat) {
            const now = performance.now();
            if (now - lastTabCycleAt < TAB_CYCLE_REPEAT_MS) {
                event.preventDefault();
                return;
            }
        }
        event.preventDefault();
        lastTabCycleAt = performance.now();
        const next = event.shiftKey
            ? (activeIndex - 1 + tabs.length) % tabs.length
            : (activeIndex + 1) % tabs.length;
        setActive(next);
    }

    function handleBackspaceKeydown(event: KeyboardEvent) {
        if (event.key !== "Backspace" || !tabsRootEl) return;
        if (isMenuOpen) return;
        if (hasOnboardingOverlay()) return;
        if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl))
            return;
        const levels = $treeLevels[activeIndex] ?? [];
        if (sumLevels(levels) === 0) return;
        if (event.repeat) return;
        event.preventDefault();
        openResetModalForActiveTab();
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
        window.addEventListener("keydown", handleTabKeydown, true);
        window.addEventListener("keydown", handleBackspaceKeydown, true);
        if (!tabsBarEl) {
            return () => {
                window.removeEventListener("keydown", handleTabKeydown, true);
                window.removeEventListener(
                    "keydown",
                    handleBackspaceKeydown,
                    true,
                );
            };
        }
        const observer = new ResizeObserver(() => {
            bottomInset = tabsBarEl ? tabsBarEl.offsetHeight : 0;
        });
        observer.observe(tabsBarEl);
        bottomInset = tabsBarEl.offsetHeight;
        return () => {
            window.removeEventListener("keydown", handleTabKeydown, true);
            window.removeEventListener("keydown", handleBackspaceKeydown, true);
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

    $: ensureTreeLevels(tabs);
    $: globalLeveledLeafNodesOutsideActiveTreeCount =
        countGlobalLeveledLeafNodesOutsideActiveTree(
            tabs,
            $treeLevels,
            activeIndex,
        );

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
            if (tabPressPointerId !== null)
                suppressNextPointerUp(tabPressPointerId);
            tabContextMenu = {
                id: tab.id,
                label: tab.label,
                x: point.x,
                y: point.y,
                index,
                hideViewOptions: true,
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

    function startBackgroundPress(event: PointerEvent) {
        if (isContextMenuTarget(event.target) || isNodeTarget(event.target))
            return;
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
            if (backgroundPressPointerId !== null)
                suppressNextPointerUp(backgroundPressPointerId);
            tabContextMenu = {
                id: activeTab.id,
                label: activeTab.label,
                x: point.x,
                y: point.y,
                index: activeIndex,
                hideViewOptions: false,
            };
            treeRef?.cancelGestures?.();
            return true;
        });
    }

    function openBackgroundMenu(event: MouseEvent) {
        // Ignore touch-synthesized contextmenu - we use long-press for that
        if (event.button !== 2) {
            event.preventDefault();
            return;
        }
        if (isContextMenuTarget(event.target) || isNodeTarget(event.target))
            return;
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
            hideViewOptions: false,
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
        // Ignore touch-synthesized contextmenu - we use long-press for that
        if (event.button !== 2) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        hideTooltip();
        tabContextMenu = {
            id: tab.id,
            label: tab.label,
            x: event.clientX,
            y: event.clientY,
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
        treeRef?.triggerFade?.();
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

    function openResetModalForActiveTab() {
        const tab = tabs[activeIndex];
        if (!tab) return;
        const levels = $treeLevels[activeIndex];
        if (sumLevels(levels) === 0) return;
        openResetTreeModal($t, tab.label, () => resetTabTree(tab.id));
    }

    export function resetActiveTree() {
        if (!tabs[activeIndex]) return;
        resetTreeByIndex(activeIndex);
    }

    export function resetAllTrees() {
        if (tabs.length === 0) return;
        resetAllTreeLevels(tabs);
        showToast($t("tree.resetAllTreesToast"), { tone: "negative" });
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

    function isCaptureInProgress() {
        return document.documentElement.classList.contains(
            SNAPDOM_CAPTURE_CLASS,
        );
    }

    function handleLevelsChange(nextLevels: number[]) {
        setTreeLevels(activeIndex, [...nextLevels]);
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
        };
        registerTreeBridge(bridge);
        return { destroy: () => unregisterTreeBridge(bridge) };
    }
</script>

<div class="tabs-root" bind:this={tabsRootEl}>
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
            on:click={() => onMenuClick?.()}
            icon={ListIcon}
            iconClass="menu-button-icon"
            iconSize={26}
        ></Button>
    </div>

    <div
        class="tabs-content"
        role="presentation"
        on:contextmenu={openBackgroundMenu}
        on:pointerdown={startBackgroundPress}
        on:pointermove={moveBackgroundPress}
        on:pointerup={clearBackgroundPress}
        on:pointercancel={clearBackgroundPress}
        on:pointerleave={clearBackgroundPress}
        use:bridgeAction
    >
        {#if tabs[activeIndex]}
            {#key tabs[activeIndex].id}
                <Tree
                    bind:this={treeRef}
                    nodes={tabs[activeIndex].nodes}
                    levelsById={$treeLevels[activeIndex] ?? null}
                    globalLeveledLeafNodesOutsideTreeCount={globalLeveledLeafNodesOutsideActiveTreeCount}
                    onLevelsChange={handleLevelsChange}
                    {bottomInset}
                    gesturesDisabled={!!tabContextMenu}
                    initialViewState={lastViewState}
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
                            hideViewOptions: false,
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
        background:
            radial-gradient(
                circle,
                color-mix(in srgb, var(--border-subtle) 30%, transparent) 0.75px,
                transparent 0.75px
            ),
            radial-gradient(
                circle at 50%
                    calc(50% - (var(--tab-height) + var(--bar-pad)) / 2),
                color-mix(in srgb, var(--bg) 20%, var(--surface)),
                var(--bg) 100%
            );
        background-size:
            32px 32px,
            100% 100%;
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
