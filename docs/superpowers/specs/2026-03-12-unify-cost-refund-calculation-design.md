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

Pure cost summation given pre-computed deltas. For each delta, looks up the node's `skillId` and calls `getCostRange(skillId, fromLevel, toLevel)`. Skips nodes without a `skillId` (matching existing behavior in `getNodeActionPreview`). Returns unsigned (always positive) total cost.

This is the reusable core — extracted from the existing inline loop in `getNodeActionPreview`.

**`computeTotalCost({ nodes, levels, index, targetLevel, nodeLevelBehavior }) → { totalCost, deltas }`**

Higher-level function that calls `applyLevelChange()` to compute deltas, then `sumDeltaCosts()` to sum costs. Used when the caller doesn't already have deltas.

### Consumer changes

**`getNodeActionPreview()`** — Replace the inline delta-summing loop (lines 66-77) with a call to `computeTotalCost`. Existing behavior and return type preserved.

**`NodeContentMenu.svelte`** — Replace direct `getCostRange()` calls in the `actionCosts` reactive block with `computeTotalCost()` calls. Each button (+1, +10, tier, -1, -10, reset) passes its known target level. Gets tree data via existing `getContext("tree")` Svelte context and imports the `nodeLevelBehavior` store. Existing `level`/`maxLevel` props are retained for display purposes; only cost computation changes. Remove `getCostRange` import. Note: this means 6 calls to `applyLevelChange` per reactive update, which is acceptable given the small tree sizes.

**`Tree.svelte` `applyChange()`** — Replace inline `getSkillLevelInfo().totalCostSpent` difference loop with `sumDeltaCosts(nodes, prevLevels, deltas)`. Uses `sumDeltaCosts` directly (not `computeTotalCost`) because `applyChange` already calls `applyLevelChange` and needs the `nextLevels` array for the global leaf cap check and splash construction. Sign applied by caller: `isUp ? cost : -cost`.

**`Tree.svelte` `resetAllNodes()`** — Build a `LevelDelta[]` array from previous levels (each node's delta = `-level`), call `sumDeltaCosts()`, negate for refund.

**Tests** — `test/nodeContentMenuTierAction.test.ts` matches `getCostRange` in source text assertions; update to reflect the new `computeTotalCost` calls.

### Sign convention

`sumDeltaCosts` always returns unsigned (positive). Direction is determined by each caller:

- **Tooltip**: `isRefund` boolean already tracks direction; display uses `+`/`-` prefix.
- **Context menu**: buttons are styled `positive`/`negative`; `crystalValue` is always a positive number.
- **Splash**: `crystalDelta` is signed — caller applies `isUp ? cost : -cost`.

### Unchanged components

- `Tooltip.svelte` — pure renderer, displays sections from tooltipStore.
- `NodeContextButton.svelte` — pure renderer, displays `crystalValue` prop.
- `LevelUpSplash.svelte` — pure renderer, receives `crystalDelta` from Tree.svelte.
- `techCrystalStore.ts` — computes absolute totals across entire trees (not action deltas), so it does not fit the `sumDeltaCosts` pattern.

## Key invariant

Within a single `applyLevelChange` call, all deltas share the same sign direction: increments produce all-positive deltas (target + ancestors up), decrements produce all-negative deltas (target + descendants down). This is why the unsigned-sum-then-apply-sign approach is safe. If `applyLevelChange` ever produced mixed-sign deltas, the caller would need per-delta signing instead.

## Equivalence verification

Two equivalences make this unification safe:

1. **`resetAllNodes` case**: `getCostRange(skillId, 0, level)` equals `getSkillLevelInfo(skillId, level, maxLevel).totalCostSpent` — both sum `costs[0..level)`.

2. **`applyChange` case** (telescoping): `getSkillLevelInfo(skillId, b, max).totalCostSpent - getSkillLevelInfo(skillId, a, max).totalCostSpent` equals `getCostRange(skillId, a, b)` — the difference of two cumulative sums equals the range sum.
