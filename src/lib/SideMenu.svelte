<script lang="ts">
    import { onMount } from "svelte";
    import {
        ChartBarIcon,
        GameControllerIcon,
        GearSixIcon,
    } from "phosphor-svelte";
    import BottomNavBar from "./BottomNavBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
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
    import { isFormField } from "./domUtil";
    import { isComposeScreenshotOpen } from "./ComposeScreenshot.svelte";

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
    let SideMenuSettingsPage: any = null;
    let SideMenuStatisticsPage: any = null;
    let SideMenuControlsPage: any = null;
    let settingsPageRef: { tryGoBack?: () => boolean } | null = null;

    export function tryGoBack(): boolean {
        if (activeTab !== "settings") return false;
        return settingsPageRef?.tryGoBack?.() ?? false;
    }

    async function loadTabPage(tab: SideMenuTab): Promise<void> {
        if (tab === "settings" && !SideMenuSettingsPage) {
            SideMenuSettingsPage = (
                await import("./sideMenuPages/SideMenuSettingsPage.svelte")
            ).default;
        } else if (tab === "statistics" && !SideMenuStatisticsPage) {
            SideMenuStatisticsPage = (
                await import("./sideMenuPages/SideMenuStatisticsPage.svelte")
            ).default;
        } else if (tab === "controls" && !SideMenuControlsPage) {
            SideMenuControlsPage = (
                await import("./sideMenuPages/SideMenuControlsPage.svelte")
            ).default;
        }
    }

    // Use get() for one-time init instead of $sideMenuActiveTab auto-subscription.
    // Tab changes are driven by direct assignment in handleSideMenuTabChange/openTab.
    let activeTab: SideMenuTab = get(sideMenuActiveTab);
    $: void loadTabPage(activeTab);
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

    function handleTabKeydown(event: KeyboardEvent) {
        if (!isOpen || event.key !== "Tab" || sideMenuTabs.length <= 1) return;
        if ($isComposeScreenshotOpen) return;
        if (isFormField(document.activeElement)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const currentIndex = sideMenuTabs.findIndex((t) => t.id === activeTab);
        const nextIndex =
            (currentIndex + (event.shiftKey ? -1 : 1) + sideMenuTabs.length) %
            sideMenuTabs.length;
        openTab(sideMenuTabs[nextIndex].id as SideMenuTab, true);
        triggerHaptic();
    }

    onMount(() => {
        window.addEventListener("keydown", handleTabKeydown, true);
        return () =>
            window.removeEventListener("keydown", handleTabKeydown, true);
    });
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
                {#if activeTab === "settings" && SideMenuSettingsPage}
                    <svelte:component
                        this={SideMenuSettingsPage}
                        bind:this={settingsPageRef}
                        {activeTreeName}
                        {activeTreeIndex}
                        {activeTreeViewState}
                        {activeTreeFocusViewState}
                        {onClose}
                        {onResetAll}
                        {onResetTree}
                        {onFocusInView}
                        {scrollContentElement}
                    />
                {:else if activeTab === "statistics" && SideMenuStatisticsPage}
                    <svelte:component this={SideMenuStatisticsPage} />
                {:else if activeTab === "controls" && SideMenuControlsPage}
                    <svelte:component this={SideMenuControlsPage} />
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
        background: var(--backdrop-overlay);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
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
        transition: transform 0.25s cubic-bezier(0.05, 0.7, 0.1, 1);
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
        box-shadow: var(--shadow-lateral);
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

    .side-menu.open .side-menu__content-inner > :global(*) {
        animation: side-menu-item-in var(--ease-decel) both;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(1)) {
        animation-delay: 15ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(2)) {
        animation-delay: 35ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(3)) {
        animation-delay: 55ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(4)) {
        animation-delay: 75ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(5)) {
        animation-delay: 95ms;
    }
    .side-menu.open .side-menu__content-inner > :global(:nth-child(6)) {
        animation-delay: 115ms;
    }
</style>
