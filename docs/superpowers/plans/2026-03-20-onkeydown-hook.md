# `onKeyDown` Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all manual `addEventListener("keydown")` / `removeEventListener` pairs in `onMount` with a centralized `onKeyDown` hook.

**Architecture:** New `onKeyDown` function in `src/lib/input/onKeyDown.ts` wraps `onMount` internally. Components call it at script root level. Standardizes all listeners to `window` with capture phase.

**Tech Stack:** Svelte 5, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-onkeydown-hook-design.md`

---

## File Map

### New File

| File | Purpose |
|---|---|
| `src/lib/input/onKeyDown.ts` | `onKeyDown` hook — wraps `onMount` to register/cleanup a window keydown listener |

### Modified Files

| File | Changes |
|---|---|
| `src/lib/input/index.ts` | Add barrel export for `onKeyDown` |
| `src/lib/SideMenu.svelte` | Replace `onMount` keydown listener with `onKeyDown` |
| `src/lib/FullscreenModal.svelte` | Replace `onMount` keydown listener with `onKeyDown` (document→window) |
| `src/lib/ContextMenu.svelte` | Replace `onMount` keydown listener with `onKeyDown` (document bubble→window capture) |
| `src/lib/onboarding/OnboardingOverlay.svelte` | Replace `onMount` keydown listener with `onKeyDown` |
| `src/lib/TreeTabs.svelte` | Replace `onMount` keydown listener with `onKeyDown` |
| `src/App.svelte` | Move `handleKeyDown` and closures out of `onMount`, replace listener with `onKeyDown` |

---

### Task 1: Create `onKeyDown` Hook and Barrel Export

**Files:**
- Create: `src/lib/input/onKeyDown.ts`
- Modify: `src/lib/input/index.ts`

- [ ] **Step 1: Create `src/lib/input/onKeyDown.ts`**

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

- [ ] **Step 2: Add barrel export in `src/lib/input/index.ts`**

Add after the `keyboardAction` exports (after line 11):

```ts
export { onKeyDown } from "./onKeyDown";
```

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/input/onKeyDown.ts src/lib/input/index.ts
git commit -m "feat(input): add onKeyDown lifecycle hook"
```

---

### Task 2: Migrate Simple Components (SideMenu, FullscreenModal, OnboardingOverlay)

These three components have the simplest migration: handler already at root scope, onMount only does add/remove (or has a clean separation).

**Files:**
- Modify: `src/lib/SideMenu.svelte`
- Modify: `src/lib/FullscreenModal.svelte`
- Modify: `src/lib/onboarding/OnboardingOverlay.svelte`

- [ ] **Step 1: Migrate `src/lib/SideMenu.svelte`**

Add `onKeyDown` to the existing import from `"./input"` (line 24 area, where `Key` is imported):

```ts
    import { Key, onKeyDown } from "./input";
```

Replace the entire `onMount` block (lines 147-151):

```ts
    onMount(() => {
        window.addEventListener("keydown", handleTabKeydown, true);
        return () =>
            window.removeEventListener("keydown", handleTabKeydown, true);
    });
```

With:

```ts
    onKeyDown(handleTabKeydown);
```

Also remove the `onMount` import from `"svelte"` if it's no longer used elsewhere in the file. Check whether `onMount` is used for anything else — if not, remove it from the import.

- [ ] **Step 2: Migrate `src/lib/FullscreenModal.svelte`**

Add `onKeyDown` to imports. Currently line 2 imports `onMount` from svelte and line 7 imports `Key` from `./input`:

Replace:
```ts
    import { onMount } from "svelte";
```
With:
```ts
    import { Key, onKeyDown } from "./input";
```

And remove the separate `import { Key } from "./input";` line (line 7) since `Key` is now in the combined import.

Replace the `onMount` block (lines 57-61):

```ts
    onMount(() => {
        document.addEventListener("keydown", handleKeydown, true);
        return () =>
            document.removeEventListener("keydown", handleKeydown, true);
    });
```

With:

```ts
    onKeyDown(handleKeydown);
```

- [ ] **Step 3: Migrate `src/lib/onboarding/OnboardingOverlay.svelte`**

Add `onKeyDown` to the import from `"../input"` (find the existing import from `"../input"`):

```ts
    import { getInputLabel, Key, onKeyDown } from "../input";
```

In the `onMount` block (around line 436), remove only the keydown listener lines:

Remove:
```ts
        window.addEventListener("keydown", handleKeydown, true);
```

And from the cleanup function, remove:
```ts
            window.removeEventListener("keydown", handleKeydown, true);
```

Add at component root level (before the `onMount`):

```ts
    onKeyDown(handleKeydown);
```

