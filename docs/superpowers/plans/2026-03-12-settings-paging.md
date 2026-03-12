# Settings Paging Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the settings side menu from a single scrollable page into a root page with 3 lazy-loaded category subpages (Node, Appearance, General), with iOS-style slide transitions.

**Architecture:** `SideMenuSettingsPage.svelte` becomes a thin navigation shell managing a `currentPage` state and CSS class-driven slide transitions. Each page (including root) is a separate `.svelte` file, lazy-loaded via dynamic import with cache variables. A `SettingsPage.svelte` base component wraps all pages with optional back-button header, advanced settings accordion, and danger zone sections.

**Tech Stack:** Svelte 5 (legacy mode with `$:` reactivity), TypeScript, phosphor-svelte icons, svelte-whisper i18n, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-12-settings-paging-design.md`

---

## Chunk 1: Foundation Components

### Task 1: Add i18n keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: Add English translation keys**

In `src/locales/en.json`, add inside the `"settings"` object (after the `"colorblindTreeColorsTooltip"` entry):

```json
"pages": {
    "node": "Node",
    "nodeDescription": "Primary action, level behavior",
    "appearance": "Appearance",
    "appearanceDescription": "Theme, zoom, text size",
    "general": "General",
    "generalDescription": "Language, haptics, reset",
    "backToSettings": "Back"
},
"dangerZone": "Danger Zone",
"advanced": "Advanced"
```

- [ ] **Step 2: Add Japanese translation keys**

In `src/locales/ja.json`, add inside the `"settings"` object (after `"colorblindTreeColorsTooltip"`):

```json
"pages": {
    "node": "ノード",
    "nodeDescription": "プライマリアクション、レベル動作",
    "appearance": "外観",
    "appearanceDescription": "テーマ、ズーム、文字サイズ",
    "general": "一般",
    "generalDescription": "言語、触覚、リセット",
    "backToSettings": "戻る"
},
"dangerZone": "危険ゾーン",
"advanced": "詳細設定"
```

- [ ] **Step 3: Add Chinese translation keys**

In `src/locales/zh.json`, add inside the `"settings"` object (after `"colorblindTreeColorsTooltip"`):

```json
"pages": {
    "node": "节点",
    "nodeDescription": "主要操作、等级行为",
    "appearance": "外观",
    "appearanceDescription": "主题、缩放、字体大小",
    "general": "通用",
    "generalDescription": "语言、触觉、重置",
    "backToSettings": "返回"
},
"dangerZone": "危险区域",
"advanced": "高级设置"
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass (locale casing style guide test validates new keys)

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/ja.json src/locales/zh.json
git commit -m "feat: add i18n keys for settings paging navigation"
```

### Task 2: Create SettingsNavButton component

**Files:**
- Create: `src/lib/sideMenuPages/SettingsNavButton.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/sideMenuPages/SettingsNavButton.svelte`:

```svelte
<script lang="ts">
    import type { Component } from "svelte";
    import { CaretRightIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";

    export let icon: Component | null = null;
    export let title = "";
    export let description = "";
    export let onClick: (() => void) | null = null;
    export let disabled: boolean | undefined = undefined;
</script>

<button
    class="settings-nav-button"
    type="button"
    {disabled}
    {...$$restProps}
    on:click={() => {
        triggerHaptic();
        onClick?.();
    }}
>
    {#if icon}
        <svelte:component this={icon} class="settings-nav-icon" aria-hidden={true} size={26} />
    {/if}
    <div class="settings-nav-text">
        <span class="settings-nav-title">{title}</span>
        {#if description}
            <span class="settings-nav-description">{description}</span>
        {/if}
    </div>
    <CaretRightIcon class="settings-nav-arrow" size={12} aria-hidden={true} />
</button>

<style>
    .settings-nav-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        font-size: var(--font-base);
        text-align: left;
        cursor: pointer;
        line-height: var(--leading-none);
        transition:
            transform var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .settings-nav-button:disabled {
        opacity: var(--opacity-disabled);
        cursor: not-allowed;
        border-color: var(--border-subtle);
        background: var(--bg-input);
        color: var(--text-disabled);
        filter: none;
        transform: none;
    }

    .settings-nav-button:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-nav-button:not(:disabled):hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-nav-button:not(:disabled):active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .settings-nav-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .settings-nav-title {
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .settings-nav-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    :global(.settings-nav-arrow) {
        flex: 0 0 auto;
        opacity: 0.5;
    }
</style>
```

- [ ] **Step 2: Verify by running type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/SettingsNavButton.svelte
git commit -m "feat: add SettingsNavButton component for settings page navigation"
```

### Task 3: Create SettingsPage base component

**Files:**
- Create: `src/lib/sideMenuPages/SettingsPage.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/sideMenuPages/SettingsPage.svelte`:

```svelte
<script lang="ts">
    import { CaretLeftIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";
    import Accordion from "../Accordion.svelte";
    import { t } from "svelte-whisper";

    export let title: string | undefined = undefined;
    export let onBack: (() => void) | null = null;

    let backButtonElement: HTMLButtonElement | null = null;

    export function focusBackButton() {
        backButtonElement?.focus();
    }
</script>

{#if title !== undefined}
    <div class="settings-page-header">
        {#if onBack}
            <button
                class="settings-page-back"
                type="button"
                aria-label={$t("settings.pages.backToSettings")}
                bind:this={backButtonElement}
                on:click={() => {
                    triggerHaptic();
                    onBack?.();
                }}
            >
                <CaretLeftIcon size={16} weight="bold" />
            </button>
        {/if}
        <h2 class="settings-page-title">{title}</h2>
    </div>
{/if}

<div class="settings-page-content">
    <slot />
</div>

{#if $$slots.advancedSettings}
    <Accordion title={$t("settings.advanced")}>
        <slot name="advancedSettings" />
    </Accordion>
{/if}

<slot name="dangerZone" />

<style>
    .settings-page-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .settings-page-back {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
        cursor: pointer;
        transition:
            transform var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .settings-page-back:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-page-back:hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-page-back:active {
        transform: scale(0.92);
    }

    .settings-page-title {
        margin: 0;
        font-size: var(--font-lg);
        color: var(--text);
        line-height: var(--leading);
    }

    .settings-page-content {
        display: grid;
        gap: var(--spacing-lg);
    }
</style>
```

- [ ] **Step 2: Verify by running type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/SettingsPage.svelte
git commit -m "feat: add SettingsPage base component with back button header"
```

---

## Chunk 2: Subpage Components

### Task 4: Create NodeSettingsPage

**Files:**
- Create: `src/lib/sideMenuPages/NodeSettingsPage.svelte`

- [ ] **Step 1: Create the component**

Extract the Node section from `SideMenuSettingsPage.svelte` (lines 295-330 for template, lines 126-184 for script logic). Create `src/lib/sideMenuPages/NodeSettingsPage.svelte`:

```svelte
<script lang="ts">
    import {
        ArrowUpIcon,
        GraphIcon,
        TagIcon,
        MedalIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import SettingsPage from "./SettingsPage.svelte";
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
    import { onMount } from "svelte";
    import { t } from "svelte-whisper";

    export let onBack: (() => void) | null = null;

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

    function handleNodePrimaryActionChange(index: number) {
        if (!isNodePrimaryAction(index)) return;
        nodePrimaryAction.set(index);
    }

    function handleNodeLevelBehaviorChange(index: number) {
        if (!isNodeLevelBehavior(index)) return;
        nodeLevelBehavior.set(index);
    }
</script>

<SettingsPage title={$t("settings.pages.node")} {onBack}>
    <SideMenuSection title={$t("sideMenu.sections.node")}>
        <SegmentedControl
            label={nodePrimaryActionLabel}
            ariaLabel={nodePrimaryActionLabel}
            icon={ArrowUpIcon as unknown as Component}
            options={nodePrimaryActionOptions}
            selectedIndex={nodePrimaryActionSelectedIndex}
            onChange={handleNodePrimaryActionChange}
            tooltipText={$t("settings.nodePrimaryActionTooltip")}
        />
        <SegmentedControl
            label={nodeLevelBehaviorLabel}
            ariaLabel={nodeLevelBehaviorLabel}
            icon={GraphIcon as unknown as Component}
            options={nodeLevelBehaviorOptions}
            selectedIndex={nodeLevelBehaviorSelectedIndex}
            onChange={handleNodeLevelBehaviorChange}
            tooltipText={$t("settings.nodeLevelBehaviorTooltip")}
        />
        <ToggleSwitch
            checked={$showSkillName}
            label={$t("settings.showSkillName")}
            ariaLabel={$t("settings.showSkillName")}
            tooltipText={$t("settings.showSkillNameTooltip")}
            icon={TagIcon as unknown as Component}
            onToggle={() => showSkillName.set(!$showSkillName)}
        />
        <ToggleSwitch
            checked={$showTier}
            label={$t("settings.showTier")}
            ariaLabel={$t("settings.showTier")}
            tooltipText={$t("settings.showTierTooltip")}
            icon={MedalIcon as unknown as Component}
            onToggle={() => showTier.set(!$showTier)}
        />
    </SideMenuSection>
</SettingsPage>
```

- [ ] **Step 2: Verify type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/NodeSettingsPage.svelte
git commit -m "feat: add NodeSettingsPage subpage component"
```

### Task 5: Create AppearanceSettingsPage

**Files:**
- Create: `src/lib/sideMenuPages/AppearanceSettingsPage.svelte`

- [ ] **Step 1: Create the component**

Extract Look & Feel section (minus Language and Haptics) + View/Zoom section from `SideMenuSettingsPage.svelte`. Create `src/lib/sideMenuPages/AppearanceSettingsPage.svelte`:

```svelte
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
        <SegmentedControl
            label={$t("settings.treeZoom")}
            ariaLabel={$t("settings.treeZoom")}
            icon={MagnifyingGlassPlusIcon as unknown as Component}
            options={treeZoomOptions}
            selectedIndex={treeZoomSelectedIndex}
            onChange={handleTreeZoomChange}
            tooltipText={$t("settings.treeZoomTooltip")}
        />
        <ToggleSwitch
            checked={$colorblindTreeColors}
            label={$t("settings.colorblindTreeColors")}
            ariaLabel={$t("settings.colorblindTreeColors")}
            tooltipText={$t("settings.colorblindTreeColorsTooltip")}
            icon={PaletteIcon as unknown as Component}
            onToggle={() => colorblindTreeColors.set(!$colorblindTreeColors)}
        />
        <ToggleSwitch
            checked={$uppercaseText}
            label={$t("settings.uppercaseText")}
            ariaLabel={$t("settings.uppercaseText")}
            tooltipText={$t("settings.uppercaseTextTooltip")}
            icon={TextAaIcon as unknown as Component}
            onToggle={() => uppercaseText.set(!$uppercaseText)}
        />
        <TextSizeSliderSetting />
    </SideMenuSection>
</SettingsPage>

<style>
    .theme-row > :global(:first-child) {
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

    .theme-row .icon-button {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: none;
    }
</style>
```

- [ ] **Step 2: Verify type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/AppearanceSettingsPage.svelte
git commit -m "feat: add AppearanceSettingsPage subpage component"
```

### Task 6: Create GeneralSettingsPage

**Files:**
- Create: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`

- [ ] **Step 1: Create the component**

Extract Application section + Language + Haptics from `SideMenuSettingsPage.svelte`. Create `src/lib/sideMenuPages/GeneralSettingsPage.svelte`:

```svelte
<script lang="ts">
    import {
        ArrowClockwiseIcon,
        ClockCounterClockwiseIcon,
        TrashSimpleIcon,
        VibrateIcon,
    } from "phosphor-svelte";
    import type { Component } from "svelte";
    import { hapticsEnabled } from "../hapticsStore";
    import Button from "../Button.svelte";
    import FullscreenToggle from "../buttons/FullscreenToggle.svelte";
    import InstallPwaButton from "../buttons/InstallPwaButton.svelte";
    import LanguageDropdown from "../buttons/LanguageDropdown.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import ToggleSwitch from "../ToggleSwitch.svelte";
    import { openModal } from "../modalStore";
    import { nodePrimaryAction } from "../nodePrimaryActionStore";
    import { nodeLevelBehavior } from "../nodeLevelBehaviorStore";
    import { showTier } from "../showTierStore";
    import { showSkillName } from "../showSkillNameStore";
    import { treeZoomScale } from "../treeZoomStore";
    import { textSize } from "../textSizeStore";
    import { themeColor } from "../themeColorStore";
    import { darkMode } from "../darkModeStore";
    import { colorblindTreeColors } from "../colorblindTreeColorsStore";
    import { uppercaseText } from "../uppercaseTextStore";
    import { showToast } from "../toast";
    import { clearAll } from "../storage";
    import { t, resetLocale } from "svelte-whisper";

    export let onBack: (() => void) | null = null;
    export let onClose: (() => void) | null = null;

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
                textSize.resetToDefault();
                themeColor.resetToDefault();
                darkMode.resetToDefault();
                colorblindTreeColors.resetToDefault();
                uppercaseText.resetToDefault();

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
                window.location.reload();
            },
        });
    }
</script>

<SettingsPage title={$t("settings.pages.general")} {onBack}>
    <SideMenuSection title={$t("settings.pages.general")}>
        <LanguageDropdown />
        <ToggleSwitch
            checked={$hapticsEnabled}
            label={$t("settings.haptics")}
            ariaLabel={$t("settings.haptics")}
            tooltipText={$t("settings.hapticsTooltip")}
            icon={VibrateIcon as unknown as Component}
            onToggle={() => hapticsEnabled.set(!$hapticsEnabled)}
        />
        <FullscreenToggle />
        <InstallPwaButton title={true} />
        <Button
            on:click={handleReloadWindow}
            tooltipText={$t("settings.reloadWindowTooltip")}
            icon={ArrowClockwiseIcon}
        >
            {$t("settings.reloadWindow")}
        </Button>
    </SideMenuSection>

    <svelte:fragment slot="dangerZone">
        <div class="danger-zone">
            <div class="danger-zone-separator"></div>
            <h3 class="danger-zone-label">{$t("settings.dangerZone")}</h3>
            <div class="danger-zone-content">
                <Button
                    on:click={handleResetSettings}
                    tooltipText={$t("settings.resetSettingsTooltip")}
                    icon={ClockCounterClockwiseIcon}
                    arrow="right"
                    negative
                >
                    {$t("settings.resetSettings")}
                </Button>
                <Button
                    on:click={handleClearAllData}
                    tooltipText={$t("settings.clearAllDataTooltip")}
                    icon={TrashSimpleIcon}
                    arrow="right"
                    negative
                >
                    {$t("settings.clearAllData")}
                </Button>
            </div>
        </div>
    </svelte:fragment>
</SettingsPage>

<style>
    .danger-zone {
        display: grid;
        gap: var(--spacing-md);
    }

    .danger-zone-separator {
        height: 1px;
        background: var(--danger-border);
        opacity: 0.5;
    }

    .danger-zone-label {
        margin: 0;
        font-size: var(--font-base);
        letter-spacing: var(--tracking);
        color: var(--danger-text);
    }

    .danger-zone-content {
        display: grid;
        gap: var(--spacing-md);
    }
</style>
```

- [ ] **Step 2: Verify type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/GeneralSettingsPage.svelte
git commit -m "feat: add GeneralSettingsPage subpage with danger zone"
```

---

## Chunk 3: Root Page and Navigation Shell

### Task 7: Create RootSettingsPage

**Files:**
- Create: `src/lib/sideMenuPages/RootSettingsPage.svelte`

- [ ] **Step 1: Create the component**

Extract Build section, Tree section, and add nav buttons. Create `src/lib/sideMenuPages/RootSettingsPage.svelte`:

```svelte
<script lang="ts">
    import {
        CursorClickIcon,
        EyeIcon,
        GearSixIcon,
        PaletteIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import BuildPresetsButton from "../buttons/BuildPresetsButton.svelte";
    import FocusInViewButton from "../buttons/FocusInViewButton.svelte";
    import ResetAllTreesButton from "../buttons/ResetAllTreesButton.svelte";
    import ResetTreeButton from "../buttons/ResetTreeButton.svelte";
    import ShareBuildButton from "../buttons/ShareBuildButton.svelte";
    import TechCrystalsButton from "../buttons/TechCrystalsButton.svelte";
    import PreviewBuildsDropdown from "../buttons/PreviewBuildsDropdown.svelte";
    import SettingsPage from "./SettingsPage.svelte";
    import SettingsNavButton from "./SettingsNavButton.svelte";
    import SideMenuPreviewSection from "./SideMenuPreviewSection.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import { isPreviewMode } from "../previewModeStore";
    import { treeLevels } from "../treeLevelsStore";
    import type { TreeViewState } from "../Tree.svelte";
    import type { SettingsPageId } from "./SideMenuSettingsPage.svelte";
    import { t } from "svelte-whisper";

    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onFocusInView: (() => void) | null = null;
    export let onNavigate: ((page: SettingsPageId) => void) | null = null;
    // Note: SettingsPageId is exported from SideMenuSettingsPage.svelte in Task 8.
    // If type-check fails here, Task 8 must be committed first or both tasks combined.

    let previewButtonElement: HTMLButtonElement | null = null;
    let dropdownMenuOpen = false;
    let dropdownMenuX = 0;
    let dropdownMenuY = 0;

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

<SettingsPage>
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

    <SideMenuSection
        title={activeTreeName
            ? $t("trees.named", { label: activeTreeName })
            : $t("trees.generic")}
    >
        <FocusInViewButton
            {onFocusInView}
            onPress={() => onClose?.()}
            viewState={activeTreeViewState}
            focusViewState={activeTreeFocusViewState}
        />
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

    <SideMenuSection title={$t("sideMenu.tabs.settings.label")}>
        <SettingsNavButton
            icon={CursorClickIcon}
            title={$t("settings.pages.node")}
            description={$t("settings.pages.nodeDescription")}
            onClick={() => onNavigate?.("node")}
            data-page="node"
        />
        <SettingsNavButton
            icon={PaletteIcon}
            title={$t("settings.pages.appearance")}
            description={$t("settings.pages.appearanceDescription")}
            onClick={() => onNavigate?.("appearance")}
            data-page="appearance"
        />
        <SettingsNavButton
            icon={GearSixIcon}
            title={$t("settings.pages.general")}
            description={$t("settings.pages.generalDescription")}
            onClick={() => onNavigate?.("general")}
            data-page="general"
        />
    </SideMenuSection>
</SettingsPage>

<PreviewBuildsDropdown
    x={dropdownMenuX}
    y={dropdownMenuY}
    isOpen={dropdownMenuOpen}
    onClose={closeDropdownMenu}
    onPreview={() => onClose?.()}
/>

<style>
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
</style>
```

- [ ] **Step 2: Verify type check**

Run: `npm run check`
Expected: May show an error for the `SettingsPageId` import if Task 8 hasn't been committed yet. If so, proceed — Task 8 resolves it. Alternatively, combine Task 7 and Task 8 into a single commit.

- [ ] **Step 3: Commit (combine with Task 8 if type check fails)**

```bash
git add src/lib/sideMenuPages/RootSettingsPage.svelte
git commit -m "feat: add RootSettingsPage with build, tree, and nav buttons"
```

### Task 8: Rewrite SideMenuSettingsPage as navigation shell

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`
- Modify: `src/lib/SideMenu.svelte` (add scrollContentElement prop passthrough)

- [ ] **Step 1: Add scrollContentElement prop to SideMenu → SideMenuSettingsPage**

In `src/lib/SideMenu.svelte`, update the settings component rendering (around line 138-149) to pass `scrollContentElement`:

Find the `<svelte:component this={SideMenuSettingsPage}` block and add `{scrollContentElement}` prop:

```svelte
<svelte:component
    this={SideMenuSettingsPage}
    {activeTreeName}
    {activeTreeIndex}
    {activeTreeViewState}
    {activeTreeFocusViewState}
    {onClose}
    {onResetAll}
    {onResetTree}
    {onFocusInView}
    {scrollContentElement}
/>
```

- [ ] **Step 2: Rewrite SideMenuSettingsPage.svelte**

Replace the entire contents of `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` with:

```svelte
<script context="module" lang="ts">
    export type SettingsPageId = "root" | "node" | "appearance" | "general";
</script>

<script lang="ts">
    import type { TreeViewState } from "../Tree.svelte";
    import { tick } from "svelte";
    import { t } from "svelte-whisper";

    export let activeTreeName = "";
    export let activeTreeIndex = 0;
    export let activeTreeViewState: TreeViewState | null = null;
    export let activeTreeFocusViewState: TreeViewState | null = null;
    export let onClose: (() => void) | null = null;
    export let onResetAll: (() => void) | null = null;
    export let onResetTree: (() => void) | null = null;
    export let onFocusInView: (() => void) | null = null;
    export let scrollContentElement: HTMLElement | null = null;

    // --- Lazy loading (cache-variable pattern matching SideMenu.svelte) ---
    let RootPage: any = null;
    let NodePage: any = null;
    let AppearancePage: any = null;
    let GeneralPage: any = null;

    async function loadPage(page: SettingsPageId): Promise<void> {
        if (page === "root" && !RootPage) {
            RootPage = (
                await import("./RootSettingsPage.svelte")
            ).default;
        } else if (page === "node" && !NodePage) {
            NodePage = (
                await import("./NodeSettingsPage.svelte")
            ).default;
        } else if (page === "appearance" && !AppearancePage) {
            AppearancePage = (
                await import("./AppearanceSettingsPage.svelte")
            ).default;
        } else if (page === "general" && !GeneralPage) {
            GeneralPage = (
                await import("./GeneralSettingsPage.svelte")
            ).default;
        }
    }

    // --- Navigation state ---
    let currentPage: SettingsPageId = "root";
    let lastNavigatedPage: SettingsPageId = "root";
    let transitionDirection: "forward" | "back" = "forward";
    let isTransitioning = false;
    let outgoingComponent: any = null;
    let outgoingPage: SettingsPageId = "root";

    $: void loadPage(currentPage);

    $: currentComponent =
        currentPage === "root"
            ? RootPage
            : currentPage === "node"
              ? NodePage
              : currentPage === "appearance"
                ? AppearancePage
                : GeneralPage;

    let containerElement: HTMLDivElement | null = null;

    function scrollToTop() {
        if (scrollContentElement) {
            scrollContentElement.scrollTop = 0;
        }
    }

    async function navigateTo(page: SettingsPageId) {
        if (isTransitioning || page === currentPage) return;
        lastNavigatedPage = page;
        transitionDirection = "forward";
        outgoingComponent = currentComponent;
        outgoingPage = currentPage;

        // Fix container height during transition
        if (containerElement) {
            containerElement.style.height = `${containerElement.offsetHeight}px`;
        }

        isTransitioning = true;
        currentPage = page;
        await loadPage(page);
        scrollToTop();
        await tick();

        // Wait for transition to end
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const onEnd = () => {
                    clearTimeout(fallbackTimeout);
                    isTransitioning = false;
                    outgoingComponent = null;
                    if (containerElement) {
                        containerElement.style.height = "";
                    }
                };
                let fallbackTimeout: ReturnType<typeof setTimeout>;
                const incomingEl = containerElement?.querySelector(
                    ".incoming:not(.active)",
                );
                if (incomingEl) {
                    incomingEl.addEventListener("animationend", onEnd, {
                        once: true,
                    });
                    fallbackTimeout = setTimeout(onEnd, 200);
                } else {
                    onEnd();
                }
            });
        });
    }

    async function navigateBack() {
        if (isTransitioning || currentPage === "root") return;
        transitionDirection = "back";
        outgoingComponent = currentComponent;
        outgoingPage = currentPage;

        if (containerElement) {
            containerElement.style.height = `${containerElement.offsetHeight}px`;
        }

        isTransitioning = true;
        currentPage = "root";
        await loadPage("root");
        scrollToTop();
        await tick();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const onEnd = () => {
                    clearTimeout(fallbackTimeout);
                    isTransitioning = false;
                    outgoingComponent = null;
                    if (containerElement) {
                        containerElement.style.height = "";
                    }
                    // Focus the nav button that was clicked
                    tick().then(() => {
                        const btn = containerElement?.querySelector(
                            `[data-page="${lastNavigatedPage}"]`,
                        );
                        if (btn instanceof HTMLElement) btn.focus();
                    });
                };
                let fallbackTimeout: ReturnType<typeof setTimeout>;
                const incomingEl = containerElement?.querySelector(
                    ".incoming:not(.active)",
                );
                if (incomingEl) {
                    incomingEl.addEventListener("animationend", onEnd, {
                        once: true,
                    });
                    fallbackTimeout = setTimeout(onEnd, 200);
                } else {
                    onEnd();
                }
            });
        });
    }
</script>

<div
    class="settings-page-container"
    class:transitioning={isTransitioning}
    class:forward={isTransitioning && transitionDirection === "forward"}
    class:back={isTransitioning && transitionDirection === "back"}
    bind:this={containerElement}
>
    {#if isTransitioning && outgoingComponent}
        <div class="settings-page-panel outgoing" aria-hidden="true">
            <svelte:component
                this={outgoingComponent}
                {activeTreeName}
                {activeTreeIndex}
                {activeTreeViewState}
                {activeTreeFocusViewState}
                {onClose}
                {onResetAll}
                {onResetTree}
                {onFocusInView}
                onNavigate={navigateTo}
                onBack={navigateBack}
            />
        </div>
    {/if}

    {#if currentComponent}
        <div
            class="settings-page-panel incoming"
            class:active={!isTransitioning}
            role="region"
            aria-label={currentPage === "root" ? undefined : $t(`settings.pages.${currentPage}`)}
        >
            <svelte:component
                this={currentComponent}
                {activeTreeName}
                {activeTreeIndex}
                {activeTreeViewState}
                {activeTreeFocusViewState}
                {onClose}
                {onResetAll}
                {onResetTree}
                {onFocusInView}
                onNavigate={navigateTo}
                onBack={navigateBack}
            />
        </div>
    {/if}
</div>

<style>
    .settings-page-container {
        position: relative;
        overflow: hidden;
    }

    .settings-page-panel {
        display: grid;
        gap: var(--spacing-lg);
    }

    .settings-page-panel.active {
        position: relative;
    }

    /* --- Transition states --- */
    .settings-page-container.transitioning .settings-page-panel {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
    }

    /* Forward: outgoing slides left, incoming slides in from right */
    .settings-page-container.forward .incoming:not(.active) {
        animation: slide-in-right 0.15s ease forwards;
    }

    .settings-page-container.forward .outgoing {
        animation: slide-out-left 0.15s ease forwards;
    }

    /* Back: outgoing slides right, incoming slides in from left */
    .settings-page-container.back .incoming:not(.active) {
        animation: slide-in-left 0.15s ease forwards;
    }

    .settings-page-container.back .outgoing {
        animation: slide-out-right 0.15s ease forwards;
    }

    @keyframes slide-in-right {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slide-out-left {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-30%);
        }
    }

    @keyframes slide-in-left {
        from {
            transform: translateX(-30%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes slide-out-right {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(100%);
        }
    }
</style>
```

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: Some existing tests that check `SideMenuSettingsPage.svelte` for specific imports/patterns may fail. These will be fixed in Task 9.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuSettingsPage.svelte src/lib/SideMenu.svelte
git commit -m "feat: rewrite SideMenuSettingsPage as navigation shell with slide transitions"
```

---

## Chunk 4: Tests and Cleanup

### Task 9: Update existing tests for new file structure

**Files:**
- Modify: `test/uppercaseTextSetting.test.ts` — store import/toggle → `AppearanceSettingsPage.svelte`, resetToDefault → `GeneralSettingsPage.svelte`
- Modify: `test/nodePrimaryActionSetting.test.ts` — store import/segmented control → `NodeSettingsPage.svelte`
- Modify: `test/nodeLevelBehaviorSetting.test.ts` — store import/segmented control → `NodeSettingsPage.svelte`, resetToDefault → `GeneralSettingsPage.svelte`
- Modify: `test/showTierSetting.test.ts` — store import/toggle → `NodeSettingsPage.svelte`, resetToDefault → `GeneralSettingsPage.svelte`
- Modify: `test/treeZoomSetting.test.ts` — store import/zoom controls → `AppearanceSettingsPage.svelte`
- Modify: `test/sideMenuComposeScreenshotClose.test.ts` — ShareBuildButton wiring → `RootSettingsPage.svelte`

- [ ] **Step 1: Update each test file**

For each of the six test files listed above, change the `resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte")` path to the appropriate new file:

| Test file | Settings page assertions move to | resetToDefault assertions move to |
|-----------|----------------------------------|-----------------------------------|
| `uppercaseTextSetting.test.ts` | `AppearanceSettingsPage.svelte` | `GeneralSettingsPage.svelte` |
| `nodePrimaryActionSetting.test.ts` | `NodeSettingsPage.svelte` | `GeneralSettingsPage.svelte` (if present) |
| `nodeLevelBehaviorSetting.test.ts` | `NodeSettingsPage.svelte` | `GeneralSettingsPage.svelte` |
| `showTierSetting.test.ts` | `NodeSettingsPage.svelte` | `GeneralSettingsPage.svelte` |
| `treeZoomSetting.test.ts` | `AppearanceSettingsPage.svelte` | `AppearanceSettingsPage.svelte` (no resetToDefault check) |
| `sideMenuComposeScreenshotClose.test.ts` | `RootSettingsPage.svelte` | N/A |

For each test, replace the `settingsPagePath` variable and `settingsPageSource` reads to point to the new file. If a test checks both toggle/control bindings AND `resetToDefault()`, split into two file reads — one for the control page, one for `GeneralSettingsPage.svelte` where all `resetToDefault()` calls now live in `handleResetSettings()`.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add test/
git commit -m "test: update settings tests for new paged file structure"
```

### Task 10: Add settings paging test

**Files:**
- Create: `test/settingsPaging.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Create the test file**

Create `test/settingsPaging.test.ts`:

```typescript
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- All page files exist ---

const pageFiles = [
    "src/lib/sideMenuPages/SettingsPage.svelte",
    "src/lib/sideMenuPages/SettingsNavButton.svelte",
    "src/lib/sideMenuPages/RootSettingsPage.svelte",
    "src/lib/sideMenuPages/NodeSettingsPage.svelte",
    "src/lib/sideMenuPages/AppearanceSettingsPage.svelte",
    "src/lib/sideMenuPages/GeneralSettingsPage.svelte",
];

for (const file of pageFiles) {
    if (!existsSync(resolve(file))) {
        throw new Error(`${file} should exist.`);
    }
}

// --- SideMenuSettingsPage exports SettingsPageId type ---

const shellPath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const shellSource = readFileSync(shellPath, "utf8");

if (!/export type SettingsPageId/.test(shellSource)) {
    throw new Error("SideMenuSettingsPage should export SettingsPageId type.");
}

// --- Shell uses cache-variable lazy loading pattern ---

if (!/await import\("\.\/RootSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import RootSettingsPage.svelte.");
}

if (!/await import\("\.\/NodeSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import NodeSettingsPage.svelte.");
}

if (!/await import\("\.\/AppearanceSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import AppearanceSettingsPage.svelte.");
}

if (!/await import\("\.\/GeneralSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import GeneralSettingsPage.svelte.");
}

// --- RootSettingsPage has navigation buttons ---

const rootSource = readFileSync(
    resolve("src/lib/sideMenuPages/RootSettingsPage.svelte"),
    "utf8",
);

if (!/SettingsNavButton/.test(rootSource)) {
    throw new Error("RootSettingsPage should use SettingsNavButton components.");
}

if (!/data-page="node"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="node" for focus restoration.');
}

if (!/data-page="appearance"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="appearance" for focus restoration.');
}

if (!/data-page="general"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="general" for focus restoration.');
}

// --- SettingsPage base component ---

const baseSource = readFileSync(
    resolve("src/lib/sideMenuPages/SettingsPage.svelte"),
    "utf8",
);

if (!/slot name="dangerZone"/.test(baseSource)) {
    throw new Error("SettingsPage should have a dangerZone named slot.");
}

if (!/slot name="advancedSettings"/.test(baseSource)) {
    throw new Error("SettingsPage should have an advancedSettings named slot.");
}

if (!/onBack/.test(baseSource)) {
    throw new Error("SettingsPage should accept onBack prop.");
}

// --- GeneralSettingsPage has danger zone ---

const generalSource = readFileSync(
    resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte"),
    "utf8",
);

if (!/dangerZone/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use the dangerZone slot.");
}

if (!/settings\.dangerZone/.test(generalSource)) {
    throw new Error("GeneralSettingsPage should use the settings.dangerZone i18n key.");
}

// --- Locale keys exist ---

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

const requiredKeys = [
    "node",
    "nodeDescription",
    "appearance",
    "appearanceDescription",
    "general",
    "generalDescription",
    "backToSettings",
];

for (const localePath of localePaths) {
    const localeData = JSON.parse(readFileSync(localePath, "utf8"));
    const pages = localeData?.settings?.pages;
    if (!pages) {
        throw new Error(`${localePath}: settings.pages section is required.`);
    }
    for (const key of requiredKeys) {
        if (!pages[key]) {
            throw new Error(
                `${localePath}: settings.pages.${key} translation is required.`,
            );
        }
    }
    if (!localeData?.settings?.dangerZone) {
        throw new Error(`${localePath}: settings.dangerZone translation is required.`);
    }
    if (!localeData?.settings?.advanced) {
        throw new Error(`${localePath}: settings.advanced translation is required.`);
    }
}

// --- SideMenu passes scrollContentElement ---

const sideMenuSource = readFileSync(
    resolve("src/lib/SideMenu.svelte"),
    "utf8",
);

if (!/\{scrollContentElement\}/.test(sideMenuSource)) {
    throw new Error("SideMenu should pass scrollContentElement to SideMenuSettingsPage.");
}
```

- [ ] **Step 2: Register test in index.ts**

In `test/index.ts`, add `"settingsPaging.test.ts"` to the `TEST_FILES` array, in the "UI & Interaction" section (after `"uppercaseTextSetting.test.ts"`):

```typescript
"settingsPaging.test.ts",
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add test/settingsPaging.test.ts test/index.ts
git commit -m "test: add settings paging structure and integration test"
```

### Task 11: Visual verification and type check

- [ ] **Step 1: Run full type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`

Manual verification checklist:
1. Open side menu → Settings tab shows root page with Build, Tree, and 3 nav buttons
2. Click "Node" → slides in from right with Node settings, back button at top
3. Click back → slides back to root, focus returns to "Node" nav button
4. Click "Appearance" → shows theme, zoom, colorblind, uppercase, text size
5. Click "General" → shows language, haptics, fullscreen, install, reload, danger zone at bottom
6. Reset Settings → opens confirm modal, resets all settings, closes side menu
7. Clear All Data → opens confirm modal, clears data, reloads
8. Close side menu, reopen → same page shown, scroll preserved
9. All transitions smooth, no flicker
10. Test with light mode, dark mode, different text sizes

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address visual verification feedback for settings paging"
```

(Skip this step if no fixes were needed.)
