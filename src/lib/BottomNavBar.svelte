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
        border: 1px solid var(--color-button-negative-border);
        background: var(--color-button-negative-bg);
        color: var(--color-button-negative-text);
        border-radius: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            border-color var(--transition-default),
            color var(--transition-default),
            background var(--transition-default);
    }

    .bottom-nav-bar__close-button:focus-visible {
        outline: 2px solid var(--color-button-focus-outline);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .bottom-nav-bar__close-button:hover {
            filter: var(--brightness-hover);
        }
    }

    .bottom-nav-bar__close-button:active {
        transform: scale(0.97);
        filter: var(--brightness-active);
    }

    :global(.bottom-nav-bar__close-icon) {
        width: 26px;
        height: 26px;
    }
</style>
