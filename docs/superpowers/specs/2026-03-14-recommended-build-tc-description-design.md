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

- Iterates over the 3 trees; for each node, calls `getSkillLevelInfo(skillId, level, maxLevel).totalCostSpent`
- `techCrystalsFromActivePreset` is refactored to call this function, removing its inline duplicate logic
- No behavior change to existing derived stores

### 2. `src/lib/Button.svelte` — Add `descriptionIcon` prop

- New prop: `export let descriptionIcon: Component | null = null`
- When `description` is set and `descriptionIcon` is provided, renders the icon inline before the description text inside `.button-description`
- `.button-description` gains `display: flex; align-items: center; gap: var(--spacing-xs)`
- Icon rendered via `<svelte:component>` at `size={12}`, `aria-hidden={true}`, class `button-description-icon`
- No changes to the main `icon` prop, `with-icon` class logic, or any other Button behavior

### 3. `src/lib/buttons/PreviewBuildsDropdown.svelte` — Wire TC count

- Import `TechCrystalIcon` from `../customIcons`
- Import `calculateTechCrystalsSpent` from `../techCrystalStore`
- Import `decodeBuildData` from `../buildData/encoder`
- Subscribe to `$activeTabs` from `../techCrystalStore`
- In the `$: premadeBuilds` reactive declaration, decode each build and compute `tcSpent = calculateTechCrystalsSpent(buildData.trees, $activeTabs)` (0 if decode fails)
- Pass `description={tcSpent.toLocaleString()}` and `descriptionIcon={TechCrystalIcon}` to each premade `Button`

## Regression Concerns

- `Button.svelte`: `descriptionIcon` defaults to `null`; all existing usages of `description` without `descriptionIcon` are unaffected. The only CSS change (adding `display: flex` to `.button-description`) applies only when `description` is set, which is already gated.
- `techCrystalStore.ts`: The extracted function is additive; `techCrystalsFromActivePreset` behavior is preserved by delegating to it.
- `PreviewBuildsDropdown.svelte`: `decodeBuildData` is already called for these same encoded strings in `recommended.ts`; the additional decode call is redundant but not incorrect. TC is 0 on decode failure (graceful degradation).

## Number Format

TC spent is formatted with `toLocaleString()` (locale-aware thousands separator, e.g. `52,400`).
