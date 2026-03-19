# Ignore Tech Crystal Budget — Design Spec

## Summary

Add a budget enforcement system for Tech Crystal spending. By default, when a user has set a Tech Crystal budget (owned > 0), leveling is constrained to stay within that budget. A new toggle setting — **"Ignore Tech Crystal Budget"** — allows users to opt out and spend freely, restoring current unconstrained behavior.

When budget is enforced and a level action would exceed the budget, the system smartly caps to the highest affordable level rather than blocking entirely. A toast notification informs the user of the cap and offers an inline action button (MD3 snackbar style) to persistently enable "Ignore Tech Crystal Budget."

## Setting

- **Name:** Ignore Tech Crystal Budget
- **Description:** Level nodes beyond spending limit
- **Location:** Node Settings > Behavior section (after "Node Level Behavior")
- **Type:** `ToggleSwitch`
- **Default:** `false` (budget IS enforced when owned > 0)
- **Storage key:** `"ignore-tech-crystal-budget"`
- **Icon:** Appropriate Phosphor icon (e.g., `CoinIcon`, `CurrencyCircleDollarIcon`, or similar crystal/currency icon from the Phosphor set)

### Store: `ignoreTechCrystalBudgetStore.ts`

Follows the same pattern as `showTierStore.ts`:

```ts
import { writable } from "svelte/store";
import { getItem, setItem } from "./storage";

const DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET = false;

function parse(storedValue: string | null): boolean | null {
    if (storedValue === null) return null;
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
    return null;
}

function get(): boolean {
    return parse(getItem("ignore-tech-crystal-budget")) ?? DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET;
}

function persist(value: boolean) {
    setItem("ignore-tech-crystal-budget", String(value));
}

function createStore() {
    const { subscribe, set } = writable(get());
    return {
        subscribe,
        set: (value: boolean) => { persist(value); set(value); },
        resetToDefault: () => { persist(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET); set(DEFAULT_IGNORE_TECH_CRYSTAL_BUDGET); },
    };
}

export const ignoreTechCrystalBudget = createStore();
```

### Reset integration

Add `ignoreTechCrystalBudget.resetToDefault()` to `handleResetSettings()` in `GeneralSettingsPage.svelte`.

## Budget enforcement logic

### Location

Inside `applyChange()` in `Tree.svelte`, inserted **after** the existing global leaf cap check and **before** `updateLevels(nextLevels)`.

### Guard conditions

The budget check lives **inside** the existing `if (isGlobalIncrement)` block in `applyChange()`, right after the leaf cap check. This means decrements are implicitly allowed (they never enter this block). The check is **skipped entirely** (current behavior preserved) when ANY of:

1. `$ignoreTechCrystalBudget === true`
2. `$techCrystalsOwned === 0` (no budget set)

### Required imports in `Tree.svelte`

Add these imports (none currently exist):
- `techCrystalsOwned`, `techCrystalsAvailable` from `../lib/techCrystalStore`
- `ignoreTechCrystalBudget` from `../lib/ignoreTechCrystalBudgetStore`
- `computeTotalCost` from `../lib/nodeActionPreview` (already imported: `sumDeltaCosts`)

### Algorithm: smart cap

When the budget check runs on an increment:

1. Compute cost of the full action: `sumDeltaCosts(nodes, prevLevels, deltas)` (using the original pre-change `levels`, NOT `nextLevels`)
2. Read current `$techCrystalsAvailable` (derived: `owned - spent`)
3. **If cost <= available:** proceed normally, no change
4. **If cost > available:** find the highest affordable target level:
   - Linear search downward from `targetLevel - 1` to `currentLevel + 1`
   - For each candidate, call `computeTotalCost({ nodes, levels, index, targetLevel: candidate, nodeLevelBehavior: $nodeLevelBehavior })` using the original `levels` — this correctly handles both Solo and Sync propagation because `computeTotalCost` internally calls `applyLevelChange`
   - Accept the first candidate where `totalCost <= available`
   - If found: call `applyLevelChange()` with the capped target to get new `nextLevels` and `deltas`, **replacing** the original values from line 507. Show capped toast.
   - If no affordable level exists (even +1 exceeds budget): block entirely (`return false`), show budget-reached toast
5. Both toast variants include an action button. The button label uses the locale key `settings.ignoreTechCrystalBudget` ("Ignore Tech Crystal Budget"). Clicking it calls `ignoreTechCrystalBudget.set(true)` and dismisses the toast.
6. Budget toasts use `durationMs: 4500` (longer than default 2600ms) to give users time to read and optionally tap the action button.

### Why linear search, not binary search

Cost is monotonically increasing with level, so binary search is theoretically possible. However:

- In **Sync mode**, `applyLevelChange()` propagates to ancestors/descendants, and the propagation boundaries change non-linearly with tier thresholds. This means the cost function is monotonic but has discontinuities at tier boundaries.
- The search space is small (max 100 levels for stat nodes, max 50 for globals, max 10 for +Tier increments). Linear search from top down is simple, correct, and fast enough.
- A binary search optimization can be added later if profiling shows a need, but correctness is the priority.

## Toast system extension

### Type change in `toast.ts`

Add an optional `action` field to the `Toast` type:

```ts
export type ToastAction = {
    label: string;
    onClick: () => void;
};

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

Update `showToast()` function body to pass the action through:

```ts
const toast: Toast = {
    // ...existing fields
    action: options?.action,
};
```

### Rendering in `Toasts.svelte`

Add an action button element after the message span, inside the toast div. The action button:

- **Stops propagation** so clicking it doesn't dismiss the toast via the parent click handler
- Calls `action.onClick()` then `dismissToast(toast.id)`
- Triggers haptic feedback

### MD3 snackbar action button styling

Following Material Design 3 snackbar action button conventions:

- **No background, no border** — text-only button
- **Accent color** — uses `var(--accent)` for positive toasts, inherits `var(--danger-text)` for negative toasts
- **Bold weight, slightly smaller font** — `font-weight: var(--weight-bold)`, `font-size: var(--font-sm)`
- **Uppercase text** — `text-transform: uppercase`
- **No padding/margin bloat** — compact, inline with the toast message
- **Positioned trailing** — appears after the message text, flex-pushed to the end
- **Interactive states** — subtle opacity change on hover/active
- **Cursor pointer**

## Locale keys

### English (`en.json`)

```json
"settings": {
    "ignoreTechCrystalBudget": "Ignore Tech Crystal Budget",
    "ignoreTechCrystalBudgetDescription": "Level nodes beyond spending limit"
}
```

```json
"techCrystals": {
    "budgetReachedToast": "Tech Crystal budget reached",
    "budgetCappedToast": "Capped to level {level}"
}
```

All other locale files (`ja.json`, `zh.json`, `fr.json`) get the same keys added with translated values. Use the project's `regenerate-locales` skill for translations.

## Files changed

| File | Change |
|------|--------|
| `src/lib/ignoreTechCrystalBudgetStore.ts` | **New.** Boolean store, default `false`, localStorage-backed. |
| `src/lib/toast.ts` | Add optional `action` field to `Toast` type and `ToastOptions`. |
| `src/lib/Toasts.svelte` | Render action button when `toast.action` is present. MD3 styling. |
| `src/lib/Tree.svelte` | Budget check in `applyChange()` after leaf cap check. Import `techCrystalsOwned`, `techCrystalsAvailable`, `ignoreTechCrystalBudget`, `computeTotalCost`. |
| `src/lib/sideMenuPages/NodeSettingsPage.svelte` | Add toggle in Behavior section. |
| `src/lib/sideMenuPages/GeneralSettingsPage.svelte` | Add `resetToDefault()` call. |
| `src/locales/en.json` | Add setting + toast locale keys. |
| `src/locales/ja.json` | Add translated keys. |
| `src/locales/zh.json` | Add translated keys. |
| `src/locales/fr.json` | Add translated keys. |

## What does NOT change

- **When `ignoreTechCrystalBudget` is `true`:** zero code paths change. The budget check is skipped. All existing behavior is preserved identically.
- **When `techCrystalsOwned === 0`:** budget check is skipped. Same as above.
- **Refunds/decrements:** always allowed regardless of setting.
- **Global leaf cap:** unchanged, runs before and independently of budget check.
- **Node action preview (tooltip):** unchanged. The preview shows what the user is attempting; the cap happens at apply time.
- **`techCrystalsSpent` derived store:** unchanged. It still sums all levels.
- **`techCrystalsAvailable` derived store:** unchanged.
- **Build encoding/decoding:** unchanged.
- **Preset persistence:** unchanged.

## Edge cases

1. **Budget set to exactly current spending:** available = 0. Any increment is blocked with "budget reached" toast.
2. **Budget reduced below current spending:** available is negative. Any increment is blocked. Refunds still work.
3. **Sync mode ancestor propagation cost:** the smart cap correctly accounts for ancestor costs because `computeTotalCost()` calls `applyLevelChange()` which handles propagation.
4. **+Tier action with partial affordability:** if user can't afford full tier but can afford partial, they get capped to the highest affordable level. The tier boundary is not special — it just becomes a regular level target.
5. **Multiple rapid clicks:** each click reads the latest `$techCrystalsAvailable` which is derived and updates synchronously after `updateLevels()`. No race condition.
6. **Toast action button after setting change:** if user toggles the setting via Node Settings while a toast is visible, the toast action button still works (it's a no-op since the store is already `true`).

## Testing

### Test files

| File | Purpose |
|------|---------|
| `test/ignoreTechCrystalBudgetStore.test.ts` | Store defaults, persistence, reset |
| `test/budgetEnforcement.test.ts` | Smart cap algorithm, guard conditions, Solo/Sync |

### Unit tests (in `test/`)

1. **Store behavior:** default is `false`, persists to localStorage, `resetToDefault()` works
2. **Budget enforcement pure logic:** given nodes/levels/available, verify:
   - Full cost within budget → returns original target
   - Full cost exceeds budget → returns capped target
   - No affordable level → returns null (block)
   - Refund action → no budget check (returns original target)
   - `ignoreTechCrystalBudget = true` → no budget check
   - `techCrystalsOwned = 0` → no budget check
3. **Smart cap with Sync mode:** verify ancestor propagation costs are included in cap calculation
4. **Toast action field:** verify toast type accepts optional action, rendering doesn't break without it
