<script lang="ts">
    import { onMount } from "svelte";
    import BottomNavBar from "./BottomNavBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { triggerHaptic } from "./hapticsStore";
    import { isKeyboardShortcutTarget } from "./domUtil";

    export let isOpen = false;
    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;
    export let onClose: (() => void) | null = null;

    let modalEl: HTMLDivElement | null = null;

    function handleTabChange(tabId: string) {
        onTabChange(tabId);
        triggerHaptic();
    }

    function handleClose() {
        triggerHaptic();
        onClose?.();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) return;
        const isTab = event.key === "Tab";
        const isArrowLeft = event.key === "ArrowLeft";
        const isArrowRight = event.key === "ArrowRight";
        if (event.key === "Escape") {
            // Let context menus and fab menus handle Escape first
            if (document.querySelector(".context-menu") || document.querySelector(".fab-menu--open")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            handleClose();
        } else if ((isTab || isArrowLeft || isArrowRight) && tabs.length > 1 && modalEl) {
            if (!isKeyboardShortcutTarget(document.activeElement, modalEl)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const currentIndex = tabs.findIndex((t) => t.id === activeTab);
            const delta =
                isTab && event.shiftKey
                    ? -1
                    : isArrowLeft
                      ? -1
                      : 1;
            const nextIndex =
                (currentIndex + delta + tabs.length) %
                tabs.length;
            onTabChange(tabs[nextIndex].id);
            triggerHaptic();
        }
    }

    onMount(() => {
        document.addEventListener("keydown", handleKeydown, true);
        return () =>
            document.removeEventListener("keydown", handleKeydown, true);
    });
</script>

{#if isOpen}
    <div class="fullscreen-modal" role="dialog" aria-modal="true" bind:this={modalEl}>
        <div class="fullscreen-modal__content">
            <slot />
        </div>
        <BottomNavBar
            {tabs}
            {activeTab}
            onTabChange={handleTabChange}
            onClose={handleClose}
        />
    </div>
{/if}

<style>
    .fullscreen-modal {
        position: fixed;
        inset: 0;
        z-index: var(--z-index-modal);
        background: var(--bg-modal, var(--surface));
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .fullscreen-modal__content {
        flex: 1;
        min-height: 0;
        position: relative;
        padding-top: var(--safe-top, 0px);
    }
</style>
