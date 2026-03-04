<script lang="ts">
    import { get } from "svelte/store";
    import { ShuffleIcon, SunIcon, MoonIcon } from "phosphor-svelte";
    import { portal } from "./portal";
    import { oklchToHex, hexToOklch, applyTheme } from "./themeEngine";
    import { darkMode } from "./darkModeStore";
    import { triggerHaptic } from "./haptics";
    import { DEFAULT_THEME_COLOR, type ThemeColor } from "./themeColorStore";
    import Button from "./Button.svelte";
    import { t } from "svelte-whisper";

    export let isOpen = false;
    export let initialColor: ThemeColor = DEFAULT_THEME_COLOR;
    export let onApply: ((color: ThemeColor) => void) | null = null;
    export let onCancel: (() => void) | null = null;

    let h = initialColor.h;
    let c = initialColor.c;
    let hexInput = "";
    let hexInputEl: HTMLInputElement | null = null;
    let isEditingHex = false;
    let wasOpen = false;
    let previewDark = true;
    let translate = $t;

    // Pointer tracking
    let gridEl: HTMLDivElement | null = null;
    let gridPointerId: number | null = null;

    // Selection state
    let selectedL = 0.7; // lightness of selected cell (for preview/hex)

    const HUE_NAMES: {
        max: number;
        key:
            | "theme.colorNames.red"
            | "theme.colorNames.orange"
            | "theme.colorNames.amber"
            | "theme.colorNames.yellow"
            | "theme.colorNames.lime"
            | "theme.colorNames.green"
            | "theme.colorNames.teal"
            | "theme.colorNames.cyan"
            | "theme.colorNames.blue"
            | "theme.colorNames.indigo"
            | "theme.colorNames.violet"
            | "theme.colorNames.pink";
    }[] = [
        { max: 15, key: "theme.colorNames.red" },
        { max: 40, key: "theme.colorNames.orange" },
        { max: 60, key: "theme.colorNames.amber" },
        { max: 85, key: "theme.colorNames.yellow" },
        { max: 110, key: "theme.colorNames.lime" },
        { max: 145, key: "theme.colorNames.green" },
        { max: 175, key: "theme.colorNames.teal" },
        { max: 200, key: "theme.colorNames.cyan" },
        { max: 240, key: "theme.colorNames.blue" },
        { max: 275, key: "theme.colorNames.indigo" },
        { max: 310, key: "theme.colorNames.violet" },
        { max: 340, key: "theme.colorNames.pink" },
        { max: 360, key: "theme.colorNames.red" },
    ];

    function getColorName(
        hue: number,
        translate: (
            key: string,
            vars?: Record<string, unknown> | unknown[],
        ) => string,
    ): string {
        for (const entry of HUE_NAMES) {
            if (hue <= entry.max) return translate(entry.key);
        }
        return translate("theme.colorNames.red");
    }

    // ── Grid data ──
    const GRID_COLS = 12;
    const GRID_ROWS = 6;
    const ROW_LIGHTNESS = [0.28, 0.40, 0.52, 0.65, 0.78, 0.90];
    // Chroma per lightness tier — perceptually optimized for in-gamut colors
    const ROW_CHROMA = [0.14, 0.18, 0.22, 0.24, 0.20, 0.14];
    // Column 0 = gray (hue irrelevant, c=0), columns 1-11 = hue steps
    const COL_HUES = [-1, 0, 33, 66, 99, 132, 165, 198, 231, 264, 297, 330];

    // ── Accent lightness for current preview mode ──
    $: accentL = previewDark ? 0.7 : 0.45;
    $: previewHex = oklchToHex(selectedL, c, h);
    $: translate = $t;
    $: colorName =
        c < 0.015
            ? translate("theme.colorNames.gray")
            : getColorName(h, translate);

    // Sync hex input when h/c change (but not during manual editing)
    $: if (!isEditingHex) hexInput = oklchToHex(selectedL, c, h);

    // Find nearest cell for current h, c, selectedL
    $: selectedCell = (() => {
        // Find nearest row (by lightness)
        let bestRow = 0;
        let bestRowD = Math.abs(ROW_LIGHTNESS[0] - selectedL);
        for (let i = 1; i < GRID_ROWS; i++) {
            const d = Math.abs(ROW_LIGHTNESS[i] - selectedL);
            if (d < bestRowD) { bestRowD = d; bestRow = i; }
        }
        // Find nearest column (gray or hue)
        let bestCol = 0;
        if (c < 0.015) {
            bestCol = 0; // gray column
        } else {
            bestCol = 1;
            let bestColD = Math.min(Math.abs(COL_HUES[1] - h), 360 - Math.abs(COL_HUES[1] - h));
            for (let i = 2; i < GRID_COLS; i++) {
                const d = Math.min(Math.abs(COL_HUES[i] - h), 360 - Math.abs(COL_HUES[i] - h));
                if (d < bestColD) { bestColD = d; bestCol = i; }
            }
        }
        return { row: bestRow, col: bestCol };
    })();

    // Reset local state only on open transition
    $: {
        if (isOpen && !wasOpen) {
            h = initialColor.h;
            c = initialColor.c;
            isEditingHex = false;
            previewDark = get(darkMode);
            selectedL = initialColor.l ?? (previewDark ? 0.7 : 0.45);
        }
        wasOpen = isOpen;
    }

    // Live preview
    $: if (isOpen) {
        applyTheme({ h, c, l: selectedL }, previewDark ? "dark" : "light");
    }

    // ── Grid pointer events ──
    function updateColorFromGrid(clientX: number, clientY: number) {
        if (!gridEl) return;
        const rect = gridEl.getBoundingClientRect();
        const col = Math.max(0, Math.min(GRID_COLS - 1,
            Math.floor((clientX - rect.left) / (rect.width / GRID_COLS))
        ));
        const row = Math.max(0, Math.min(GRID_ROWS - 1,
            Math.floor((clientY - rect.top) / (rect.height / GRID_ROWS))
        ));
        selectedL = ROW_LIGHTNESS[row];
        if (col === 0) {
            h = 0;
            c = 0;
        } else {
            h = COL_HUES[col];
            c = ROW_CHROMA[row];
        }
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

    // ── Hex input ──
    function handleHexInput(event: Event) {
        const value = (event.target as HTMLInputElement).value.trim();
        hexInput = value;
        if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
            const hex = value.startsWith("#") ? value : `#${value}`;
            const oklch = hexToOklch(hex);
            h = Math.round(oklch.h);
            c = Math.round(oklch.c * 1000) / 1000;
            selectedL = Math.round(oklch.l * 100) / 100;
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
        const col = 1 + Math.floor(Math.random() * (GRID_COLS - 1));
        h = COL_HUES[col];
        const row = Math.floor(Math.random() * GRID_ROWS);
        c = ROW_CHROMA[row];
        selectedL = ROW_LIGHTNESS[row];
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
            aria-label={$t("theme.colorPicker.dialogAria")}
            on:pointerdown={handleBackdropPointerDown}
        >
            <div class="color-picker-card">
                <!-- Full-spectrum color grid (col 0 = gray, cols 1-11 = hues) -->
                <div
                    class="color-grid"
                    bind:this={gridEl}
                    on:pointerdown={handleGridPointerDown}
                    on:pointermove={handleGridPointerMove}
                    on:pointerup={handleGridPointerUp}
                    on:pointercancel={handleGridPointerUp}
                >
                    {#each ROW_LIGHTNESS as L, row}
                        {#each COL_HUES as hueVal, col}
                            <div
                                class="grid-cell"
                                class:grid-cell-selected={selectedCell.row === row && selectedCell.col === col}
                                class:grid-cell-gray-border={col === 0}
                                style="background: oklch({L} {col === 0 ? 0 : ROW_CHROMA[row]} {col === 0 ? 0 : hueVal})"
                            ></div>
                        {/each}
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
                                class="icon-button icon-button-negative"
                                type="button"
                                aria-label={$t(
                                    "theme.colorPicker.randomColorAria",
                                )}
                                on:click={handleRandom}
                            >
                                <ShuffleIcon size={18} />
                            </button>
                            <button
                                class="icon-button"
                                type="button"
                                aria-label={$t(
                                    "theme.colorPicker.toggleModeAria",
                                    {
                                        mode: previewDark
                                            ? $t("theme.colorPicker.modeLight")
                                            : $t("theme.colorPicker.modeDark"),
                                    },
                                )}
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
                            <Button on:click={handleCancel}>
                                {$t("theme.colorPicker.cancel")}
                            </Button>
                            <Button positive on:click={handleApply}>
                                {$t("theme.colorPicker.apply")}
                            </Button>
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
        left: 0;
        top: var(--vv-offset-top, 0px);
        width: 100%;
        height: var(--vv-height, 100vh);
        background: transparent;
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        padding: calc(var(--spacing-lg) + var(--safe-top, 0px))
            calc(var(--spacing-lg) + var(--safe-right, 0px))
            calc(var(--spacing-lg) + var(--safe-bottom, 0px))
            calc(var(--spacing-lg) + var(--safe-left, 0px));
        z-index: var(--z-index-modal);
    }

    .color-picker-card {
        margin-top: auto;
        margin-bottom: auto;
        flex-shrink: 0;
        width: min(95vw, 400px);
        max-height: 100%;
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
        overflow-y: auto;
    }

    /* Color grid */
    .color-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
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

    .grid-cell-gray-border {
        border-right: 2px solid var(--bg-panel);
    }

    /* Controls below grid */
    .picker-controls {
        padding: var(--spacing-lg);
        display: grid;
        gap: var(--spacing-lg);
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

    .icon-button-negative {
        background: transparent;
        border-color: var(--text-muted);
        color: var(--text);
    }

    @media (max-width: 480px) {
        .color-picker-card {
            width: min(95vw, 360px);
        }
    }
</style>
