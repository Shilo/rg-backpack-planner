<script lang="ts">
    import {
        ChartBarIcon,
        GameControllerIcon,
        GearSixIcon,
    } from "phosphor-svelte";
    import BottomNavBar from "./BottomNavBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import SideMenuSettingsPage from "./sideMenuPages/SideMenuSettingsPage.svelte";
    import SideMenuStatisticsPage from "./sideMenuPages/SideMenuStatisticsPage.svelte";
    import SideMenuControlsPage from "./sideMenuPages/SideMenuControlsPage.svelte";
    import { pushOverlay, popOverlay } from "./overlayHistory";
    import { triggerHaptic } from "./hapticsStore";
    import type { TreeViewState } from "./Tree.svelte";
    import { get } from "svelte/store";
    import {
        setActiveTab,
        setActiveTabWithoutPersist,
        sideMenuActiveTab,
        type SideMenuTab,
    } from "./sideMenuActiveTabStore";
    import { t } from "svelte-whisper";

    let sideMenuTabs: TabBarItem[] = [];
    $: sideMenuTabs = [
        {
            id: "statistics",
            label: $t("sideMenu.tabs.statistics.label"),
            icon: ChartBarIcon,
            tooltip: $t("sideMenu.tabs.statistics.tooltip"),
        },
        {
            id: "settings",
            label: $t("sideMenu.tabs.settings.label"),
            icon: GearSixIcon,
            tooltip: $t("sideMenu.tabs.settings.tooltip"),
        },
        {
            id: "controls",
            label: $t("sideMenu.tabs.controls.label"),
            icon: GameControllerIcon,
            tooltip: $t("sideMenu.tabs.controls.tooltip"),
        },
    ];

    export let isOpen = false;
    export let skipTransition = false;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onFocusInView: (() => void) | null = null;
    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    // Use get() for one-time init instead of $sideMenuActiveTab auto-subscription.
    // Tab changes are driven by direct assignment in handleSideMenuTabChange/openTab.
    let activeTab: SideMenuTab = get(sideMenuActiveTab);
    let scrollContentElement: HTMLElement | null = null;
    let wasOpen = false;
    let wePushedOverlay = false;

    $: {
        if (isOpen && !wasOpen) {
            pushOverlay(() => {
                wePushedOverlay = false;
                onClose?.();
            });
            wePushedOverlay = true;
        }
        if (!isOpen && wePushedOverlay) {
            wePushedOverlay = false;
            popOverlay(true);
        }
        wasOpen = isOpen;
    }

    export function openTab(tab: SideMenuTab, persist: boolean = true) {
        activeTab = tab;
        if (persist) {
            setActiveTab(tab);
        } else {
            setActiveTabWithoutPersist(tab);
        }
    }

    function handleSideMenuTabChange(tabId: string) {
        activeTab = tabId as SideMenuTab;
        setActiveTab(activeTab);
        triggerHaptic();
    }

    function handleBackdropClick() {
        triggerHaptic();
        if (wePushedOverlay) popOverlay();
        else onClose?.();
    }

    // Reset scroll position when activeTab changes
    $: if (activeTab && scrollContentElement) {
        scrollContentElement.scrollTop = 0;
    }
</script>

<button
    class={`menu-backdrop${isOpen ? " visible" : ""}${skipTransition ? " skip-transition" : ""}`}
    aria-label={$t("common.close")}
    tabindex={isOpen ? 0 : -1}
    inert={!isOpen}
    on:click={handleBackdropClick}
    type="button"
></button>
<aside
    class="side-menu"
    class:open={isOpen}
    class:skip-transition={skipTransition}
    inert={!isOpen}
>
    <div class="side-menu__scroll-area">
        <nav class="side-menu__content" bind:this={scrollContentElement}>
            <div class="side-menu__content-inner">
                {#if activeTab === "settings"}
                    <SideMenuSettingsPage
                        {activeTreeName}
                        {activeTreeIndex}
                        {activeTreeViewState}
                        {activeTreeFocusViewState}
                        {onClose}
                        {onResetAll}
                        {onResetTree}
                        {onFocusInView}
                    />
                {:else if activeTab === "statistics"}
                    <SideMenuStatisticsPage />
                {:else if activeTab === "controls"}
                    <SideMenuControlsPage />
                {/if}
            </div>
        </nav>
    </div>
    <BottomNavBar
        tabs={sideMenuTabs}
        {activeTab}
        onTabChange={handleSideMenuTabChange}
        onClose={() => {
            triggerHaptic();
            onClose?.();
        }}
    />
</aside>

<style>
    :global(.menu-backdrop) {
        position: fixed;
        inset: 0;
        background: var(--backdrop-overlay, rgba(0, 0, 0, 0.5));
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        border: none;
        padding: 0;
        z-index: calc(var(--z-index-side-menu) - 2);
    }

    :global(.menu-backdrop.skip-transition) {
        transition: none;
    }

    :global(.menu-backdrop.visible) {
        opacity: 1;
        pointer-events: auto;
    }

    .side-menu {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        max-width: 100%;
        width: var(--side-menu-width, 360px);
        background: var(--bg-panel);
        border-left: var(--border-width) solid var(--border-subtle);
        transform: translateX(100%);
        transition: transform 0.15s ease;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0px;
        overflow: hidden;
        z-index: var(--z-index-side-menu);
    }

    .side-menu.skip-transition {
        transition: none;
    }

    .side-menu.open {
        transform: translateX(0);
    }

    .side-menu__content {
        display: block;
        height: 100%;
        overflow-y: auto;
        padding: 0 calc(var(--spacing-md) + var(--safe-right, 0px)) 0
            var(--spacing-md);
        scrollbar-gutter: stable;
        scrollbar-width: thin;
    }

    @media (pointer: fine) and (hover: hover) {
        /* 
           Note: Polypane and other desktop-based simulators may still report pointer: fine 
           even for mobile views, which can cause these styles to trigger unexpectedly 
           in simulation. On real devices (Windows/Android/iOS) this detection is robust.
        */
        .side-menu__content {
            --scrollbar-visual-width: 6px;
            scrollbar-gutter: stable both-edges;

            /* 
               On desktop with classic scrollbars, the visual gap is:
               Base Padding + Scrollbar Gutter. 
               We subtract the scrollbar width from the padding to keep the total gap exactly --spacing-md.
            */
            padding: 0
                calc(
                    max(0px, var(--spacing-md) - var(--scrollbar-visual-width)) +
                        var(--safe-right, 0px)
                )
                0 max(0px, var(--spacing-md) - var(--scrollbar-visual-width));
        }

        .side-menu__content::-webkit-scrollbar {
            width: var(--scrollbar-visual-width);
        }
    }

    .side-menu__content-inner {
        display: grid;
        gap: var(--spacing-lg);
    }

    .side-menu__content-inner > :global(:first-child) {
        margin-top: calc(var(--spacing-md) + var(--safe-top, 0px));
    }

    .side-menu__content-inner > :global(:last-child) {
        margin-bottom: var(--spacing-lg);
    }

    /* When the last child is hidden (e.g. a portal wrapper), apply the bottom
       margin to the preceding visible sibling instead. */
    .side-menu__content-inner > :global(:has(+ [hidden]:last-child)) {
        margin-bottom: var(--spacing-lg);
    }

    .side-menu__scroll-area {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }
</style>
