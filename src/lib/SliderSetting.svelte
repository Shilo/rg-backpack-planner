<script lang="ts">
    import type { Component } from "svelte";
    import { triggerHaptic } from "./hapticsStore";
    import { LONG_PRESS_MS } from "./longPress";
    import { tooltip } from "./tooltip";

    export let label = "";
    export let ariaLabel: string | undefined = undefined;
    export let icon: Component | null = null;
    export let iconClass = "slider-setting__icon";
    export let value = 0;
    export let min = 0;
    export let max = 10;
    export let step = 1;
    /** Optional formatter for the value badge (e.g. "1×" for text size). */
    export let formatValue: ((value: number) => string) | null = null;
    /** Optional notch index to show as default (drawn taller). */
    export let defaultNotchIndex: number | undefined = undefined;
    export let onChange: ((value: number) => void) | null = null;
    export let tooltipText: string | undefined = undefined;
    export let description: string | undefined = undefined;

    const DRAG_THRESHOLD_PX = 5;

    let inputEl: HTMLInputElement | undefined = undefined;
    /** Ignore input events until the user has moved (drag) or lifted (tap). */
    let allowInput = true;
    let hasMoved = false;
    let tapClientX: number | null = null;
    let downClientX = 0;
    let downClientY = 0;
    let downAt = 0;

    $: notchCount = Math.round((max - min) / step) + 1;
    $: notches = Array.from({ length: notchCount }, (_, i) => i);

    $: valueLabel = formatValue ? formatValue(value) : String(value);
    $: snappedValue = Math.max(
        min,
        Math.min(max, min + Math.round((value - min) / step) * step),
    );

    function valueFromClientX(clientX: number): number {
        if (!inputEl) return value;
        const rect = inputEl.getBoundingClientRect();
        const width = rect.width;
        if (width <= 0) return value;
        const t = Math.max(0, Math.min(1, (clientX - rect.left) / width));
        const raw = min + t * (max - min);
        const stepped = min + Math.round((raw - min) / step) * step;
        return Math.max(min, Math.min(max, stepped));
    }

    function applyValue(next: number) {
        if (next === value) return;
        triggerHaptic();
        onChange?.(next);
    }

    function handlePointerDown(e: PointerEvent) {
        allowInput = false;
        hasMoved = false;
        tapClientX = e.clientX;
        downClientX = e.clientX;
        downClientY = e.clientY;
        downAt = Date.now();
        (e.currentTarget as HTMLInputElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        const dx = e.clientX - downClientX;
        const dy = e.clientY - downClientY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
            hasMoved = true;
            allowInput = true;
        }
    }

    function handlePointerUp() {
        const pressDuration = Date.now() - downAt;
        const isLongPress = pressDuration >= LONG_PRESS_MS;
        if (
            !hasMoved &&
            tapClientX !== null &&
            onChange &&
            !isLongPress
        ) {
            const next = valueFromClientX(tapClientX);
            applyValue(next);
        }
        allowInput = true;
        hasMoved = false;
        tapClientX = null;
    }

    function handlePointerCancel() {
        allowInput = true;
        hasMoved = false;
        tapClientX = null;
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const raw = Number(target.value);
        const stepped = min + Math.round((raw - min) / step) * step;
        const clamped = Math.max(min, Math.min(max, stepped));
        target.value = String(clamped);
        if (!allowInput) {
            target.value = String(snappedValue);
            return;
        }
        if (clamped !== value) {
            triggerHaptic();
            onChange?.(clamped);
        }
    }
</script>

<div
    class="slider-setting"
    role="group"
    aria-label={ariaLabel ?? label}
    use:tooltip={tooltipText}
