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

Both are independent and composable (Shift+Ctrl is valid). This is a behavioral change from the current system where macro (Shift) takes priority when both are held — now both are independently active.

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

### resolveModifiers return type

```ts
// Before
function resolveModifier(state: InputState): InputModifier;

// After
function resolveModifiers(state: InputState): { reverse: boolean; alternate: boolean };
```

### resolveAction signature

```ts
// Before
function resolveAction(
    button: number,
    modifier: InputModifier,
    pointerType: string,
): InputAction | null;

// After
function resolveAction(
    button: number,
    modifiers: { reverse: boolean; alternate: boolean },
    pointerType: string,
): InputAction | null;
```

Touch devices still force modifiers to `{ reverse: false, alternate: false }` — the existing touch-forces-none behavior maps directly.

### DeviceInputLabels

The `DeviceInputLabels` type and `getDeviceInputLabels` function use field names based on the old modifier naming (`macroPrimary`, `microPrimary`, `macroAuxiliary`, `microAuxiliary`). These rename to match the new semantics:

```ts
// Before
type DeviceInputLabels = {
    primary: string;
    secondary: string;
    auxiliary?: string;
    macroPrimary: string;
    microPrimary: string;
    macroAuxiliary?: string;
    microAuxiliary?: string;
};

// After
type DeviceInputLabels = {
    primary: string;
    secondary: string;
    auxiliary?: string;
    reversePrimary: string;
    alternatePrimary: string;
    reverseAuxiliary?: string;
    alternateAuxiliary?: string;
};
```

`auxiliary`, `reverseAuxiliary`, and `alternateAuxiliary` remain optional — they are only populated for `device === "mouse"` (touch has no auxiliary/middle click).

`getInputLabel` currently takes a single `InputModifier` string. It changes to accept a modifier name string (`"reverse" | "alternate"`) used purely for label construction — this is a display concern, not a runtime modifier object.

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
| `src/lib/input/modifierKeyMap.ts` | Rename `macro`/`micro` → `reverse`/`alternate` in both the type and the `DEFAULT_MODIFIER_KEY_MAP` constant (`{ reverse: "shiftKey", alternate: "ctrlKey" }`). |
| `src/lib/input/resolveAction.ts` | `resolveModifier` → `resolveModifiers`, returns object. `resolveAction` passes modifiers object through. |

### Node actions

| File | Change |
|---|---|
| `src/lib/input/nodeActions.ts` | Remove `incrementTier`, `decrementTier`, `incrementOne`, `decrementOne`. Add `incrementByAlternate`, `decrementByAlternate`. Update `resolveNodeAction` with reverse/alternate logic. Update `NodeOperationCallbacks`. |
| `src/lib/Tree.svelte` | Update `nodeCallbacks` — replace 4 fixed callbacks with 2 alternate callbacks resolved against `$nodePrimaryAction`. |

### Labels & UI

| File | Change |
|---|---|
| `src/lib/input/inputLabels.ts` | Rename `DeviceInputLabels` fields (`macroPrimary` → `reversePrimary`, etc.). Update `getModifierLabel`, `getInputLabel`, `getDeviceInputLabels`, and `getKeyboardActionLabel` for new naming. `getKeyboardActionLabel("cycle")` references `input.macro` for the Shift label — update to `input.reverse`. |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Update help page: Shift = decrement, Ctrl = alternate. Rename `DeviceInputLabels` field references. Rework control item descriptions and translation keys to describe new semantics (Shift = reverse direction, Ctrl = alternate amount) instead of old fixed-action descriptions (+Tier, +1). |
| `src/lib/NodeContextMenu.svelte` | Replace static shortcut hints with dynamic hints computed reactively from `$nodePrimaryAction`. Each context menu action button (+1, +Tier, -1, -Tier) shows the shortcut that currently maps to it (e.g., if primary is +1, the +Tier button shows "Ctrl + Click" since alternate = +Tier). When no single-modifier shortcut exists for an action in the current primary state, no hint is shown. |
| `src/lib/onboarding/onboardingSteps.ts` | Update `input.macro`/`input.micro` translation key references to `input.reverse`/`input.alternate`. Update onboarding descriptions to reflect new semantics (Shift = decrement, Ctrl = alternate). |
| `src/locales/en.json`, `fr.json`, `ja.json`, `zh.json` | Rename `macro`/`micro` translation keys to `reverse`/`alternate`. Update `modifierTierLabel`/`modifierOneLabel` descriptions. |

### Consumers

| File | Change |
|---|---|
| `src/lib/input/index.ts` | Remove `InputModifier` re-export. |
| `src/lib/Node.svelte` | Update reactive blocks calling `resolveAction`/`resolveNodeAction`. |
| `src/lib/nodeActionPreview.ts` | Replace `incrementTier`/`decrementTier`/`incrementOne`/`decrementOne` switch cases with `incrementByAlternate`/`decrementByAlternate`. These new cases must resolve the concrete amount at preview time using the same alternate logic: if primary is +1 → alternate previews +Tier, else → +1. This is a logic change, not just a rename. |
| `src/lib/input/interactable.ts` | `use:primary`/`use:auxiliary`/`use:secondary` pass new modifier shape. The secondary handler's touch path currently constructs `"none"` — update to `{ reverse: false, alternate: false }`. |

### Tests

| File | Change |
|---|---|
| `test/resolveAction.test.ts` | Rewrite expectations from `"macro"`/`"micro"` strings to `{ reverse, alternate }` objects. |
| `test/resolveNodeAction.test.ts` | Replace tier/one operation tests with alternate operation tests. |
| `test/inputLabels.test.ts` | Update modifier label tests for `"reverse"`/`"alternate"` naming. |

## Context Menu

Unchanged. Right-click and long-press both open context menu. This is the primary discovery path for novice users and remains the most accessible interaction.

## Middle Click

Kept as a redundant decrement shortcut. `type === "auxiliary"` inherently resolves to decrement via the OR direction logic. No special-casing needed — it falls out of the existing pipeline.
