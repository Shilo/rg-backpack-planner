<script lang="ts">
    import {
        ArrowClockwiseIcon,
        ArrowUpIcon,
        ClockCounterClockwiseIcon,
        CubeFocusIcon,
        MagnifyingGlassPlusIcon,
        MoonIcon,
        SunIcon,
        TrashSimpleIcon,
        EyeIcon,
        GraphIcon,
    } from "phosphor-svelte";
    import { fade } from "svelte/transition";
    import type { Component } from "svelte";
    import { tooltip } from "../tooltip";
    import { triggerHaptic, hapticsEnabled } from "../hapticsStore";
    import Button from "../Button.svelte";
    import FullscreenToggle from "../buttons/FullscreenToggle.svelte";
    import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
    import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
    import ResetTreeButton from "../buttons/ResetTreeButton.svelte";
    import BuildPresetsButton from "../buttons/BuildPresetsButton.svelte";
    import ShareBuildButton from "../buttons/ShareBuildButton.svelte";
    import TechCrystalsButton from "../buttons/TechCrystalsButton.svelte";
    import PreviewBuildsDropdown from "../buttons/PreviewBuildsDropdown.svelte";
    import {
        treeZoomScale,
        TreeZoomLevel,
        isTreeZoomLevel,
        getTreeZoomScaleValue,
    } from "../treeZoomStore";
    import { darkMode } from "../darkModeStore";
    import { themeColor } from "../themeColorStore";
    import ThemeColorSelector from "../ThemeColorSelector.svelte";
    import LanguageDropdown from "../buttons/LanguageDropdown.svelte";
    import { openModal } from "../modalStore";
    import SideMenuPreviewSection from "./SideMenuPreviewSection.svelte";
    import { isPreviewMode } from "../previewModeStore";
    import SideMenuSection from "../SideMenuSection.svelte";
    import SegmentedControl from "../SegmentedControl.svelte";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import {
        nodePrimaryAction,
        isNodePrimaryAction,
    } from "../nodePrimaryActionStore";
    import {
        nodeLevelBehavior,
        isNodeLevelBehavior,
    } from "../nodeLevelBehaviorStore";
    import { showTier } from "../showTierStore";
    import { showSkillName } from "../showSkillNameStore";
    import { showToast } from "../toast";
    import { clearAll } from "../storage";
    import type { TreeViewState } from "../Tree.svelte";
    import { treeLevels } from "../treeLevelsStore";
    import { onMount } from "svelte";
    import { t, resetLocale, locale } from "svelte-whisper";

    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onFocusInView: (() => void) | null = null;

    const POS_EPSILON = 0.5;
    const SCALE_EPSILON = 0.001;
    const ZOOM_LABEL_MAX_FRACTION_DIGITS = 1;

    let previewButtonElement: HTMLButtonElement | null = null;
    let dropdownMenuOpen = false;
    let dropdownMenuX = 0;
    let dropdownMenuY = 0;

    const isClose = (a: number, b: number, epsilon: number) =>
        Math.abs(a - b) <= epsilon;

    $: isFocused =
        !!activeTreeViewState &&
        !!activeTreeFocusViewState &&
        isClose(
            activeTreeViewState.offsetX,
            activeTreeFocusViewState.offsetX,
            POS_EPSILON,
        ) &&
        isClose(
            activeTreeViewState.offsetY,
            activeTreeFocusViewState.offsetY,
            POS_EPSILON,
        ) &&
        isClose(
            activeTreeViewState.scale,
            activeTreeFocusViewState.scale,
            SCALE_EPSILON,
        );

    $: isFocusDisabled = !onFocusInView || isFocused;
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
    ];
    let isTouchPrimaryPlatform = false;

    const detectTouchPrimaryPlatform = () => {
        if (typeof window === "undefined") return false;
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        const hasTouchPoints =
            typeof navigator !== "undefined" &&
            (navigator.maxTouchPoints ?? 0) > 0;
        return !hasFinePointer && (hasCoarsePointer || hasTouchPoints);
    };

    onMount(() => {
        isTouchPrimaryPlatform = detectTouchPrimaryPlatform();
    });

    $: nodePrimaryActionName = $t(
        isTouchPrimaryPlatform
            ? "settings.nodePrimaryActionTouch"
            : "settings.nodePrimaryActionLeftClick",
    );
    $: nodePrimaryActionLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: nodePrimaryActionName,
    });
    $: nodePrimaryActionOptions = [
        $t("nodeMenu.incrementOne"),
        $t("nodeMenu.incrementTen"),
        $t("nodeMenu.incrementTier"),
    ];
    $: nodePrimaryActionSelectedIndex = $nodePrimaryAction;
    $: nodeLevelBehaviorLabel = $t("settings.nodeLevelBehavior");
    $: nodeLevelBehaviorOptions = [
        $t("settings.nodeLevelBehaviorSolo"),
        $t("settings.nodeLevelBehaviorSync"),
    ];
    $: nodeLevelBehaviorSelectedIndex = $nodeLevelBehavior;

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

    function handleNodePrimaryActionChange(index: number) {
        if (!isNodePrimaryAction(index)) return;
        nodePrimaryAction.set(index);
    }

    function handleNodeLevelBehaviorChange(index: number) {
        if (!isNodeLevelBehavior(index)) return;
        nodeLevelBehavior.set(index);
    }

    function handleResetSettings() {
        openModal({
            type: "confirm",
            title: $t("modal.resetSettings.title"),
            titleIcon: ClockCounterClockwiseIcon as unknown as Component,
            message: $t("modal.resetSettings.message"),
            confirmLabel: $t("modal.resetSettings.confirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                nodePrimaryAction.resetToDefault();
                nodeLevelBehavior.resetToDefault();
                showTier.resetToDefault();
                showSkillName.resetToDefault();
                hapticsEnabled.resetToDefault();
                treeZoomScale.resetToDefault();
                themeColor.resetToDefault();
                darkMode.resetToDefault();

                // Reset locale using the new library helper
                void resetLocale();

                showToast($t("modal.resetSettings.toast"));
                onClose?.();
            },
        });
    }

    async function handleReloadWindow() {
        if ("serviceWorker" in navigator) {
            try {
                const registration =
                    await navigator.serviceWorker.getRegistration();
                if (registration && navigator.onLine) {
                    await Promise.race([
                        registration.update(),
                        new Promise((_, reject) =>
                            setTimeout(
                                () => reject(new Error("Update timeout")),
                                2000,
                            ),
                        ),
                    ]);
                }
            } catch (error) {
                console.warn("Service worker update failed/timed out:", error);
            }
        }
        window.location.reload();
    }

    function handleClearAllData() {
        openModal({
            type: "confirm",
            title: $t("modal.clearAllData.title"),
            titleIcon: TrashSimpleIcon as unknown as Component,
            message: $t("modal.clearAllData.message"),
            confirmLabel: $t("modal.clearAllData.confirmLabel"),
            cancelLabel: $t("common.cancel"),
            confirmNegative: true,
            onConfirm: () => {
                clearAll();
                // Reload the page
                window.location.reload();
            },
        });
    }

    function handlePreviewDropdownClick() {
        if (!previewButtonElement) return;
        const rect = previewButtonElement.getBoundingClientRect();
        dropdownMenuX = rect.left + rect.width / 2;
        dropdownMenuY = rect.bottom + 8;
        dropdownMenuOpen = true;
    }

    function closeDropdownMenu() {
        dropdownMenuOpen = false;
    }