**Important:** This component's `onMount` has other logic (body class, layout refresh, etc.) — keep all of that. Only remove the keydown add/remove lines.

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 5: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/SideMenu.svelte src/lib/FullscreenModal.svelte src/lib/onboarding/OnboardingOverlay.svelte
git commit -m "refactor(input): migrate SideMenu, FullscreenModal, OnboardingOverlay to onKeyDown hook"
```

---

### Task 3: Migrate ContextMenu (Bubble→Capture Bugfix)

This migration changes behavior: `document` bubble → `window` capture. The handler uses `stopImmediatePropagation()` for Escape, which now prevents later capture-phase handlers from seeing the event. This is safe because App.svelte's Escape handler already guards via `document.querySelector(".context-menu")`.

**Files:**
- Modify: `src/lib/ContextMenu.svelte`

- [ ] **Step 1: Add `onKeyDown` import**

Add to existing imports from `"./input"`:

```ts
    import { Key, onKeyDown } from "./input";
```

- [ ] **Step 2: Replace listener in `onMount`**

In the `onMount` block (line 346+), remove:
```ts
        document.addEventListener("keydown", handleKeydown);
```

And from the cleanup, remove:
```ts
            document.removeEventListener("keydown", handleKeydown);
```

Add at component root level (before `onMount`):

```ts
    onKeyDown(handleKeydown);
```

**Important:** Keep all other `onMount` logic (pointerup listener, resize listener, registry cleanup).

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 4: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/ContextMenu.svelte
git commit -m "refactor(input): migrate ContextMenu to onKeyDown hook (bubble→capture bugfix)"
```

---

### Task 4: Migrate TreeTabs.svelte

TreeTabs has two cleanup paths (early return when `tabsBarEl` is null, normal return with observer). Both need the `removeEventListener` lines removed.

**Files:**
- Modify: `src/lib/TreeTabs.svelte`

- [ ] **Step 1: Add `onKeyDown` to import**

Update the existing import from `"./input"` (line 22):

```ts
    import { secondary, getKeyboardActionLabel, getDeviceInputLabels, resolveKeyboardAction, Key, onKeyDown } from "./input";
```

- [ ] **Step 2: Add hook call at root level**

Add before the `onMount` block (before line 165):

```ts
    onKeyDown(handleGlobalKeydown);
```

- [ ] **Step 3: Remove listener lines from `onMount`**

Remove the registration (line 177):
```ts
        window.addEventListener("keydown", handleGlobalKeydown, true);
```

Remove from the first cleanup block (early return, around line 180):
```ts
                window.removeEventListener("keydown", handleGlobalKeydown, true);
```

If the early-return cleanup becomes empty:
```ts
        if (!tabsBarEl) {
            return () => {
            };
        }
```
Simplify to:
```ts
        if (!tabsBarEl) {
            return;
        }
```

Remove from the second cleanup block (around line 189):
```ts
            window.removeEventListener("keydown", handleGlobalKeydown, true);
```

The second cleanup should still have `observer.disconnect()`.

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 5: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/TreeTabs.svelte
git commit -m "refactor(input): migrate TreeTabs to onKeyDown hook"
```

---

### Task 5: Migrate App.svelte (Move Handler Out of onMount)

App.svelte is the most complex migration because `handleKeyDown` and its closure variables (`undoRedoApplyGen`, `lastUndoRedoTime`, `UNDO_REDO_REPEAT_MS`) are defined inside `onMount`. They must move to component root scope.

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Add `onKeyDown` to imports**

Add to the existing import from `"./lib/input"` (line 78):

```ts
    import { resolveKeyboardAction, Key, onKeyDown } from "./lib/input";
```

- [ ] **Step 2: Move `handleKeyDown` and its closures out of `onMount`**

Cut these lines from inside `onMount` (lines 544-658 — everything from the comment through the closing `};` of `handleKeyDown`):

```ts
        // Global hotkeys: F9 to open screenshot composer, Escape/Backspace for menu navigation
        let undoRedoApplyGen = 0;
        let lastUndoRedoTime = 0;
        const UNDO_REDO_REPEAT_MS = 250;
        const handleKeyDown = (e: KeyboardEvent) => {
            ... entire function body ...
        };
```

Paste them at component root scope, just before the `onMount(() => {` line. Adjust indentation from 8 spaces (inside onMount) to 4 spaces (component root).

- [ ] **Step 3: Add `onKeyDown` call and remove listener lines**

Add at component root level (after `handleKeyDown` definition, before `onMount`):

```ts
    onKeyDown(handleKeyDown);
```

Remove from `onMount`:
```ts
        window.addEventListener("keydown", handleKeyDown, true);
```

Remove from the cleanup function (around line 711):
```ts
                window.removeEventListener("keydown", handleKeyDown, true);
```

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 5: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/App.svelte
git commit -m "refactor(input): migrate App.svelte to onKeyDown hook"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Search for remaining `addEventListener("keydown"` in `.svelte` files**

Search `src/` for `addEventListener("keydown"` in `.svelte` files. The only remaining instances should be:
- `RootNodeQuickSettings.svelte` — `$:` reactive block (out of scope)

Any other `.svelte` file with `addEventListener("keydown"` is a missed migration.

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Run `npm test`**

Run: `npm test`
Expected: All tests pass
