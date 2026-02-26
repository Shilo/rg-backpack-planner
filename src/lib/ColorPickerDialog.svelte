<script lang="ts">
    import { onMount } from "svelte";
    import { ShuffleIcon } from "phosphor-svelte";
    import { portal } from "./portal";
    import { oklchToHex, hexToOklch } from "./themeEngine";
    import { triggerHaptic } from "./haptics";
    import type { ThemeColor } from "./themeColorStore";
    import Button from "./Button.svelte";

    export let isOpen = false;
    export let initialColor: ThemeColor = { h: 264, c: 0.19 };
    export let onApply: ((color: ThemeColor) => void) | null = null;
    export let onCancel: (() => void) | null = null;
    export let onChange: ((color: ThemeColor) => void) | null = null;

    let h = initialColor.h;
    let c = initialColor.c;
    let hexInput = "";
    let hexInputEl: HTMLInputElement | null = null;
    let isEditingHex = false;
    let wasOpen = false;

    // Hue bar pointer tracking
    let hueBarEl: HTMLDivElement | null = null;
    let huePointerId: number | null = null;

    // Chroma bar pointer tracking
    let chromaBarEl: HTMLDivElement | null = null;
    let chromaPointerId: number | null = null;

    const MAX_CHROMA = 0.25;

    const HUE_NAMES: { max: number; name: string }[] = [
        { max: 15, name: "Red" },
        { max: 40, name: "Orange" },
        { max: 60, name: "Amber" },
        { max: 85, name: "Yellow" },
        { max: 110, name: "Lime" },
        { max: 145, name: "Green" },
        { max: 175, name: "Teal" },
        { max: 200, name: "Cyan" },
        { max: 240, name: "Blue" },
        { max: 275, name: "Indigo" },
        { max: 310, name: "Violet" },
        { max: 340, name: "Pink" },
        { max: 360, name: "Red" },
    ];

    function getColorName(hue: number): string {
        for (const entry of HUE_NAMES) {
            if (hue <= entry.max) return entry.name;
        }
        return "Red";
    }

    $: previewHex = oklchToHex(0.65, c, h);
    $: colorName = getColorName(h);

    // Sync hex input when h/c change (but not during manual editing)
    $: if (!isEditingHex) hexInput = oklchToHex(0.65, c, h);

    // Generate hue gradient CSS (oklch stops every 30°)
    function buildHueGradient(): string {
        const stops: string[] = [];
        for (let deg = 0; deg <= 360; deg += 30) {
            stops.push(`oklch(0.65 0.15 ${deg})`);
        }
        return `linear-gradient(to right, ${stops.join(", ")})`;
    }

    const hueGradient = buildHueGradient();

    // Chroma gradient depends on current hue
    $: chromaGradient = `linear-gradient(to right, oklch(0.65 0 ${h}), oklch(0.65 ${MAX_CHROMA} ${h}))`;

    // Reset local state only on open transition (not on every dependency change)
    $: {
        if (isOpen && !wasOpen) {
            h = initialColor.h;
            c = initialColor.c;
            isEditingHex = false;
        }
        wasOpen = isOpen;
    }

    // Live preview: notify parent when color changes while open
    $: if (isOpen) {
        onChange?.({ h, c });
    }

    // ── Hue bar pointer events ──
    function updateHueFromPointer(clientX: number) {
        if (!hueBarEl) return;
        const rect = hueBarEl.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        h = Math.round(ratio * 360);
    }

    function handleHuePointerDown(event: PointerEvent) {
        if (huePointerId !== null) return;
        huePointerId = event.pointerId;
        hueBarEl?.setPointerCapture(event.pointerId);
        updateHueFromPointer(event.clientX);
    }

    function handleHuePointerMove(event: PointerEvent) {
        if (event.pointerId !== huePointerId) return;
        updateHueFromPointer(event.clientX);
    }

    function handleHuePointerUp(event: PointerEvent) {
        if (event.pointerId !== huePointerId) return;
        hueBarEl?.releasePointerCapture(event.pointerId);
        huePointerId = null;
    }

    // ── Chroma bar pointer events ──
    function updateChromaFromPointer(clientX: number) {
        if (!chromaBarEl) return;
        const rect = chromaBarEl.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        c = Math.round(ratio * MAX_CHROMA * 1000) / 1000;
    }

    function handleChromaPointerDown(event: PointerEvent) {
        if (chromaPointerId !== null) return;
        chromaPointerId = event.pointerId;
        chromaBarEl?.setPointerCapture(event.pointerId);
        updateChromaFromPointer(event.clientX);
    }

    function handleChromaPointerMove(event: PointerEvent) {
        if (event.pointerId !== chromaPointerId) return;
        updateChromaFromPointer(event.clientX);
    }

    function handleChromaPointerUp(event: PointerEvent) {
        if (event.pointerId !== chromaPointerId) return;
        chromaBarEl?.releasePointerCapture(event.pointerId);
        chromaPointerId = null;
    }

    // ── Hex input ──
    function handleHexInput(event: Event) {
        const value = (event.target as HTMLInputElement).value.trim();
        hexInput = value;
        if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
            const hex = value.startsWith("#") ? value : `#${value}`;
            const oklch = hexToOklch(hex);
            h = Math.round(oklch.h);
            c = Math.round(oklch.c * 1000) / 1000;
        }
    }

    function handleHexKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleApply();
        }
    }

    // ── Random color ──
    function handleRandom() {
        triggerHaptic();
        h = Math.round(Math.random() * 360);
        c = Math.round((0.10 + Math.random() * 0.12) * 1000) / 1000;
    }

    // ── Actions ──
    function handleApply() {
        triggerHaptic();
        onApply?.({ h, c });
    }

    function handleCancel() {
        triggerHaptic();
        onCancel?.();
    }

    function handleBackdropPointerDown(event: PointerEvent) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) return;
        if (event.key === "Escape") {
            event.preventDefault();
            handleCancel();
        }
    }

    onMount(() => {
        // Focus management handled by portal
    });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <div use:portal class="color-picker-portal">
        <div
            class="color-picker-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Custom color picker"
            on:pointerdown={handleBackdropPointerDown}
        >
            <div class="color-picker-card">
                <!-- Header -->
                <div class="picker-header">
                    <h2 class="picker-title">CUSTOM COLOR</h2>
                    <button
                        class="dice-button"
                        type="button"
                        aria-label="Random color"
                        on:click={handleRandom}
                    >
                        <ShuffleIcon size={18} />
                    </button>
                </div>

                <!-- Preview -->
                <div class="picker-preview">
                    <div
                        class="preview-circle"
                        style="background: {previewHex}"
                    ></div>
                    <span class="color-name">{colorName}</span>
                </div>

                <!-- Hue bar -->
                <div class="slider-group">
                    <span class="slider-label">Hue</span>
                    <div
                        class="slider-track"
                        style="background: {hueGradient}"
                        bind:this={hueBarEl}
                        on:pointerdown={handleHuePointerDown}
                        on:pointermove={handleHuePointerMove}
                        on:pointerup={handleHuePointerUp}
                        on:pointercancel={handleHuePointerUp}
                    >
                        <div
                            class="slider-thumb"
                            style="left: {(h / 360) * 100}%; background: {oklchToHex(0.65, 0.15, h)}"
                        ></div>
                    </div>
                </div>

                <!-- Chroma bar -->
                <div class="slider-group">
                    <span class="slider-label">Chroma</span>
                    <div
                        class="slider-track"
                        style="background: {chromaGradient}"
                        bind:this={chromaBarEl}
                        on:pointerdown={handleChromaPointerDown}
                        on:pointermove={handleChromaPointerMove}
                        on:pointerup={handleChromaPointerUp}
                        on:pointercancel={handleChromaPointerUp}
                    >
                        <div
                            class="slider-thumb"
                            style="left: {(c / MAX_CHROMA) * 100}%; background: {previewHex}"
                        ></div>
                    </div>
                </div>

                <!-- Hex input -->
                <div class="hex-group">
                    <label class="slider-label" for="picker-hex-input">Hex</label>
                    <input
                        id="picker-hex-input"
                        class="hex-input"
                        type="text"
                        value={hexInput}
                        maxlength="7"
                        autocomplete="off"
                        autocapitalize="none"
                        autocorrect="off"
                        spellcheck="false"
                        bind:this={hexInputEl}
                        on:input={handleHexInput}
                        on:keydown={handleHexKeydown}
                        on:focus={() => (isEditingHex = true)}
                        on:blur={() => {
                            isEditingHex = false;
                            hexInput = oklchToHex(0.65, c, h);
                        }}
                    />
                </div>

                <!-- Actions -->
                <div class="picker-actions">
                    <Button on:click={handleCancel}>Cancel</Button>
                    <Button positive on:click={handleApply}>Apply</Button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .color-picker-portal {
        display: contents;
    }

    .color-picker-backdrop {
        position: fixed;
        inset: 0;
        background: var(--backdrop-overlay, rgba(0, 0, 0, 0.5));
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-lg);
        z-index: var(--z-index-modal);
    }

    .color-picker-card {
        width: min(92vw, 320px);
        background: var(--bg-panel);
        border: var(--border-width) solid
            color-mix(
                in srgb,
                color-mix(in srgb, var(--accent) 55%, var(--border)) 50%,
                transparent
            );
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: var(--spacing-lg);
        display: grid;
        gap: var(--spacing-lg);
    }

    /* Header */
    .picker-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .picker-title {
        margin: 0;
        font-size: var(--font-lg);
        letter-spacing: var(--tracking);
        color: var(--text);
    }

    .dice-button {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        transition:
            filter var(--ease),
            transform var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    @media (hover: hover) {
        .dice-button:hover {
            filter: var(--brightness-hover);
        }
    }

    .dice-button:active {
        transform: scale(0.92);
    }

    .dice-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    /* Preview */
    .picker-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) 0;
    }

    .preview-circle {
        width: 64px;
        height: 64px;
        border-radius: var(--radius-full);
        border: 3px solid rgba(128, 128, 128, 0.3);
        transition: background 0.1s ease;
    }

    .color-name {
        font-size: var(--font-base);
        font-weight: 500;
        color: var(--text-muted);
        letter-spacing: var(--tracking);
        text-transform: uppercase;
    }

    /* Slider groups */
    .slider-group {
        display: grid;
        gap: var(--spacing-xs);
    }

    .slider-label {
        font-size: var(--font-sm);
        font-weight: 500;
        color: var(--text-disabled);
        text-transform: uppercase;
        letter-spacing: var(--tracking);
    }

    .slider-track {
        position: relative;
        height: 32px;
        border-radius: var(--radius);
        border: var(--border-width) solid var(--border-subtle);
        cursor: pointer;
        touch-action: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }

    .slider-thumb {
        position: absolute;
        top: 50%;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-full);
        border: 3px solid white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: background 0.05s ease;
    }

    /* Hex input */
    .hex-group {
        display: grid;
        gap: var(--spacing-xs);
    }

    .hex-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-input);
        border: var(--border-width) solid var(--border-subtle);
        border-radius: var(--radius);
        color: var(--text);
        font-size: var(--font-base);
        font-family: monospace;
        outline: none;
        transition: border-color 0.15s ease;
    }

    .hex-input:focus {
        border-color: var(--border-focus);
    }

    .hex-input::placeholder {
        color: var(--text-disabled);
    }

    /* Actions */
    .picker-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-lg);
    }

    @media (max-width: 480px) {
        .color-picker-card {
            width: min(92vw, 300px);
        }
    }
</style>
