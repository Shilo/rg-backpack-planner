# Shortcut Flash — Keyboard Hotkey Visual Feedback on Buttons

**Date**: 2026-03-20
**Status**: Draft

## Problem

When users press keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z), the corresponding action executes but the toolbar buttons show no visual feedback. There's no confirmation that the shortcut was received, and no visual link between the hotkey and the button it corresponds to.

## Solution

Add a store-driven flash system that briefly activates a button's pressed appearance when its corresponding keyboard shortcut fires. Buttons opt in via a single prop.

## Design

### 1. Flash Store (`src/lib/input/shortcutFlashStore.ts`)

A minimal store that broadcasts which `KeyboardActionType` was just activated.

**Exports:**
- `shortcutFlash` — readable store of `KeyboardActionType | null`
- `triggerShortcutFlash(action: KeyboardActionType)` — sets the store value and auto-clears it after `FLASH_DURATION_MS` (~150ms)

**Behavior:**
- Calling `triggerShortcutFlash` while a previous flash is active cancels the previous timer and starts a new one (so rapid Ctrl+Z presses each get their own flash).
- The store resets to `null` after the timeout.

**Re-exported** from `src/lib/input/index.ts`.

### 2. Button Enhancement (`src/lib/Button.svelte`)

**New optional prop:**
```typescript
export let flashOnAction: KeyboardActionType | undefined = undefined;
```

**Behavior:**
- When `flashOnAction` is set, Button subscribes to `shortcutFlash`.
- When the store value matches `flashOnAction`, Button applies the CSS class `button-flash` to the `<button>` element.
- The class is removed when the store resets to `null`.

**CSS class `button-flash`:**
Reuses the existing `:active` visual treatment:
```css
.button.button-flash:not(:disabled) {
    filter: var(--brightness-hover);
    transform: scale(0.96);
}
```

The existing `.button` already has `transition: transform var(--ease), filter var(--ease)` — so both the press-in and release will animate smoothly with no additional transition rules needed.

**Subscription lifecycle:**
- Only subscribes when `flashOnAction` is defined (reactive — if the prop changes to `undefined`, unsubscribes).
- Uses `onDestroy` to clean up the subscription.

### 3. App.svelte Integration

In the existing `handleKeyDown` function, add `triggerShortcutFlash` calls where undo/redo actions execute:

```typescript
// After undo executes successfully:
triggerShortcutFlash("undo");

// After redo executes successfully:
triggerShortcutFlash("redo");
```

Placed right after `lastUndoRedoTime = Date.now();` in each branch — the flash fires at the same moment the action begins, giving immediate visual confirmation.

### 4. UndoRedoToolbar Wiring (`src/lib/UndoRedoToolbar.svelte`)

Add the prop to the undo and redo buttons:

```svelte
<Button
    flashOnAction="undo"
    ...existing props...
/>
<Button
    flashOnAction="redo"
    ...existing props...
/>
```

No other changes needed in UndoRedoToolbar.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/input/shortcutFlashStore.ts` | **New** — flash store and trigger function |
| `src/lib/input/index.ts` | Re-export `shortcutFlash` and `triggerShortcutFlash` |
| `src/lib/Button.svelte` | New `flashOnAction` prop, subscribe to store, `button-flash` CSS class |
| `src/App.svelte` | Call `triggerShortcutFlash("undo")`/`triggerShortcutFlash("redo")` in hotkey handler |
| `src/lib/UndoRedoToolbar.svelte` | Add `flashOnAction` prop to undo/redo buttons |

## Extensibility

Any button can opt in by adding `flashOnAction="screenshot"` (or `"budget"`, etc.) and calling `triggerShortcutFlash` at the action site. No additional infrastructure needed.

## Edge Cases

- **Disabled buttons**: The `button-flash` selector includes `:not(:disabled)`, so disabled buttons don't flash. This matches the behavior that disabled undo/redo shortcuts are no-ops.
- **Rapid key repeat**: Each `triggerShortcutFlash` call resets the timer, so rapid presses produce a sustained visual state that releases 150ms after the last press.
- **Tab switching during undo/redo**: The flash fires immediately regardless of tab switch delays — it confirms the keypress was received, not that the operation completed.
- **No keyboard**: On touch-only devices, `flashOnAction` is inert — the store is never triggered since keyboard shortcuts don't fire.
