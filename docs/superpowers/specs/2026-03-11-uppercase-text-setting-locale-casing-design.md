# Design: Uppercase Text Setting & Locale Casing Cleanup

**Date:** 2026-03-11
**Status:** Approved

---

## Overview

Two related changes:

1. **Uppercase Text setting** — make the global `text-transform: uppercase` CSS a user-controlled toggle (default on), stored as a persistent setting.
2. **Locale casing cleanup** — audit all three locale files (`en`, `ja`, `zh`) and apply standard UI casing conventions consistently throughout.

---

## 1. Uppercase Text Setting

### Store

New file: `src/lib/uppercaseTextStore.ts`

- Boolean store, default `true`
- localStorage key: `"uppercase-text"`
- Same shape as `colorblindTreeColorsStore`: exposes `subscribe`, `set(value: boolean)`, `resetToDefault()`

### CSS

In `src/app.css`, change:

```css
* {
    text-transform: uppercase;
}
```

to:

```css
.uppercase-text * {
    text-transform: uppercase;
}
```

The `.uppercase-text` class is applied to `document.documentElement` (`<html>`).

**Component-level `text-transform: uppercase` declarations must all be removed.** They are redundant when uppercase is on (global rule covers them) but would break the toggle when uppercase is off by forcing uppercase regardless of the user's preference. Remove the following (14 declarations across 13 files):

| File | Line(s) |
|---|---|
| `src/lib/AppTitleDisplay.svelte` | 65 |
| `src/lib/ColorPickerDialog.svelte` | 559, 575 |
| `src/lib/ContextMenu.svelte` | 392 |
| `src/lib/PreviewBuildIndicator.svelte` | 120 |
| `src/lib/SliderSetting.svelte` | 221 |
| `src/lib/SideMenuSection.svelte` | 34 |
| `src/lib/TabBar.svelte` | 121 |
| `src/lib/TreeContextMenuList.svelte` | 256, 369 |
| `src/lib/TreeTabs.svelte` | 678 |
| `src/lib/buttons/PreviewBuildsDropdown.svelte` | 142 |
| `src/lib/modals/InputModal.svelte` | 252 |
| `src/lib/modals/LoadBuildModal.svelte` | 230 |

**`text-transform: none` overrides stay as-is.** `FabMenu.svelte` (line 79) and `LoadBuildModal.svelte` (line 249) intentionally suppress uppercase for specific elements. When uppercase is on, these correctly override the global rule. When uppercase is off, they are redundant but harmless. Do not remove them.

**Screenshot behavior:** The capture pipeline adds a class to `document.documentElement` during snapdom capture. Since snapdom captures the live DOM, the `.uppercase-text` class will be present or absent on `<html>` depending on the user's toggle, and the scoped CSS rule `.uppercase-text * { text-transform: uppercase }` is included in the capture accordingly. Screenshots therefore respect the user's uppercase setting automatically. This is intentional — no changes to `captureStyles.css` are needed.

### Reactivity

Add `initUppercaseTextReactivity()` to `src/lib/themeApply.ts`:

- **Applies the class synchronously on call** (before the subscription fires) to avoid a first-frame flash, following the same pattern as `initThemeReactivity()` which calls `apply()` immediately before subscribing
- Subscribes to `uppercaseText` store; adds `uppercase-text` class when `true`, removes it when `false`
- Returns an unsubscribe cleanup function

In `src/main.ts`, wire it up alongside `initThemeReactivity()` — call it **before `mount`** at the same location:

```typescript
const cleanupUppercaseText = initUppercaseTextReactivity();
```

And include it in the HMR dispose block:

```typescript
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unsubLocale();
        cleanupThemeReactivity();
        cleanupUppercaseText();          // add this line
        removeGlobalContextMenuListener();
        cleanupServiceWorkerAutoUpdate();
    });
}
```

### Settings UI

In `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`, "Look and Feel" section:

- Add a `ToggleSwitch` for `uppercaseText`, placed above the `colorblindTreeColors` toggle
- No `icon` prop (consistent with all other `ToggleSwitch` instances in this file)
- Label: `$t("settings.uppercaseText")`
- Tooltip: `$t("settings.uppercaseTextTooltip")`
- `handleResetSettings` includes `uppercaseText.resetToDefault()`

### i18n Keys (all three locales)

```
settings.uppercaseText
settings.uppercaseTextTooltip
```

English values:
- `uppercaseText`: `"Uppercase text"`
- `uppercaseTextTooltip`: `"Display all text in uppercase"`

Japanese and Chinese translations should follow the same patterns used for neighboring settings keys.

---

## 2. Locale Casing Cleanup

### Casing Rules

