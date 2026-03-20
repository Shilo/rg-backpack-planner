# Node Content Menu: Add -Tier & Relocate Reset — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a -Tier button to the node menu grid and relocate Reset below the grid as a ghost outline button.

**Architecture:** The tier logic (`previousTierTargetLevel`, `levelDownTier`) already exists from the input system rework. This plan adds the UI: a `ghost` Button variant, wires -Tier into the node menu grid, and relocates Reset to a full-width ghost button below the grid. All callback wiring flows through Tree.svelte → NodeContextMenu.

**Tech Stack:** Svelte 4 (legacy mode in Svelte 5 — uses `export let`, `$:`, `on:event`), TypeScript, phosphor-svelte icons, svelte-whisper i18n

---

### Task 1: Add locale keys for -Tier and Min

**Files:**
- Modify: `src/locales/en.json` (nodeMenu section, ~line 223)
- Modify: `src/locales/fr.json` (nodeMenu section)
- Modify: `src/locales/ja.json` (nodeMenu section)
- Modify: `src/locales/zh.json` (nodeMenu section)

- [ ] **Step 1: Add keys to en.json**

In the `nodeMenu` object, after `"incrementTier": "+Tier"`, add:

```json
"decrementTier": "-Tier",
"min": "Min",
```

- [ ] **Step 2: Add keys to fr.json**

```json
"decrementTier": "-Palier",
"min": "Min",
```

- [ ] **Step 3: Add keys to ja.json**

```json
"decrementTier": "-ティア",
"min": "最小",
```

- [ ] **Step 4: Add keys to zh.json**

```json
"decrementTier": "-阶",
"min": "最小",
```

- [ ] **Step 5: Run check and commit**

```bash
npm run check
git add src/locales/en.json src/locales/fr.json src/locales/ja.json src/locales/zh.json
git commit -m "feat(i18n): add -Tier and Min locale keys for node menu"
```

---

### Task 2: Add `ghost` variant to Button.svelte

**Files:**
- Modify: `src/lib/Button.svelte`

**Context:** Button.svelte uses Svelte 4 legacy syntax (`export let` props, `$:` reactivity). Variant styling is set via a `computedClass` array (line 49-58) joined into a class string. Hover uses `filter: var(--brightness-hover)` wrapped in `@media (hover: hover)` (line 230). Active uses `filter + scale(0.96)` without media query (line 236).

- [ ] **Step 1: Add `ghost` prop**

After `export let accent = false;` (line 25), add:

```typescript
export let ghost = false;
```

- [ ] **Step 2: Add `ghost` to the `computedClass` array**

In the `computedClass` reactive block (line 49-58), add a new entry after the variant line:

```typescript
$: computedClass = [
    "button",
    small ? "button-sm" : "button-md",
    negative ? "button-negative" : positive ? "button-positive" : accent ? "button-accent" : "",
    ghost ? "button-ghost" : "",
    restClass,
    icon || arrow ? "with-icon" : "",
    arrow ? "with-arrow" : "",
]
    .filter(Boolean)
    .join(" ");
```

- [ ] **Step 3: Add ghost CSS styles**

After the `.button-accent` block (line 273), add:

```css
.button-ghost {
    background: transparent;
}

@media (hover: hover) {
    .button-negative.button-ghost:not(:disabled):hover {
        filter: none;
        background: var(--danger-bg);
    }
}

.button-negative.button-ghost:not(:disabled):active {
    filter: none;
    background: var(--danger-bg);
    transform: scale(0.96);
}
```

Notes:
- Ghost overrides background to transparent; the border/text colors still come from `.button-negative`.
- Hover is inside `@media (hover: hover)` matching the existing pattern (line 230).
- `filter: none` overrides the default brightness hover since ghost buttons use bg-fill hover instead.
- Active keeps scale(0.96) for press feedback. `filter: none` prevents doubling up with the default active filter.
- Only the `negative` combo is defined (YAGNI — only needed for Reset).

- [ ] **Step 4: Run check and commit**

```bash
npm run check
git add src/lib/Button.svelte
git commit -m "feat(Button): add ghost variant for outline-style buttons"
```

