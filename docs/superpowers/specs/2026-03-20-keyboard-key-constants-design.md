# Keyboard Key Constants & Centralized Global Hotkey Handling

Eliminates hardcoded keyboard key strings across the codebase. Introduces a declarative binding system for `resolveKeyboardAction` and consolidates scattered global hotkey handlers in App.svelte and TreeTabs.svelte into resolver-based dispatch.

## Motivation

Key strings (`"Escape"`, `"z"`, `"Backspace"`, etc.) are hardcoded in 16+ files. The same hotkey logic is duplicated between `keyboardAction.ts`, `App.svelte`, and `TreeTabs.svelte`. Changing a shortcut means hunting through multiple files. Caps Lock breaks Ctrl+Z undo because the code compares against both `"z"` and `"Z"` defensively but misses the Caps Lock case where `event.key = "Z"` with `shiftKey = false`.

## Scope

**In scope (global hotkeys):** Centralize App.svelte and TreeTabs.svelte global `window.addEventListener("keydown")` handlers through `resolveKeyboardAction`. Replace all hardcoded key strings with `Key.*` constants.

**Out of scope (component-local):** Component-local key handlers (modal Escape, Enter-to-confirm, Tab trapping in ModalHost, etc.) get string-to-constant swaps only — no structural changes. These are standard UI patterns co-located with their behavior.

## `Key` Constants

All `KeyboardEvent.key` values used in the app, in canonical (lowercase) form for single-character keys:

```ts
export const Key = {
    Escape: "Escape",
    Backspace: "Backspace",
    Tab: "Tab",
    Enter: "Enter",
    Space: " ",
    Backtick: "`",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    Shift: "Shift",
    Control: "Control",
    F9: "F9",
    z: "z",
    y: "y",
    b: "b",
} as const;
```

No uppercase letter variants. The resolver normalizes `event.key` before comparison.

## `canonicalKey` Helper

Returns the canonical form of a `KeyboardEvent.key` value. Lowercases single-character keys so comparisons are independent of Caps Lock or Shift casing. Named keys (`"Escape"`, `"ArrowLeft"`, `"F9"`) pass through unchanged.

```ts
export function canonicalKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
}
```

This fixes a Caps Lock bug: currently Ctrl+Z with Caps Lock on produces `event.key = "Z"` with `shiftKey = false`, which matches neither the undo check (`"z" && !shiftKey`) nor the redo check (`"Z" && shiftKey`). With `canonicalKey`, the key normalizes to `"z"` and matches undo correctly.

## Declarative Keyboard Action Bindings

A flat array mapping `KeyboardActionType` → key + modifier requirements. `resolveKeyboardAction` iterates this instead of a hardcoded `if` chain.

```ts
type KeyBinding = {
    action: KeyboardActionType;
    key: string;
    /** true = require Ctrl/Meta, false = require NO Ctrl/Meta, undefined = either */
    ctrl?: boolean;
    /** true = require Shift, false = require NO Shift, undefined = either */
    shift?: boolean;
    /** true = require Alt, false = require NO Alt, undefined = either */
    alt?: boolean;
};

