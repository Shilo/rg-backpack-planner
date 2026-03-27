<script lang="ts">
    import type { Component } from "svelte";
    export let checked = false;
    export let label = "";
    export let ariaLabel: string | undefined = undefined;
    export let tooltipText: string | undefined = undefined;
    export let description: string | undefined = undefined;
    export let icon: Component | null = null;
    export let iconClass = "toggle-icon";
    export let onToggle: (() => void) | null = null;
    import { triggerHaptic } from "./hapticsStore";
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
    {#if label || description}
        <div class="toggle-row__label-group">
            {#if label}
                <span class="toggle-row__label">{label}</span>
            {/if}
            {#if description}
                <span class="toggle-row__description">{description}</span>
            {/if}
        </div>
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
        gap: var(--spacing-md);
        width: 100%;
        min-height: 40px;
        padding: var(--spacing-md) var(--spacing-lg);
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        line-height: var(--leading);
        cursor: pointer;
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease),
            transform var(--ease),
            filter var(--ease);
        text-align: left;
        -webkit-tap-highlight-color: transparent;
    }

    .toggle-row:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .toggle-row:hover {
            filter: var(--brightness-hover);
        }
    }

    .toggle-row:active {
        transform: scale(0.97);
        filter: var(--brightness-hover);
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

    .toggle-row__label-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
        flex: 1;
        min-width: 0;
    }

    .toggle-row__label {
        white-space: normal;
        overflow-wrap: anywhere;
        user-select: none;
    }

    .toggle-row__description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
        user-select: none;
    }

    .toggle-switch {
        position: relative;
        width: 50px;
        height: 30px;
        border-radius: var(--radius);
        background: color-mix(in srgb, var(--border) 80%, transparent);
        border: var(--border-width) solid
            color-mix(in srgb, var(--border) 90%, transparent);
        transition:
            background var(--ease),
            border-color var(--ease);
        flex-shrink: 0;
    }

    .toggle-switch.active {
        background: color-mix(in srgb, var(--accent-light) 90%, transparent);
        border-color: var(--accent-light);
    }

    .toggle-switch__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--toggle-thumb);
        transition:
            transform var(--ease-emphasis),
            width 0.15s cubic-bezier(0.16, 1, 0.3, 1),
            border-radius 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: var(--shadow);
    }

    .toggle-row:active .toggle-switch__thumb {
        width: 28px;
        border-radius: 12px;
    }

    .toggle-switch.active .toggle-switch__thumb {
        transform: translateX(20px);
    }

    .toggle-row:active .toggle-switch.active .toggle-switch__thumb {
        transform: translateX(16px);
    }
</style>
