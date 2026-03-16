# Audit: Multi-feature implementation changes

This document reviews all changes from the multi-feature plan (version migration, controls instructions, action sheet, unified reset, onboarding transitions, arrow keys, preview icons, Escape priority, TreeContextMenu mobile, RootNodeQuickSettings positioning).

---

## 1. Version migration

| File | Change |
|------|--------|
| `src/lib/migrations/runMigrations.ts` | **Added.** Sync runner: reads `getStoredVersion()` / `getCurrentVersion()`, runs migrations where `toVersion === current`, does **not** call `markVersionAsSeen()` so App.svelte can still show the "updated" toast. |
| `src/main.ts` | Import and call `runMigrations()` as first executable step; comment references `docs/version-migration-early-run.md`. |

**Review:** Aligns with `docs/version-migration-early-run.md`. Migrations run before theme, i18n, mount. No `markVersionAsSeen()` in runner avoids regression with `shouldShowUpdatedToast` in App.svelte.

---

## 2. Controls: Root node → Quick Settings

| File | Change |
|------|--------|
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Import `RootNodeIcon`; new HUD row "Root (Gear)" with `hudRootQuickSettingsLabel` / `hudRootQuickSettingsDescription`. |
| `src/locales/en.json`, `ja.json`, `zh.json` | Added `hudRootQuickSettingsLabel`, `hudRootQuickSettingsDescription`. |

**Review:** Matches plan. Single source for icons and copy.

---

## 3. Generic action sheet

| File | Change |
|------|--------|
| `src/lib/actionSheetTypes.ts` | **Added.** `ActionSheetChoiceTone`, `ActionSheetChoice`. |
| `src/lib/ActionSheet.svelte` | **Added.** Generic sheet: title, message, sheetIcon, choices, cancelLabel, onConfirm(id), onCancel, optional getChoiceIcon. Uses `data-modal-choice` / `data-modal-cancel` for ModalHost. |
| `src/lib/modals/ResetTreeChoicesModal.svelte` | Refactored to thin wrapper: maps `ResetTreeChoiceConfig[]` to `ActionSheetChoice[]`, renders `<ActionSheet>`. |

**Review:** ResetTreeChoicesModal remains the modal type in ModalHost; no change to modalStore or ModalHost contract. Action sheet is reusable.

---

## 4. Unify tree reset; remove old modal

| File | Change |
|------|--------|
| `src/lib/resetTreeModal.ts` | Removed `openResetTreeModal` and its `openConfirmModal` usage. Kept `openResetTreeChoicesModal`; import `TranslateFn` from modalUtil. |
| `src/lib/buttons/ResetTreeButton.svelte` | Opens choices modal via `openResetTreeChoicesModal`; added props `treeNodes`, `treeId`, `onResetBranch`; uses `getTreeIcon(treeId)`. |
| `src/lib/TreeContextMenu.svelte` | Added `onResetBranch`; pass to list; pass `touchAnchorAbove={true}` to ContextMenu. |
| `src/lib/TreeContextMenuList.svelte` | Added `onResetBranch`; pass `treeNodes`, `treeId`, `onResetBranch` to ResetTreeButton. |
| `src/lib/TreeTabs.svelte` | `openResetModalForActiveTab` → `openResetChoicesForActiveTab` (opens choices modal); pass `onResetBranch` to TreeContextMenu. |
| `src/lib/sideMenuPages/RootSettingsPage.svelte` | Added `onResetBranch`, `activeTreeNodes`, `activeTreeId`; pass to ResetTreeButton. |
| `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` | Added `onResetBranch`, `activeTreeNodes`, `activeTreeId`; pass to current/outgoing page components. |
| `src/lib/SideMenu.svelte` | Added `onResetBranch`, `activeTreeNodes`, `activeTreeId`; pass to SideMenuSettingsPage. |
| `src/App.svelte` | Pass `onResetBranch`, `activeTreeNodes`, `activeTreeId` to SideMenu. |
| `src/locales/en.json`, `ja.json`, `zh.json` | Removed unused: `modal.resetTree.message`, `confirmLabel`, `confirmLabelDefault`. |

**Review:** All reset entry points use the same action sheet. No leftover references to `openResetTreeModal`. Locale cleanup is correct.

---

## 5. Onboarding step transitions

