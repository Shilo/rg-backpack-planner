# Onboarding Steps Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce icon/title redundancy between onboarding step headers and their first cards across steps 3–9.

**Architecture:** Override card properties via spread + replace on `controlCard()` results to differentiate card 1 from step headers while preserving input bindings. Add new i18n keys for overridden titles.

**Tech Stack:** Svelte 5, TypeScript, phosphor-svelte icons, svelte-whisper i18n

**Spec:** `docs/superpowers/specs/2026-03-23-onboarding-steps-tuning-design.md`

---

### Task 1: Add new translation keys to en.json

**Files:**
- Modify: `src/locales/en.json:535-592` (onboarding section)

- [ ] **Step 1: Add seven new keys to the onboarding section**

Inside the `"onboarding"` object (after `"rootQuickSettings"` line 548), add:

```json
"quickSettings": "Quick Settings",
"setBudget": "Set your budget",
"previewOptions": "Preview Options",
"changePrimaryAction": "Change node {input} action",
"historyToolbar": "History Toolbar",
"navigationBar": "Navigation Bar",
"selectTab": "Select Tab",
```

- [ ] **Step 2: Remove dead keys replaced by new ones**

Remove these keys from en.json (they are only used in `onboardingSteps.ts` and are being replaced):
- `"toolbarSection": "Undo / Redo / Reset"` (line 568) → replaced by `"historyToolbar"`
- `"bottombarSection": "Bottom Bar"` (line 580) → replaced by `"navigationBar"`

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json
git commit -m "feat(i18n): add onboarding step tuning translation keys"
```

---

### Task 2: Remove dead keys from other locale files

**Files:**
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/fr.json`

- [ ] **Step 1: Remove `toolbarSection` and `bottombarSection` from ja.json, zh.json, fr.json**

These keys are dead code after the en.json changes. Remove both keys from each file's `"onboarding"` section.

- [ ] **Step 2: Commit**

```bash
git add src/locales/ja.json src/locales/zh.json src/locales/fr.json
git commit -m "chore(i18n): remove dead onboarding keys from non-English locales"
```

---

### Task 3: Update onboardingSteps.ts — imports and step definitions

**Files:**
- Modify: `src/lib/onboarding/onboardingSteps.ts`

- [ ] **Step 1: Update phosphor-svelte imports**

Replace the import block (lines 2–15) to add new icons and remove unused ones. The final import should be:

```typescript
import {
    ArrowCounterClockwiseIcon,
    ArrowsOutCardinalIcon,
    ClockCounterClockwiseIcon,
    CoinIcon,
    CoinsIcon,
    CopySimpleIcon,
    DotsNineIcon,
    DotsThreeOutlineIcon,
    EyeIcon,
    GearSixIcon,
    GraphIcon,
    ListIcon,
    LockSimpleIcon,
    LockSimpleOpenIcon,
    RepeatIcon,
    SquaresFourIcon,
    TabsIcon,
    WarningCircleIcon,
} from "phosphor-svelte";
```

New: `CoinIcon`, `DotsNineIcon`, `GearSixIcon`, `ListIcon`, `RepeatIcon`, `TabsIcon`

Note: `ListIcon` is new to this file (already used in `controlsData.ts`). Keep `ArrowsOutCardinalIcon` (still used by tree-pan card via `controlCard`), `CoinsIcon` (still used in `hudCards` card 2), `DotsThreeOutlineIcon` (still used in bottombar cards via `controlCard`).

Also update the customIcons import (line 16) to add `VanguardIcon`:

```typescript
import { GuardianIcon, VanguardIcon } from "../customIcons";
```

- [ ] **Step 2: Override rootCards card 1 (step 3)**

Replace `rootCards` (lines 304–312):

```typescript
const rootCards = [
    {
        ...controlCard(
            "hud-root-quick-settings",
            "controls.actions.rootQuickSettings",
            "controls.actions.rootQuickSettingsDesc",
            `input.primary.${device}` as const,
            device,
        ),
        icon: GearSixIcon,
        title: translate("onboarding.quickSettings"),
        label: [translate("onboarding.quickSettings"), ...getActionInputs("hud-root-quick-settings")],
    },
];
```

- [ ] **Step 3: Update step 3 (root) title to use translate directly**

Replace lines 456–459:

```typescript
title: translate("onboarding.rootSection"),
```

This was previously `getActionTitle("hud-root-quick-settings", "onboarding.rootSection")` which resolved to the control action title "Root Node Quick Settings". Now it uses the translation key directly → "Root Node".

- [ ] **Step 4: Update step 4 (tree) title icon**

Replace line 470:

```typescript
titleIcon: DotsNineIcon,
```

Was `ArrowsOutCardinalIcon` (redundant with card 1 pan icon).

- [ ] **Step 5: Override hudCards card 1 (step 5)**

Replace `hudCards` (lines 255–268):

