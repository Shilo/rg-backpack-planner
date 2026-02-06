<script lang="ts">
    import type { Component } from "svelte";
    export let checked = false;
    export let label = "";
    export let ariaLabel: string | undefined = undefined;
    export let tooltipText: string | undefined = undefined;
    export let icon: Component | null = null;
    export let iconClass = "toggle-icon";
    export let onToggle: (() => void) | null = null;
    import { triggerHaptic } from "./haptics";
    import { tooltip } from "./tooltip";
</script>

<button
    class="toggle-row"
    type="button"
    on:click={() => {
        onToggle?.();
        triggerHaptic();
    }}
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel ?? label}
    use:tooltip={tooltipText}
>
    {#if icon}
        <span class="toggle-icon">
            <svelte:component
                this={icon}
                class={iconClass}
                aria-hidden="true"
                size={26}
            />
        </span>
    {/if}
    {#if label}
        <span class="toggle-row__label">{label}</span>
    {/if}
    <div class="toggle-switch" class:active={checked}>
        <div class="toggle-switch__thumb"></div>
    </div>
</button>

<style>
    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        height: 40px;
        padding: 10px 12px;
        border: 1px solid var(--color-button-border);
        background: var(--color-button-bg);
        border-radius: var(--radius-md);
        color: var(--color-button-text);
        font-size: var(--font-size-body);
        line-height: var(--line-height-tight);
        cursor: pointer;
        transition:
            border-color var(--transition-default),
            color var(--transition-default),
            background var(--transition-default),
            transform var(--transition-fast),
            filter var(--transition-fast);
        text-align: left;
        -webkit-tap-highlight-color: transparent;
    }

    .toggle-row:focus-visible {
        outline: 2px solid var(--color-button-focus-outline);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .toggle-row:hover {
            filter: var(--brightness-hover);
        }
    }

    .toggle-row:active {
        transform: scale(0.97);
        filter: var(--brightness-active);
    }

    .toggle-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        color: currentColor;
    }

    .toggle-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .toggle-row__label {
        flex: 1;
        user-select: none;
    }

    .toggle-switch {
        position: relative;
        width: 50px;
        height: 30px;
        border-radius: var(--radius-toggle);
        background: var(--color-toggle-off-bg);
        border: 1px solid var(--color-toggle-off-border);
        transition:
            background var(--transition-default),
            border-color var(--transition-default);
        flex-shrink: 0;
    }

    .toggle-switch.active {
        background: var(--color-toggle-on-bg);
        border-color: var(--color-toggle-on-border);
    }

    .toggle-switch__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-toggle-thumb);
        transition: transform var(--transition-default);
        box-shadow: var(--shadow-toggle-thumb);
    }

    .toggle-switch.active .toggle-switch__thumb {
        transform: translateX(20px);
    }
</style>
