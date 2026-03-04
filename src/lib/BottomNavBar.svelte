<script lang="ts">
    import { XIcon } from "phosphor-svelte";
    import TabBar from "./TabBar.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { tooltip } from "./tooltip";
    import { t } from "svelte-whisper";

    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;
    export let onClose: (() => void) | null = null;
</script>

<div class="bottom-nav-bar">
    <TabBar {tabs} {activeTab} {onTabChange} />
    <button
        class="bottom-nav-bar__close-button"
        aria-label={$t("sideMenu.close")}
        use:tooltip={$t("sideMenu.close")}
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
        padding-bottom: var(--safe-bottom, 0px);
        padding-right: var(--safe-right, 0px);
    }

    .bottom-nav-bar__close-button {
        flex: 0 0 auto;
        width: var(--side-menu-tab-height);
        height: var(--side-menu-tab-height);
        border: var(--border-width) solid var(--danger-border);
        background: var(--danger-bg);
        color: var(--danger-text);
        border-radius: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease);
    }

    .bottom-nav-bar__close-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .bottom-nav-bar__close-button:hover {
            filter: var(--brightness-hover);
        }
    }

    .bottom-nav-bar__close-button:active {
        transform: scale(0.97);
        filter: var(--brightness-hover);
    }

    :global(.bottom-nav-bar__close-icon) {
        width: 26px;
        height: 26px;
    }
</style>
