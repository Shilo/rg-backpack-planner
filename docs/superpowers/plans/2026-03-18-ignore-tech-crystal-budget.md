# Ignore Tech Crystal Budget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add budget enforcement that caps node leveling to available Tech Crystals when a budget is set, with a toggle to opt out.

**Architecture:** A new boolean store (`ignoreTechCrystalBudgetStore`) gates a budget check inside `applyChange()` in `Tree.svelte`. When budget is enforced and the user exceeds it, a linear search finds the highest affordable level. A toast with an MD3-style action button lets users persistently disable enforcement. The toast system gains an optional `action` field.

**Tech Stack:** Svelte 4/5, TypeScript, Svelte stores, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-18-ignore-tech-crystal-budget-design.md`

---

## File Structure

| File | Role |
|------|------|
| `src/lib/ignoreTechCrystalBudgetStore.ts` | **New.** Boolean store, default `false`, localStorage key `"ignore-tech-crystal-budget"` |
| `src/lib/budgetEnforcement.ts` | **New.** Pure function `findBudgetCappedLevel()` — smart cap algorithm |
| `src/lib/toast.ts` | **Modify.** Add `ToastAction` type and optional `action` field |
| `src/lib/Toasts.svelte` | **Modify.** Render action button with MD3 styling |
| `src/lib/Tree.svelte` | **Modify.** Budget check in `applyChange()` after leaf cap |
| `src/lib/sideMenuPages/NodeSettingsPage.svelte` | **Modify.** Add toggle in Behavior section |
| `src/lib/sideMenuPages/GeneralSettingsPage.svelte` | **Modify.** Add `resetToDefault()` call |
| `src/locales/en.json` | **Modify.** Add locale keys |
| `src/locales/ja.json`, `zh.json`, `fr.json` | **Modify.** Add translated keys |
| `test/ignoreTechCrystalBudgetStore.test.ts` | **New.** Store defaults, persistence, reset |
| `test/budgetEnforcement.test.ts` | **New.** Tests for `findBudgetCappedLevel()` |

---

### Task 1: Create the store

**Files:**
- Create: `src/lib/ignoreTechCrystalBudgetStore.ts`

- [ ] **Step 1: Create the store file**

```ts
import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

export const DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET = false;

function parseIgnoreTechCrystalBudget(
    storedValue: string | null,
): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function getIgnoreTechCrystalBudget(): boolean {
    const stored = parseIgnoreTechCrystalBudget(
        getItem("ignore-tech-crystal-budget"),
    );
    return stored ?? DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET;
}

function setIgnoreTechCrystalBudget(value: boolean) {
    setItem("ignore-tech-crystal-budget", String(value));
}

function createIgnoreTechCrystalBudgetStore() {
    const { subscribe, set } = writable(getIgnoreTechCrystalBudget());

    return {
        subscribe,
        set: (value: boolean) => {
            setIgnoreTechCrystalBudget(value);
            set(value);
        },
        resetToDefault: () => {
            setIgnoreTechCrystalBudget(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET);
            set(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET);
        },
    };
}

export const ignoreTechCrystalBudget = createIgnoreTechCrystalBudgetStore();
```

- [ ] **Step 2: Add reset integration in GeneralSettingsPage.svelte**

In `src/lib/sideMenuPages/GeneralSettingsPage.svelte`, add the import and call `resetToDefault()` inside `handleResetSettings()`:

Import:
```ts
import { ignoreTechCrystalBudget } from "../ignoreTechCrystalBudgetStore";
```

Inside `handleResetSettings()` `onConfirm` callback, add after the existing `showLevelSplash.resetToDefault()` line:
```ts
ignoreTechCrystalBudget.resetToDefault();
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx svelte-check --threshold error 2>&1 | tail -5`

Expected: no errors related to `ignoreTechCrystalBudgetStore`

- [ ] **Step 4: Commit**

```bash
git add src/lib/ignoreTechCrystalBudgetStore.ts src/lib/sideMenuPages/GeneralSettingsPage.svelte
git commit -m "feat: add ignoreTechCrystalBudget store with reset integration"
```

- [ ] **Step 5: Write store integration test**

Create `test/ignoreTechCrystalBudgetStore.test.ts` following the same source-assertion pattern as `test/showTierSetting.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("  ignoreTechCrystalBudgetStore");

