# Tooltip Action Preview Design

## Problem

The node tooltip currently shows only the tech crystal cost for the clicked node itself. It lacks:

1. **Total recursive cost** — when `NodeLevelBehavior.Sync` is active, clicking a node propagates level changes to ancestors/descendants, but the tooltip only shows the single-node cost.
2. **Resulting level** — the user has no preview of what level the node will land on after clicking.

Additionally, the tooltip's `TooltipContent` type is hardcoded to `{ line1, costLine, costLineRefund }`, coupling the tooltip system to node-specific cost data.

## Design

### 1. Generalized TooltipContent type (`tooltip.ts`)

Replace the current structured content type with an array of typed sections:

```ts
export type TooltipSection =
    | { type: "text"; value: string }
    | { type: "crystal-cost"; value: string; refund: boolean }
    | { type: "level-preview"; from: number; to: number };

export type TooltipContent = string | TooltipSection[];
```

- `"text"` — plain label line (replaces `line1`)
- `"crystal-cost"` — crystal icon + formatted cost, with refund styling (replaces `costLine`/`costLineRefund`)
- `"level-preview"` — shows "Lv. {from} -> {to}"

`TooltipParam` keeps its shape (`TooltipContent | { content: TooltipContent; hoverOnly: boolean }`).

`TooltipState` changes internal fields from `text`/`costLine`/`costLineRefund` to `sections: TooltipSection[]`.

#### Internal function changes in `tooltip.ts`

- `normalizeContent(value)`: converts a plain `string` to `[{ type: "text", value }]`; converts empty string to `[]`; passes `TooltipSection[]` through as-is.
- `parseTooltipParam(value)`: returns `{ sections: TooltipSection[]; hoverOnly: boolean }` instead of the old `{ text, costLine, costLineRefund, hoverOnly }`.
- `hasContent()`: changes from `!!text || !!costLine` to `sections.length > 0`.
- `showTooltip(owner, sections, point)`: takes `sections: TooltipSection[]` instead of separate `text`/`costLine`/`costLineRefund` args.
- `updateTooltipText(owner, sections)`: same — takes `sections` instead of individual fields.
- `hideTooltip(owner?)`: sets `sections: []` on reset.

### 2. Tooltip.svelte rendering

Replace the current if/else rendering with iteration over `sections`:

```svelte
{#each $tooltipStore.sections as section}
    {#if section.type === "text"}
        <div class="tooltip-line">{section.value}</div>
    {:else if section.type === "crystal-cost"}
        <div class="tooltip-cost-line" class:refund={section.refund}>
            <TechCrystalIcon size={14} weight="fill" class="tooltip-cost-icon" />
            <span class="tooltip-cost-value">{section.refund ? "+" : "-"}{section.value}</span>
        </div>
    {:else if section.type === "level-preview"}
        <div class="tooltip-level-line">Lv. {section.from} → {section.to}</div>
    {/if}
{/each}
```

New `tooltip-level-line` class gets minimal styling (same font as cost line, muted color).

### 3. `getNodeActionPreview` utility (`src/lib/nodeActionPreview.ts`)

New pure function:

```ts
export type NodeActionPreview = {
    targetLevel: number;
    totalCost: number;
    isRefund: boolean;
};

export function getNodeActionPreview(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    action: NodePrimaryAction;
    nodeLevelBehavior: NodeLevelBehavior;
    isRefund: boolean;
}): NodeActionPreview | null;
```

Logic:

1. Based on `action` and `isRefund`, compute `targetLevel`: for increment, add 1/10/tier; for refund, subtract 1/10/tier. Clamp to `[0, maxLevel]`. For `maxLevel: 1` nodes, all action types behave identically to +1/-1 after clamping.
2. Return `null` if `targetLevel === currentLevel` (no change possible — e.g., refund at level 0, increment at maxLevel).
3. Call `applyLevelChange()` to get all `deltas` (includes propagated ancestor/descendant changes in Sync mode; single delta in Solo mode).
4. Sum costs: for each `{ index, delta }`, call `getCostRange(skillId, fromLevel, toLevel)`. `totalCost` = sum of all delta costs.

