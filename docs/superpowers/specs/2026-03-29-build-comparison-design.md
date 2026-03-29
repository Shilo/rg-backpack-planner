# Build Comparison Feature Design

## Overview

Stats-only build comparison in the statistics side menu page. Users compare the active (editable) build against a frozen reference build. The active build is always the left column; the reference is always the right column. A segmented toggle lets users swap which build is active, using the same `applyBuildData` flow as preset switching.

## Comparison Modes

Three comparison pairings are supported:

- Personal build vs personal build
- Personal build vs preview/recommended build
- Preview build vs personal/recommended build

## Entry Points

### Statistics header (primary)

A compare icon button (⚖) sits next to the existing share icon in the `SideMenuSection` header. Tapping opens `CompareBuildsMenu` — a context menu with three sections:

1. **Personal Presets** — all saved presets except the currently active one. Name only.
2. **Recommended Builds** — from `buildData/recommended.ts`. Name + tech crystals cost.
3. **From Code** — opens the same "load from code" input used by the preview dropdown.

Selecting any option decodes the build, calls `startCompare()`, and closes the menu. Tapping the compare icon again while comparing calls `stopCompare()` (toggle behavior).

### Build preset context menu (secondary)

Each preset's three-dots submenu in `BuildPresetsButton` gains a "Compare with active" option (hidden for the currently active preset). Calls `startCompare()` with the decoded preset data.

### Preview context menu (secondary)

`PreviewContextMenuList` gains a "Compare with..." option that opens the `CompareBuildsMenu`.

### Recommended builds dropdown (secondary)

Each recommended build in `PreviewBuildsDropdown` gains a "Compare with active" action. Calls `startCompare()` with the decoded recommended build data.

## Statistics Page Behavior

### Default (not comparing)

No changes. Single-column stats table via `CodeBlockTable`. Compare icon is muted.

### Comparison mode

1. **Compare icon turns accent color** to indicate active state.
2. **Segmented toggle** appears above the stats card: active build name (left, highlighted) | reference build name (right, muted). Tapping the inactive side triggers `swapBuilds()`.
3. **`CompareTable` replaces `CodeBlockTable`** — 4-column layout:
   - Column 1: Label (skill name, tree name, etc.)
   - Column 2: Indicator — `▲` green (active higher), `▼` red (active lower), `•` muted (equal)
   - Column 3: Active build value (accent color)
   - Column 4: Reference build value (secondary color, lower opacity)
4. **Section headers** (Backpack Bonus, Tech Crystals Spent, Node Levels) span all columns.
5. **Tech Crystals Spent inverts indicator color** — spending more is `▲` red (cost is negative), spending less is `▼` green.

## Swap Mechanics

When the user taps the inactive side of the segmented toggle:

1. **Snapshot current active build** — read `treeLevels` and `techCrystalsOwned` from stores, plus current `activeBuildName`.
2. **Apply reference build** — call `applyBuildData(tabs, referenceBuild)`. This is the same function used by preset switching and preview loading.
3. **Store snapshot as new reference** — the old active build's data and label become the new `referenceBuild` and `referenceLabel`.
4. **Persistence follows existing rules** — personal mode updates localStorage via `updateActivePresetBuildCode()`. Preview mode updates URL hash.

The swap is symmetrical. The reference is always a frozen snapshot. Only the active build is live and editable.

## Comparison Store (`compareStore.ts`)

State:

- `isComparing: boolean` — whether comparison mode is active
- `referenceBuild: { trees: number[][], owned: number } | null` — decoded reference build data
- `referenceLabel: string` — display name of the reference build
- `referenceSource: "preset" | "preview" | "recommended" | null` — where the reference came from

Actions:

- `startCompare(buildData, name, source)` — sets `isComparing = true`, stores reference build data, label, and source
- `stopCompare()` — sets `isComparing = false`, clears reference data
- `swapBuilds(tabs)` — snapshots active, applies reference via `applyBuildData`, stores snapshot as new reference

## Reference Stats Computation (`compareStats.ts`)

Pure helper functions that compute stats from a reference build snapshot using existing functions:

- `computeReferenceSkillBonuses(referenceBuild, tabs)` — wraps `computeSkillBonuses()`
- `computeReferenceTechCrystals(referenceBuild, tabs)` — wraps `calculateTechCrystalsSpent()` and per-tree variants
- `computeReferenceTreeLevels(referenceBuild)` — sums tree levels per tree and total

These are called reactively in the statistics page when `referenceBuild` changes. No new derived stores.

## File Structure

### New files (all in `src/lib/compare/`)

- `compareStore.ts` — comparison state and actions
- `CompareTable.svelte` — 4-column comparison table component
- `CompareBuildsMenu.svelte` — context menu for picking a comparison target
- `compareStats.ts` — pure helpers for computing reference build stats

### Modified files (additive only)

- `SideMenuStatisticsPage.svelte` — import compare store, conditionally render `CompareTable` vs `CodeBlockTable`, add compare icon button, render segmented toggle and `CompareBuildsMenu`
- `BuildPresetsButton.svelte` — add "Compare with active" menu item calling `startCompare()`
- `PreviewContextMenuList.svelte` — add "Compare with..." menu item
- `PreviewBuildsDropdown.svelte` — add "Compare with active" action per recommended build

### Untouched files

`CodeBlockTable.svelte`, `Button.svelte`, `ContextMenu.svelte`, `SideMenuSection.svelte`, `Tree.svelte`, `buildPresetsStore.ts`, `treeLevelsStore.ts`, `techCrystalStore.ts`, `skillBonusStore.ts`, and all other existing stores and components.

## UI Details

### Indicator symbols and colors

| Condition | Symbol | Color |
|-----------|--------|-------|
| Active higher (bonuses/levels) | ▲ | Green |
| Active lower (bonuses/levels) | ▼ | Red |
| Equal | • | Muted/gray |
| Active higher (TC spent) | ▲ | Red (spending more is negative) |
| Active lower (TC spent) | ▼ | Green (spending less is positive) |

### Segmented toggle

- Full-width bar above the stats card
- Two segments: active build (left, highlighted background, accent color, pencil icon) | reference build (right, muted)
- Tapping the inactive segment triggers swap
- Build names truncate with ellipsis if too long

### Compare icon button

- Same size and style as the existing share icon button (20x20, muted color, no background)
- Turns accent color when comparison is active
- Position: to the left of the share icon in the section header

### Auto-exit comparison

Comparison mode automatically exits (`stopCompare()`) when:

- The user switches to a different preset via `BuildPresetsButton`
- The user exits preview mode (page reload)
- The user loads a build from code into preview mode

This prevents stale reference data from persisting across build context changes.

### Mobile considerations

- 4-column table fits on small screens because: labels truncate, indicator column is narrow (16px), values are short numbers/percentages
- Segmented toggle is full-width and touch-friendly (minimum 44px tap target per segment)
- Compare builds menu uses existing `ContextMenu` which already handles mobile positioning
