# Settings Description/Subtitle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline description text below labels on all settings controls, replacing redundant tooltips.

**Architecture:** Add an optional `description` prop to 4 core components (ToggleSwitch, SegmentedControl, SliderSetting, Button), update 3 wrapper components to pass through the prop, add i18n keys for descriptions in all 3 locales, and update all settings page callers to use descriptions instead of tooltips.

**Tech Stack:** Svelte 5, TypeScript, svelte-whisper (i18n)

---

## Chunk 1: Core Components and i18n

### Task 1: Add `description` prop to ToggleSwitch

**Files:**
- Modify: `src/lib/ToggleSwitch.svelte`

- [ ] **Step 1: Add description prop and render it**

In `src/lib/ToggleSwitch.svelte`, add the prop and description element:

```svelte
<!-- In <script> block, after line 6 (tooltipText) -->
export let description: string | undefined = undefined;
```

Wrap the label in a container div and add the description span below it. Replace lines 36-38:

```svelte
{#if label || description}
    <div class="toggle-row__label-group">
        {#if label}
            <span class="toggle-row__label">{label}</span>
        {/if}
        {#if description}
            <span class="toggle-row__description">{description}</span>
        {/if}
    </div>
{/if}
```

Add CSS for the new elements (append before closing `</style>`):

```css
.toggle-row__label-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.toggle-row__description {
    font-size: var(--font-sm);
    color: var(--text-disabled);
    line-height: var(--leading);
    white-space: normal;
    overflow-wrap: anywhere;
    user-select: none;
}
```

Remove the standalone `.toggle-row__label` styles for `flex: 1; min-width: 0;` since those now live on `.toggle-row__label-group`. The `.toggle-row__label` style block becomes:

```css
.toggle-row__label {
    white-space: normal;
    overflow-wrap: anywhere;
    user-select: none;
}
```

- [ ] **Step 2: Run type check**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to ToggleSwitch

- [ ] **Step 3: Commit**

```bash
git add src/lib/ToggleSwitch.svelte
git commit -m "feat(ToggleSwitch): add optional description prop below label"
```

---

### Task 2: Add `description` prop to SegmentedControl

**Files:**
- Modify: `src/lib/SegmentedControl.svelte`

- [ ] **Step 1: Add description prop and render it**

In `src/lib/SegmentedControl.svelte`, add the prop after line 18 (`tooltipText`):

```svelte
export let description: string | undefined = undefined;
```

In the header section (lines 58-65), wrap the label in a group and add description. Replace lines 57-66:

```svelte
{#if label}
    <div class="segmented-control__header">
        {#if icon}
            <span class="segmented-control__header-icon" aria-hidden="true">
                <svelte:component this={icon} class={iconClass} size={26} />
            </span>
        {/if}
        <div class="segmented-control__header-label-group">
            <span class="segmented-control__header-label">{label}</span>
            {#if description}
                <span class="segmented-control__header-description">{description}</span>
            {/if}
        </div>
    </div>
{/if}
```

Add CSS for the new elements (append before closing `</style>`):

```css
.segmented-control__header-label-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.segmented-control__header-description {
    font-size: var(--font-sm);
    color: var(--text-disabled);
    line-height: var(--leading);
    white-space: normal;
    overflow-wrap: anywhere;
    user-select: none;
}
```

Update `.segmented-control__header-label` to remove `flex: 1; min-width: 0;` (those are now on the group):

```css
.segmented-control__header-label {
    font-size: var(--font-base);
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: var(--leading);
    user-select: none;
}
```

- [ ] **Step 2: Run type check**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to SegmentedControl

- [ ] **Step 3: Commit**

```bash
git add src/lib/SegmentedControl.svelte
git commit -m "feat(SegmentedControl): add optional description prop in header"
```

---

### Task 3: Add `description` prop to SliderSetting

**Files:**
- Modify: `src/lib/SliderSetting.svelte`

- [ ] **Step 1: Add description prop and render it**

In `src/lib/SliderSetting.svelte`, add the prop after line 20 (`tooltipText`):

```svelte
export let description: string | undefined = undefined;
```