| File | Change |
|------|--------|
| `src/lib/onboarding/OnboardingOverlay.svelte` | Import `fly` from svelte/transition; `prefersReducedMotion` + `stepTransitionDuration` / `stepTransitionY`; wrap pane in div with `in:fly` / `out:fly`; `.onboarding-pane-wrap` styles. |

**Review:** Step change is animated; reduced-motion respected (duration 0, y 0). `prefersReducedMotion` is read at component init (client-only); safe for this PWA.

---

## 6. Arrow keys for side menu tabs

| File | Change |
|------|--------|
| `src/lib/SideMenu.svelte` | `handleTabKeydown`: handle `ArrowLeft` / `ArrowRight` like Shift+Tab / Tab (same guards). |
| `src/locales/en.json`, `ja.json`, `zh.json` | Updated `keyboardCycleTabsLabel` / `keyboardCycleTabsDescription` to mention Tab and Left/Right arrows. |

**Review:** Behavior and copy consistent with plan.

---

## 7. Preview builds icons

| File | Change |
|------|--------|
| `src/lib/customIcons.ts` | Added phosphor imports (Knife, Spiral, Sun, Sword, Shield); `premadeBuildIcons` map: Late PvE = SwordIcon, Late PvP = ShieldIcon. |
| `src/lib/buttons/PreviewBuildsDropdown.svelte` | Import `premadeBuildIcons` from customIcons; removed local icon map; kept `LinkIcon`, `ShareNetworkIcon` for fallback. |

**Review:** Icons centralized; swap applied.

---

## 8. Escape closes RootNodeQuickSettings first

| File | Change |
|------|--------|
| `src/lib/RootNodeQuickSettings.svelte` | When `isOpen`: add window `keydown` listener (capture); on Escape call `onClose()`, `preventDefault()`, `stopImmediatePropagation()`; cleanup on close and onDestroy. |

**Review:** Capture runs before App’s Escape handler; no App change required.

---

## 9. TreeContextMenu position on mobile

| File | Change |
|------|--------|
| `src/lib/ContextMenu.svelte` | New prop `touchAnchorAbove`; when true and coarse pointer, position menu above touch (bottom at `y - TOUCH_OFFSET_Y`), transform origin `translate(-50%, -100%)`; drag handle uses bottom of menu when touchAnchorAbove. |
| `src/lib/TreeContextMenu.svelte` | Pass `touchAnchorAbove={true}`. |

**Review:** Menu appears above finger on touch; desktop unchanged.

---

## 10. RootNodeQuickSettings position relative to RootNode

| File | Change |
|------|--------|
| `src/lib/RootNode.svelte` | `onRootNodeClick(r.left + r.width/2, r.top)` — pass center X and root top. |
| `src/lib/TreeTabs.svelte` | `ROOT_QUICK_SETTINGS_PAD = 8`; `openRootQuickSettings(centerX, rootTop)` sets `quickSettings = { x: centerX, y: rootTop - 8 }`. |
| `src/lib/RootNodeQuickSettings.svelte` | Position panel so bottom at `y`: `displayY = y - rect.height`; center x; clamp to viewport. Removed OFFSET_Y / TOUCH_EXTRA_OFFSET_Y. |

**Review:** Panel sits above root with 8px gap; semantics match NodeContentMenu-style anchoring.

---

## Removed / test changes

| Item | Change |
|------|--------|
| `test/rootNodeQuickSettingsTouchOffset.test.ts` | **Deleted** — asserted old touch-offset behavior; replaced by root-relative positioning. |
| `test/index.ts` | Removed `rootNodeQuickSettingsTouchOffset.test.ts` from TEST_FILES. |

---

## Regression and validation

- **Version / toast:** `runMigrations()` does **not** call `markVersionAsSeen()`. App.svelte still reads `getStoredVersion()` at load, computes `shouldShowUpdatedToast`, and calls `markVersionAsSeen()` in `runInitialization()` after showing the toast when appropriate. No regression.
- **Tests:** `npm run check` and `npm test` pass (full suite).
- **No backward-compat shims:** Old confirm modal, unused locale keys, and obsolete test removed; no legacy paths added.

---

## Summary

All 10 plan items are implemented. One fix applied during audit: migration runner no longer calls `markVersionAsSeen()`, preserving the "updated version" toast. No other regressions or inconsistencies found.
