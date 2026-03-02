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
    let selectedL = 0.7; // lightness of selected cell (for preview/hex)

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
    const GRID_COLS = 10;
    const ROW_LIGHTNESS = [0.85, 0.72, 0.6, 0.48, 0.36];
    const COL_CHROMA = [
        0.0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27,
    ];
    const GRAY_LIGHTNESS = [
        0.95, 0.86, 0.77, 0.68, 0.59, 0.5, 0.41, 0.32, 0.23, 0.15,
    ];
    const HUE_STEPS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

    // ── Accent lightness for current preview mode ──
    $: accentL = previewDark ? 0.7 : 0.45;
    $: previewHex = oklchToHex(selectedL, c, h);
    $: colorName = c < 0.015 ? "Gray" : getColorName(h);

    // Sync hex input when h/c change (but not during manual editing)
    $: if (!isEditingHex) hexInput = oklchToHex(selectedL, c, h);

    // Reactive chroma column (for gradient rows) — tracks c from any source
    $: chromaCol = (() => {
        let best = 0;
        let bestD = Math.abs(COL_CHROMA[0] - c);
        for (let i = 1; i < COL_CHROMA.length; i++) {
            const d = Math.abs(COL_CHROMA[i] - c);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    })();

    // Reactive hue column — tracks h from any source
    $: hueCol = (() => {
        let best = 0;
        let bestD = Math.abs(HUE_STEPS[0] - h);
        for (let i = 1; i < HUE_STEPS.length; i++) {
            // Handle wrap-around (e.g., h=350 is closer to 0 than to 324)
            const d = Math.min(
                Math.abs(HUE_STEPS[i] - h),
                360 - Math.abs(HUE_STEPS[i] - h),
            );
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    })();

    // Reset local state only on open transition
    $: {
        if (isOpen && !wasOpen) {
            h = initialColor.h;
            c = initialColor.c;
            isEditingHex = false;
            previewDark = get(darkMode);

            // Initialize grid selection (compute accentL inline to avoid cycle)
            const initL = initialColor.l ?? (previewDark ? 0.7 : 0.45);
            selectedL = initL;
            if (c < 0.015) {
                gridSelectedRow = 0;
                let bestCol = 0;
                let bestDist = Math.abs(GRAY_LIGHTNESS[0] - initL);
                for (let i = 1; i < GRAY_LIGHTNESS.length; i++) {
                    const dist = Math.abs(GRAY_LIGHTNESS[i] - initL);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestCol = i;
                    }
                }
                gridSelectedCol = bestCol;
            } else {
                let bestRow = 0;
                let bestDist = Math.abs(ROW_LIGHTNESS[0] - initL);
                for (let i = 1; i < ROW_LIGHTNESS.length; i++) {
                    const dist = Math.abs(ROW_LIGHTNESS[i] - initL);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestRow = i;
                    }
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
        const col = Math.max(
            0,
            Math.min(
                GRID_COLS - 1,
                Math.floor((clientX - rect.left) / (rect.width / GRID_COLS)),
            ),
        );
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
        const col = Math.max(
            0,
            Math.min(
                GRID_COLS - 1,
                Math.floor((clientX - rect.left) / (rect.width / GRID_COLS)),
            ),
        );
        const row = Math.max(
            0,
            Math.min(
                ROW_LIGHTNESS.length - 1,
                Math.floor(
                    (clientY - rect.top) / (rect.height / ROW_LIGHTNESS.length),
                ),
            ),
        );
        c = COL_CHROMA[col];
        selectedL = ROW_LIGHTNESS[row];
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
        const col = Math.max(
            0,
            Math.min(
                HUE_STEPS.length - 1,
                Math.floor(
                    (clientX - rect.left) / (rect.width / HUE_STEPS.length),
                ),
            ),
        );
        h = HUE_STEPS[col];
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
        h = HUE_STEPS[Math.floor(Math.random() * HUE_STEPS.length)];
        const chromaIdx =
            4 + Math.floor(Math.random() * (COL_CHROMA.length - 4));
        c = COL_CHROMA[chromaIdx];
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
        const savedH = c < 0.015 ? 0 : h;
        applyTheme({ h: savedH, c, l: selectedL }, realDark ? "dark" : "light");
        onApply?.({ h: savedH, c, l: selectedL });
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
            event.stopImmediatePropagation();
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
                            class:grid-cell-selected={gridSelectedRow === 0 &&
                                col === gridSelectedCol}
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
                        {#each COL_CHROMA as C, col}
                            <div
                                class="grid-cell"
                                class:grid-cell-selected={gridSelectedRow ===
                                    row + 1 && col === chromaCol}
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
                    {#each HUE_STEPS as hueStep, col}
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
                                aria-label="Toggle {previewDark
                                    ? 'light'
                                    : 'dark'} mode preview"
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
                            <Button positive on:click={handleApply}
                                >Apply</Button
                            >
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
        background: var(--bg-panel);
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
        grid-template-columns: repeat(10, 1fr);
        border-top: 2px solid var(--bg-panel);
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
        grid-template-columns: repeat(10, 1fr);
        border-top: 2px solid var(--bg-panel);
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
        background: var(--bg-input);
        border: var(--border-width) solid var(--border-subtle);
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
        .icon-button:hover {
            filter: var(--brightness-hover);
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