Reuses `applyLevelChange` and `getCostRange` directly — no duplication of leveling logic.

### 4. Tree context & Node.svelte integration

#### Tree context type

```ts
import type { Writable } from "svelte/store";
import type { Node, LevelsByIndex } from "../types/tree";

export type TreeContext = Writable<{ nodes: Node[]; levels: LevelsByIndex }>;
```

The context key is a string constant `"tree"`.

#### Tree.svelte

- Creates a `writable<{ nodes: Node[]; levels: LevelsByIndex }>` store.
- Sets it as Svelte context via `setContext("tree", store)`.
- Updates the store whenever `levels` changes (in `updateLevels`).

#### Node.svelte

- Uses `getContext("tree")` to access tree data store.
- Removes direct `getPrimaryActionCost` import and computation.
- Imports `nodeLevelBehavior` store.
- Calls `getNodeActionPreview()` reactively with tree data + own props + store values.
- **Guard logic**: The existing guards remain — when `state === "locked" && isGlobalIncrementLocked`, the node suppresses the preview entirely (no cost, no level preview shown). When `isMaxed` and not refunding, preview returns `null` naturally (target === current). The `getNodeActionPreview` function itself does not need state/lock awareness; the caller (Node.svelte) handles this, same as the current pattern.
- Builds `TooltipSection[]` from the preview, in this order:
  1. `{ type: "text" }` for skill name (only when `showSkillName` is off)
  2. `{ type: "level-preview", from: level, to: preview.targetLevel }`
  3. `{ type: "crystal-cost", value: formatNumber(preview.totalCost), refund: preview.isRefund }`
- When preview is `null` (no action possible), tooltip shows only the text section (skill name) or nothing.
- Passes sections to `use:tooltip`.

### 5. Cleanup

- Delete `getPrimaryActionCost` from `nodePrimaryActionStore.ts` (no callers remain).
- Remove all old `TooltipContent` fields (`line1`, `costLine`, `costLineRefund`) from types and store.
- No backwards compatibility shims. All callers updated in the same change.

## Files changed

| File | Change |
|------|--------|
| `src/lib/tooltip.ts` | New `TooltipSection` type, `TooltipContent` becomes `string \| TooltipSection[]`, `TooltipState` uses `sections`, update all internal functions (`normalizeContent`, `parseTooltipParam`, `hasContent`, `showTooltip`, `updateTooltipText`, `hideTooltip`) |
| `src/lib/Tooltip.svelte` | Render `sections` array instead of hardcoded fields, add `tooltip-level-line` style |
| `src/lib/nodeActionPreview.ts` | New file with `getNodeActionPreview` and `NodeActionPreview` type |
| `src/lib/Node.svelte` | Use `getContext` for tree data, call `getNodeActionPreview`, build `TooltipSection[]`, remove `getPrimaryActionCost` usage |
| `src/lib/Tree.svelte` | `setContext` with writable tree data store, update on level changes |
| `src/lib/nodePrimaryActionStore.ts` | Delete `getPrimaryActionCost` and its imports (`getCostRange`, tier functions) |
| `src/lib/Button.svelte` | Imports `TooltipContent` — type changes shape but all Button callers pass plain strings, so no code change needed (verified) |

## Known limitation

The `getNodeActionPreview` function does not simulate the `shouldBlockIncrementForGlobalLeafCap` check that Tree.svelte performs at click time. A globally-capped leaf node's tooltip may show a preview for an action that would be rejected. However, Node.svelte already receives `isGlobalIncrementLocked` and suppresses the preview when `state === "locked" && isGlobalIncrementLocked`, which covers the visible case. The edge case where a node is `available` but still blocked by the cap at click time is accepted as a minor discrepancy.

## Tests

New file `test/nodeActionPreview.test.ts` covering:

- IncrementOne at level 0 (basic upgrade)
- IncrementOne at maxLevel (returns null)
- Refund at level 0 (returns null)
- IncrementTen with clamping to maxLevel
- IncrementTier target level computation
- Sync mode: totalCost includes ancestor/descendant propagation costs
- Solo mode: totalCost equals single-node cost only
- maxLevel 1 nodes (final_damage_boost): all actions behave as +1/-1
