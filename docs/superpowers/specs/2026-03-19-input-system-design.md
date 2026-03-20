# Input System Rework

Centralized input abstraction that unifies pointer, touch, and keyboard modifier handling across the app. Replaces scattered inline event handling with a shared module of pure action resolvers and composable Svelte actions.

## Motivation

Input handling is currently spread across Tree.svelte (~700 lines of gesture logic), inputStore.ts (shift key only), longPress.ts, and individual components. The action-to-event mapping is hardcoded inline, making it hard to reason about what each input does, update controls documentation, or add new actions consistently.

## Terminology

Aligned with W3C PointerEvent naming:

| Name | Mouse | Touch | `event.button` |
|---|---|---|---|
| **Primary** | Left click | Tap | 0 |
| **Secondary** | Right click | Long press | 2 |
| **Auxiliary** | Middle click | *Not available* | 1 |

Modifiers (desktop only):

| Name | Default Key | Purpose |
|---|---|---|
| **macro** | Shift | Escalated/bulk action (e.g. +tier) |
| **micro** | Ctrl | Precision action (e.g. +1) |

Secondary always maps to context menu behavior. Auxiliary is a convenience shortcut — never the only way to reach an action.

## Core Types

```ts
type InputActionType = "primary" | "secondary" | "auxiliary";
type InputModifier = "none" | "macro" | "micro";
type PointerDevice = "mouse" | "touch";

type InputAction = {
    type: InputActionType;
    modifier: InputModifier;
    device: PointerDevice;
};
```

`PointerDevice` stays two-valued. Pen/stylus (`pointerType === "pen"`) is normalized to `"mouse"` at the resolution boundary — pen users have hover, fine pointer, and modifier keys, so they behave identically to mouse for action resolution.

## Modifier Key Map

Physical keys are decoupled from abstract modifiers via a configurable map:

```ts
type ModifierKeyMap = {
    macro: "shiftKey" | "ctrlKey";
    micro: "shiftKey" | "ctrlKey";
};

const DEFAULT_MODIFIER_KEY_MAP: ModifierKeyMap = {
    macro: "shiftKey",
    micro: "ctrlKey",
};
```

`resolveModifier()` reads from `inputStore` and translates physical key state to abstract modifier. Macro takes priority if both keys are held.

The `ModifierKeyMap` type enables future key remapping but is not exposed via settings UI in this iteration. Code consumes `DEFAULT_MODIFIER_KEY_MAP` directly.

## inputStore Expansion

`InputState` adds `ctrlKey` alongside the existing `shiftKey`:

```ts
type InputState = {
    shiftKey: boolean;
    ctrlKey: boolean;
};
```

`useInputStore()` tracks Ctrl keydown/keyup and syncs `ctrlKey` from PointerEvent (matching the existing `shiftKey` sync pattern from `pointerdown`/`pointerup`/`pointermove`). This ensures Ctrl state is available on the first interaction even before key events fire. Only attaches listeners on devices with fine pointer (unchanged behavior). Touch-only devices never update these values.

## Action Resolution

### resolveAction()

Pure function: raw event data in, semantic action out.

```ts
resolveAction(button: number, modifier: InputModifier, pointerType: string): InputAction | null
```

Accepts raw `pointerType` string from the event (`"mouse"`, `"touch"`, `"pen"`). Normalizes `"pen"` to `"mouse"` internally — callers never need to handle pen separately.

- Button 0 → primary
- Button 1 → auxiliary (mouse only; returns null for touch)
- Button 2 / long-press → secondary
- All other button values → null
- Touch device always gets `modifier: "none"`

### resolveNodeAction()

Maps InputAction to a concrete node operation. Direction is determined by button (primary = increment, auxiliary = decrement). Modifiers override amount only, never direction. Store resolution is deferred to `applyNodeOperation` at execution time.

```ts
type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementTier" }
    | { op: "decrementTier" }
    | { op: "incrementOne" }
    | { op: "decrementOne" }
    | { op: "contextMenu" };

resolveNodeAction(action: InputAction): NodeOperation
```

### Node Action Table

| Input | Direction | Amount | NodeOperation |
|---|---|---|---|
| Left click | Increment | Per store (+1, +10, or +tier) | `incrementByStore` |
| Middle click | Decrement | Per store (-1, -10, or -tier) | `decrementByStore` |
| Right click / long press | — | — | `contextMenu` |
| Shift + left click | Increment | Tier (fixed) | `incrementTier` |
| Shift + middle click | Decrement | Tier (fixed) | `decrementTier` |
| Ctrl + left click | Increment | +1 (fixed) | `incrementOne` |
| Ctrl + middle click | Decrement | -1 (fixed) | `decrementOne` |

