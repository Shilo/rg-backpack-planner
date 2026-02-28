<script lang="ts">
    import { get } from "svelte/store";
    import { ShuffleIcon, SunIcon, MoonIcon } from "phosphor-svelte";
    import { portal } from "./portal";
    import { oklchToHex, hexToOklch, applyTheme } from "./themeEngine";
    import { darkMode } from "./darkModeStore";
    import { triggerHaptic } from "./haptics";
    import type { ThemeColor } from "./themeColorStore";
    import Button from "./Button.svelte";

    export let isOpen = false;
    export let initialColor: ThemeColor = { h: 264, c: 0.19 };
    export let onApply: ((color: ThemeColor) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let h = initialColor.h;
    let c = initialColor.c;
    let hexInput = "";
    let hexInputEl: HTMLInputElement | null = null;
    let isEditingHex = false;
    let wasOpen = false;
    let previewDark = true;

    // Pointer tracking
    let hueRowEl: HTMLDivElement | null = null;
    let huePointerId: number | null = null;
    let gridEl: HTMLDivElement | null = null;
    let gridPointerId: number | null = null;
    let grayRowEl: HTMLDivElement | null = null;
    let grayPointerId: number | null = null;

    // Selection state (set by grid/gray clicks)
    let gridSelectedRow = 1; // 0 = grayscale, 1-5 = gradient rows
    let gridSelectedCol = 0; // used for grayscale row only
    let selectedL = 0.70; // lightness of selected cell (for preview/hex)

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

    // ── Grid data ──
    const GRID_COLS = 12;
    const GRAY_COLS = 10;
    const HUE_MARKERS = 12;
    const ROW_LIGHTNESS = [0.86, 0.75, 0.64, 0.53, 0.42];
    const MIN_CHROMA = 0;
    const MAX_CHROMA = 0.27;
    const GRAY_LIGHTNESS = [0.95, 0.86, 0.77, 0.68, 0.59, 0.50, 0.41, 0.32, 0.23, 0.15];

    // ── Accent lightness for current preview mode ──
    $: accentL = previewDark ? 0.70 : 0.45;
    $: previewHex = oklchToHex(selectedL, c, h);
    $: colorName = c < 0.015 ? "Gray" : getColorName(h);

    // Sync hex input when h/c change (but not during manual editing)
    $: if (!isEditingHex) hexInput = oklchToHex(selectedL, c, h);

    // Reactive chroma column (for gradient rows) — tracks c from any source
    $: chromaCol = Math.round((Math.min(Math.max(c, MIN_CHROMA), MAX_CHROMA) / MAX_CHROMA) * (GRID_COLS - 1));

    // Reactive hue column — tracks h from any source
    $: hueCol = Math.round((((h % 360) + 360) % 360 / 360) * (HUE_MARKERS - 1));

    // Reset local state only on open transition
    $: {
        if (isOpen && !wasOpen) {
            h = initialColor.h;
            c = initialColor.c;
            isEditingHex = false;
            previewDark = get(darkMode);

            // Initialize grid selection (compute accentL inline to avoid cycle)
            const initL = initialColor.l ?? (previewDark ? 0.70 : 0.45);
            selectedL = initL;
            if (c < 0.015) {
                gridSelectedRow = 0;
                let bestCol = 0;
                let bestDist = Math.abs(GRAY_LIGHTNESS[0] - initL);
                for (let i = 1; i < GRAY_LIGHTNESS.length; i++) {
                    const dist = Math.abs(GRAY_LIGHTNESS[i] - initL);
                    if (dist < bestDist) { bestDist = dist; bestCol = i; }
                }
                gridSelectedCol = bestCol;
            } else {
                let bestRow = 0;
                let bestDist = Math.abs(ROW_LIGHTNESS[0] - initL);
                for (let i = 1; i < ROW_LIGHTNESS.length; i++) {
                    const dist = Math.abs(ROW_LIGHTNESS[i] - initL);
                    if (dist < bestDist) { bestDist = dist; bestRow = i; }
                }
                gridSelectedRow = bestRow + 1;
            }
        }
        wasOpen = isOpen;
    }

    // Live preview
    $: if (isOpen) {
        applyTheme({ h, c, l: selectedL }, previewDark ? "dark" : "light");
    }

    // ── Grayscale row pointer events ──
    function updateGrayFromPointer(clientX: number) {
        if (!grayRowEl) return;
        const rect = grayRowEl.getBoundingClientRect();
        const col = Math.max(0, Math.min(GRAY_COLS - 1, Math.floor((clientX - rect.left) / (rect.width / GRAY_COLS))));
        h = 0;
        c = 0;
        selectedL = GRAY_LIGHTNESS[col];
        gridSelectedRow = 0;
        gridSelectedCol = col;
    }

    function handleGrayPointerDown(event: PointerEvent) {
        if (grayPointerId !== null) return;
        grayPointerId = event.pointerId;
        grayRowEl?.setPointerCapture(event.pointerId);
        updateGrayFromPointer(event.clientX);
    }

    function handleGrayPointerMove(event: PointerEvent) {
        if (event.pointerId !== grayPointerId) return;
        updateGrayFromPointer(event.clientX);
    }

    function handleGrayPointerUp(event: PointerEvent) {
        if (event.pointerId !== grayPointerId) return;
        grayRowEl?.releasePointerCapture(event.pointerId);
        grayPointerId = null;
    }

    // ── Gradient grid pointer events ──
    function updateColorFromGrid(clientX: number, clientY: number) {
        if (!gridEl) return;
        const rect = gridEl.getBoundingClientRect();
        const xRatio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const yRatio = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
        const row = Math.max(0, Math.min(ROW_LIGHTNESS.length - 1, Math.floor(yRatio * ROW_LIGHTNESS.length)));
        c = Math.round((MIN_CHROMA + xRatio * (MAX_CHROMA - MIN_CHROMA)) * 1000) / 1000;
        selectedL = Math.round((ROW_LIGHTNESS[row]) * 1000) / 1000;
        gridSelectedRow = row + 1; // +1 because row 0 = grayscale
    }

    function handleGridPointerDown(event: PointerEvent) {
        if (gridPointerId !== null) return;
        gridPointerId = event.pointerId;
        gridEl?.setPointerCapture(event.pointerId);
        updateColorFromGrid(event.clientX, event.clientY);
    }

    function handleGridPointerMove(event: PointerEvent) {
        if (event.pointerId !== gridPointerId) return;
        updateColorFromGrid(event.clientX, event.clientY);
    }

    function handleGridPointerUp(event: PointerEvent) {
        if (event.pointerId !== gridPointerId) return;
        gridEl?.releasePointerCapture(event.pointerId);
        gridPointerId = null;
    }

    // ── Hue row pointer events ──
    function updateHueFromPointer(clientX: number) {
        if (!hueRowEl) return;
        const rect = hueRowEl.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        h = Math.round(ratio * 360) % 360;
    }

    function handleHuePointerDown(event: PointerEvent) {
        if (huePointerId !== null) return;
        huePointerId = event.pointerId;
        hueRowEl?.setPointerCapture(event.pointerId);
        updateHueFromPointer(event.clientX);
    }

    function handleHuePointerMove(event: PointerEvent) {
        if (event.pointerId !== huePointerId) return;
        updateHueFromPointer(event.clientX);
    }

    function handleHuePointerUp(event: PointerEvent) {
        if (event.pointerId !== huePointerId) return;
        hueRowEl?.releasePointerCapture(event.pointerId);
        huePointerId = null;
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
        h = Math.round(Math.random() * 359);
        c = Math.round((0.1 + Math.random() * 0.17) * 1000) / 1000;
    }

    // ── Mode toggle ──
    function handleModeToggle() {
        triggerHaptic();
        previewDark = !previewDark;
    }

    // ── Actions ──
    function handleApply() {
        triggerHaptic();
        const realDark = get(darkMode);
        const savedH = c < 0.015 ? 0 : Math.round(h);
        const savedC = Math.round(c * 1000) / 1000;
        const savedL = Math.round(selectedL * 1000) / 1000;
        applyTheme({ h: savedH, c: savedC, l: savedL }, realDark ? "dark" : "light");
        onApply?.({ h: savedH, c: savedC, l: savedL });
    }

    function handleCancel() {
        triggerHaptic();
        const realDark = get(darkMode);
        applyTheme(initialColor, realDark ? "dark" : "light");
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
                <!-- Grayscale row -->
                <div
                    class="grayscale-row"
                    bind:this={grayRowEl}
                    on:pointerdown={handleGrayPointerDown}
                    on:pointermove={handleGrayPointerMove}
                    on:pointerup={handleGrayPointerUp}
                    on:pointercancel={handleGrayPointerUp}
                >
                    {#each GRAY_LIGHTNESS as L, col}
                        <div
                            class="grid-cell"
                            class:grid-cell-selected={gridSelectedRow === 0 && col === gridSelectedCol}
                            style="background: oklch({L} 0 0)"
                        ></div>
                    {/each}
                </div>

                <!-- Gradient grid (chroma × lightness for current hue) -->
                <div
                    class="color-grid"
                    bind:this={gridEl}
                    on:pointerdown={handleGridPointerDown}
                    on:pointermove={handleGridPointerMove}
                    on:pointerup={handleGridPointerUp}
                    on:pointercancel={handleGridPointerUp}
                >
                    {#each ROW_LIGHTNESS as L, row}
                        {#each Array.from({ length: GRID_COLS }, (_, col) => Math.round(((col / (GRID_COLS - 1)) * MAX_CHROMA) * 1000) / 1000) as C, col}
                            <div
                                class="grid-cell"
                                class:grid-cell-selected={gridSelectedRow === row + 1 && col === chromaCol}
                                style="background: oklch({L} {C} {h})"
                            ></div>
                        {/each}
                    {/each}
                </div>

                <!-- Hue row -->
                <div
                    class="hue-row"
                    bind:this={hueRowEl}
                    on:pointerdown={handleHuePointerDown}
                    on:pointermove={handleHuePointerMove}
                    on:pointerup={handleHuePointerUp}
                    on:pointercancel={handleHuePointerUp}
                >
                    {#each Array.from({ length: HUE_MARKERS }, (_, col) => Math.round((col / (HUE_MARKERS - 1)) * 360)) as hueStep, col}
                        <div
                            class="grid-cell"
                            class:grid-cell-selected={col === hueCol}
                            style="background: oklch(0.65 0.18 {hueStep})"
                        ></div>
                    {/each}
                </div>

                <!-- Controls area (padded) -->
                <div class="picker-controls">
                    <!-- Preview + Hex row -->
                    <div class="preview-row">
                        <div class="preview-left">
                            <div
                                class="preview-circle"
                                style="background: {previewHex}"
                            ></div>
                            <span class="color-name">{colorName}</span>
                        </div>
                        <input
                            id="picker-hex-input"
                            class="hex-input"
                            type="text"
                            bind:value={hexInput}
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
                                hexInput = oklchToHex(selectedL, c, h);
                            }}
                        />
                    </div>

                    <!-- Actions row -->
                    <div class="actions-row">
                        <div class="actions-left">
                            <button
                                class="icon-button"
                                type="button"
                                aria-label="Random color"
                                on:click={handleRandom}
                            >
                                <ShuffleIcon size={18} />
                            </button>
                            <button
                                class="icon-button"
                                type="button"
                                aria-label="Toggle {previewDark ? 'light' : 'dark'} mode preview"
                                on:click={handleModeToggle}
                            >
                                {#if previewDark}
                                    <MoonIcon size={18} />
                                {:else}
                                    <SunIcon size={18} />
                                {/if}
                            </button>
                        </div>
                        <div class="actions-right">
                            <Button on:click={handleCancel}>Cancel</Button>
                            <Button positive on:click={handleApply}>Apply</Button>
                        </div>
                    </div>
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
        width: min(95vw, 400px);
        background: var(--surface-container);
        border: var(--border-width) solid
            color-mix(
                in srgb,
                color-mix(in srgb, var(--accent) 55%, var(--border)) 50%,
                transparent
            );
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        overflow: hidden;
    }

    /* Grayscale row */
    .grayscale-row {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        touch-action: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
    }

    .grayscale-row .grid-cell {
        aspect-ratio: 2;
    }

    /* Gradient grid */
    .color-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-top: 2px solid var(--surface-container);
        touch-action: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
    }

    .grid-cell {
        aspect-ratio: 1;
        position: relative;
    }

    .grid-cell-selected {
        outline: 2.5px solid white;
        outline-offset: -2.5px;
        border-radius: 2px;
        z-index: 1;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
    }

    /* Controls below grid */
    .picker-controls {
        padding: var(--spacing-lg);
        display: grid;
        gap: var(--spacing-lg);
    }

    /* Hue row */
    .hue-row {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-top: 2px solid var(--surface-container);
        touch-action: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
    }

    .hue-row .grid-cell {
        aspect-ratio: 2;
    }

    /* Preview + hex row */
    .preview-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
    }

    .preview-left {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
        min-width: 0;
    }

    .preview-circle {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-full);
        border: 2px solid rgba(128, 128, 128, 0.3);
        flex-shrink: 0;
        transition: background 0.1s ease;
    }

    .color-name {
        font-size: var(--font-sm);
        font-weight: 500;
        color: var(--text-muted);
        letter-spacing: var(--tracking);
        text-transform: uppercase;
        white-space: nowrap;
    }

    .hex-input {
        width: 96px;
        height: 28px;
        padding: 0 var(--spacing-sm);
        background: var(--surface-container-highest);
        border: var(--border-width) solid var(--outline-variant);
        border-radius: var(--radius);
        color: var(--text);
        font-size: var(--font-base);
        font-family: monospace;
        outline: none;
        text-align: center;
        flex-shrink: 0;
        transition: border-color 0.15s ease;
    }

    .hex-input:focus {
        border-color: var(--border-focus);
    }

    /* Actions row */
    .actions-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .actions-left {
        display: flex;
        gap: var(--spacing-sm);
    }

    .actions-right {
        display: flex;
        gap: var(--spacing-lg);
    }

    .icon-button {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        background: var(--surface-container-high);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        transition:
            background var(--ease),
            transform var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    @media (hover: hover) {
        .icon-button:hover {
            background: var(--surface-container-highest);
        }
    }

    .icon-button:active {
        transform: scale(0.92);
    }

    .icon-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (max-width: 480px) {
        .color-picker-card {
            width: min(95vw, 360px);
        }
    }
</style>
