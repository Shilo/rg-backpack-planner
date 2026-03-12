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

### Reactivity

Add `initUppercaseTextReactivity()` to `src/lib/themeApply.ts`:

- Subscribes to `uppercaseText` store
- Adds/removes the `uppercase-text` class on `document.documentElement`
- Called once at app startup alongside `initThemeReactivity()`
- Returns an unsubscribe function

### Settings UI

In `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`, "Look and Feel" section:

- Add a `ToggleSwitch` for `uppercaseText`, placed above the `colorblindTreeColors` toggle
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

**Inconsistent setting/control labels → Sentence case:**

| Key | Before | After |
|---|---|---|
| `settings.textSize` | `Font Size` | `Font size` |
| `settings.treeZoom` | `Tree Zoom` | `Tree zoom` |
| `settings.nodeLevelBehavior` | `Node Level Behavior` | `Node level behavior` |
| `settings.focusTreeInViewLower` | `Focus tree in view` | *(already correct — used as lowercase variant)* |

**Button labels that are Title Case** (already correct or need verification):

| Key | Value | Status |
|---|---|---|
| `settings.focusTreeInView` | `Focus Tree in View` | ✓ Title Case |
| `settings.reloadWindow` | `Reload Window` | ✓ Title Case |
| `settings.resetSettings` | `Reset Settings` | ✓ Title Case |
| `settings.clearAllData` | `Clear All Data` | ✓ Title Case |
| `modal.resetTree.confirmLabel` | `Reset {treeLabel}` | ✓ Title Case |
| `modal.resetTree.buttonLabel` | `Reset {treeName}` | ✓ Title Case |
| `modal.resetTree.buttonLabelAll` | `Reset all trees` | → `Reset All Trees` |
| `modal.resetTree.buttonLabelDefault` | `Reset tree` | → `Reset Tree` |
| `modal.resetTree.confirmLabelDefault` | `Reset` | ✓ Title Case |

### Changes in `ja.json`

Japanese has no uppercase/lowercase distinction. Changes are limited to:

- Punctuation consistency: use full-width parentheses `（）` where the string uses `()` inconsistently
- Verify spacing around interpolation variables (`{subject}`, `{name}`, etc.) is consistent with surrounding Japanese text

### Changes in `zh.json`

Same approach as `ja.json` — no casing changes. Verify:

- Punctuation consistency (`（）` vs `()`)
- Spacing around interpolation variables

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/uppercaseTextStore.ts` | New file |
| `src/lib/themeApply.ts` | Add `initUppercaseTextReactivity()` |
| `src/app.css` | Scope uppercase rule to `.uppercase-text` class |
| `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` | Add toggle, import store, include in reset |
| `src/locales/en.json` | Casing cleanup throughout |
| `src/locales/ja.json` | Punctuation consistency |
| `src/locales/zh.json` | Punctuation consistency |

---

## Out of Scope

- No changes to `captureStyles.css` or screenshot export paths
- No changes to game data / tree config files
- No backwards-compatibility shims for the new localStorage key