</script>

<SideMenuPreviewSection />

<SideMenuSection title={$t("sideMenu.sections.build")}>
    <BuildPresetsButton disabled={$isPreviewMode} />
    <TechCrystalsButton disabled={$isPreviewMode} />
    <div class="button-group build-share-row">
        <ShareBuildButton
            title={$t("settings.shareButton")}
            disabled={$isPreviewMode}
            onComposeScreenshot={() => onClose?.()}
        />
        <Button
            class="dropdown-button"
            bind:element={previewButtonElement}
            on:click={handlePreviewDropdownClick}
            tooltipText={$t("settings.previewButtonTooltip")}
            icon={EyeIcon}
            arrow="down"
        >
            {$t("settings.previewButton")}
        </Button>
    </div>
</SideMenuSection>

<SideMenuSection title={$t("sideMenu.sections.node")}>
    <SegmentedControl
        label={nodePrimaryActionLabel}
        ariaLabel={nodePrimaryActionLabel}
        icon={ArrowUpIcon as unknown as Component}
        options={nodePrimaryActionOptions}
        selectedIndex={nodePrimaryActionSelectedIndex}
        onChange={handleNodePrimaryActionChange}
    />
    <SegmentedControl
        label={nodeLevelBehaviorLabel}
        ariaLabel={nodeLevelBehaviorLabel}
        icon={GraphIcon as unknown as Component}
        options={nodeLevelBehaviorOptions}
        selectedIndex={nodeLevelBehaviorSelectedIndex}
        onChange={handleNodeLevelBehaviorChange}
    />
    <ToggleSwitch
        checked={$showSkillName}
        label={$t("settings.showSkillName")}
        ariaLabel={$t("settings.showSkillName")}
        onToggle={() => showSkillName.set(!$showSkillName)}
    />
    <ToggleSwitch
        checked={$showTier}
        label={$t("settings.showTier")}
        ariaLabel={$t("settings.showTier")}
        onToggle={() => showTier.set(!$showTier)}
    />
