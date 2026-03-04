<script lang="ts">
    import {
        CaretDownIcon,
        CaretRightIcon,
        PaletteIcon,
    } from "phosphor-svelte";
    import { themeColor, DEFAULT_THEME_COLOR, type ThemeColor } from "./themeColorStore";
    import { oklchToHex } from "./themeEngine";
    import { triggerHaptic } from "./haptics";
    import { tooltip } from "./tooltip";
    import { portal } from "./portal";
    import ContextMenu from "./ContextMenu.svelte";
    import ColorPickerDialog from "./ColorPickerDialog.svelte";
    import { t } from "svelte-whisper";

    const PRESETS: {
        h: number;
        c: number;
        labelKey:
            | "theme.preset.blue"
            | "theme.preset.rose"
            | "theme.preset.amber"
            | "theme.preset.green"
            | "theme.preset.neutral";
    }[] = [
        { ...DEFAULT_THEME_COLOR, labelKey: "theme.preset.blue" },
        { h: 145, c: 0.25, labelKey: "theme.preset.green" },
        { h: 350, c: 0.26, labelKey: "theme.preset.rose" },
        { h: 55, c: 0.24, labelKey: "theme.preset.amber" },
        { h: 260, c: 0.02, labelKey: "theme.preset.neutral" },
    ];
    $: presetOptions = PRESETS.map((preset) => ({
        ...preset,
        label: $t(preset.labelKey),
        hex: oklchToHex(0.65, preset.c, preset.h),
    }));

    let buttonEl: HTMLButtonElement | null = null;
    let dropdownOpen = false;
    let dropdownX = 0;
    let dropdownY = 0;
    let pickerOpen = false;
    let pickerInitialColor: ThemeColor = { ...DEFAULT_THEME_COLOR };

    $: currentHex = oklchToHex(0.65, $themeColor.c, $themeColor.h);

    $: selectedPreset = presetOptions.find(
        (p) => p.h === $themeColor.h && p.c === $themeColor.c,
    );
    $: currentLabel = selectedPreset
        ? selectedPreset.label
        : $t("theme.custom");
    $: isCustom = !selectedPreset;

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

    function selectPreset(preset: { h: number; c: number }) {
        themeColor.set({ h: preset.h, c: preset.c });
        triggerHaptic();
        closeDropdown();
    }

    function isSelected(
        preset: { h: number; c: number },
        current: ThemeColor,
    ): boolean {
        return preset.h === current.h && preset.c === current.c;
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
    aria-label={$t("theme.aria", { label: currentLabel })}
    use:tooltip={$t("theme.changeTooltip")}
    on:click={openDropdown}
>
    <span class="theme-button-icon">
        <PaletteIcon size={26} />
    </span>
    <span class="theme-button-label">{$t("theme.label")}</span>
    <span class="theme-button-swatch" style="background: {currentHex}"></span>
    <CaretDownIcon class="caret-icon" size={12} />
</button>

<div use:portal class="theme-dropdown-portal" class:menu-open={dropdownOpen}>
    <ContextMenu
        x={dropdownX}
        y={dropdownY}
        isOpen={dropdownOpen}
        title={$t("theme.menuTitle")}
        onClose={closeDropdown}
    >
        {#each presetOptions as preset}
            <button
                class="preset-item"
                class:preset-selected={isSelected(preset, $themeColor)}
                type="button"
                on:click={() => selectPreset(preset)}
            >
                <span class="preset-swatch" style="background: {preset.hex}"
                ></span>
                <span class="preset-label">{preset.label}</span>
                {#if isSelected(preset, $themeColor)}
                    <span class="preset-check" aria-hidden="true"></span>
                {/if}
            </button>
        {/each}
        <button
            class="preset-item custom-item"
            class:preset-selected={isCustom}
            type="button"
            on:click={openCustomPicker}
        >
            <span
                class="preset-swatch preset-swatch-custom"
                style="background: {isCustom ? currentHex : 'var(--border)'}"
            ></span>
            <span class="preset-label">{$t("theme.customEllipsis")}</span>
            {#if isCustom}
                <span class="preset-check" aria-hidden="true"></span>
            {/if}
            <CaretRightIcon class="caret-icon" size={12} />
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
        gap: var(--spacing-md);
        height: 40px;
        padding: var(--spacing-md) var(--spacing-sm) var(--spacing-md)
            var(--spacing-lg);
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

    .theme-color-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .theme-color-button:hover {
            filter: var(--brightness-hover);
        }
    }

    .theme-color-button:active {
        transform: scale(0.97);
        filter: var(--brightness-hover);
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
        gap: var(--spacing-md);
        width: 100%;
        min-width: 160px;
        padding: var(--spacing-sm) var(--spacing-lg);
        min-height: 38px;
        border: var(--border-width) solid var(--border);
        background: var(--bg-raised);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        cursor: pointer;
        text-align: left;
        transition:
            filter var(--ease),
            transform var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .custom-item {
        padding-right: var(--spacing-sm) !important;
    }

    @media (hover: hover) {
        .preset-item:hover {
            filter: var(--brightness-hover);
        }
    }

    .preset-item:active {
        filter: var(--brightness-hover);
    }

    .preset-item:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .preset-selected {
        border-color: var(--accent);
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
        background: var(--accent);
        flex-shrink: 0;
    }
</style>