In the header section (lines 124-136), wrap the label in a group and add description. Replace lines 124-136:

```svelte
{#if label || icon}
    <div class="slider-setting__header">
        {#if icon}
            <span class="slider-setting__header-icon" aria-hidden="true">
                <svelte:component this={icon} class={iconClass} size={26} />
            </span>
        {/if}
        {#if label}
            <div class="slider-setting__header-label-group">
                <span class="slider-setting__header-label">{label}</span>
                {#if description}
                    <span class="slider-setting__header-description">{description}</span>
                {/if}
            </div>
        {/if}
        <span class="slider-setting__value">{valueLabel}</span>
    </div>
{/if}
```

Add CSS for the new elements (append before closing `</style>`):

```css
.slider-setting__header-label-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.slider-setting__header-description {
    font-size: var(--font-sm);
    color: var(--text-disabled);
    line-height: var(--leading);
    white-space: normal;
    overflow-wrap: anywhere;
    user-select: none;
}
```

Update `.slider-setting__header-label` to remove `flex: 1`:

```css
.slider-setting__header-label {
    font-size: var(--font-base);
    letter-spacing: var(--tracking);
    color: var(--text-muted);
}
```

- [ ] **Step 2: Run type check**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to SliderSetting

- [ ] **Step 3: Commit**

```bash
git add src/lib/SliderSetting.svelte
git commit -m "feat(SliderSetting): add optional description prop in header"
```

---

### Task 4: Add `description` prop to Button

**Files:**
- Modify: `src/lib/Button.svelte`

- [ ] **Step 1: Add description prop and render it**

In `src/lib/Button.svelte`, add the prop after line 34 (`arrow`):

```svelte
export let description: string | undefined = undefined;
```

Replace lines 122-124 (the button-text span with slot):

```svelte
{#if description}
    <span class="button-text-group">
        <span class="button-text">
            <slot />
        </span>
        <span class="button-description">{description}</span>
    </span>
{:else}
    <span class="button-text">
        <slot />
    </span>
{/if}
```

Add CSS for the new elements (append before closing `</style>`):

```css
.button-text-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
    line-height: var(--leading);
}

.button-description {
    font-size: var(--font-sm);
    color: var(--text-disabled);
    line-height: var(--leading);
    white-space: normal;
    overflow-wrap: anywhere;
}
```

Update the `.button.with-arrow .button-text` rule (lines 177-182) to also apply to `.button-text-group`:

```css
.button.with-arrow .button-text,
.button.with-arrow .button-text-group {
    flex: 1;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
}
```

- [ ] **Step 2: Run type check**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors related to Button

- [ ] **Step 3: Commit**

```bash
git add src/lib/Button.svelte
git commit -m "feat(Button): add optional description prop inside button"
```

---

### Task 5: Add i18n description keys to all locale files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: Add English description keys**

In `src/locales/en.json`, add the following keys as a block inside the `"settings"` object (e.g. before the `"pages"` sub-object):

```json
"nodePrimaryActionDescription": "Increment per tap on a node",
"nodeLevelBehaviorDescription": "Level one node or its full lineage",
"showTierDescription": "Badge overlay on each node",
"showSkillNameDescription": "Name label overlay on each node",
"showLevelSplashDescription": "Brief animation when leveling nodes",
"textSizeDescription": "Scale for labels and UI text",
"treeZoomDescription": "Overall tree size in the viewport",
"uppercaseTextDescription": "Capitalize all interface text",
"colorblindTreeColorsDescription": "Adjusted region colors for color vision deficiencies",
"focusTreeInViewDescription": "Reset zoom and pan to fit",
"languageDescription": "Application display language",
"hapticsDescription": "Vibration on supported devices",
"reloadWindowDescription": "Refresh and load latest version",
"resetSettingsDescription": "Restore defaults without affecting progress",
"clearAllDataDescription": "Erase everything and reload"
```

- [ ] **Step 2: Add Japanese description keys**

In `src/locales/ja.json`, add inside the `"settings"` object:

```json
"nodePrimaryActionDescription": "ノードをタップした時の増加量",
"nodeLevelBehaviorDescription": "1つのノードか系統全体を上げる",
"showTierDescription": "各ノードにバッジを重ねて表示",
"showSkillNameDescription": "各ノードに名前ラベルを重ねて表示",
"showLevelSplashDescription": "ノードレベル変更時の短いアニメーション",
"textSizeDescription": "ラベルとUI文字の拡大縮小",
"treeZoomDescription": "ビューポート内のツリー全体サイズ",
"uppercaseTextDescription": "すべてのインターフェーステキストを大文字化",
"colorblindTreeColorsDescription": "色覚特性に合わせた色の調整",
"focusTreeInViewDescription": "ズームとパンをリセットして収める",
"languageDescription": "アプリケーションの表示言語",
"hapticsDescription": "対応デバイスでの振動",
"reloadWindowDescription": "最新バージョンを更新して読み込む",
"resetSettingsDescription": "進行状況を保持してデフォルトに戻す",
"clearAllDataDescription": "すべて消去して再読み込み"
```

- [ ] **Step 3: Add Chinese description keys**

In `src/locales/zh.json`, add inside the `"settings"` object:

```json
"nodePrimaryActionDescription": "点击节点时的增量",
"nodeLevelBehaviorDescription": "单独升级一个节点或整条谱系",
"showTierDescription": "在每个节点上叠加显示徽章",
"showSkillNameDescription": "在每个节点上叠加显示名称标签",
"showLevelSplashDescription": "节点升级时的短暂动画",
"textSizeDescription": "标签和界面文字的缩放",
"treeZoomDescription": "视口中技能树的整体大小",
"uppercaseTextDescription": "将所有界面文本大写显示",
"colorblindTreeColorsDescription": "为色觉障碍调整区域颜色",
"focusTreeInViewDescription": "重置缩放和平移以适应视图",
"languageDescription": "应用程序显示语言",
"hapticsDescription": "支持设备上的振动",
"reloadWindowDescription": "刷新并加载最新版本",
"resetSettingsDescription": "恢复默认设置，不影响进度",
"clearAllDataDescription": "清除所有数据并重新加载"
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en OK')" && node -e "JSON.parse(require('fs').readFileSync('src/locales/ja.json','utf8')); console.log('ja OK')" && node -e "JSON.parse(require('fs').readFileSync('src/locales/zh.json','utf8')); console.log('zh OK')"`
Expected: `en OK`, `ja OK`, `zh OK`

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/ja.json src/locales/zh.json
git commit -m "feat(i18n): add description keys for settings controls in all locales"
```

---

## Chunk 2: Wrapper Components, Settings Page Callers, and Verification

### Task 6: Update wrapper components to pass through `description`

**Files:**
- Modify: `src/lib/TextSizeSliderSetting.svelte`
- Modify: `src/lib/buttons/FocusInViewButton.svelte`
- Modify: `src/lib/buttons/LanguageDropdown.svelte`

- [ ] **Step 1: Update TextSizeSliderSetting**

In `src/lib/TextSizeSliderSetting.svelte`, replace line 38 (the `tooltipText` prop) with `description`:

```svelte
    description={$t("settings.textSizeDescription")}
```

Remove the `tooltipText={$t("settings.textSizeTooltip")}` line entirely.

- [ ] **Step 2: Update FocusInViewButton**

In `src/lib/buttons/FocusInViewButton.svelte`, replace line 33 (`tooltipText`) with `description`:

```svelte
    description={$t("settings.focusTreeInViewDescription")}
```

Remove the `tooltipText={$t("settings.focusTreeInViewTooltip")}` line entirely.

- [ ] **Step 3: Update LanguageDropdown**

In `src/lib/buttons/LanguageDropdown.svelte`, replace line 67 (`tooltipText`) with `description`:

```svelte
        description={$t("settings.languageDescription")}