Direction is determined by button (primary = up, auxiliary = down). Modifiers only change the amount, never the direction.

Modifiers are fixed/absolute — they do not rotate with `nodePrimaryActionStore`. Overlap (e.g. store set to +tier and Shift+click also does +tier) is harmless.

### Other Interactable Operations

```ts
type TreeBackgroundOperation =
    | { op: "contextMenu" }
    | { op: "focusInView" };

type TabOperation =
    | { op: "activate" }
    | { op: "contextMenu" };

type RootOperation =
    | { op: "openQuickSettings" };
```

#### Tree Background Action Table

| Input | Operation |
|---|---|
| Right click / long press | `contextMenu` (tree options) |
| Middle click empty space | `focusInView` (re-center viewport) |

Primary click on empty space initiates pan — handled by the gesture system, not the action resolver.

#### Tab Action Table

| Input | Operation |
|---|---|
| Left click / tap | `activate` |
| Right click / long press | `contextMenu` (tab options) |

#### Root Node Action Table

| Input | Operation |
|---|---|
| Left click / tap | `openQuickSettings` |
| Right click / long press | `openQuickSettings` |

Both primary and secondary inputs open quick settings (preserving current behavior). The root node has no separate context menu.

### applyNodeOperation()

Dispatcher that executes a `NodeOperation` on a node. Used by Tree.svelte after resolving the action:

```ts
function applyNodeOperation(op: NodeOperation, index: NodeIndex, callbacks: NodeOperationCallbacks, pos?: {x: number, y: number}): void
```

Switches on `op.op` and delegates to the provided callbacks. The `callbacks` parameter decouples the dispatcher from Tree.svelte's internal state (levels, budget enforcement, splash effects), making the function reusable and testable. The `pos` parameter is required when `op` is `contextMenu` (to position the menu) and ignored for all other operations. Implementation should throw if `pos` is missing for `contextMenu`.

`incrementByStore` / `decrementByStore` resolve to the concrete delta at execution time via the callbacks, which consult the current `NodePrimaryAction` value from `nodePrimaryActionStore`. The operation type is abstract — it does not encode the amount until execution.

### Convenience Wrappers

Named functions for direct use in node operation execution (called by `applyNodeOperation` and context menu buttons):

```ts
function nodeIncrement(index: NodeIndex): void
function nodeDecrement(index: NodeIndex): void
function nodeIncrementTier(index: NodeIndex): void
function nodeDecrementTier(index: NodeIndex): void
function nodeIncrementOne(index: NodeIndex): void
function nodeDecrementOne(index: NodeIndex): void
function nodeContextMenu(index: NodeIndex, pos: {x: number, y: number}): void
```

## Svelte Actions

Three composable `use:` hooks, each listening to distinct events with zero overlap:

```ts
function primary(node: HTMLElement, handler: (action: InputAction) => void): ActionReturn
function secondary(node: HTMLElement, handler: (action: InputAction) => void): ActionReturn
function auxiliary(node: HTMLElement, handler: (action: InputAction) => void): ActionReturn
```

### Event Surface Per Hook

| Hook | Mouse Events | Touch Events |
|---|---|---|
| `use:primary` | `click` (button 0), resolves modifier | `click` (tap), modifier always `"none"` |
| `use:secondary` | `contextmenu` | Long-press timer on `pointerdown` (auto-detected from `pointerType`), cancels on movement > 8px, suppresses click after fire |
| `use:auxiliary` | `auxclick` (with Safari double-fire guard, see below) | Never fires |

### Automatic Behavior (No Configuration)

- **Long-press**: Detected automatically from `pointerType === "touch"` on `pointerdown`. No consumer config needed.
- **Haptics**: Each hook calls `triggerHaptic()` after firing (haptic store has rate-limiting).
- **Click suppression**: `use:secondary` relies on the existing `longPress.ts` document-level capture handler to suppress the next `click`/`contextmenu` after long-press fires. This prevents `use:primary` from firing on the same element after a long-press.
- **Modifier resolution**: Reads `inputStore`, applies `ModifierKeyMap`.
- **Device detection**: From `pointerType` on events. `"pen"` normalized to `"mouse"`. Touch actions always get `modifier: "none"`.
- **Safari auxclick guard**: Safari may fire both `pointerup` and `auxclick` for middle-click. `use:auxiliary` timestamps each fire and deduplicates within a 50ms window to prevent double invocation.
- **Long-press + modifier keys**: If a modifier key (Shift/Ctrl) is held when a long-press fires, the modifier is ignored — touch secondary always resolves with `modifier: "none"`. This prevents accidental modifier actions on devices with detachable keyboards.