const storePath = resolve("src/lib/ignoreTechCrystalBudgetStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("ignoreTechCrystalBudgetStore.ts should exist.");
}

if (!/DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET\s*=\s*false/.test(storeSource)) {
    throw new Error("Store default should be false.");
}

if (!/getItem\("ignore-tech-crystal-budget"\)/.test(storeSource)) {
    throw new Error("Store should read from ignore-tech-crystal-budget storage key.");
}

if (!/setItem\("ignore-tech-crystal-budget",\s*String\(value\)\)/.test(storeSource)) {
    throw new Error("Store should persist boolean values as strings.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("Store should expose resetToDefault().");
}

const generalPagePath = resolve("src/lib/sideMenuPages/GeneralSettingsPage.svelte");
const generalPageSource = readFileSync(generalPagePath, "utf8");

if (!/ignoreTechCrystalBudget\.resetToDefault\(\)/.test(generalPageSource)) {
    throw new Error(
        "GeneralSettingsPage reset should include ignoreTechCrystalBudget.resetToDefault().",
    );
}

console.log("    ✓ store has correct default, storage key, persistence, and resetToDefault");
console.log("    ✓ GeneralSettingsPage includes resetToDefault call");
console.log("  ✓ ignoreTechCrystalBudgetStore\n");
```

Note: This test validates only the store and reset integration. The NodeSettingsPage toggle and locale keys will be validated by extending this test after Tasks 2-3 are complete. Register this test and `budgetEnforcement.test.ts` together in `test/index.ts` during Task 5, Step 6.

- [ ] **Step 6: Commit test file**

```bash
git add test/ignoreTechCrystalBudgetStore.test.ts
git commit -m "test: add ignoreTechCrystalBudgetStore integration test"
```

---

### Task 2: Add locale keys

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add English locale keys**

Add to the `"settings"` object in `en.json`:
```json
"ignoreTechCrystalBudget": "Ignore Tech Crystal Budget",
"ignoreTechCrystalBudgetDescription": "Level nodes beyond spending limit"
```

Add to the `"techCrystals"` object in `en.json`:
```json
"budgetReachedToast": "Tech Crystal budget reached",
"budgetCappedToast": "Capped to level {level}"
```

- [ ] **Step 2: Regenerate translations for other locales**

Use the project's `regenerate-locales` skill (`.skills/regenerate-locales`) to generate `ja.json`, `zh.json`, and `fr.json` translations.

- [ ] **Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat: add locale keys for budget enforcement setting and toasts"
```

---

### Task 3: Add settings toggle in NodeSettingsPage

**Files:**
- Modify: `src/lib/sideMenuPages/NodeSettingsPage.svelte`

- [ ] **Step 1: Add imports**

Add to the imports in `NodeSettingsPage.svelte`:

```ts
import { CurrencyCircleDollarIcon } from "phosphor-svelte";
import { ignoreTechCrystalBudget } from "../ignoreTechCrystalBudgetStore";
```

Note: If `CurrencyCircleDollarIcon` is not available in the project's phosphor-svelte version, check available icons with a quick search and use an appropriate alternative (e.g., `CoinIcon`, `WalletIcon`, or `CurrencyDollarIcon`).

- [ ] **Step 2: Add ToggleSwitch after the Node Level Behavior SegmentedControl**

Inside the `<SideMenuSection title={$t("sideMenu.sections.behavior")}>` section, after the second `<SegmentedControl>` (the nodeLevelBehavior one), add:

```svelte
<ToggleSwitch
    checked={$ignoreTechCrystalBudget}
    label={$t("settings.ignoreTechCrystalBudget")}
    ariaLabel={$t("settings.ignoreTechCrystalBudget")}
    description={$t("settings.ignoreTechCrystalBudgetDescription")}
    icon={CurrencyCircleDollarIcon as unknown as Component}
    onToggle={() =>
        ignoreTechCrystalBudget.set(!$ignoreTechCrystalBudget)}
/>
```

- [ ] **Step 3: Verify in dev server**

Run: `npm run dev`

Open Node Settings > Behavior. Verify the toggle appears after "Node Level Behavior", labeled "Ignore Tech Crystal Budget" with description "Level nodes beyond spending limit". Toggle it on/off — should persist across page reloads.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/NodeSettingsPage.svelte
git commit -m "feat: add Ignore Tech Crystal Budget toggle to Node Settings"
```

---

### Task 4: Extend toast system with action button

**Files:**
- Modify: `src/lib/toast.ts`
- Modify: `src/lib/Toasts.svelte`

- [ ] **Step 1: Add ToastAction type and update Toast in toast.ts**

In `src/lib/toast.ts`, add the `ToastAction` type after the `ToastTone` type:

```ts
export type ToastAction = {
    label: string;
    onClick: () => void;
};
```

Add `action?: ToastAction;` to the `Toast` type, after `showSpinner: boolean;`:

```ts
export type Toast = {
    id: string;
    message: string;
    tone: ToastTone;
    durationMs: number;
    showIcon: boolean;
    showSpinner: boolean;
    action?: ToastAction;
};
```

Update `ToastOptions` to include `action`:

```ts
type ToastOptions = Partial<
    Pick<Toast, "tone" | "durationMs" | "showIcon" | "showSpinner" | "action">
>;
```

In the `showToast` function body, add `action: options?.action,` to the toast object construction, after the `showSpinner` line:

```ts
const toast: Toast = {
    id: createId(),
    message,
    tone: options?.tone ?? "positive",
    durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
    showIcon: options?.showIcon ?? true,
    showSpinner: options?.showSpinner ?? false,
    action: options?.action,
};
```

- [ ] **Step 2: Render action button in Toasts.svelte**

In `src/lib/Toasts.svelte`, add the action button after the `<span class="toast__message">` line. The action button stops event propagation so clicking it doesn't dismiss the toast via the parent click handler:

After `<span class="toast__message">{toast.message}</span>`, add:

```svelte
{#if toast.action}
    <button
        class="toast__action"
        on:click|stopPropagation={() => {
            triggerHaptic();
            toast.action?.onClick();
            dismissToast(toast.id);
        }}
    >
        {toast.action.label}
    </button>
{/if}
```

- [ ] **Step 3: Add MD3 action button styles in Toasts.svelte**

Add these styles in the `<style>` block of `Toasts.svelte`:

```css
.toast__action {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
    font-size: var(--font-sm);
    font-weight: var(--weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--accent);
    white-space: nowrap;
    padding: var(--spacing-xs) var(--spacing-sm);
    margin: calc(-1 * var(--spacing-xs)) calc(-1 * var(--spacing-sm));
    border-radius: var(--radius-sm);
}

.toast--negative .toast__action {
    color: var(--danger-text);
}

@media (hover: hover) {
    .toast__action:hover {
        opacity: 0.8;
    }
}

.toast__action:active {
    opacity: 0.6;
}
```

- [ ] **Step 4: Verify type-check and existing toasts still work**

Run: `npm run check`

Expected: no errors. Open dev server, trigger any existing toast (e.g., reset a tree) — should display normally without action button.

- [ ] **Step 5: Commit**

```bash
git add src/lib/toast.ts src/lib/Toasts.svelte
git commit -m "feat: add optional action button to toast system (MD3 snackbar style)"
```

---

### Task 5: Create pure budget enforcement function

**Files:**
- Create: `src/lib/budgetEnforcement.ts`
- Create: `test/budgetEnforcement.test.ts`

- [ ] **Step 1: Write the test file**

Create `test/budgetEnforcement.test.ts`:

```ts
import assert from "node:assert/strict";
import { findBudgetCappedLevel } from "../src/lib/budgetEnforcement.ts";
import { NodeLevelBehavior } from "../src/lib/nodeLevelBehaviorStore.ts";
import { computeTotalCost } from "../src/lib/nodeActionPreview.ts";
import { getCostRange } from "../src/config/skillMetadata.ts";
import {
    createYellowBranchFixture,
    YELLOW_BRANCH_LENGTH,
} from "./tierLeveling.shared.ts";

function createLevels(length: number, fill = 0) {
    return new Array(length).fill(fill);
}

console.log("  budgetEnforcement");

// --- Returns original target when cost is within budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Cost of level 0 -> 1 for node 0
    const cost = getCostRange(nodes[0]!.skillId, 0, 1);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: cost + 100, // plenty of budget
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, null, "should return null (no cap needed) when within budget");
    console.log("    ✓ returns null when cost is within budget");
}

