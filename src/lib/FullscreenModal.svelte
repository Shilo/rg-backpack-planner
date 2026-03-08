<script lang="ts">
    import { onMount } from "svelte";
    import BottomNavBar from "./BottomNavBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { triggerHaptic } from "./hapticsStore";

    export let isOpen = false;
    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;
    export let onClose: (() => void) | null = null;

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
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            handleClose();
        }
    }

    onMount(() => {
        document.addEventListener("keydown", handleKeydown);
        return () => document.removeEventListener("keydown", handleKeydown);
    });
</script>

{#if isOpen}
    <div class="fullscreen-modal" role="dialog" aria-modal="true">
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
        animation: fullscreen-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes fullscreen-modal-in {
        from {
            opacity: 0;
            transform: scale(0.98);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .fullscreen-modal__content {
        flex: 1;
        min-height: 0;
        position: relative;
        padding-top: var(--safe-top, 0px);
    }
</style>