</SideMenuSection>

<SideMenuSection title={$t("sideMenu.sections.view")}>
    <SegmentedControl
        label={$t("settings.treeZoom")}
        ariaLabel={$t("settings.treeZoom")}
        icon={MagnifyingGlassPlusIcon as unknown as Component}
        options={treeZoomOptions}
        selectedIndex={treeZoomSelectedIndex}
        onChange={handleTreeZoomChange}
    />
    <Button
        on:click={() => {
            if (!onFocusInView) return;
            onFocusInView();
            onClose?.();
        }}
        tooltipText={$t("settings.focusTreeInViewTooltip")}
        icon={CubeFocusIcon}
        disabled={isFocusDisabled}
    >
        {$t("settings.focusTreeInView")}
    </Button>
</SideMenuSection>

<SideMenuSection
    title={activeTreeName
        ? $t("trees.named", { label: activeTreeName })
        : $t("trees.generic")}
>
    <ResetTreeButton
        onReset={() => {
            onResetTree?.();
            onClose?.();
        }}
        levelsById={$treeLevels[activeTreeIndex] ?? null}
        treeLabel={activeTreeName}
    />
    <ResetAllTreesButton
        onResetAll={() => {
            onResetAll?.();
            onClose?.();
        }}
        levelsByTree={$treeLevels}
    />
</SideMenuSection>

<SideMenuSection title={$t("sideMenu.sections.lookAndFeel")}>
    <LanguageDropdown />
    <div class="button-group theme-row">
        <ThemeColorSelector />
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
                <span transition:fade={{ duration: 150 }}
                    ><MoonIcon size={26} /></span
                >
            {:else}
                <span transition:fade={{ duration: 150 }}
                    ><SunIcon size={26} /></span
                >
            {/if}
        </button>
    </div>
    <ToggleSwitch
        checked={$hapticsEnabled}
        label={$t("settings.haptics")}
        ariaLabel={$t("settings.haptics")}
        onToggle={() => hapticsEnabled.set(!$hapticsEnabled)}
    />
</SideMenuSection>

<SideMenuSection title={$t("sideMenu.sections.application")}>
    <FullscreenToggle />
    <InstallPwaButton title={true} />
    <Button
        on:click={handleReloadWindow}
        tooltipText={$t("settings.reloadWindowTooltip")}
        icon={ArrowClockwiseIcon}
    >
        {$t("settings.reloadWindow")}
    </Button>
    <Button
        on:click={handleResetSettings}
        tooltipText={$t("settings.resetSettingsTooltip")}
        icon={ClockCounterClockwiseIcon}
        arrow="right"
        negative
    >
        {$t("settings.resetSettings")}
    </Button>
    <div class="spacer"></div>
    <Button
        on:click={handleClearAllData}
        tooltipText={$t("settings.clearAllDataTooltip")}
        icon={TrashSimpleIcon}
        arrow="right"
        negative
    >
        {$t("settings.clearAllData")}
    </Button>
</SideMenuSection>

<PreviewBuildsDropdown
    x={dropdownMenuX}
    y={dropdownMenuY}
    isOpen={dropdownMenuOpen}
    onClose={closeDropdownMenu}
    onPreview={() => onClose?.()}
/>

<style>
    .spacer {
        height: var(--spacing-md);
    }

    :global(
            .side-menu-section .button:has(.button-text:not(:empty)),
            .side-menu-section .button-group
        ) {
        min-width: 0;
    }

    .build-share-row :global(.button) {
        flex: 1 1 auto;
    }

    .build-share-row > :global(:first-child) {
        border-right: none;
    }

    .build-share-row > :global(.dropdown-button) {
        border-left: var(--border-width) solid var(--border);
    }

    .theme-row > :global(:first-child) {
        flex: 1;
        min-width: 0;
    }

    .icon-button {
        width: 39px;
        height: 40px;
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

    /* Flat left edge and no left border when in button-group */
    .theme-row .icon-button {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: none;
    }
</style>