---

### Task 3: Add -Tier button and relocate Reset in NodeContextMenu

**Files:**
- Modify: `src/lib/NodeContextMenu.svelte`

**Context:** NodeContextMenu uses Svelte 4 legacy syntax. The `button-grid` div has 6 `NodeContextButton` children. Cost computation is an IIFE reactive block (`$: actionCosts = (() => { ... })()`, line 68-130) where each entry uses `computeTotalCost({...}).totalCost` guarded by `canUp`/`canDown`. Reset is the last button in the grid (line 300-313), always rendered (outside `!isSingleLevel`). Reset uses `NodeContextButton` with `negative` prop, inline `onClick`, and conditional `toastMessage`.

- [ ] **Step 1: Add imports**

1. Add `CaretLineDownIcon` to the phosphor-svelte import (line 2-9):
```typescript
import {
    ArrowCounterClockwiseIcon,
    CaretDownIcon,
    CaretDoubleDownIcon,
    CaretDoubleUpIcon,
    CaretLineDownIcon,
    CaretLineUpIcon,
    CaretUpIcon,
    Warning,
} from "phosphor-svelte";
```

2. Add `previousTierTargetLevel` to the tierLeveling import (line 15):
```typescript
import { tierSize, nextTierTargetLevel, previousTierTargetLevel } from "./tierLeveling";
```

3. Add `Button` and `TechCrystalIcon` imports:
```typescript
import Button from "./Button.svelte";
import { TechCrystalIcon } from "./customIcons";
```