### Usage — Compose What You Need

```svelte
<!-- Button: primary + secondary -->
<button use:primary={handleClick} use:secondary={handleContextMenu}>

<!-- Tab button: primary + secondary -->
<button use:primary={() => activateTab(i)} use:secondary={(a) => openTabMenu(a)}>
```

### Tree.svelte — Calls Resolver Directly

Tree.svelte does NOT use the Svelte actions on nodes (it captures events at the viewport level for pan/pinch gesture disambiguation). Both primary clicks and auxiliary (middle) clicks on nodes are captured at the viewport level via `pointerdown`/`pointerup` — not via `auxclick`. After confirming a pointerup is a click and not a pan, it calls the same resolver:

```ts
const modifier = resolveModifier($inputStore);
const action = resolveAction(event.button, modifier, event.pointerType);
if (!action) return;
const nodeOp = resolveNodeAction(action, $nodePrimaryAction);
applyNodeOperation(nodeOp, nodeIndex);
```

This path handles all button values (0, 1, 2) uniformly through the resolver. Middle-click (button 1) follows the same pattern as primary but without pan/gesture disambiguation (middle-click never initiates a pan).

## Tooltip Changes

### Desktop Only

Tooltip is suppressed entirely on touch devices — no hover capability, no modifiers, long-press opens context menu instead.

### Two-Row Format

Tooltip shows both the primary (increment) and auxiliary (decrement) action results, following the same visual format as LevelUpSplash:

```
▲ Lv 1 → 2   ⬡ -6       (what left-click does)
▼ Lv 1 → 0   ⬡ +6       (what middle-click does)
```

Arrow up/down icons for direction. Hexagon/crystal icon for cost. Color-coded (accent for increment, danger for cost, success for refund).

### Modifier-Reactive

Values update live as modifier keys are held. Only the currently hovered node computes preview — no bulk recomputation across all visible nodes:

| Modifier held | Tooltip shows |
|---|---|
| None | Per store action (e.g. +10 / -10) |
| Macro (Shift) | +tier / -tier with costs |
| Micro (Ctrl) | +1 / -1 with costs |

### Updated Preview Function

`getNodeActionPreviewFromOp()` replaces `getNodeActionPreview()`. Takes a `NodeOperation` directly instead of `NodePrimaryAction` + `isRefund`:

```ts
function getNodeActionPreviewFromOp(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    operation: NodeOperation;
    nodeLevelBehavior: NodeLevelBehavior;
    primaryAction: NodePrimaryAction;
}): NodeActionPreview | null
```

The `nodeLevelBehavior` parameter (from `nodeLevelBehaviorStore`) is needed to resolve level deltas with sync/solo behavior. The `primaryAction` parameter (from `nodePrimaryActionStore`) is needed to resolve `incrementByStore` / `decrementByStore` operations into concrete level deltas. Fixed-amount operations (`incrementOne`, `incrementTier`, etc.) ignore `primaryAction`. Returns `null` for `contextMenu` (no preview applicable).

## Input Label Helpers

Shared functions for generating localized input labels, used by both the controls help page and onboarding overlay.

### Functions

```ts
getModifierLabel(modifier: InputModifier, t: TranslateFn): string
getButtonLabel(type: InputActionType, device: PointerDevice, t: TranslateFn): string
getInputLabel(type: InputActionType, modifier: InputModifier, device: PointerDevice, t: TranslateFn): string
```

### Locale Keys

Atomic input terms mirroring the API naming:

```json
{
    "input": {
        "primary": { "mouse": "Left Click", "touch": "Tap" },
        "secondary": { "mouse": "Right Click", "touch": "Long Press" },
        "auxiliary": { "mouse": "Middle Click" },
        "macro": "Shift",
        "micro": "Ctrl",
        "modifierSeparator": " + "
    }
}
```

### Composable Labels

Control descriptions use full locale templates with `{input}` placeholder to support language-specific word order:

```ts
$t("controls.nodeIncrement", { input: getInputLabel("primary", "none", "mouse", $t) })
// English: "{input} a Node" → "Left Click a Node"
// Japanese: "ノードを{input}" → "ノードを左クリック"
```

## Controls Help Page

Mouse section updated with full action set. Touch and keyboard sections unchanged.

New mouse controls:

