<script lang="ts">
    import { PaletteIcon } from "phosphor-svelte";
    import { themeColor, type ThemeColor } from "./themeColorStore";
    import { hexToOklch, oklchToHex } from "./themeEngine";
    import { triggerHaptic } from "./haptics";
    import { tooltip } from "./tooltip";

    const PRESETS: { h: number; c: number; label: string; hex: string }[] = [
        { h: 264, c: 0.19, label: "Blue", hex: oklchToHex(0.65, 0.19, 264) },
        { h: 300, c: 0.17, label: "Violet", hex: oklchToHex(0.65, 0.17, 300) },
        { h: 345, c: 0.18, label: "Pink", hex: oklchToHex(0.65, 0.18, 345) },
        { h: 25, c: 0.18, label: "Red", hex: oklchToHex(0.65, 0.18, 25) },
        { h: 75, c: 0.16, label: "Amber", hex: oklchToHex(0.65, 0.16, 75) },
        { h: 150, c: 0.16, label: "Green", hex: oklchToHex(0.65, 0.16, 150) },
        { h: 195, c: 0.13, label: "Teal", hex: oklchToHex(0.65, 0.13, 195) },
        { h: 230, c: 0.10, label: "Steel", hex: oklchToHex(0.65, 0.10, 230) },
    ];

    $: isPresetSelected = PRESETS.some(
        (p) => p.h === $themeColor.h && p.c === $themeColor.c,
    );

    $: customDisplayHex = isPresetSelected
        ? oklchToHex(0.50, 0.0, 0)
        : oklchToHex(0.65, $themeColor.c, $themeColor.h);

    function selectPreset(preset: { h: number; c: number }) {
        themeColor.set({ h: preset.h, c: preset.c });
        triggerHaptic();
    }

    function isSelected(preset: { h: number; c: number }, current: ThemeColor): boolean {
        return preset.h === current.h && preset.c === current.c;
    }

    function handleNativeColorChange(event: Event) {
        const hex = (event.target as HTMLInputElement).value;
        const oklch = hexToOklch(hex);
        themeColor.set(oklch);
    }
</script>

<div class="color-swatches">
    {#each PRESETS as preset}
        <button
            class="swatch"
            class:selected={isSelected(preset, $themeColor)}
            style="background: {preset.hex}"
            aria-label="Theme color: {preset.label}"
            use:tooltip={preset.label}
            on:click={() => selectPreset(preset)}
        ></button>
    {/each}
    <label
        class="swatch custom-swatch"
        class:selected={!isPresetSelected}
        style="background: {customDisplayHex}"
        use:tooltip={"Custom color"}
    >
        <PaletteIcon size={16} />
        <input
            type="color"
            value={oklchToHex(0.65, $themeColor.c, $themeColor.h)}
            on:input={handleNativeColorChange}
            class="native-color-input"
        />
    </label>
</div>

<style>
    .color-swatches {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
    }

    .swatch {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-full);
        border: 2px solid transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
        transition:
            border-color var(--ease),
            transform var(--ease);
        -webkit-tap-highlight-color: transparent;
        padding: 0;
        flex-shrink: 0;
    }

    .swatch:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .swatch:hover {
            filter: var(--brightness-hover);
        }
    }

    .swatch:active {
        transform: scale(0.9);
    }

    .swatch.selected {
        border-color: var(--text);
        transform: scale(1.1);
    }

    .swatch.selected:active {
        transform: scale(1.0);
    }

    .custom-swatch {
        border: 2px dashed var(--border);
        display: grid;
        place-items: center;
        color: var(--text-muted);
        position: relative;
        overflow: hidden;
        cursor: pointer;
    }

    .custom-swatch.selected {
        border-style: solid;
        border-color: var(--text);
    }

    .native-color-input {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
        inset: 0;
    }
</style>
