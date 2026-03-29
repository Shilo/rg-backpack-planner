# Compare Image Export Design

## Overview

When comparison mode is active, the "Share Image" action in the Statistics page produces a compare-specific canvas image instead of the normal single-build stats card. The image shows both build names, a diff pill per row, the active build's values (left, color-coded), and the reference build's values (right, always white).

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ [3px accent bar]                                     │
├─────────────────────────────────────────────────────┤
│ ✎ My Main Build          vs        Guardian Max Build│  ← "vs" header
├─────────────────────────────────────────────────────┤
│ 📈 BACKPACK BONUS          My Build            Ref   │  ← first section header (with col labels)
│ Carry Weight     [+25% ▲]     75%              50%   │
│ Pickup Range     [−10% ▼]     20%              30%   │
│ Move Speed          [–]       15%              15%   │
├─────────────────────────────────────────────────────┤
│ 💎 TECH CRYSTALS SPENT                               │  ← subsequent section headers (no col labels)
│ Total            [+50 ▲]     350              300    │
│ Guardian            [–]      130              130    │
│ Vanguard         [−30 ▼]      80              110    │
├─────────────────────────────────────────────────────┤
│ ⬆ NODE LEVELS                                        │
│ Total            [+12 ▲]      87               75    │
│ ...                                                  │
└─────────────────────────────────────────────────────┘
```

## Color Rules

| Condition        | Active value color          | Reference value color | Diff pill          |
|------------------|-----------------------------|----------------------|--------------------|
| A > B (higher)   | green (`#4caf50` / CSS var) | white (`--text`)     | muted gray, border |
| A < B (lower)    | red (`--accent-danger`)     | white (`--text`)     | muted gray, border |
| A = B (equal)    | white (`--text`)            | white (`--text`)     | faint/dim pill     |

Diff pill text: `+X ▲` / `−X ▼` / `–`. The pill always uses muted gray text regardless of direction — color information is carried by the active value column only.

Tech Crystals Spent uses the same color logic as all other rows (higher = green). No inversion.

## Column Order

Always **buildA left, buildB right** — same fixed perspective as the text export (`CompareTable.buildCompareText`). The `activeSide` field is only used to determine which side reads from live stores vs. a computed snapshot.

The "vs" header shows buildA name on the left with accent color (no icon — canvas draws text only, not Phosphor SVGs), buildB name on the right with muted color. Names truncate with ellipsis if too long.

## Data Flow

### `compareImageGenerator.ts`

```
get(compareState)             → buildA, buildB, activeSide
get(activeTabs)               → tabs for computeCompareStats
live stores                   → skillBonuses, techCrystalsSpent, treeLevels, etc.
computeCompareStats(frozen)   → stats for the non-active side

buildCompareSections(...)     → CompareSection[]   (same helper used by SideMenuStatisticsPage)

renderCompareImage({
  labelA, labelB,
  sections: CompareSection[],
  activeSide
})                            → Promise<Blob | null>
```

### `compareImageRenderer.ts`

Pure canvas function. No Svelte, no store access.

**Input type:**

```ts
// CompareSection / CompareRow are imported from CompareTable.svelte module context
export type CompareImageData = {
  labelA: string;
  labelB: string;
  activeSide: "a" | "b";
  sections: CompareSection[];
};
```

**Canvas implementation:**
- Resolves theme colors via `getComputedStyle(document.documentElement)` (same pattern as `statsImageRenderer.ts`)
- Imports `EXPORT_DPR`, `EXPORT_MIME` from `../buildImageExport/imageFormat`
- Two-pass rendering: measure pass (off-screen canvas) to compute column widths, draw pass
- Column widths: label col, diff col (max pill text width), valueA col, valueB col — all measured from real text
- Section header rows span full width; first section header includes column label text (labelA / labelB) right-aligned

## Shared Helper: `buildCompareSections()`

Added to `compareStats.ts`. Accepts compare state, tabs, live store values, and a translate function. Returns `CompareSection[]`. Eliminates duplication between `SideMenuStatisticsPage` and `compareImageGenerator`.

```ts
export function buildCompareSections(
  state: CompareState,
  tabs: TabConfig[],
  live: {
    skillBonuses: Map<SkillId, number>;
    techCrystalsSpent: number;
    techCrystalsSpentByTree: number[];
    treeLevelsTotal: number;
    treeLevelsByTree: number[];
  },
  translate: (key: string) => string,
): CompareSection[];
```

## Integration in `SideMenuStatisticsPage.svelte`

**`compareSections` reactive block:** Replace inline computation with `buildCompareSections(...)` call.

**`withStatsImage()`:** Add a branch at the top:

```ts
if (get(compareState).isComparing) {
  const { generateCompareImageBlob } = await import("../compare/compareImageGenerator");
  blob = await generateCompareImageBlob();
} else {
  const { generateStatsImageBlob } = await import("../buildImageExport/statsImageGenerator");
  blob = await generateStatsImageBlob();
}
```

## File Structure

### New files

- `src/lib/compare/compareImageRenderer.ts` — pure canvas drawing
- `src/lib/compare/compareImageGenerator.ts` — store reads + calls renderer

### Modified files

- `src/lib/compare/compareStats.ts` — add `buildCompareSections()` export
- `src/lib/sideMenuPages/SideMenuStatisticsPage.svelte` — use `buildCompareSections()`, branch `withStatsImage()`

### Untouched files

`statsImageGenerator.ts`, `statsImageRenderer.ts`, `CompareTable.svelte`, `CodeBlockTable.svelte`, `compareStore.ts`, all other existing files.