>
    {#if label || icon}
        <div class="slider-setting__header">
            {#if icon}
                <span class="slider-setting__header-icon" aria-hidden="true">
                    <svelte:component this={icon} class={iconClass} size={26} />
                </span>
            {/if}
            {#if label}
            <div class="slider-setting__header-label-group">
                <span class="slider-setting__header-label">{label}</span>
                {#if description}
                    <span class="slider-setting__header-description">{description}</span>
                {/if}
            </div>
        {/if}
            <span class="slider-setting__value">{valueLabel}</span>
        </div>
    {/if}

    <div class="slider-setting__body">
        <div class="slider-setting__notches" aria-hidden="true">
            {#each notches as notchIndex}
                <span
                    class="slider-setting__notch"
                    class:slider-setting__notch--default={defaultNotchIndex ===
                        notchIndex}
                ></span>
            {/each}
        </div>
        <input
            type="range"
            class="slider-setting__input"
            bind:this={inputEl}
            {min}
            {max}
            {step}
            value={snappedValue}
            on:input={handleInput}
            on:pointerdown={handlePointerDown}
            on:pointermove={handlePointerMove}
            on:pointerup={handlePointerUp}
            on:pointercancel={handlePointerCancel}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={valueLabel}
        />
    </div>
</div>

<style>
    .slider-setting {
        display: grid;
        gap: 0;
        width: 100%;
        min-width: 0;
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        border-radius: var(--radius);
        overflow: hidden;
        color: var(--text-muted);
        transition:
            border-color var(--ease),
            background var(--ease),
            color var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .slider-setting:focus-within {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .slider-setting__header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        min-height: 32px;
        padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-sm) var(--spacing-md);
        background: var(--bg-input);
    }

    .slider-setting__header-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        color: var(--text-muted);
    }

    .slider-setting__header-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .slider-setting__header-label {
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        color: var(--text-muted);
    }

    .slider-setting__value {
        font-size: var(--font-sm);
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .slider-setting__body {
        --slider-thumb-radius: 10px;
        position: relative;
        display: flex;
        align-items: center;
        padding: var(--spacing-md) var(--spacing-lg);
        min-height: 40px;
        border-top: var(--border-width) solid var(--border);
    }

    .slider-setting__notches {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        justify-content: space-between;
        padding-left: calc(var(--spacing-lg) + var(--slider-thumb-radius));
        padding-right: calc(var(--spacing-lg) + var(--slider-thumb-radius));
        box-sizing: border-box;
        pointer-events: none;
    }

    .slider-setting__notch {
        width: 2px;
        height: 6px;
        border-radius: 1px;
        background: var(--text-muted);
    }

    .slider-setting__notch--default {
        width: 3px;
        height: 12px;
        border-radius: 1.5px;
        background: var(--accent);
    }

    .slider-setting__input {
        position: relative;
        width: 100%;
        height: 24px;
        margin: 0;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        /* Let vertical touch gestures scroll the page instead of dragging the slider */
        touch-action: pan-y;
    }

    .slider-setting__input:focus {
        outline: none;
    }

    .slider-setting__input:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
    }

    .slider-setting__input::-webkit-slider-runnable-track {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: color-mix(in srgb, var(--border) 80%, transparent);
    }

    .slider-setting__input::-moz-range-track {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: color-mix(in srgb, var(--border) 80%, transparent);
    }

    .slider-setting__input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--accent);
        border: var(--border-width) solid var(--accent-light);
        box-shadow: var(--shadow);
        margin-top: -8px;
        transition: transform var(--ease);
    }

    .slider-setting__input::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--accent);
        border: var(--border-width) solid var(--accent-light);
        box-shadow: var(--shadow);
        transition: transform var(--ease);
    }

    @media (hover: hover) {
        .slider-setting__input::-webkit-slider-thumb:hover {
            transform: scale(1.08);
        }
        .slider-setting__input::-moz-range-thumb:hover {
            transform: scale(1.08);
        }
    }

    .slider-setting__input:active::-webkit-slider-thumb {
        transform: scale(1.12);
    }
    .slider-setting__input:active::-moz-range-thumb {
        transform: scale(1.12);
    }

    .slider-setting__header-label-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }

    .slider-setting__header-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        white-space: normal;
        overflow-wrap: anywhere;
        user-select: none;
    }
</style>
