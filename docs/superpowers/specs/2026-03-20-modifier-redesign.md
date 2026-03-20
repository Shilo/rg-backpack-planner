# Modifier Redesign — Reverse & Alternate

Replaces the `macro`/`micro` modifier system with two composable modifiers: **reverse** (Shift) and **alternate** (Ctrl). Retires middle click as the primary decrement path in favor of Shift+click, while keeping middle click as a redundant alternative.

## Motivation

The current modifier system has usability problems:

- **Middle click is physically awkward** — stiffer button, unnatural to press, slower for repeated use.
- **Shift (macro/+Tier) and Ctrl (micro/+1) overlap** with the dynamic primary action store — confusing in practice since the primary action is often already set to one of the modifier actions.
- **Two fixed modifiers is one too many** — users must remember what each does vs. what the primary action already covers.

The fix: one modifier for direction (decrement), one for smart amount toggling, and they compose together.

## Design

### Modifier Mapping

| Modifier | Key | Semantics |
|---|---|---|
| **reverse** | Shift | Reverses direction: increment becomes decrement |
| **alternate** | Ctrl | Toggles amount: if primary is +1 → +Tier; if primary is +10 or +Tier → +1 |

Both are independent and composable (Shift+Ctrl is valid).

### Interaction Matrix

| Input | Direction | Amount | Result |
|---|---|---|---|
| Left click | increment | primary action | +1 / +10 / +Tier (per store) |
| Shift + Left click | decrement | primary action | -1 / -10 / -Tier (per store) |
| Ctrl + Left click | increment | alternate | +Tier if primary is +1, else +1 |
| Ctrl + Shift + Left click | decrement | alternate | -Tier if primary is +1, else -1 |
| Middle click | decrement | primary action | Same as Shift + Left click |
| Shift + Middle click | decrement | primary action | Shift redundant — still decrement |
| Ctrl + Middle click | decrement | alternate | Same as Ctrl + Shift + Left click |
| Ctrl + Shift + Middle click | decrement | alternate | Shift redundant — still decrement alternate |
| Right click / Long press | — | — | Context menu (unchanged) |

### Direction Logic

```
isDecrement = (type === "auxiliary") || modifiers.reverse
```

OR semantics — Shift and middle click don't cancel out. Both active = still decrement.

### Alternate Logic

```
isAlternate = modifiers.alternate

if primary is +1:     alternate = +Tier
if primary is +10:    alternate = +1
if primary is +Tier:  alternate = +1
```

Rule: if primary is +1, alternate gives +Tier. Otherwise, alternate gives +1.

## Core Type Changes

### InputAction modifiers — object replaces single enum

```ts
// Before
type InputModifier = "none" | "macro" | "micro";
type InputAction = {
    type: InputActionType;
    modifier: InputModifier;
    device: PointerDevice;
};

// After
type InputAction = {
    type: InputActionType;
    modifiers: { reverse: boolean; alternate: boolean };
    device: PointerDevice;
};
```

`InputModifier` as a standalone type is removed. The object shape gives compile-time typo safety, autocomplete, and destructuring.

### ModifierKeyMap

```ts
// Before
type ModifierKeyMap = {
    macro: "shiftKey" | "ctrlKey";
    micro: "shiftKey" | "ctrlKey";
};

// After
type ModifierKeyMap = {
    reverse: "shiftKey" | "ctrlKey";
    alternate: "shiftKey" | "ctrlKey";
};
```

### resolveModifier return type

```ts
// Before
function resolveModifier(state: InputState): InputModifier;

// After
function resolveModifiers(state: InputState): { reverse: boolean; alternate: boolean };
```

### NodeOperation simplification

```ts
// Before (7 operations)
type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementTier" }
    | { op: "decrementTier" }
    | { op: "incrementOne" }
    | { op: "decrementOne" }
    | { op: "contextMenu" };

// After (5 operations)
type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementByAlternate" }
    | { op: "decrementByAlternate" }
    | { op: "contextMenu" };
```

`incrementByAlternate`/`decrementByAlternate` are resolved at callback execution time against the `nodePrimaryAction` store.

## Affected Files

### Core input pipeline

| File | Change |
|---|---|
| `src/lib/input/inputAction.ts` | Replace `modifier: InputModifier` with `modifiers: { reverse: boolean; alternate: boolean }`. Remove `InputModifier` type. |
| `src/lib/input/modifierKeyMap.ts` | Rename `macro`/`micro` → `reverse`/`alternate`. |
| `src/lib/input/resolveAction.ts` | `resolveModifier` → `resolveModifiers`, returns object. `resolveAction` passes modifiers object through. |

### Node actions

| File | Change |
|---|---|
| `src/lib/input/nodeActions.ts` | Remove `incrementTier`, `decrementTier`, `incrementOne`, `decrementOne`. Add `incrementByAlternate`, `decrementByAlternate`. Update `resolveNodeAction` with reverse/alternate logic. Update `NodeOperationCallbacks`. |
| `src/lib/Tree.svelte` | Update `nodeCallbacks` — replace 4 fixed callbacks with 2 alternate callbacks resolved against `$nodePrimaryAction`. |

### Labels & UI

| File | Change |
|---|---|
| `src/lib/input/inputLabels.ts` | Update `getModifierLabel` for `reverse`/`alternate`. |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Update help page: Shift = decrement, Ctrl = alternate. |
| `src/locales/en.json` (+ other locales) | Rename `macro`/`micro` translation keys to `reverse`/`alternate`. |

### Consumers

| File | Change |
|---|---|
| `src/lib/Node.svelte` | Update reactive blocks calling `resolveAction`/`resolveNodeAction`. |
| `src/lib/nodeActionPreview.ts` | Update preview logic for new operation names. |
| `src/lib/input/interactable.ts` | `use:primary`/`use:auxiliary` pass new modifier shape. |

### Tests

| File | Change |
|---|---|
| `test/resolveAction.test.ts` | Rewrite expectations from `"macro"`/`"micro"` strings to `{ reverse, alternate }` objects. |
| `test/resolveNodeAction.test.ts` | Replace tier/one operation tests with alternate operation tests. |

## Context Menu

Unchanged. Right-click and long-press both open context menu. This is the primary discovery path for novice users and remains the most accessible interaction.

## Middle Click

Kept as a redundant decrement shortcut. `type === "auxiliary"` inherently resolves to decrement via the OR direction logic. No special-casing needed — it falls out of the existing pipeline.