| Context | Rule |
|---|---|
| Modal / dialog titles | Title Case |
| Section headers | Title Case |
| Tab / navigation labels | Title Case |
| Button text | Title Case |
| Menu items | Title Case |
| Toggle / setting labels | Sentence case |
| Slider / segmented control labels | Sentence case |
| Tooltips | Sentence case |
| Toast messages | Sentence case |
| Descriptions / paragraph text | Sentence case |
| Form field labels | Sentence case |

### Changes in `en.json`

**Hardcoded ALL CAPS modal titles → Title Case:**

| Key | Before | After |
|---|---|---|
| `techCrystals.ownedModalTitle` | `TECH CRYSTALS OWNED` | `Tech Crystals Owned` |
| `techCrystals.ownedModalTitleWithSubject` | `TECH CRYSTALS OWNED ({subject})` | `Tech Crystals Owned ({subject})` |
| `preview.cloneModalTitle` | `CLONE PREVIEW BUILD` | `Clone Preview Build` |
| `preview.loadModalTitle` | `PREVIEW SHAREABLE BUILD` | `Preview Shareable Build` |
| `modal.loadBuild.title` | `Preview shareable build` | `Preview Shareable Build` |
| `modal.resetTree.title` | `RESET {treeName}` | `Reset {treeName}` |
| `modal.resetTree.titleQuestion` | `RESET {treeName}?` | `Reset {treeName}?` |
| `modal.resetTree.titleAllQuestion` | `RESET ALL TREES?` | `Reset All Trees?` |
| `modal.resetTree.titleDefault` | `RESET TREE` | `Reset Tree` |
| `modal.resetTree.titleDefaultQuestion` | `RESET TREE?` | `Reset Tree?` |
| `modal.resetSettings.title` | `RESET SETTINGS` | `Reset Settings` |
| `modal.clearAllData.title` | `CLEAR ALL DATA` | `Clear All Data` |

Note: `preview.loadModalTitle` and `modal.loadBuild.title` are both used but rendered in different locations (preview flow vs. modal host). The duplication is intentional; both are updated to the same value.

**Inconsistent setting/control labels → Sentence case:**

| Key | Before | After |
|---|---|---|
| `settings.textSize` | `Font Size` | `Font size` |
| `settings.treeZoom` | `Tree Zoom` | `Tree zoom` |
| `settings.nodeLevelBehavior` | `Node Level Behavior` | `Node level behavior` |

**Button labels → Title Case (corrections needed):**

| Key | Before | After |
|---|---|---|
| `modal.resetTree.buttonLabelAll` | `Reset all trees` | `Reset All Trees` |
| `modal.resetTree.buttonLabelDefault` | `Reset tree` | `Reset Tree` |

**Already correct (no change):**

| Key | Value | Note |
|---|---|---|
| `settings.focusTreeInView` | `Focus Tree in View` | Button label ✓ |
| `settings.focusTreeInViewLower` | `Focus tree in view` | Used in HUD button where lowercase rendering is intentional; excluded from button Title Case rule |
| `settings.reloadWindow` | `Reload Window` | Button label ✓ |
| `settings.resetSettings` | `Reset Settings` | Button label ✓ |
| `settings.clearAllData` | `Clear All Data` | Button label ✓ |
| `modal.resetTree.confirmLabel` | `Reset {treeLabel}` | Button label ✓ |
| `modal.resetTree.buttonLabel` | `Reset {treeName}` | Button label ✓ — `{treeName}` is a proper noun supplied at runtime; the static word "Reset" is already Title Case |
| `modal.resetTree.confirmLabelDefault` | `Reset` | Button label ✓ |

### Changes in `ja.json` and `zh.json`

No casing changes (not applicable). No punctuation inconsistencies found — both files already use full-width parentheses `（）` consistently throughout.

The only changes to these files are adding the two new i18n keys for the uppercase text setting (`settings.uppercaseText`, `settings.uppercaseTextTooltip`).

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/uppercaseTextStore.ts` | New file |
| `src/lib/themeApply.ts` | Add `initUppercaseTextReactivity()` |
| `src/main.ts` | Store cleanup return value; add to HMR dispose block |
| `src/app.css` | Scope uppercase rule to `.uppercase-text` class |
| `src/lib/AppTitleDisplay.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/ColorPickerDialog.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/ContextMenu.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/PreviewBuildIndicator.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/SliderSetting.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/SideMenuSection.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/TabBar.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/TreeContextMenuList.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/TreeTabs.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/buttons/PreviewBuildsDropdown.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/modals/InputModal.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/modals/LoadBuildModal.svelte` | Remove redundant `text-transform: uppercase` |
| `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` | Add toggle, import store, include in reset |
| `src/locales/en.json` | Casing cleanup + new i18n keys |
| `src/locales/ja.json` | New i18n keys only |
| `src/locales/zh.json` | New i18n keys only |

---

## Out of Scope

- No changes to `captureStyles.css`
- No changes to game data / tree config files
- No backwards-compatibility shims for the new localStorage key
