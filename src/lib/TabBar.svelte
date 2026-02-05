<script lang="ts" context="module">
    import type { Component } from "svelte";

    export type TabBarItem = {
        id: string;
        label: string;
        icon?: Component;
        tooltip?: string;
    };
</script>

<script lang="ts">
    import { tooltip } from "./tooltip";

    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;
</script>

<div class="tab-bar">
    <div class="tab-bar__tabs">
        {#each tabs as tab (tab.id)}
            <button
                class="tab-bar__tab-button"
                class:active={activeTab === tab.id}
                aria-label={tab.label}
                use:tooltip={tab.tooltip ?? ""}
                on:click={() => onTabChange(tab.id)}
                type="button"
            >
                {#if tab.icon}
                    <svelte:component
                        this={tab.icon}
                        class="tab-bar__tab-icon"
                        aria-hidden="true"
                    />
                {/if}
                <span class="tab-bar__tab-label">{tab.label}</span>
            </button>
        {/each}
    </div>
</div>

<style>
    .tab-bar {
        width: 100%;
        height: var(--side-menu-tab-height);
    }

    .tab-bar__tabs {
        display: flex;
        align-items: stretch;
        gap: 0;
        padding: 0;
        flex: 1;
        min-width: 0;
        height: var(--side-menu-tab-height);
        pointer-events: none;
    }

    .tab-bar__tab-button {
        flex: 1;
        min-width: var(--side-menu-tab-min-width, 72px);
        border: 1px solid #2c3c61;
        background: transparent;
        color: #8fa4ce;
        border-radius: 0;
        height: var(--side-menu-tab-height);
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        transition:
            border-color 0.2s ease,
            color 0.2s ease,
            background 0.2s ease,
            z-index 0.2s ease;
        pointer-events: auto;
    }

    :global(.tab-bar__tab-icon) {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
    }

    .tab-bar__tab-label {
        font-size: 0.65rem;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    .tab-bar__tab-button:not(:first-child) {
        margin-left: -1px;
    }

    .tab-bar__tab-button.active {
        background: rgba(34, 49, 82, 0.78);
        color: #e7efff;
        border-color: #4f6fbf;
        z-index: 2;
    }

    .tab-bar__tab-button:focus-visible {
        outline: 2px solid rgba(120, 156, 240, 0.9);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .tab-bar__tab-button:not(.active):hover {
            filter: brightness(1.18);
        }
    }

    .tab-bar__tab-button:active {
        transform: scale(0.97);
        filter: brightness(1.2);
    }
</style>
