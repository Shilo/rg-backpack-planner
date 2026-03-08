<script lang="ts">
    import type { Component } from "svelte";
    import { triggerHaptic } from "./hapticsStore";

    type SegmentOption = {
        index: number;
        label: string;
    };

    export let options: string[] = [];
    export let selectedIndex = 0;
    export let label = "";
    export let ariaLabel: string | undefined = undefined;
    export let icon: Component | null = null;
    export let iconClass = "segmented-control__icon";
    export let onChange: ((index: number) => void) | null = null;

    const normalizeLabel = (value: string, index: number) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : `Option ${index + 1}`;
    };

    $: segmentOptions = options.map<SegmentOption>((value, index) => {
        const normalizedLabel = normalizeLabel(value, index);
        return {
            index,
            label: normalizedLabel,
        };
    });

    $: normalizedSelectedIndex =
        segmentOptions.length === 0
            ? -1
            : Math.max(0, Math.min(selectedIndex, segmentOptions.length - 1));

    function handleSelect(index: number) {
        if (index === normalizedSelectedIndex) return;
        onChange?.(index);
        triggerHaptic();
    }

    function handleSegmentKeydown(event: KeyboardEvent, index: number) {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        handleSelect(index);
    }
</script>

<div
    class="segmented-control"
    role="radiogroup"
    aria-label={ariaLabel ?? (label || undefined)}
>
    {#if label}
        <div class="segmented-control__header">
            {#if icon}
                <span class="segmented-control__header-icon" aria-hidden="true">
                    <svelte:component this={icon} class={iconClass} size={26} />
                </span>
            {/if}
            <span class="segmented-control__header-label">{label}</span>
        </div>
    {/if}

    <div
        class="segmented-control__content"
        class:with-leading-icon={!label && !!icon}
        class:with-header={!!label}
    >
        {#if !label && icon}
            <span class="segmented-control__leading-icon" aria-hidden="true">
                <svelte:component this={icon} class={iconClass} size={26} />
            </span>
        {/if}

        <div class="segmented-control__segments">
            {#each segmentOptions as option (option.index)}
                <button
                    class="segmented-control__segment"
                    class:segment-selected={option.index === normalizedSelectedIndex}
                    type="button"
                    role="radio"
                    aria-checked={option.index === normalizedSelectedIndex}
                    aria-label={option.label}
                    on:click={() => handleSelect(option.index)}
                    on:keydown={(event) => handleSegmentKeydown(event, option.index)}
                >
                    <span class="segmented-control__segment-text">
                        {option.label}
                    </span>
                </button>
            {/each}
        </div>
    </div>
</div>

<style>
    .segmented-control {
        display: grid;
        gap: 0;
        width: 100%;
        min-width: 0;
        padding: 0;
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        border-radius: var(--radius);
        overflow: hidden;
        color: var(--text-muted);
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease),
            transform var(--ease),
            filter var(--ease);
        text-align: left;
        -webkit-tap-highlight-color: transparent;
    }

    .segmented-control:focus-within {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .segmented-control__header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        min-height: 32px;
        padding: 0 8px 0 12px;
        background: var(--bg-input);
    }

    .segmented-control__header-icon,
    .segmented-control__leading-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        color: currentColor;
    }

    .segmented-control__header-icon :global(svg),
    .segmented-control__leading-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .segmented-control__header-label {
        flex: 1;
        min-width: 0;
        font-size: var(--font-base);
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: var(--leading);
        user-select: none;
    }

    .segmented-control__content {
        display: flex;
        align-items: stretch;
        gap: 8px;
        min-width: 0;
        min-height: 38px;
    }

    .segmented-control__content.with-header {
        border-top: var(--border-width) solid var(--border);
    }

    .segmented-control__content.with-leading-icon {
        padding-left: 12px;
        background: var(--bg-input);
    }

    .segmented-control__content.with-leading-icon .segmented-control__segments {
        flex: 1;
        min-width: 0;
        background: var(--bg-raised);
        border-left: var(--border-width) solid
            color-mix(in srgb, var(--border) 80%, transparent);
    }

    .segmented-control__leading-icon {
        align-self: center;
    }

    .segmented-control__segments {
        width: auto;
        flex: 1;
        display: flex;
        align-items: stretch;
        border: none;
        border-radius: 0;
        overflow: hidden;
        min-height: 38px;
        background: transparent;
    }

    .segmented-control__segment {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 0;
        min-width: 0;
        border: none;
        border-right: var(--border-width) solid
            color-mix(in srgb, var(--border) 80%, transparent);
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: var(--font-sm);
        line-height: var(--leading);
        padding: 0 var(--spacing-sm);
        transition:
            background var(--ease),
            color var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .segmented-control__segment:last-child {
        border-right: none;
    }

    .segmented-control__segment:focus-visible {
        position: relative;
        z-index: 1;
        outline: 2px solid var(--border-focus);
        outline-offset: -2px;
    }

    @media (hover: hover) {
        .segmented-control__segment:hover {
            filter: var(--brightness-hover);
        }

        .segmented-control__segment:not(.segment-selected):hover {
            background: color-mix(in srgb, var(--bg-raised) 80%, var(--text) 20%);
        }
    }

    .segmented-control__segment:active {
        filter: var(--brightness-hover);
    }

    .segmented-control__segment:active .segmented-control__segment-text {
        transform: scale(0.96);
    }

    .segmented-control__segment.segment-selected {
        color: var(--text);
        background: color-mix(in srgb, var(--surface) 78%, var(--accent));
    }

    .segmented-control__segment-text {
        display: block;
        min-width: 0;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
        transition: transform var(--ease);
    }
</style>