// --- Returns capped level when cost exceeds budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Cost of 0->10 for node 0
    const costFor5 = getCostRange(nodes[0]!.skillId, 0, 5);
    const costFor6 = getCostRange(nodes[0]!.skillId, 0, 6);
    // Set available between cost of 5 and cost of 6
    const available = costFor5 + Math.floor((costFor6 - costFor5) / 2);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 10,
        currentLevel: 0,
        available,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 5, "should cap to level 5 (highest affordable)");
    console.log("    ✓ caps to highest affordable level");
}

// --- Returns 0 (block) when even +1 exceeds budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: 0,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 0, "should return 0 (block) when nothing is affordable");
    console.log("    ✓ returns 0 when even +1 exceeds budget");
}

// --- Sync mode: accounts for ancestor propagation costs ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    // Node 2 has ancestors [0, 1] (via parent chain). Sync mode will level ancestors too.
    // Solo cost for node 2 to level 20 is just node 2's cost
    const soloCost = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    }).totalCost;
    const syncCost = computeTotalCost({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    }).totalCost;

    // With budget = soloCost (enough for Solo but not Sync),
    // Sync mode should cap below 20
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 2,
        targetLevel: 20,
        currentLevel: 0,
        available: soloCost,
        nodeLevelBehavior: NodeLevelBehavior.Sync,
    });
    assert.ok(
        result !== null && result < 20,
        `Sync should cap below 20 when budget is Solo-cost only (got ${result})`,
    );
    assert.ok(
        result !== null && result > 0,
        `Sync should still afford some levels (got ${result})`,
    );
    console.log("    ✓ Sync mode accounts for ancestor propagation costs");
}

