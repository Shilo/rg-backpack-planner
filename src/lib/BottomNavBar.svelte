<script lang="ts">
    import { XIcon } from "phosphor-svelte";
    import TabBar from "./TabBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { tooltip } from "./tooltip";

    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;
    export let onClose: (() => void) | null = null;
</script>

<div class="bottom-nav-bar">
    <TabBar {tabs} {activeTab} {onTabChange} />
    <button
        class="bottom-nav-bar__close-button"
        aria-label="Close"
        use:tooltip={"Close"}
        on:click={() => onClose?.()}
        type="button"
    >
        <svelte:component
            this={XIcon}
            class="bottom-nav-bar__close-icon"
            aria-hidden="true"
            size={26}
        />
    </button>
</div>

<style>
    .bottom-nav-bar {
        flex: 0 0 auto;
        width: 100%;
        display: flex;
        align-items: stretch;
        position: relative;
    }

    .bottom-nav-bar__close-button {
        flex: 0 0 auto;
        width: var(--side-menu-tab-height);
        height: var(--side-menu-tab-height);
        border: 1px solid rgba(180, 72, 72, 0.9);
        background: rgba(84, 26, 32, 0.85);
        color: #ffd7d7;
        border-radius: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            border-color 0.2s ease,
            color 0.2s ease,
            background 0.2s ease;
    }

    .bottom-nav-bar__close-button:focus-visible {
        outline: 2px solid rgba(120, 156, 240, 0.9);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .bottom-nav-bar__close-button:hover {
            filter: brightness(1.18);
        }
    }

    .bottom-nav-bar__close-button:active {
        transform: scale(0.97);
        filter: brightness(1.2);
    }

    :global(.bottom-nav-bar__close-icon) {
        width: 26px;
        height: 26px;
    }
</style>
