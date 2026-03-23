<script lang="ts">
    import {
        MagnifyingGlassPlusIcon,
        MoonIcon,
        SunIcon,
        PaletteIcon,
        TextAaIcon,
    } from "phosphor-svelte";
    import { fade } from "svelte/transition";
    import type { Component } from "svelte";
    import { tooltip } from "../tooltip";
    import { triggerHaptic } from "../hapticsStore";
    import ButtonGroup from "../ButtonGroup.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import SegmentedControl from "../SegmentedControl.svelte";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import TextSizeSliderSetting from "../TextSizeSliderSetting.svelte";
    import ThemeColorSelector from "../ThemeColorSelector.svelte";
    import {
        treeZoomScale,
        TreeZoomLevel,
        isTreeZoomLevel,
        getTreeZoomScaleValue,
    } from "../treeZoomStore";
    import { animationsDisabled } from "../reduceMotionStore";
    import { darkMode } from "../darkModeStore";
    import { colorblindTreeColors } from "../colorblindTreeColorsStore";
    import { uppercaseText } from "../uppercaseTextStore";
    import { t, locale } from "svelte-whisper";

    export let onBack: (() => void) | null = null;

    const ZOOM_LABEL_MAX_FRACTION_DIGITS = 1;

    $: currentLocale = $locale || undefined;
    $: treeZoomSelectedIndex = $treeZoomScale;
    $: treeZoomOptions = [
        $t("settings.treeZoomFitOption", {
            scale: formatZoomMultiplier(
                getTreeZoomScaleValue(TreeZoomLevel.Fit),
                currentLocale,
            ),
        }),
        $t("settings.treeZoomCloseUpOption", {
            scale: formatZoomMultiplier(
                getTreeZoomScaleValue(TreeZoomLevel.CloseUp),
                currentLocale,
            ),
        }),
        $t("settings.treeZoomDetailOption", {
            scale: formatZoomMultiplier(
                getTreeZoomScaleValue(TreeZoomLevel.Detail),
                currentLocale,
            ),
        }),
    ];

    function formatZoomMultiplier(zoomScale: number, localeCode?: string) {
        const multiplier = zoomScale / getTreeZoomScaleValue(TreeZoomLevel.Fit);
        const minimumFractionDigits = Number.isInteger(multiplier) ? 0 : 1;
        const localizedMultiplier = new Intl.NumberFormat(localeCode, {
            minimumFractionDigits,
            maximumFractionDigits: ZOOM_LABEL_MAX_FRACTION_DIGITS,
        }).format(multiplier);
        return `${localizedMultiplier}x`;
    }

    function handleTreeZoomChange(index: number) {
        if (!isTreeZoomLevel(index)) return;
        treeZoomScale.set(index);
    }
</script>

<SettingsPage title={$t("settings.pages.appearance")} {onBack}>
    <SideMenuSection title={$t("sideMenu.sections.lookAndFeel")}>
        <ButtonGroup class="theme-row">
            <ThemeColorSelector description={$t("settings.themeDescription")} />
            <button
                class="icon-button"
                type="button"
                use:tooltip={$t("settings.themeModeTooltip")}
                on:click={() => {
                    triggerHaptic();
                    darkMode.toggle();
                }}
            >
                {#if $darkMode}
                    <span transition:fade={{ duration: $animationsDisabled ? 0 : 150 }}
                        ><MoonIcon size={26} /></span
                    >
                {:else}
                    <span transition:fade={{ duration: $animationsDisabled ? 0 : 150 }}
                        ><SunIcon size={26} /></span
                    >
                {/if}
            </button>
        </ButtonGroup>
        <ToggleSwitch
            checked={$uppercaseText}
            label={$t("settings.uppercaseText")}
            ariaLabel={$t("settings.uppercaseText")}
            description={$t("settings.uppercaseTextDescription")}
            icon={TextAaIcon as unknown as Component}
            onToggle={() => uppercaseText.set(!$uppercaseText)}
        />
        <TextSizeSliderSetting />
    </SideMenuSection>

    <SideMenuSection title={$t("sideMenu.sections.tree")}>
        <SegmentedControl
            label={$t("settings.treeZoom")}
            ariaLabel={$t("settings.treeZoom")}
            icon={MagnifyingGlassPlusIcon as unknown as Component}
            options={treeZoomOptions}
            selectedIndex={treeZoomSelectedIndex}
            onChange={handleTreeZoomChange}
            description={$t("settings.treeZoomDescription")}
        />
        <ToggleSwitch
            checked={$colorblindTreeColors}
            label={$t("settings.colorblindTreeColors")}
            ariaLabel={$t("settings.colorblindTreeColors")}
            description={$t("settings.colorblindTreeColorsDescription")}
            icon={PaletteIcon as unknown as Component}
            onToggle={() => colorblindTreeColors.set(!$colorblindTreeColors)}
        />
    </SideMenuSection>
</SettingsPage>

<style>
    :global(.theme-row > :first-child) {
        flex: 1;
        min-width: 0;
    }

    .icon-button {
        min-width: 39px;
        min-height: 40px;
        align-self: stretch;
        display: grid;
        place-items: center;
        position: relative;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        flex-shrink: 0;
        transition:
            filter var(--ease),
            transform var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .icon-button span {
        position: absolute;
        display: grid;
        place-items: center;
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

</style>
