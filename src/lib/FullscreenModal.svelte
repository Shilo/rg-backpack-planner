<script lang="ts">
    import BottomNavBar from "./BottomNavBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { triggerHaptic } from "./haptics";

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
        background: var(--bg-panel);
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
