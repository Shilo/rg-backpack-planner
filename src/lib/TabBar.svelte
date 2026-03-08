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
    import { triggerHaptic } from "./hapticsStore";

    export let tabs: TabBarItem[];
    export let activeTab: string;
    export let onTabChange: (tabId: string) => void;

    function handleTabClick(tabId: string) {
        triggerHaptic();
        onTabChange(tabId);
    }
</script>

<div class="tab-bar">
    <div class="tab-bar__tabs">
        {#each tabs as tab (tab.id)}
            <button
                class="tab-bar__tab-button"
                class:active={activeTab === tab.id}
                aria-label={tab.label}
                use:tooltip={tab.tooltip ?? ""}
                on:click={() => handleTabClick(tab.id)}
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
        flex: 1;
        min-width: 0;
        min-height: var(--side-menu-tab-height);
        --tab-bar-font-size: var(--font-xs);
    }

    .tab-bar__tabs {
        display: flex;
        align-items: stretch;
        gap: 0;
        padding: 0;
        flex: 1;
        min-width: 0;
        min-height: var(--side-menu-tab-height);
        pointer-events: none;
    }

    .tab-bar__tab-button {
        flex: 1;
        min-width: 0;
        border: var(--border-width) solid var(--border);
        background: transparent;
        color: var(--text-muted);
        border-radius: 0;
        min-height: var(--side-menu-tab-height);
        padding: var(--spacing-sm);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease),
            z-index var(--ease);
        pointer-events: auto;
        container-type: inline-size;
        container-name: tab-bar-tab;
    }

    :global(.tab-bar__tab-icon) {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
    }

    /* Hide icon when tab is narrow so label can use space and wrap */
    @container tab-bar-tab (max-width: calc(72px / var(--text-scale, 1))) {
        :global(.tab-bar__tab-icon) {
            display: none;
        }
    }

    .tab-bar__tab-label {
        font-size: var(--tab-bar-font-size);
        line-height: var(--leading);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        white-space: normal;
        overflow-wrap: anywhere;
        text-align: center;
        max-width: 100%;
    }

    @container tab-bar-tab (max-width: calc(100px / var(--text-scale, 1))) {
        .tab-bar__tab-label {
            font-size: var(--font-xs);
        }
    }

    @container tab-bar-tab (max-width: calc(75px / var(--text-scale, 1))) {
        .tab-bar__tab-label {
            font-size: var(--font-xxs);
        }
    }

    .tab-bar__tab-button:not(:first-child) {
        margin-left: -1px;
    }

    .tab-bar__tab-button.active {
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
        color: var(--text-muted);
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
        z-index: 2;
    }

    .tab-bar__tab-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .tab-bar__tab-button:not(.active):hover {
            filter: var(--brightness-hover);
        }
    }

    .tab-bar__tab-button:active {
        transform: scale(0.97);
        filter: var(--brightness-hover);
    }
</style>
