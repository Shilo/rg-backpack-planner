# Primary Action Indicator — Design Spec

## Problem

Users cannot visually tell which NodePrimaryAction (`+1`, `+10`, `+Tier`) is currently active. The only ways to check are hovering a node tooltip (desktop-only) or opening Quick Settings — neither is a persistent, glanceable indicator.

## Solution

A new always-visible pill button in the bottom-left HUD that shows the current primary action state and lets users cycle through states by tapping/clicking.

## Component: `PrimaryActionIndicator.svelte`

### Placement

- **Position**: Bottom-left, above tab bar — mirrors `bot-right-actions` on the opposite side.
- **Container**: New `bot-left-actions` div inside `.hud-safe-area` in `App.svelte`.
- **CSS**: `position: absolute; bottom: calc(var(--tab-height) + var(--bar-pad)); left: 0;` — same pattern as `bot-right-actions` but anchored left. Safe-area insets are inherited from the `.hud-safe-area` parent container.
- **z-index**: `var(--z-index-hud)`, matching other HUD elements. Include `above-backdrop` class toggle for context menu overlay raise (same as `bot-right-actions`).

### Appearance

- **Size**: 38px height (matches UndoRedoToolbar), `border-radius: 999px`.
- **Content**: Phosphor caret icon + label text.
  - `+1`: `CaretUpIcon` + "+1"
  - `+10`: `CaretDoubleUpIcon` + "+10"
  - `+Tier`: `CaretLineUpIcon` + "+Tier"
- **Always visible**: No conditional hiding. The indicator renders unconditionally.

### Color Treatments

Implement **Style A (accent-tinted)** first. If it feels too prominent during review, fall back to B or C.

| Style | Background | Border | Text |
|-------|-----------|--------|------|
| **A: Accent** (primary) | `color-mix(in srgb, var(--accent) 12%, var(--bg-raised))` | `color-mix(in srgb, var(--accent) 28%, var(--border))` | accent-tinted text |
| **B: Subtle** (fallback) | `var(--bg-raised)` | `var(--border)` | `var(--text-muted)` |
| **C: Toolbar-matched** (fallback) | Same bg/border as UndoRedoToolbar | `var(--border)` | `var(--text-muted)` |

### Behavior

- **Click/tap**: Cycles `+1 → +10 → +Tier → +1` (wrap-around). Cycle logic: `(current + 1) % 3`.
- **Haptic**: Triggers `triggerHaptic()` on cycle.
- **Toast**: Shows toast on change using the existing `showSettingToast` pattern (setting label + value label).
- **Tooltip** (desktop): Shows current state label + keyboard shortcut via the existing Button tooltip/shortcut pattern.

### Accessibility

- `role="button"` with `aria-label` constructed from existing i18n keys: `settings.nodePrimaryActionTitle` (parameterized with input label) + the current value label (`nodeMenu.incrementOne` / `incrementTen` / `incrementTier`). No new localization keys for aria.

### Store Integration

- Imports `nodePrimaryAction` and `NodePrimaryAction` from `nodePrimaryActionStore.ts`.
- Uses existing `isNodePrimaryAction` guard before setting.
- No new store needed — `nodePrimaryActionStore` already handles persistence to localStorage.

## Keyboard Shortcut

### New Action: `cyclePrimaryAction`

- **Key**: `N` (no modifiers, `ctrl: false`).
- **Mnemonic**: "Node action" — sits next to `B` (budget) on a standard keyboard.
- **Binding** in `keyboardAction.ts`:
  ```
  { action: "cyclePrimaryAction", key: Key.n, ctrl: false }
  ```
  Requires adding `n: "n"` to the `Key` constant and `"cyclePrimaryAction"` to `KeyboardActionType`.

### Handler

Wired in `App.svelte` (or wherever global keyboard actions are resolved). On `cyclePrimaryAction`, executes the same cycle logic as the pill click. The pill component also shows the shortcut label in its tooltip via `getKeyboardActionLabel("cyclePrimaryAction", $t)`.

## Toast Overlap Avoidance

`Toasts.svelte` currently checks overlap against `.bot-right-actions` only. Extend `checkOverlap()` to also query `.bot-left-actions` and take the max shift from either element. This ensures toasts on narrow screens don't overlap the new indicator.

Specifically: refactor the single-element overlap check into a loop over both selectors (`.bot-right-actions`, `.bot-left-actions`), computing `maxShift` across all overlapping HUD elements.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/PrimaryActionIndicator.svelte` | **New** — standalone pill component |
| `src/lib/input/keyboardAction.ts` | Add `cyclePrimaryAction` to `KeyboardActionType`, add `Key.n`, add binding |
| `src/App.svelte` | Add `bot-left-actions` container in `.hud-safe-area`, render `PrimaryActionIndicator`, wire keyboard handler for `cyclePrimaryAction` |
| `src/lib/Toasts.svelte` | Extend `checkOverlap()` to include `.bot-left-actions` |
| `src/app.css` | Add `.bot-left-actions` positioning (mirrors `bot-right-actions`) |

### Files NOT Changed

- `nodePrimaryActionStore.ts` — already has everything needed.
- `RootNodeQuickSettings.svelte` — untouched, keeps working independently.
- `UndoRedoToolbar.svelte` — untouched.
- `src/locales/*.json` — no new keys; reuses existing `settings.nodePrimaryActionTitle`, `nodeMenu.incrementOne`, `nodeMenu.incrementTen`, `nodeMenu.incrementTier`.
