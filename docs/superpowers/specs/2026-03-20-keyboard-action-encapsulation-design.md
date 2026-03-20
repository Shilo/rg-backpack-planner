# Keyboard Action Encapsulation Design

## Goal

Encapsulate the `Key` constant object inside `src/lib/input/` so no external file references raw key values. Components use action-based helpers (`isKeyboardAction`, `getCycleDirection`, `keyForAction`) instead.

## Motivation

Currently 13 component files import `Key` and compare `event.key === Key.X` directly. This couples them to physical key values. Changing a key mapping requires updating every consumer. The action system should be the single source of truth — consumers express intent ("is this a dismiss?"), not mechanics ("is this Escape?").

## Action Type Changes

### Split "confirm" into "confirm" and "activate"

Current bindings map both Enter and Space to `"confirm"`. But usage splits into two patterns:

- **Form submission** (Enter only): TextInputModal, LoadBuildModal, InputModal, ColorPickerDialog hex input — Space should type in the input, not submit.
- **Button activation** (Enter + Space): ContextMenu, OnboardingOverlay, SegmentedControl, ModalHost backdrop, ColorPickerDialog backdrop — standard button keyboard interaction.

**New definitions:**

- `"confirm"` — Enter only. Use for form submission, input finalization.
- `"activate"` — Enter + Space. Use for button clicks, selections, menu item activation.

Updated `KeyboardActionType`:

```ts
export type KeyboardActionType =
    | "dismiss"
    | "back"
    | "cycle"
    | "confirm"    // Enter only — form submission
    | "activate"   // Enter + Space — button clicks
    | "console"
    | "undo"
    | "redo"
    | "screenshot"
    | "budget";
```

Updated bindings:

```ts
{ action: "confirm", key: Key.Enter },
{ action: "activate", key: Key.Enter },
{ action: "activate", key: Key.Space },
```

Note: `resolveKeyboardAction` returns the first match, so `"confirm"` (Enter) will be returned before `"activate"` (Enter) for an Enter keypress. This only matters for App.svelte's global handler, which doesn't currently handle either action. For `isKeyboardAction`, both `"confirm"` and `"activate"` will correctly match Enter events since it checks all bindings for the given action.

## New API (3 functions)

### `isKeyboardAction(event, action): boolean`

Replaces all `event.key === Key.X` patterns. Checks if the event's key matches any binding for the given action, respecting modifier constraints.

```ts
export function isKeyboardAction(
    event: KeyboardEvent,
    action: KeyboardActionType,
): boolean {
    const { ctrlKey, metaKey, shiftKey, altKey } = event;
    const ctrl = ctrlKey || metaKey;
    const key = canonicalKey(event.key);

    for (const binding of KEYBOARD_ACTION_BINDINGS) {
        if (binding.action !== action) continue;
        if (binding.key !== key) continue;
        if (binding.ctrl !== undefined && binding.ctrl !== ctrl) continue;
        if (binding.shift !== undefined && binding.shift !== shiftKey) continue;
        if (binding.alt !== undefined && binding.alt !== altKey) continue;
        return true;
    }
    return false;
}
```

### `getCycleDirection(event): 1 | -1`

Replaces inline delta calculations duplicated across FullscreenModal, SideMenu, and TreeTabs.

```ts
export function getCycleDirection(event: KeyboardEvent): 1 | -1 {
    const key = canonicalKey(event.key);
    if (key === Key.ArrowLeft) return -1;
    if (key === Key.ArrowRight) return 1;
    // Tab: Shift+Tab = backward, Tab = forward
    return event.shiftKey ? -1 : 1;
}
```

### `keyForAction(action): string`

Returns the first bound key string for an action. Used for synthetic event construction (App.svelte dispatches a synthetic Escape event).

```ts
export function keyForAction(action: KeyboardActionType): string {
    const binding = KEYBOARD_ACTION_BINDINGS.find(b => b.action === action);
    if (!binding) {
        throw new Error(`No key binding for action "${action}"`);
    }
    return binding.key;
}
```

## Export Changes

### `keyboardAction.ts`

- **Remove export:** `Key` (becomes `const Key = { ... } as const;`)
- **Add exports:** `isKeyboardAction`, `getCycleDirection`, `keyForAction`
- **Keep exports:** `KeyboardActionType`, `KeyBinding`, `KEYBOARD_ACTION_BINDINGS`, `canonicalKey`, `resolveKeyboardAction`