4. Add `formatNumber` if not already imported (check line 14 — it's already imported from svelte-whisper).

- [ ] **Step 2: Add `onDecrementTier` prop**

After `export let onIncrementTier` (line 36), add:

```typescript
export let onDecrementTier: ((index: NodeIndex) => void) | null = null;
```

- [ ] **Step 3: Add previousTierLevel computation and decrementTier cost**

After the `tierTargetLevel` computation (line 63-66), add:

```typescript
$: previousTierLevel =
    maxLevel > 0
        ? previousTierTargetLevel(level, maxLevel as Node["maxLevel"])
        : 0;
```

Inside the `actionCosts` IIFE (line 68-130), add a `decrementTier` entry after `decrement10` (line 119) and before `reset` (line 120):

```typescript
            decrementTier: canDown
                ? computeTotalCost({
                      nodes,
                      levels,
                      index: nodeIndex,
                      targetLevel: previousTierLevel,
                      nodeLevelBehavior: behavior,
                  }).totalCost
                : null,
```

- [ ] **Step 4: Add decrementTier label reactive**

After the `isSingleLevel` reactive (line 132), add:

```typescript
$: decrementTierLabel =
    level > 0 && previousTierLevel === 0
        ? $t("nodeMenu.min")
        : $t("nodeMenu.decrementTier");
```

- [ ] **Step 5: Replace Reset in grid with -Tier button**

In the template, the Reset `NodeContextButton` (line 300-313) is currently always rendered. **Remove it** from the grid.

In its place, add the -Tier button **inside** the `{#if !isSingleLevel}` block (line 276-298), after the -10 button (line 288-298):

```svelte
            <NodeContextButton
                icon={CaretLineDownIcon}
                label={decrementTierLabel}
                crystalValue={actionCosts?.decrementTier ?? null}
                negative
                disabled={nodeIndex === null || level <= 0}
                onClick={() => {
                    if (nodeIndex !== null && onDecrementTier)
                        onDecrementTier(nodeIndex);
                }}
            />
```

- [ ] **Step 6: Add Reset as ghost Button below the grid**

After the closing `</div>` of `button-grid` (line 314), before `</div>` of `menu-content` (line 315), add:

```svelte
        <Button
            ghost
            negative
            icon={ArrowCounterClockwiseIcon}
            disabled={nodeIndex === null || level <= 0}
            toastMessage={nodeIndex !== null && onReset
                ? $t("nodeMenu.resetToast")
                : undefined}
            on:click={() => {
                if (nodeIndex !== null && onReset) onReset(nodeIndex);
            }}
            description={actionCosts?.reset != null
                ? `+${formatNumber(Math.abs(actionCosts.reset))}`
                : undefined}
            descriptionIcon={actionCosts?.reset != null
                ? TechCrystalIcon
                : null}
        >
            {$t("nodeMenu.reset")}
        </Button>
```

Notes:
- Button uses `on:click` (Svelte event dispatch), not `onClick` (that's NodeContextButton's prop).
- `disabled`, `toastMessage` conditions match the original Reset button's pattern.
- `description` shows the refund amount with `formatNumber` for i18n-safe number formatting.
- `descriptionIcon` shows the TechCrystalIcon next to the cost.

- [ ] **Step 7: Run check and commit**

```bash
npm run check
git add src/lib/NodeContextMenu.svelte
git commit -m "feat(NodeContextMenu): add -Tier button, relocate Reset as ghost button"
```

---

### Task 4: Wire onDecrementTier in Tree.svelte

**Files:**
- Modify: `src/lib/Tree.svelte` (~line 1624)

**Context:** Tree.svelte renders `<NodeContextMenu>` at line 1624-1640 with callback props. `levelDownTier` already exists (line 707) and is in `nodeCallbacks.decrementTier` (line 728). It just needs passing to the menu.

- [ ] **Step 1: Add `onDecrementTier` prop to NodeContextMenu rendering**

In the `<NodeContextMenu>` block (around line 1624), add after `onIncrementTier={levelUpTier}`:

```svelte
onDecrementTier={levelDownTier}
```

- [ ] **Step 2: Run check and commit**

```bash
npm run check
git add src/lib/Tree.svelte
git commit -m "feat(Tree): wire onDecrementTier to NodeContextMenu"
```

---

### Task 5: Update validation tests

**Files:**
- Modify: `test/nodeContextMenuTierAction.test.ts`

**Context:** This test reads source files as strings and validates patterns with regex. Current checks: `onIncrementTier` prop, `computeTotalCost` usage, tier label switch logic, single-level conditional, Tree.svelte handler, and locale keys (en, ja, zh).

- [ ] **Step 1: Read the current test file and add new validations**

After the existing checks on `menuSource`, add:

```typescript
if (!/onDecrementTier/.test(menuSource)) {
    throw new Error(
        "NodeContextMenu should have onDecrementTier callback prop.",
    );
}

if (!/previousTierTargetLevel/.test(menuSource)) {
    throw new Error(
        "NodeContextMenu should use previousTierTargetLevel for -Tier cost.",
    );
}

if (!/nodeMenu\.min/.test(menuSource)) {
    throw new Error(
        "NodeContextMenu should use nodeMenu.min label for -Tier at tier 1.",
    );
}

if (!/button-ghost|ghost/.test(menuSource)) {
    throw new Error(
        "NodeContextMenu Reset button should use ghost Button variant.",
    );
}
```

After the existing checks on `treeSource`, add:

```typescript
if (!/onDecrementTier/.test(treeSource)) {
    throw new Error(
        "Tree should pass onDecrementTier to NodeContextMenu.",
    );
}
```

In the locale validation loop, add:

```typescript
if (!/"decrementTier"\s*:/.test(source)) {
    throw new Error(
        `${localePath}: nodeMenu.decrementTier translation is required.`,
    );
}
```

Note: Skip validating the `"min"` key by regex — the string is too short and would produce false positives. The locale key's existence is implicitly validated by the `npm run check` build succeeding with the template that references it.

- [ ] **Step 2: Run tests and commit**

```bash
npm test
git add test/nodeContextMenuTierAction.test.ts
git commit -m "test: validate -Tier button and ghost Reset in node menu"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Verify:
1. Open a node context menu → grid shows +1/+10/+Tier (row 1), -1/-10/-Tier (row 2)
2. Reset appears below the grid as a full-width outline button with danger-colored border
3. -Tier decrements to previous tier boundary; shows "Min" label when in tier 1
4. Reset ghost button fills with danger-bg on hover
5. Single-level node shows only +Tier with Reset below (no -Tier, no ±1/±10)
6. All buttons show correct crystal costs