| Control | Description |
|---|---|
| Left Click a Node | Add node level(s) — per primary action setting |
| Middle Click a Node | Remove node level(s) — inverse of primary action |
| Shift + Left Click a Node | Add one tier of levels |
| Shift + Middle Click a Node | Remove one tier of levels |
| Ctrl + Left Click a Node | Add one level |
| Ctrl + Middle Click a Node | Remove one level |
| Right Click a Node | Show node options |
| Right Click Empty Space / Tab | Show tree options |
| Click and Drag | Pan around tree |
| Scroll Wheel | Zoom in and out |
| Hover | Show tooltip on nodes |

## File Changes

### New Files

| File | Purpose |
|---|---|
| `src/lib/input/inputAction.ts` | Core types |
| `src/lib/input/resolveAction.ts` | `resolveAction()`, `resolveModifier()` |
| `src/lib/input/modifierKeyMap.ts` | `ModifierKeyMap` type and defaults |
| `src/lib/input/nodeActions.ts` | `NodeOperation` type, `resolveNodeAction()`, convenience wrappers |
| `src/lib/input/interactable.ts` | `primary`, `secondary`, `auxiliary` Svelte actions |
| `src/lib/input/inputLabels.ts` | Localized label helpers |
| `src/lib/input/index.ts` | Barrel export |

### Modified Files

| File | Changes |
|---|---|
| `src/lib/inputStore.ts` | Add `ctrlKey` tracking. Expand `InputState` type. |
| `src/lib/Tree.svelte` | Replace inline action logic with `resolveAction()` → `resolveNodeAction()`. Remove `shiftKeyHeld` usage. Middle-click unified through resolver. |
| `src/lib/Node.svelte` | Modifier-aware two-row tooltip preview. Tooltip suppressed on touch. Remove `isRefund = $shiftKeyHeld`. |
| `src/lib/nodeActionPreview.ts` | Replace `getNodeActionPreview()` with `getNodeActionPreviewFromOp()`. |
| `src/lib/nodePrimaryActionStore.ts` | Remove `shiftKeyHeld` re-export. |
| `src/lib/Button.svelte` | Replace raw event forwarding with `use:primary` / `use:secondary`. |
| `src/lib/TreeTabs.svelte` | Tab/background interactions use `use:primary` / `use:secondary`. |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Labels generated via `getInputLabel()` + `$t()` templates. |
| `src/lib/onboarding/OnboardingOverlay.svelte` | `primaryInputLabel` from `getInputLabel()`. |
| `src/lib/RootNodeQuickSettings.svelte` | Platform label from `getInputLabel()`. |
| `src/locales/*.json` | Add `input.*` keys. Update `controls.*` templates. |

### Deleted

| What | Why |
|---|---|
| `shiftKeyHeld` re-export from `nodePrimaryActionStore.ts` | Replaced by `resolveModifier()` |
| `shiftKeyHeld` derived store from `inputStore.ts` | No longer needed — consumers use `resolveModifier($inputStore)` |
| `isRefund` pattern in `Node.svelte` | Replaced by modifier-aware preview |
| `applyPrimaryNodeAction()` / `applyOppositeNodeAction()` in `Tree.svelte` | Replaced by resolver |
| Old hardcoded control label locale keys | Replaced by composable `input.*` + template keys |

### Unchanged

| What | Why |
|---|---|
| Pan / pinch / zoom in `Tree.svelte` | Not part of action system |
| `longPress.ts` | Used internally by `use:secondary` |
| `tooltip.ts` directive | Separate concern |
| `hapticsStore.ts` | Called by Svelte actions internally |
| `NodeContextMenu.svelte` | Keeps callback-prop pattern; Tree.svelte passes convenience wrappers instead of inline functions |
| Keyboard shortcuts (F9, Tab, Esc, Backspace) | Separate from pointer/touch input |

## Behavior Changes

User-facing changes from the current implementation:

| Before | After | Impact |
|---|---|---|
| Shift + left click toggles refund (level down) | Shift + left click = increment tier (macro modifier) | **Breaking**: users accustomed to Shift for refund must use middle click or context menu instead |
| Middle click = decrement (inverse of primary action) | Middle click = decrement (unchanged, routed through resolver) | No change — behavior preserved |
| No Ctrl modifier support | Ctrl + left/middle click = +1 / -1 | New capability, no conflict |
| Tooltip shows single action preview | Tooltip shows both increment and decrement rows | Visual change only |
| Tooltip shows on all devices | Tooltip suppressed on touch devices | Touch users unaffected (no hover capability anyway) |

The Shift+click change is the most significant. The refund action (level down) moves from Shift+click to middle click — a more intuitive mapping where button determines direction and modifiers only change amount.