### `index.ts` barrel

- **Remove re-export:** `Key`
- **Add re-exports:** `isKeyboardAction`, `getCycleDirection`, `keyForAction`

## Migration Map

### Pattern: `event.key === Key.Escape` -> `isKeyboardAction(event, "dismiss")`

| File | Lines |
|------|-------|
| FullscreenModal.svelte | 1 usage |
| SideMenu.svelte | (verify — may not have direct Escape check) |
| ContextMenu.svelte | 1 usage |
| FabMenu.svelte | 1 usage |
| ColorPickerDialog.svelte | 1 usage |
| ModalHost.svelte | 1 usage |
| RootNodeQuickSettings.svelte | 2 usages |

### Pattern: `event.key === Key.Enter` (form submit) -> `isKeyboardAction(event, "confirm")`

| File | Lines |
|------|-------|
| TextInputModal.svelte | 1 usage |
| LoadBuildModal.svelte | 1 usage |
| InputModal.svelte | 1 usage |
| ColorPickerDialog.svelte | 2 usages (hex input submit, global Enter confirm) |
| ModalHost.svelte | 1 usage |

### Pattern: `Key.Enter || Key.Space` or `!== Key.Enter && !== Key.Space` -> `isKeyboardAction(event, "activate")`

| File | Lines |
|------|-------|
| ContextMenu.svelte | 1 usage (negated) |
| OnboardingOverlay.svelte | 1 usage |
| SegmentedControl.svelte | 1 usage (negated) |
| ColorPickerDialog.svelte | 1 usage (backdrop, negated) |
| ModalHost.svelte | 1 usage (backdrop, negated) |

### Pattern: Tab/ArrowLeft/ArrowRight cycle -> `isKeyboardAction(event, "cycle")` + `getCycleDirection(event)`

| File | Lines |
|------|-------|
| FullscreenModal.svelte | isTab/isArrowLeft/isArrowRight + delta |
| SideMenu.svelte | isTab/isArrowLeft/isArrowRight + delta |
| TreeTabs.svelte | shiftKey+Tab / ArrowLeft check + delta |

### Pattern: Synthetic event -> `keyForAction("dismiss")`

| File | Lines |
|------|-------|
| App.svelte | `new KeyboardEvent("keydown", { key: Key.Escape })` |

### Special case: Focus trapping in ModalHost

ModalHost uses `event.key === Key.Tab` for focus trapping (constraining Tab/Shift+Tab within the modal). This is an accessibility primitive tied to the browser's Tab navigation, not a semantic "cycle" action. Using `isKeyboardAction(event, "cycle")` would incorrectly match ArrowLeft/ArrowRight, which don't move focus.

**Solution:** ModalHost uses `isKeyboardAction(event, "cycle")` to detect cycle keys generally, then checks the raw `event.key === "Tab"` string for the specific focus trapping branch. The "Tab" string is a DOM spec constant. This is the only justified exception — one raw string comparison for a browser accessibility mechanism.

Alternatively: combine cycle detection with direction. Tab produces direction values, as do arrows. The focus trap handler can check `isKeyboardAction(event, "cycle")` and then use `event.shiftKey` for direction — but this still routes ArrowLeft/Right into the focus trap incorrectly.

The cleanest path: `event.key === "Tab"` for the focus trap guard, `isKeyboardAction` for everything else in ModalHost.

## Test Changes

`test/keyboardAction.test.ts` imports `Key` directly. After this change:

- Replace `Key.X` references with raw DOM strings (`"Escape"`, `"Enter"`, `" "`, etc.)
- Tests verify the public API with standard DOM key values
- Add tests for `isKeyboardAction`, `getCycleDirection`, `keyForAction`
- Add tests for the confirm/activate split

## Internal File (`inputStore.ts`)

`inputStore.ts` is inside `src/lib/input/` and imports `Key` from `./keyboardAction`. This is fine — `Key` remains accessible within the module. No changes needed.

## Files NOT Changed

- `inputStore.ts` — internal to `src/lib/input/`, uses `Key` directly (correct)
- Components that already use only `getKeyboardActionLabel` / `buildShortcutTooltip` (RootNode, BottomNavBar, ResetTreeButton, ShareBuildButton, UndoRedoToolbar, SideMenuControlsPage, TechCrystalDisplay) — no `Key` import to remove