```typescript
const hudCards = [
    {
        ...controlCard(
            "hud-budget",
            "controls.actions.budget",
            "controls.actions.budgetDesc",
            `input.primary.${device}` as const,
            device,
        ),
        icon: CoinIcon,
        title: translate("onboarding.setBudget"),
        label: [translate("onboarding.setBudget"), ...getActionInputs("hud-budget")],
    },
    customCard(
        CoinsIcon,
        translate("onboarding.budgetIgnoreLabel"),
        translate("onboarding.budgetIgnoreDesc"),
    ),
];
```

- [ ] **Step 6: Override previewCards card 1 (step 6)**

Replace `previewCards` (lines 338–356):

```typescript
const previewCards = [
    {
        ...controlCard(
            "hud-preview-indicator",
            "controls.actions.previewIndicator",
            "controls.actions.previewIndicatorDesc",
            `input.primary.${device}` as const,
            device,
        ),
        icon: ListIcon,
        title: translate("onboarding.previewOptions"),
        label: [translate("onboarding.previewOptions"), ...getActionInputs("hud-preview-indicator")],
    },
    customCard(
        WarningCircleIcon,
        translate("onboarding.previewTemporary"),
        translate("onboarding.previewTemporaryDesc"),
    ),
    customCard(
        CopySimpleIcon,
        translate("onboarding.previewClone"),
        translate("onboarding.previewCloneDesc"),
    ),
];
```

- [ ] **Step 7: Override primaryActionCards card 1 (step 7)**

Replace `primaryActionCards` (lines 270–278):

```typescript
const primaryActionCards = [
    {
        ...controlCard(
            "hud-primary-action",
            "controls.actions.primaryAction",
            "controls.actions.primaryActionDesc",
            `input.primary.${device}` as const,
            device,
        ),
        icon: RepeatIcon,
        title: translate("onboarding.changePrimaryAction", { input: labels.primary.toLowerCase() }),
        label: [translate("onboarding.changePrimaryAction", { input: labels.primary.toLowerCase() }), ...getActionInputs("hud-primary-action")],
    },
];
```

- [ ] **Step 8: Update step 8 (toolbar) title**

Replace line 514:

```typescript
title: translate("onboarding.historyToolbar"),
```

Was `translate("onboarding.toolbarSection")`.

- [ ] **Step 9: Update step 9 (bottombar) title and icon**

Replace lines 523–524:

```typescript
title: translate("onboarding.navigationBar"),
titleIcon: TabsIcon,
```

Was `translate("onboarding.bottombarSection")` and `DotsThreeOutlineIcon`.

- [ ] **Step 10: Update bottombarCards — card 1 title and tree-options icon**

In both touch and mouse branches of `bottombarCards`:

**Card 1 (both branches):** Change the title from dynamic `translate("onboarding.bottombarActionTab", { action: labels.primary })` to static `translate("onboarding.selectTab")`. The card becomes:

```typescript
customCard(
    GuardianIcon as unknown as Component,
    translate("onboarding.selectTab"),
    translate("onboarding.bottombarSwitchTree"),
    [{ keys: labels.primary, device }],
),
```

**Tree Options card (both branches):** Override the icon to `VanguardIcon`. Use spread pattern:

Touch branch (line ~368):
```typescript
{
    ...controlCard(
        "tree-options",
        "controls.actions.treeOptions",
        "controls.actions.nodeTreeOptionsDesc",
        "input.secondary.touch",
        "touch",
    ),
    icon: VanguardIcon as unknown as Component,
},
```

Mouse branch (line ~409):
```typescript
{
    ...controlCard(
        "tree-options",
        "controls.actions.treeOptions",
        "controls.actions.nodeTreeOptionsDesc",
        "input.secondary.mouse",
        "mouse",
    ),
    icon: VanguardIcon as unknown as Component,
},
```

Note: `VanguardIcon` needs the same `as unknown as Component` cast as `GuardianIcon` since both are phosphor icon aliases from customIcons.

- [ ] **Step 11: Remove dead translation key `bottombarActionTab`**

Check if `onboarding.bottombarActionTab` is used anywhere else. If only in `onboardingSteps.ts` (which we just replaced), remove it from en.json and other locale files.

- [ ] **Step 12: Commit**

```bash
git add src/lib/onboarding/onboardingSteps.ts
git commit -m "feat(onboarding): reduce icon/title redundancy across steps 3-9"
```

---

### Task 4: Run tests and verify

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass. Key test files that validate this code:
- `test/onboardingStepsData.test.ts` — regex checks on onboardingSteps.ts source (spread pattern preserves `controlCard(` calls)
- `test/onboardingPaneLayout.test.ts` — checks `rootSection` and `hudSection` keys exist in locales
- `test/onboardingStore.test.ts` — checks `nodesSection`, `treeSection` keys exist in locales

- [ ] **Step 2: Fix any test failures**

If tests fail, check:
1. Regex patterns that match against source code — ensure spread syntax doesn't break existing pattern matches
2. Locale key existence checks — ensure no required keys were accidentally removed

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: address test failures from onboarding tuning"
```