// --- Returns null for +1 increment within budget ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const cost = getCostRange(nodes[0]!.skillId, 0, 1);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: cost,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, null, "exact budget for +1 should return null (no cap)");
    console.log("    ✓ exact budget for +1 returns null");
}

// --- Negative available always blocks ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const result = findBudgetCappedLevel({
        nodes,
        levels,
        index: 0,
        targetLevel: 1,
        currentLevel: 0,
        available: -100,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
    });
    assert.equal(result, 0, "negative available should block (return 0)");
    console.log("    ✓ negative available blocks");
}

console.log("  ✓ budgetEnforcement\n");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx test/budgetEnforcement.test.ts`

Expected: FAIL — `findBudgetCappedLevel` is not defined yet.

- [ ] **Step 3: Create the budget enforcement module**

Create `src/lib/budgetEnforcement.ts`:

```ts
import type { LevelsByIndex, Node, NodeIndex } from "../types/tree";
import type { NodeLevelBehavior } from "./nodeLevelBehaviorStore";
import { computeTotalCost } from "./nodeActionPreview";

/**
 * Finds the highest affordable target level when the requested level exceeds
 * the available tech crystal budget.
 *
 * Returns:
 * - `null` if the original target is affordable (no cap needed)
 * - `0` if even +1 from currentLevel exceeds the budget (block entirely)
 * - A capped target level (currentLevel < result < targetLevel) otherwise
 */
