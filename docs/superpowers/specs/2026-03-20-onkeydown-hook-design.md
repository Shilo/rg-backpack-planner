# `onKeyDown` Hook — Centralized Global Keydown Listener Lifecycle

Eliminates boilerplate `window.addEventListener("keydown")` / `removeEventListener` pairs in component `onMount` blocks. Provides a single hook that manages registration and cleanup automatically.

## Motivation

7 components manually register global keydown listeners in `onMount` and manually clean them up in the returned destroy function. This is repetitive and error-prone — miss the cleanup and you leak listeners. A thin hook wrapping `onMount` removes the boilerplate while keeping each component's handler logic untouched.

Additionally, the listeners are inconsistent: most use `window` with capture phase, but ContextMenu uses `document` without capture. The migration standardizes all global keydown listeners to `window` with capture.

## Scope

**In scope:** 7 `addEventListener("keydown")` calls inside `onMount` callbacks in `.svelte` files. Each is replaced by an `onKeyDown(handler)` call at component root level.

**Out of scope:**
- `RootNodeQuickSettings.svelte` — uses a `$:` reactive block, not `onMount`
- `inputStore.ts` — Svelte action lifecycle (`useInputStore`), not a component
- Inline `on:keydown` handlers on DOM elements (Svelte template syntax)
- Handler logic inside components (unchanged)

## Capture vs Bubble

`capture: true` (third argument to `addEventListener`) means the handler fires during the capture phase — as the event travels *down* from `window` to the target element, *before* the target sees it. This lets global hotkey handlers intercept keys (e.g., `preventDefault()` on Tab) before focused inputs or buttons consume them.

`capture: false` (default) means the handler fires during the bubble phase — *after* the target element has already handled the event.

**All global keydown listeners in this app should use capture.** They need to intercept before focused elements react. The one exception was ContextMenu (bubble phase), which is a bug — Escape should intercept before child elements, consistent with every other Escape handler.

## `onKeyDown` Hook

**File:** `src/lib/input/onKeyDown.ts`

```ts
import { onMount } from "svelte";

/**
 * Registers a window keydown listener on mount and removes it on destroy.
 * Call at component root level (not inside onMount).
 * Defaults to capture phase for global hotkey interception.
 */
export function onKeyDown(
    handler: (event: KeyboardEvent) => void,
    capture = true,
): void {
    onMount(() => {
        window.addEventListener("keydown", handler, capture);
        return () => window.removeEventListener("keydown", handler, capture);
    });
}
```

Called at component script root level. Svelte queues multiple `onMount` calls independently, so components that have other mount logic keep their existing `onMount` — the hook adds a separate one.

## Barrel Export

`src/lib/input/index.ts` adds:

```ts
export { onKeyDown } from "./onKeyDown";
```

## Migration Per Component

### App.svelte

Remove from `onMount`:
```ts
window.addEventListener("keydown", handleKeyDown, true);
```
And from cleanup:
```ts
window.removeEventListener("keydown", handleKeyDown, true);
```

Add at component root level (before `onMount`):
```ts
onKeyDown(handleKeyDown);
```

The `handleKeyDown` function definition must move out of `onMount` to component root scope so it's accessible to `onKeyDown`. The `undoRedoApplyGen`, `lastUndoRedoTime`, and `UNDO_REDO_REPEAT_MS` variables it closes over also move to component root scope.

### TreeTabs.svelte

Remove from `onMount`:
```ts
window.addEventListener("keydown", handleGlobalKeydown, true);
```
And from both cleanup blocks:
```ts
window.removeEventListener("keydown", handleGlobalKeydown, true);
```

Add at component root level:
```ts
onKeyDown(handleGlobalKeydown);
```

`handleGlobalKeydown` is already at component root scope.

### SideMenu.svelte

Remove from `onMount`:
```ts
window.addEventListener("keydown", handleTabKeydown, true);
```
And from cleanup:
```ts
window.removeEventListener("keydown", handleTabKeydown, true);
```

Add at component root level:
```ts
onKeyDown(handleTabKeydown);
```

`handleTabKeydown` is already at component root scope.

### FullscreenModal.svelte

Remove from `onMount`:
```ts
document.addEventListener("keydown", handleKeydown, true);
```
And from cleanup:
```ts
document.removeEventListener("keydown", handleKeydown, true);
```

Add at component root level:
```ts
onKeyDown(handleKeydown);
```

Switches from `document` to `window` — no behavior change for keydown events.

### ContextMenu.svelte

Remove from `onMount`:
```ts
document.addEventListener("keydown", handleKeydown);
```
And from cleanup:
```ts
document.removeEventListener("keydown", handleKeydown);
```

Add at component root level:
```ts
onKeyDown(handleKeydown);
```

Switches from `document` (bubble) to `window` (capture). This is a **bugfix** — Escape now intercepts before child elements, consistent with all other Escape handlers in the app.

### OnboardingOverlay.svelte

Remove from `onMount`:
```ts
window.addEventListener("keydown", handleKeydown, true);
```
And from cleanup:
```ts
window.removeEventListener("keydown", handleKeydown, true);
```

Add at component root level:
```ts
onKeyDown(handleKeydown);
```

`handleKeydown` is already at component root scope.

## Not Migrated

| Component | Why |
|---|---|
| `RootNodeQuickSettings.svelte` | Uses `$:` reactive block — listener added/removed when `isOpen` changes, not on mount |
| `inputStore.ts` | Svelte action lifecycle (`destroy()`), not component `onMount` |

## Behavior Changes

| Before | After | Impact |
|---|---|---|
| ContextMenu: `document.addEventListener("keydown", handler)` (bubble) | `window.addEventListener("keydown", handler, true)` (capture) | **Bugfix** — Escape intercepts before child elements |
| FullscreenModal: `document` with capture | `window` with capture | No behavior change |

## Unchanged

- All handler logic inside components
- `resolveKeyboardAction` / `Key.*` constants
- Inline `on:keydown` handlers on DOM elements
- `RootNodeQuickSettings.svelte` reactive listener
- `inputStore.ts` Svelte action listener
- Event listener registration order between components (determined by mount order, unchanged)
