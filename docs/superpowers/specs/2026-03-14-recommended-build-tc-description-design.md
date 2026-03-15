# Design: Tech Crystal Count in Recommended Build Buttons

**Date:** 2026-03-14

## Overview

Each button in the `PreviewBuildsDropdown` recommended list will display a secondary description line showing the tech crystals (TC) spent for that build, with the `TechCrystalIcon` rendered inline before the number.

## Changes

### 1. `src/lib/techCrystalStore.ts` — Extract pure helper

Add an exported pure function `calculateTechCrystalsSpent` that computes total TC spent given a build's tree levels and the active tab configs:

```ts
export function calculateTechCrystalsSpent(
    trees: number[][],
    tabs: TabConfig[],
): number
```

**Scope: this is a refactor only — no logic is invented or changed.**

- The function body is the existing inline calculation extracted verbatim from `techCrystalsFromActivePreset`.
- Iterates over the 3 trees; for each node, skips if `!node || !level` (matching the existing guard in `techCrystalsFromActivePreset`), then calls `getSkillLevelInfo(skillId, level, maxLevel).totalCostSpent`.
- The `!level` guard is preserved from `techCrystalsFromActivePreset`. `getSkillLevelInfo` at level 0 returns `totalCostSpent = 0` regardless, so the guard is safe to include and is kept to match the existing implementation exactly.
- `techCrystalsFromActivePreset` is refactored to delegate to this function; its behavior is preserved exactly because the function uses the same guard logic.
- `techCrystalsSpentByTree`, `techCrystalsSpent`, and all their dependents are **not touched**. `SideMenuStatisticsPage.svelte` uses `techCrystalsSpent` which flows from `techCrystalsSpentByTree` — that entire code path is unchanged.
- If `tabs` is empty or a tab index has no corresponding entry, the tree returns 0 (graceful degradation).

### 2. `src/lib/Button.svelte` — Add `descriptionIcon` prop

- New prop: `export let descriptionIcon: Component | null = null`
- When `description` is set and `descriptionIcon` is provided, renders the icon inline before the description text inside `.button-description`
- `.button-description` gains `display: flex; align-items: center; gap: var(--spacing-xs)`
- Icon rendered via `<svelte:component>` at `size={12}`, `aria-hidden={true}`, class `button-description-icon`
- No changes to the main `icon` prop, `with-icon` class logic, or any other Button behavior

### 3. `src/lib/buttons/PreviewBuildsDropdown.svelte` — Wire TC count

- Import `TechCrystalIcon` from `../customIcons`
- Import `calculateTechCrystalsSpent` and `activeTabs` from `../techCrystalStore`
- Import `decodeBuildData` from `../buildData/encoder`
- In the `$: premadeBuilds` reactive declaration, subscribe to `$activeTabs` and decode each build to compute `tcSpent = calculateTechCrystalsSpent(buildData.trees, $activeTabs)` (0 if decode fails)
- Pass `description={tcSpent.toLocaleString()}` and `descriptionIcon={TechCrystalIcon}` to each premade `Button`

## Regression Concerns

### Button.svelte — CSS change

`descriptionIcon` defaults to `null`. The CSS rule `display: flex; align-items: center; gap: var(--spacing-xs)` is added unconditionally to `.button-description`. This is safe for all existing `description`-only usages because:
- `.button-description` is a child of `.button-text-group`, which is already a column flex container; changing the span's own display type from inline to flex is absorbed by the parent layout.
- With only a single text child and no icon, `display: flex` and `gap` have no visual effect.
- There is no existing caller that passes `description` with multiple children that would be affected by the new flex context.

### techCrystalStore.ts — Refactor

`techCrystalsFromActivePreset` behavior is preserved exactly because `calculateTechCrystalsSpent` uses the same `!level` guard. The `techCrystalsSpentByTree` derived store is not touched and retains its own (guardless) implementation.

### PreviewBuildsDropdown.svelte — Decode cost and `activeTabs` timing

`decodeBuildData` is called again per reactive tick (locale change, `activeTabs` change) for each of the 5 recommended builds. Since the encoded strings are static (from `package.json` at build time), the results never differ between calls. The per-tick decode cost is acceptable given the small number of builds and infrequent reactive updates.

`activeTabs` is initialized as `writable([])` and populated by `initTechCrystalTrees` at app startup, before any user interaction can open this dropdown. If `$activeTabs` is empty, `calculateTechCrystalsSpent` returns 0 for all builds — this is an acceptable transient state, and in practice the dropdown is never rendered before initialization completes.

## Number Format

TC spent is formatted with `toLocaleString()` (locale-aware thousands separator, e.g. `52,400`).