export const KEYBOARD_ACTION_BINDINGS: readonly KeyBinding[] = [
    { action: "dismiss", key: Key.Escape },
    { action: "back", key: Key.Backspace },
    { action: "cycle", key: Key.Tab },
    { action: "cycle", key: Key.ArrowLeft },
    { action: "cycle", key: Key.ArrowRight },
    { action: "confirm", key: Key.Enter },
    { action: "confirm", key: Key.Space },
    { action: "console", key: Key.Backtick },
    { action: "undo", key: Key.z, ctrl: true, shift: false, alt: false },
    { action: "redo", key: Key.y, ctrl: true, alt: false },
    { action: "redo", key: Key.z, ctrl: true, shift: true, alt: false },
    { action: "screenshot", key: Key.F9 },
    { action: "budget", key: Key.b, ctrl: false },
];
```

To change a shortcut, edit the array. No logic changes needed.

ArrowLeft and ArrowRight are added as `cycle` triggers — they already do tab cycling in TreeTabs, SideMenu, and FullscreenModal but weren't previously in `resolveKeyboardAction`. Direction is resolved at the call site from `event.key`.

## Refactored `resolveKeyboardAction`

```ts
export function resolveKeyboardAction(
    event: KeyboardEvent,
): KeyboardActionType | null {
    const { ctrlKey, metaKey, shiftKey, altKey } = event;
    const ctrl = ctrlKey || metaKey;
    const key = canonicalKey(event.key);

    for (const binding of KEYBOARD_ACTION_BINDINGS) {
        if (binding.key !== key) continue;
        if (binding.ctrl !== undefined && binding.ctrl !== ctrl) continue;
        if (binding.shift !== undefined && binding.shift !== shiftKey) continue;
        if (binding.alt !== undefined && binding.alt !== altKey) continue;
        return binding.action;
    }
    return null;
}
```

## TreeTabs.svelte Consolidation

Replace 4 separate `window.addEventListener("keydown", ...)` handlers (`handleTabKeydown`, `handleBackspaceKeydown`, `handleConsoleKeydown`, `handleBudgetKeydown`) with one handler that uses `resolveKeyboardAction`:

```ts
function handleGlobalKeydown(event: KeyboardEvent) {
    const action = resolveKeyboardAction(event);
    if (!action) return;
    if (hasOnboardingOverlay()) return;

    switch (action) {
        case "cycle": {
            if (!tabsRootEl || tabs.length <= 1) return;
            if (isMenuOpen || $isComposeScreenshotOpen) return;
            if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl)) return;
            if (event.repeat) {
                const now = performance.now();
                if (now - lastTabCycleAt < TAB_CYCLE_REPEAT_MS) {
                    event.preventDefault();
                    return;
                }
            }
            event.preventDefault();
            lastTabCycleAt = performance.now();
            const delta = event.shiftKey && event.key === Key.Tab
                ? -1
                : event.key === Key.ArrowLeft ? -1 : 1;
            const next = (activeIndex + delta + tabs.length) % tabs.length;
            setActive(next);
            break;
        }
        case "back": {
            if (!tabsRootEl) return;
            if (isMenuOpen) return;
            if (!isKeyboardShortcutTarget(document.activeElement, tabsRootEl)) return;
            const levels = $treeLevels[activeIndex] ?? [];
            if (sumLevels(levels) === 0) return;
            if (event.repeat) return;
            event.preventDefault();
            openResetChoicesForActiveTab();
            break;
        }
        case "console": {
            if (!tabsRootEl) return;
            if (isMenuOpen || $isComposeScreenshotOpen || $modalStore) return;
            if (isFormField(document.activeElement)) return;
            if (event.repeat) return;
            event.preventDefault();
            if (quickSettings) {
                quickSettings = null;
                return;
            }
            const rootEl = tabsRootEl.querySelector('[data-node-id="root"]');
            if (!rootEl) return;
            const rect = rootEl.getBoundingClientRect();
            openRootQuickSettings(rect.left + rect.width / 2, rect.top);
            break;
        }
        case "budget": {
            if (isMenuOpen || $isComposeScreenshotOpen || $modalStore) return;
            if (isFormField(document.activeElement)) return;
            if (event.repeat) return;
            event.preventDefault();
            openTechCrystalsOwnedModal($techCrystalsOwned, undefined, activeIndex);
            break;
        }
    }
}
```

One listener registered in `onMount` instead of four. Same guards per-action, same behavior.

## App.svelte Consolidation

Replace inline key checks with `resolveKeyboardAction`:

```ts
const handleKeyDown = (e: KeyboardEvent) => {
    const action = resolveKeyboardAction(e);
    if (!action) return;

    // Undo/Redo — special: allows e.repeat with throttling
    if (
        (action === "undo" || action === "redo") &&
        !isFormField(document.activeElement) &&
        !hasOnboardingOverlay()
    ) {
        if (action === "undo" && get(canUndo)) {
            e.preventDefault();
            /* existing deferred undo logic unchanged */
            return;
        }
        if (action === "redo" && get(canRedo)) {
            e.preventDefault();
            /* existing deferred redo logic unchanged */
            return;
        }
    }

    if (e.repeat) return;

    switch (action) {
        case "dismiss":
            if (e.defaultPrevented || !e.isTrusted) break;
            if (
                $isComposeScreenshotOpen ||
                document.querySelector(".context-menu") ||
                document.querySelector(".qs-panel") ||
                hasOnboardingOverlay()
            ) break;
            e.preventDefault();
            if (isMenuOpen) {
                if (!sideMenuRef?.tryGoBack?.()) closeMenu();
            } else {
                isMenuOpen = true;
            }
            break;
        case "back":
            if (!isMenuOpen || e.defaultPrevented || !e.isTrusted) break;
            if (isFormField(document.activeElement) || hasOnboardingOverlay()) break;
            e.preventDefault();
            if (!sideMenuRef?.tryGoBack?.()) closeMenu();
            break;
        case "screenshot":
            if (hasOnboardingOverlay()) break;
            e.preventDefault();
            openComposeScreenshot();
            break;
    }
};
```

The `!e.altKey` guard for undo/redo is now handled by `alt: false` in the bindings — `resolveKeyboardAction` returns null if Alt is held with Ctrl+Z.

## Synthetic KeyboardEvent Dispatch

`App.svelte` line 101 dispatches a synthetic `new KeyboardEvent("keydown", { key: "Escape" })` in `closeTransientUiForPreview()`. This string should also be swapped to `Key.Escape`.

## Component-Local String Swaps

These files get `Key.*` constant swaps only (no structural changes):

| File | Key strings replaced |
|---|---|
| `src/lib/input/inputStore.ts` | `"Shift"` → `Key.Shift`, `"Control"` → `Key.Control` |
| `src/lib/FullscreenModal.svelte` | `"Tab"`, `"ArrowLeft"`, `"ArrowRight"`, `"Escape"` |
| `src/lib/SideMenu.svelte` | `"Tab"`, `"ArrowLeft"`, `"ArrowRight"` |
| `src/lib/ColorPickerDialog.svelte` | `"Enter"`, `"Escape"`, `" "` |
| `src/lib/ContextMenu.svelte` | `"Escape"`, `"Enter"`, `" "` |
| `src/lib/FabMenu.svelte` | `"Escape"` |
| `src/lib/ModalHost.svelte` | `"Tab"`, `"Escape"`, `"Enter"`, `" "` |
| `src/lib/SegmentedControl.svelte` | `" "`, `"Enter"` |
| `src/lib/RootNodeQuickSettings.svelte` | `"Escape"` |
| `src/lib/modals/InputModal.svelte` | `"Enter"` |
| `src/lib/modals/LoadBuildModal.svelte` | `"Enter"` |
| `src/lib/modals/TextInputModal.svelte` | `"Enter"` |
| `src/lib/onboarding/OnboardingOverlay.svelte` | `"Enter"`, `" "` |

## Barrel Export Updates

`src/lib/input/index.ts` adds:

```ts
export { Key, canonicalKey, KEYBOARD_ACTION_BINDINGS } from "./keyboardAction";
export type { KeyBinding } from "./keyboardAction";
```

## Test Updates

- `test/appHotkeys.test.ts`: Update regex that checks App.svelte source for the F9 hotkey pattern (string changes from `"F9"` to `Key.F9`).
- Existing `npm test` suite must pass with no changes to test logic (behavior is preserved).

## Behavior Changes

| Before | After | Impact |
|---|---|---|
| Caps Lock + Ctrl+Z → undo broken | Caps Lock + Ctrl+Z → undo works | **Bugfix** |
| Caps Lock + B → budget broken (only `"b"` matched without explicit `"B"`) | Caps Lock + B → budget works | **Bugfix** |
| ArrowLeft/ArrowRight not in `resolveKeyboardAction` | Added as `cycle` triggers | No behavior change — same components handle them |
| 4 global keydown listeners in TreeTabs | 1 consolidated listener | No behavior change — same guards, same order |

## Unchanged

- Component-local handler structure (modals, menus, dialogs)
- Event listener capture phase and registration order
- `getKeyboardActionLabel` and `inputLabels.ts`
- All guard logic (isMenuOpen, isComposeScreenshotOpen, hasOnboardingOverlay, isFormField, etc.)
- Undo/redo deferred apply logic, repeat throttling