```

Remove the `tooltipText={$t("settings.languageTooltip")}` line entirely.

- [ ] **Step 4: Run type check**

Run: `npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/TextSizeSliderSetting.svelte src/lib/buttons/FocusInViewButton.svelte src/lib/buttons/LanguageDropdown.svelte
git commit -m "feat: update wrapper components to use description instead of tooltip"
```

---

### Task 7: Update NodeSettingsPage callers

**Files:**
- Modify: `src/lib/sideMenuPages/NodeSettingsPage.svelte`

- [ ] **Step 1: Replace tooltips with descriptions**

In `src/lib/sideMenuPages/NodeSettingsPage.svelte`:

Line 87 — replace `tooltipText={$t("settings.nodePrimaryActionTooltip")}` with:
```svelte
            description={$t("settings.nodePrimaryActionDescription")}
```

Line 96 — replace `tooltipText={$t("settings.nodeLevelBehaviorTooltip")}` with:
```svelte
            description={$t("settings.nodeLevelBehaviorDescription")}
```

Line 105 — replace `tooltipText={$t("settings.showSkillNameTooltip")}` with:
```svelte
            description={$t("settings.showSkillNameDescription")}
```

Line 113 — replace `tooltipText={$t("settings.showTierTooltip")}` with:
```svelte
            description={$t("settings.showTierDescription")}
```

Line 121 — replace `tooltipText={$t("settings.showLevelSplashTooltip")}` with:
```svelte
            description={$t("settings.showLevelSplashDescription")}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sideMenuPages/NodeSettingsPage.svelte
git commit -m "feat(NodeSettingsPage): use descriptions instead of tooltips"
```

---

### Task 8: Update AppearanceSettingsPage callers

**Files:**
- Modify: `src/lib/sideMenuPages/AppearanceSettingsPage.svelte`

- [ ] **Step 1: Replace tooltips with descriptions**

In `src/lib/sideMenuPages/AppearanceSettingsPage.svelte`:

Line 95 — replace `tooltipText={$t("settings.uppercaseTextTooltip")}` with:
```svelte
            description={$t("settings.uppercaseTextDescription")}
```

Line 110 — replace `tooltipText={$t("settings.treeZoomTooltip")}` with:
```svelte
            description={$t("settings.treeZoomDescription")}
```

Line 116 — replace `tooltipText={$t("settings.colorblindTreeColorsTooltip")}` with:
```svelte
            description={$t("settings.colorblindTreeColorsDescription")}
```

Note: `TextSizeSliderSetting` on line 99 was already updated in Task 6.

- [ ] **Step 2: Commit**

```bash
git add src/lib/sideMenuPages/AppearanceSettingsPage.svelte
git commit -m "feat(AppearanceSettingsPage): use descriptions instead of tooltips"
```

---

### Task 9: Update GeneralSettingsPage callers

**Files:**
- Modify: `src/lib/sideMenuPages/GeneralSettingsPage.svelte`

- [ ] **Step 1: Replace tooltips with descriptions**

In `src/lib/sideMenuPages/GeneralSettingsPage.svelte`:

Note: `LanguageDropdown` on line 109 was already updated in Task 6.

Line 114 — replace `tooltipText={$t("settings.hapticsTooltip")}` with:
```svelte
            description={$t("settings.hapticsDescription")}
```

Line 125 — replace `tooltipText={$t("settings.reloadWindowTooltip")}` with:
```svelte
            description={$t("settings.reloadWindowDescription")}
```

Line 139 — replace `tooltipText={$t("settings.resetSettingsTooltip")}` with:
```svelte
            description={$t("settings.resetSettingsDescription")}
```

Line 148 — replace `tooltipText={$t("settings.clearAllDataTooltip")}` with:
```svelte
            description={$t("settings.clearAllDataDescription")}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sideMenuPages/GeneralSettingsPage.svelte
git commit -m "feat(GeneralSettingsPage): use descriptions instead of tooltips"
```

---

### Task 10: Run full test suite and verify

- [ ] **Step 1: Run type checks**

Run: `npx svelte-check --threshold error`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`
Open the app, navigate to each settings page (Node, Appearance, General), and verify:
- All descriptions appear below labels
- No tooltips show on controls that now have descriptions
- Excluded controls (Preset, Tech Crystals, Preview, Theme mode/color, Fullscreen, Install PWA) are unchanged
- Descriptions fit within the side menu width
- Button descriptions appear inside the button

- [ ] **Step 4: Final commit if any fixes needed**

Only if visual verification reveals issues that need fixing.
