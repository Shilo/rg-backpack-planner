<script lang="ts">
    import { PaletteIcon } from "phosphor-svelte";
    import { themeColor, type ThemeColor } from "./themeColorStore";
    import {
        createSpacedThemePresets,
        oklchToHex,
        type ThemePreset,
    } from "./themeEngine";
    import { triggerHaptic } from "./haptics";
    import { tooltip } from "./tooltip";
    import { portal } from "./portal";
    import ContextMenu from "./ContextMenu.svelte";
    import ColorPickerDialog from "./ColorPickerDialog.svelte";

    const PRESETS: (ThemePreset & { hex: string })[] = createSpacedThemePresets([
        { h: 255, c: 0.19, label: "Blue" },
        { h: 276, c: 0.2, label: "Indigo" },
        { h: 190, c: 0.16, label: "Teal" },
        { h: 148, c: 0.17, label: "Green" },
        { h: 85, c: 0.15, label: "Amber" },
        { h: 45, c: 0.16, label: "Orange" },
        { h: 12, c: 0.17, label: "Rose" },
        { h: 315, c: 0.18, label: "Violet" },
        { h: 260, c: 0.03, l: 0.62, label: "Neutral" },
    ]).map((preset) => ({
        ...preset,
        hex: oklchToHex(preset.l ?? 0.65, preset.c, preset.h),
    }));

    let buttonEl: HTMLButtonElement | null = null;
    let dropdownOpen = false;
    let dropdownX = 0;
    let dropdownY = 0;
    let pickerOpen = false;
    let pickerInitialColor: ThemeColor = { h: 264, c: 0.19 };

    $: currentHex = oklchToHex(0.65, $themeColor.c, $themeColor.h);

    $: currentLabel = (() => {
        const match = PRESETS.find(
            (p) => p.h === $themeColor.h && p.c === $themeColor.c && p.l === $themeColor.l,
        );
        return match ? match.label : "Custom";
    })();

    function openDropdown() {
        if (!buttonEl) return;
        triggerHaptic();
        const rect = buttonEl.getBoundingClientRect();
        dropdownX = rect.left + rect.width / 2;
        dropdownY = rect.bottom + 8;
        dropdownOpen = true;
    }

    function closeDropdown() {
        dropdownOpen = false;
    }

    function selectPreset(preset: { h: number; c: number; l?: number }) {
        themeColor.set({ h: preset.h, c: preset.c, l: preset.l });
        triggerHaptic();
        closeDropdown();
    }

    function isSelected(preset: { h: number; c: number; l?: number }, current: ThemeColor): boolean {
        return preset.h === current.h && preset.c === current.c && preset.l === current.l;
    }

    function openCustomPicker() {
        closeDropdown();
        pickerInitialColor = { ...$themeColor };
        pickerOpen = true;
    }

    function handlePickerApply(color: ThemeColor) {
        themeColor.set(color);
        pickerOpen = false;
    }

    function handlePickerCancel() {
        themeColor.set(pickerInitialColor);
        pickerOpen = false;
    }
</script>

<button
    class="theme-color-button"
    type="button"
    bind:this={buttonEl}
    aria-label="Theme: {currentLabel}"
    use:tooltip={"Change theme"}
    on:click={openDropdown}
>
    <span class="theme-button-icon">
        <PaletteIcon size={26} />
    </span>
    <span class="theme-button-label">Theme</span>
    <span
        class="theme-button-swatch"
        style="background: {currentHex}"
    ></span>
</button>

<div use:portal class="theme-dropdown-portal" class:menu-open={dropdownOpen}>
    <ContextMenu
        x={dropdownX}
        y={dropdownY}
        isOpen={dropdownOpen}
        title="Theme"
        onClose={closeDropdown}
    >
        {#each PRESETS as preset}
            <button
                class="preset-item"
                class:preset-selected={isSelected(preset, $themeColor)}
                type="button"
                on:click={() => selectPreset(preset)}
            >
                <span
                    class="preset-swatch"
                    style="background: {preset.hex}"
                ></span>
                <span class="preset-label">{preset.label}</span>
                {#if isSelected(preset, $themeColor)}
                    <span class="preset-check" aria-hidden="true"></span>
                {/if}
            </button>
        {/each}
        <button
            class="preset-item"
            class:preset-selected={currentLabel === "Custom"}
            type="button"
            on:click={openCustomPicker}
        >
            <span
                class="preset-swatch preset-swatch-custom"
                style="background: {currentLabel === 'Custom' ? currentHex : 'var(--border)'}"
            ></span>
            <span class="preset-label">Custom...</span>
            {#if currentLabel === "Custom"}
                <span class="preset-check" aria-hidden="true"></span>
            {/if}
        </button>
    </ContextMenu>
</div>

<ColorPickerDialog
    isOpen={pickerOpen}
    initialColor={pickerInitialColor}
    onApply={handlePickerApply}
    onCancel={handlePickerCancel}
/>

<style>
    /* Button row (matches ToggleSwitch styling) */
    .theme-color-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        height: 40px;
        padding: var(--spacing-md) var(--spacing-lg);
        border: var(--border-width) solid var(--border);
        background: var(--surface-container-high);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        line-height: var(--leading);
        cursor: pointer;
        transition:
            border-color var(--ease),
            color var(--ease),
            background var(--ease),
            transform var(--ease);
        text-align: left;
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
    }

    .theme-color-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .theme-color-button:hover::after {
            background: var(--state-hover);
        }
    }

    .theme-color-button::after {
        content: "";
        position: absolute;
        inset: 0;
        background: transparent;
        pointer-events: none;
        transition: background var(--ease);
    }

    .theme-color-button:active {
        transform: scale(0.97);
    }

    .theme-color-button:active::after {
        background: var(--state-pressed);
    }

    .theme-button-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        flex-shrink: 0;
        color: currentColor;
    }

    .theme-button-icon :global(svg) {
        width: 100%;
        height: 100%;
    }

    .theme-button-label {
        flex: 1;
        user-select: none;
    }

    .theme-button-swatch {
        width: 50px;
        height: 30px;
        border-radius: var(--radius-full);
        border: 2px solid var(--border);
        flex-shrink: 0;
    }

    /* Remove right border-radius when inside a button-group */
    :global(.button-group) .theme-color-button {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }

    /* Dropdown portal */
    .theme-dropdown-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu-over-modal);
    }

    .theme-dropdown-portal.menu-open {
        pointer-events: auto;
    }

    /* Preset items in dropdown */
    .preset-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        width: 100%;
        min-width: 160px;
        padding: var(--spacing-sm) var(--spacing-lg);
        min-height: 38px;
        border: var(--border-width) solid var(--outline);
        background: var(--surface-container-high);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        cursor: pointer;
        text-align: left;
        transition:
            transform var(--ease),
            background var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    @media (hover: hover) {
        .preset-item:hover {
            background: var(--surface-container-highest);
        }
    }

    .preset-item:active {
        background: var(--surface-container-highest);
    }

    .preset-item:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .preset-selected {
        border-color: var(--primary);
        color: var(--text);
    }

    .preset-swatch {
        width: 24px;
        height: 24px;
        border-radius: var(--radius-full);
        border: 2px solid var(--border-subtle);
        flex-shrink: 0;
    }

    .preset-swatch-custom {
        border-style: dashed;
    }

    .preset-label {
        flex: 1;
        user-select: none;
    }

    .preset-check {
        width: 8px;
        height: 8px;
        border-radius: var(--radius-full);
        background: var(--primary);
        flex-shrink: 0;
    }
</style>