export function findBudgetCappedLevel(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    targetLevel: number;
    currentLevel: number;
    available: number;
    nodeLevelBehavior: NodeLevelBehavior;
}): number | null {
    const {
        nodes,
        levels,
        index,
        targetLevel,
        currentLevel,
        available,
        nodeLevelBehavior,
    } = params;

    // Check if full action is affordable
    const { totalCost } = computeTotalCost({
        nodes,
        levels,
        index,
        targetLevel,
        nodeLevelBehavior,
    });

    if (totalCost <= available) return null;

    // Linear search downward for highest affordable level
    for (let candidate = targetLevel - 1; candidate > currentLevel; candidate--) {
        const { totalCost: candidateCost } = computeTotalCost({
            nodes,
            levels,
            index,
            targetLevel: candidate,
            nodeLevelBehavior,
        });
        if (candidateCost <= available) return candidate;
    }

    // Even +1 exceeds budget — block entirely
    return 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx test/budgetEnforcement.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `npm test`

Expected: all existing tests continue to pass (the new budget test is not registered yet — it runs standalone but not via `npm test` until Step 6).

- [ ] **Step 6: Register both new tests in test runner**

In `test/index.ts`, add imports for both `test/ignoreTechCrystalBudgetStore.test.ts` and `test/budgetEnforcement.test.ts` following the existing pattern for adding test files.

- [ ] **Step 7: Run full test suite again after registration**

Run: `npm test`

Expected: all pass including the new `budgetEnforcement` tests.

- [ ] **Step 8: Commit**

```bash
git add src/lib/budgetEnforcement.ts test/budgetEnforcement.test.ts test/index.ts
git commit -m "feat: add findBudgetCappedLevel pure function with tests"
```

---

### Task 6: Wire budget enforcement into Tree.svelte

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Add imports to Tree.svelte**

Add these imports in the `<script lang="ts">` section of `Tree.svelte`. Place alongside existing store imports:

```ts
import {
    techCrystalsOwned,
    techCrystalsAvailable,
} from "./techCrystalStore";
import { ignoreTechCrystalBudget } from "./ignoreTechCrystalBudgetStore";
import { findBudgetCappedLevel } from "./budgetEnforcement";
```

Note: `sumDeltaCosts` and `applyLevelChange` are already imported. `computeTotalCost` is NOT needed in `Tree.svelte` — it's used internally by `findBudgetCappedLevel` in `budgetEnforcement.ts`.

- [ ] **Step 2: Add budget check inside `applyChange()`**

Inside `applyChange()`, find the closing brace of the `shouldBlockIncrementForGlobalLeafCap` check (after `return false;` on line ~534). The budget check goes right after, still inside the `if (isGlobalIncrement)` block, before the closing brace of that block (line ~536).

Insert this block after the leaf cap check's closing brace (after the `}` on line ~535), still inside `if (isGlobalIncrement) {`:

```ts
// Budget enforcement: cap level to what's affordable
if (
    !$ignoreTechCrystalBudget &&
    $techCrystalsOwned > 0
) {
    const actionCost = sumDeltaCosts(nodes, levels, deltas);
    const available = $techCrystalsAvailable;
    if (actionCost > available) {
        const cappedLevel = findBudgetCappedLevel({
            nodes,
            levels,
            index,
            targetLevel,
            currentLevel,
            available,
            nodeLevelBehavior: $nodeLevelBehavior,
        });
        if (cappedLevel === 0) {
            // Can't afford even +1
            showToast(
                $t("techCrystals.budgetReachedToast"),
                {
                    tone: "negative",
                    durationMs: 4500,
                    action: {
                        label: $t("settings.ignoreTechCrystalBudget"),
                        onClick: () => ignoreTechCrystalBudget.set(true),
                    },
                },
            );
            return false;
        }
        // Re-run with capped target, replacing nextLevels and deltas
        const capped = applyLevelChange({
            nodes,
            levels,
            index,
            targetLevel: cappedLevel,
            nodeLevelBehavior: $nodeLevelBehavior,
        });
        nextLevels = capped.levels;
        deltas = capped.deltas;
        targetLevel = cappedLevel;
        showToast(
            $t("techCrystals.budgetCappedToast", {
                level: cappedLevel,
            }),
            {
                tone: "negative",
                durationMs: 4500,
                action: {
                    label: $t("settings.ignoreTechCrystalBudget"),
                    onClick: () => ignoreTechCrystalBudget.set(true),
                },
            },
        );
    }
}
```

**Important:** The variables `nextLevels`, `deltas`, and `targetLevel` are currently declared with `const` at the top of `applyChange()`. They need to be changed to `let` so the budget cap can reassign them:

Change line ~507 from:
```ts
const { levels: nextLevels, deltas } = applyLevelChange({
```
to:
```ts
let { levels: nextLevels, deltas } = applyLevelChange({
```

And change the `targetLevel` parameter to a `let` by adding at the top of the function:
```ts
function applyChange(index: NodeIndex, targetLevel: number) {
```
The `targetLevel` is a parameter, so it can already be reassigned in JS/TS. No change needed for it. But double-check — if `const` destructuring blocks reassignment, use intermediate variables.

- [ ] **Step 3: Verify type-check passes**

Run: `npm run check`

Expected: no errors.

- [ ] **Step 4: Run full test suite**

Run: `npm test`

Expected: all pass. Existing behavior is unchanged because the default is `ignoreTechCrystalBudget = false` and `techCrystalsOwned` defaults to `0`, so the budget check is skipped.

- [ ] **Step 5: Manual verification in dev server**

1. Open dev server, set a Tech Crystal budget (click the crystal display, enter e.g. 100)
2. Verify the "Ignore Tech Crystal Budget" toggle is OFF by default
3. Try leveling a node — should cap to what you can afford
4. Verify toast appears with "Capped to level X" and the "IGNORE TECH CRYSTAL BUDGET" action button
5. Click the action button — verify the setting toggles to ON
6. Level freely now — no more caps
7. Set budget to 0 — verify no caps regardless of toggle state
8. Toggle setting OFF, set budget > 0, try leveling beyond budget — verify blocking toast "Tech Crystal budget reached" when even +1 is unaffordable

- [ ] **Step 6: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "feat: wire budget enforcement into applyChange with smart cap and toast"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all pass.

- [ ] **Step 2: Run type-check**

Run: `npm run check`

Expected: no errors.

- [ ] **Step 3: Manual smoke tests**

Verify these scenarios in the dev server:

1. **No budget set (owned = 0):** leveling works exactly as before, no toasts, no caps
2. **Budget set, toggle OFF (enforce):** leveling caps to affordable level, toast with action button appears
3. **Budget set, toggle ON (ignore):** leveling works exactly as before
4. **Budget = exact spending:** any increment is blocked with "budget reached" toast
5. **Shift+click (refund):** always works regardless of budget
6. **Sync mode:** ancestor propagation costs are included in cap calculation
7. **Toast action button:** clicking "IGNORE TECH CRYSTAL BUDGET" enables the setting persistently
8. **Reset settings:** resets the toggle back to OFF (enforced)
9. **Existing toasts (tree reset, focus, etc.):** still work, no action button shown

- [ ] **Step 4: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```
