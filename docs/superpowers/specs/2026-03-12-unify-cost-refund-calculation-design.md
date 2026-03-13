# Unify Cost/Refund Calculation Across Components

## Problem

Three UI surfaces display cost/refund values for node level changes:

1. **Node tooltip** (`Node.svelte`) — uses `getNodeActionPreview()` which calls `applyLevelChange()` + sums `getCostRange()` per delta. Correctly accounts for Sync mode.
2. **Context menu** (`NodeContentMenu.svelte`) — calls `getCostRange()` directly for the single target node. Does NOT account for Sync mode.
3. **Level-up splash** (`Tree.svelte`) — computes `totalCrystalDelta` via `getSkillLevelInfo().totalCostSpent` differences across deltas. Correctly accounts for Sync mode but uses a different code path.

When `NodeLevelBehavior.Sync` is on, clicking a node may also change ancestor/descendant levels. The context menu shows only the target node's cost, making it inconsistent with the tooltip and splash.

All three surfaces also use different calculation code paths for the same underlying computation.

## Solution

Extract shared cost calculation into two functions in `nodeActionPreview.ts`:

### New exports

**`sumDeltaCosts(nodes, levels, deltas) → number`**

Pure cost summation given pre-computed deltas. For each delta, looks up the node's `skillId` and calls `getCostRange(skillId, fromLevel, toLevel)`. Returns unsigned (always positive) total cost.

This is the reusable core — extracted from the existing inline loop in `getNodeActionPreview`.

**`computeTotalCost({ nodes, levels, index, targetLevel, nodeLevelBehavior }) → { totalCost, deltas }`**

Higher-level function that calls `applyLevelChange()` to compute deltas, then `sumDeltaCosts()` to sum costs. Used when the caller doesn't already have deltas.

### Consumer changes

**`getNodeActionPreview()`** — Replace the inline delta-summing loop (lines 66-77) with a call to `computeTotalCost`. Existing behavior and return type preserved.

**`NodeContentMenu.svelte`** — Replace direct `getCostRange()` calls in the `actionCosts` reactive block with `computeTotalCost()` calls. Each button (+1, +10, tier, -1, -10, reset) passes its known target level. Gets tree data via existing `getContext("tree")` Svelte context and imports the `nodeLevelBehavior` store. Remove `getCostRange` import.

**`Tree.svelte` `applyChange()`** — Replace inline `getSkillLevelInfo().totalCostSpent` difference loop with `sumDeltaCosts(nodes, prevLevels, deltas)`. Sign applied by caller: `isUp ? cost : -cost`.

**`Tree.svelte` `resetAllNodes()`** — Build a `LevelDelta[]` array from previous levels (each node's delta = `-level`), call `sumDeltaCosts()`, negate for refund.

### Sign convention

`sumDeltaCosts` always returns unsigned (positive). Direction is determined by each caller:

- **Tooltip**: `isRefund` boolean already tracks direction; display uses `+`/`-` prefix.
- **Context menu**: buttons are styled `positive`/`negative`; `crystalValue` is always a positive number.
- **Splash**: `crystalDelta` is signed — caller applies `isUp ? cost : -cost`.

### Unchanged components

- `Tooltip.svelte` — pure renderer, displays sections from tooltipStore.
- `NodeContextButton.svelte` — pure renderer, displays `crystalValue` prop.
- `LevelUpSplash.svelte` — pure renderer, receives `crystalDelta` from Tree.svelte.

## Equivalence verification

`getCostRange(skillId, 0, level)` equals `getSkillLevelInfo(skillId, level, maxLevel).totalCostSpent` — both sum the same `costs[]` array over `[0, level)`. This ensures switching `Tree.svelte` from `totalCostSpent` differences to `getCostRange` via `sumDeltaCosts` produces identical results.
