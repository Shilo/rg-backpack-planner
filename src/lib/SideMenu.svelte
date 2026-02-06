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
    import { triggerHaptic } from "./haptics";
    import type { TreeViewState } from "./Tree.svelte";
    import {
        setActiveTab,
        setActiveTabWithoutPersist,
        sideMenuActiveTab,
        type SideMenuTab,
    } from "./sideMenuActiveTabStore";

    const sideMenuTabs: TabBarItem[] = [
        {
            id: "statistics",
            label: "Statistics",
            icon: ChartBarIcon,
            tooltip: "View skills, levels, and tech crystal data",
        },
        {
            id: "settings",
            label: "Settings",
            icon: GearSixIcon,
            tooltip: "View options",
        },
        {
            id: "controls",
            label: "Controls",
            icon: GameControllerIcon,
            tooltip: "View input mapping",
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
    let activeTab: SideMenuTab = $sideMenuActiveTab;
    let scrollContentElement: HTMLElement | null = null;

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
        onClose?.();
    }

    // Reset scroll position when activeTab changes
    $: if (activeTab && scrollContentElement) {
        scrollContentElement.scrollTop = 0;
    }
</script>

<button
    class={`menu-backdrop${isOpen ? " visible" : ""}${skipTransition ? " skip-transition" : ""}`}
    aria-label="Close menu"
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
        <nav
            class="side-menu__content"
            aria-label="Primary"
            bind:this={scrollContentElement}
        >
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
        background: var(--color-side-menu-backdrop);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--transition-slow);
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
        width: calc(
            3 * var(--side-menu-tab-min-width) + var(--side-menu-tab-height) +
                10px
        );
        background: var(--color-side-menu-bg);
        border-left: 1px solid var(--color-side-menu-border);
        transform: translateX(100%);
        transition: transform var(--transition-slow);
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
        padding: 0 10px;
        scrollbar-gutter: stable;
    }

    .side-menu__content-inner {
        display: grid;
        gap: 10px;
    }

    .side-menu__content-inner > :global(:first-child) {
        margin-top: 8px;
    }

    .side-menu__content-inner > :global(:last-child) {
        margin-bottom: 10px;
    }

    .side-menu__scroll-area {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }
</style>
