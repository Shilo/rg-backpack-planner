# Node Content Menu: Add -Tier & Relocate Reset

**Date:** 2026-03-19
**Chosen Design:** Option F (full-width outline/ghost button below symmetric grid)

## Problem

The current `NodeContentMenu` button grid has an asymmetric layout:

```
+1    +10    +Tier
-1    -10    Reset
```

- No **-Tier** button exists, so users must repeatedly click -10 or -1 to undo a tier.
- **Reset** occupies the slot where -Tier should be, making it easy to misclick Reset when intending -10.
- Reset is a rarely-used, instant destructive action sharing visual weight with frequently-used buttons.

## Design

### New layout

```
+1      +10      +Tier
-1      -10      -Tier
  ┌──────────────────┐
  │   ↺ Reset  💎+600│   ← full-width ghost button (Option F)
  └──────────────────┘
```

- The 3x2 grid becomes fully symmetric: every increment has its inverse directly below.
- Reset moves below the grid as a **full-width outline/ghost button**: danger-colored border, transparent background, fills with `danger-bg` on hover.
- Reset retains its crystal cost display, icon, toast, and disabled state behavior.

### Ghost button style

A new `ghost` variant on `Button.svelte`:

- **Default:** `border: var(--danger-border)`, `background: transparent`, `color: var(--danger-text)`
- **Hover:** `background: var(--danger-bg)`
- **Disabled:** Same as other disabled buttons (opacity 0.5, `bg-input`, `border-subtle`, `text-disabled`)
- **No new CSS variables needed** — all values already exist in the theme engine.

The ghost variant is generic (not hardcoded to danger). It sets `background: transparent` and shows the background fill on hover. Combined with the existing `negative` prop, it produces the danger-themed outline look. This makes `ghost` reusable for future outline buttons of any semantic color.

### -Tier behavior

`-Tier` is the inverse of `+Tier`. It uses a new `previousTierTargetLevel` function:

- If at a tier boundary (e.g. level 60 = top of tier 3 for maxLevel 100), target the previous tier boundary (level 40 = top of tier 2).
- If mid-tier (e.g. level 55), target the lower boundary of the current tier (level 40).
- If in tier 1 (level 1-20), target level 0.
- If level is 0, disabled.

The label shows "-Tier" normally, or "Min" when level is already within tier 1 (mirrors how +Tier shows "Max" when near the top).

### Single-level nodes (maxLevel <= 1)

No change. The `isSingleLevel` branch already hides the ±1/±10 buttons and only shows +Tier/Max. With this design, single-level nodes show:

```
  +Tier (or Max)
  ┌──────────────┐
  │   ↺ Reset    │
  └──────────────┘
```

The -Tier button is hidden for single-level nodes (same conditional as ±1/±10), since +Tier toggles between 0 and 1.

## Already Implemented (from input system rework)

- `previousTierTargetLevel(level, maxLevel)` in `src/lib/tierLeveling.ts` — fully implemented.
- `levelDownTier(index)` handler in `src/lib/Tree.svelte` — fully implemented, available in `nodeCallbacks.decrementTier`.

## Remaining Changes

### 1. `src/lib/Button.svelte`

Add `ghost` boolean prop:

- New CSS class `.button-ghost` that sets `background: transparent`.
- On hover, inherits the semantic background from the variant (e.g. `.button-negative.button-ghost:hover` gets `background: var(--danger-bg)`).
- Works in combination with `negative`, `positive`, or `accent` props.

### 2. `src/lib/NodeContentMenu.svelte`

- Add `onDecrementTier` callback prop.
- Add `-Tier` button using `NodeContextButton` in the grid (position row 2, column 3), inside the existing `!isSingleLevel` conditional.
- Move Reset button outside `button-grid` div. Render it as a `Button` component with `ghost` + `negative` props, full width.
- Add `decrementTier` cost to `actionCosts` reactive block.
- Compute `previousTierTargetLevel` for the -Tier label (show "Min" when appropriate).

### 3. `src/lib/Tree.svelte`

- Pass `onDecrementTier` to `NodeContentMenu`, wiring `nodeCallbacks.decrementTier`.
- (`levelDownTier` handler already exists — just needs wiring to the menu.)

### 4. `src/locales/*.json` (en, fr, ja, zh)

Add keys:
- `nodeMenu.decrementTier`: "-Tier"
- `nodeMenu.min`: "Min"

### 5. `src/lib/nodeActionPreview.ts`

No changes — `computeTotalCost` already accepts any `targetLevel`. The new `-Tier` action just passes `previousTierTargetLevel(level, maxLevel)` as the target.

## Not in scope

- Confirmation dialog for Reset (it's instant today, stays instant).
- Changes to `themeEngine.ts` (all needed CSS variables already exist).
- Changes to `NodeContextButton.svelte` (the grid buttons stay the same; only Reset changes to use `Button`).
