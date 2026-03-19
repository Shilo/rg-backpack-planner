# Undo/Redo System Design

## Problem

Users accidentally click nodes, click the wrong button, or have budget enforcement apply levels in unexpected ways. There is no way to reverse a single action — the only recovery is manual re-leveling or a full tree reset.

## Decisions

| Decision | Choice |
|----------|--------|
| Undo granularity | One click = one undo step (includes sync lineage, budget capping, resets) |
| Persistence | Ephemeral (memory only, lost on refresh) |
| Scope | Global stack across all 3 trees |
| Tab behavior | Undo/redo auto-switches to the tree tab where the action occurred |
| Max history | 30 snapshots, FIFO eviction |
| Keyboard shortcuts | Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo) |
| UI placement | Unified toolbar pill in top-right HUD (option B), option C (bottom-right float) as fallback |
| Reset icon | Changes from ArrowCounterClockwise to Trash (HUD button + modal) |
| Button sizing | Match existing HUD button sizing |
| Snapshot strategy | Full-state snapshots (not deltas) |

## Architecture

### Snapshot Shape

```ts
type Snapshot = {
  treeLevels: LevelsByIndex[];  // all 3 trees, deep-copied
  techCrystalsOwned: number;
  activeTreeIndex: number;
};

type UndoHistory = {
  past: Snapshot[];     // max 30, oldest evicted first
  present: Snapshot;    // current state
  future: Snapshot[];   // redo stack, cleared on new action
};
```

### Store: `undoHistoryStore.ts`

New Svelte store managing the snapshot stack.

**API:**
- `pushSnapshot()` — deep-copies current state from `treeLevels`, `techCrystalsOwned`, and `activeTreeIndex`. Pushes `present` onto `past`, sets new `present`. Clears `future`. Evicts oldest entry if `past` exceeds 30.
- `undo()` — pops from `past` into `present`, pushes old `present` onto `future`. Applies snapshot to `treeLevels` and `techCrystalsOwned` stores. Returns the `activeTreeIndex` from the restored snapshot so the caller (App.svelte) can set the active tab.
- `redo()` — pops from `future` into `present`, pushes old `present` onto `past`. Applies snapshot to stores. Returns `activeTreeIndex` for the caller to apply.
- `canUndo` / `canRedo` — derived booleans for button disabled states.
- `clearHistory()` — resets `past` and `future` to empty arrays, re-snapshots `present` from current state.

### Integration Points

**`pushSnapshot()` called after:**
- `applyChange()` in `Tree.svelte` (all level-up/down, tier, +1/+10, budget capping, partial lineage fills)
- `resetTreeLevels()` / `resetTreeBranchLevels()` / `resetAllTreeLevels()` in `TreeTabs.svelte` (tree, branch, and full resets)

**`clearHistory()` called on:**
- Preset load/switch
- Build import from URL (share link)
- Preview mode enter/exit
- Onboarding preview start/end

This ensures undo never crosses a mode or preset boundary.

## UI: Toolbar Pill Component

### `UndoRedoToolbar.svelte`

Replaces the standalone `ActiveTreeResetButton` in the top-right HUD area of `App.svelte`.

**Structure:**
- Pill-shaped container with 3 icon buttons
- Undo: `ArrowArcLeftIcon` (phosphor-svelte)
- Redo: `ArrowArcRightIcon` (phosphor-svelte)
- Vertical divider (1px line)
- Reset: `TrashSimpleIcon` (phosphor-svelte, red/negative color)

**States:**
- Undo disabled (dimmed) when `canUndo` is false
- Redo disabled (dimmed) when `canRedo` is false
- Reset disabled when no levels allocated (existing logic)
- Pill always visible in the HUD (inherits `forceShow` pattern from `ActiveTreeResetButton`). Buttons are individually dimmed when disabled but the pill container never hides — this ensures discoverability and consistent HUD layout

**Behavior:**
- Undo/Redo call `undo()` / `redo()` from the history store
- Reset delegates to existing `openResetTreeChoicesModal()` (unchanged)
- Haptic feedback on all three buttons (existing `triggerHaptic()`)

### Reset Modal Update

`ResetTreeChoicesModal` receives `TrashSimpleIcon` as its `sheetIcon` prop instead of the current tree icon.

## Keyboard Shortcuts

Added to the existing `keydown` handler in `App.svelte`:
- `Ctrl+Z` → `undo()`
- `Ctrl+Y` → `redo()`
- `Ctrl+Shift+Z` → `redo()`

**Guards:**
- No-op when a modal is open
- No-op when an input/textarea is focused
- No-op during onboarding preview

## Accessibility

- Undo/Redo buttons use `aria-label` with magic strings ("Undo", "Redo") — no new locale keys
- Disabled state via `disabled` attribute
- Keyboard shortcuts are standard and don't conflict with screen reader bindings

## Edge Cases

- **Budget toggle change mid-session:** History remains valid — snapshots are full state.
- **Node level behavior change (Solo ↔ Sync):** Same — snapshots are state, not actions.
- **Rapid clicking:** No debounce. Each click = one snapshot. 30-entry cap handles rapid fire.
- **Tab auto-switch:** `undo()` / `redo()` returns `activeTreeIndex` from the snapshot. The caller in `App.svelte` sets the component-local `activeTreeIndex` variable (bound to `TreeTabs` via `bind:activeIndex`), so the user sees the relevant tree.
- **Preview mode boundary:** `clearHistory()` on enter/exit prevents undoing across modes.
- **Preset switch boundary:** `clearHistory()` on preset load prevents undoing into a different build.

## Files Affected

| File | Change |
|------|--------|
| `src/lib/undoHistoryStore.ts` | New — snapshot stack store |
| `src/lib/UndoRedoToolbar.svelte` | New — pill toolbar component with undo/redo/reset buttons. Passes `TrashSimpleIcon` as `sheetIcon` to `openResetTreeChoicesModal()` |
| `src/lib/Tree.svelte` | Add `pushSnapshot()` calls after `applyChange()` |
| `src/lib/TreeTabs.svelte` | Add `pushSnapshot()` calls after reset actions |
| `src/App.svelte` | Replace `ActiveTreeResetButton` with `UndoRedoToolbar`, add keyboard listener in existing `keydown` handler, add `clearHistory()` calls at mode/preset boundaries |
| `src/lib/ActiveTreeResetButton.svelte` | Deleted — reset logic moves into `UndoRedoToolbar` |
| `test/undoHistory.test.ts` | New — unit tests for the history store |
| `test/activeTreeResetSheet.test.ts` | Update or remove references to deleted `ActiveTreeResetButton` |
