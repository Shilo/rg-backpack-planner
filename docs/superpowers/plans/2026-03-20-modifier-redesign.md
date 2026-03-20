# Modifier Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the macro/micro modifier system with composable reverse (Shift) + alternate (Ctrl) modifiers.

**Architecture:** Two independent boolean modifiers replace a single priority-based enum. Direction is determined by `isDecrement = auxiliary || reverse`. Amount toggle is `isAlternate = alternate`. NodeOperation simplifies from 7 to 5 variants — alternate ops resolve at callback time against the primary action store.

**Tech Stack:** Svelte 4, TypeScript, node:assert tests

**Spec:** `docs/superpowers/specs/2026-03-20-modifier-redesign.md`

---

## File Map

| File | Role | Change |
|---|---|---|
| `src/lib/input/inputAction.ts` | Core types | Remove `InputModifier`, add modifiers object to `InputAction` |
| `src/lib/input/modifierKeyMap.ts` | Key-to-modifier config | Rename macro/micro → reverse/alternate |
| `src/lib/input/resolveAction.ts` | Modifier + action resolution | Return object, remove priority logic |
| `src/lib/input/nodeActions.ts` | Node operation mapping | New reverse/alternate logic, 5 ops |
| `src/lib/input/index.ts` | Barrel exports | Remove `InputModifier`, rename `resolveModifier` |
| `src/lib/input/inputLabels.ts` | Display labels | Rename fields, update label functions |
| `src/lib/input/interactable.ts` | Svelte use: actions | Pass new modifier shape |
| `src/lib/nodeActionPreview.ts` | Tooltip previews | New alternate resolution logic |
| `src/lib/Node.svelte` | Node component | Update reactive modifier/op blocks |
| `src/lib/Tree.svelte` | Tree orchestrator | Update nodeCallbacks + call sites |
| `src/lib/NodeContextMenu.svelte` | Context menu | Rename shortcut hint fields |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Help page | Rename field references |
| `src/lib/TreeTabs.svelte` | Tab bar | Rename field references (secondary only) |
| `src/lib/onboarding/onboardingSteps.ts` | Onboarding flow | Update modifier labels + descriptions |
| `src/locales/en.json`, `fr.json`, `ja.json`, `zh.json` | Translations | Rename keys + update descriptions |
| `test/resolveAction.test.ts` | Unit tests | Rewrite for object modifiers |
| `test/resolveNodeAction.test.ts` | Unit tests | Rewrite for reverse/alternate logic |
| `test/inputLabels.test.ts` | Unit tests | Update modifier label expectations |

---

### Task 1: Core Types — inputAction.ts + modifierKeyMap.ts

**Files:**
- Modify: `src/lib/input/inputAction.ts`
- Modify: `src/lib/input/modifierKeyMap.ts`

- [ ] **Step 1: Update inputAction.ts**

Replace the entire file:

```ts
export type InputActionType = "primary" | "secondary" | "auxiliary";
export type PointerDevice = "mouse" | "touch";

export type InputModifiers = {
    reverse: boolean;
    alternate: boolean;
};

export type InputAction = {
    type: InputActionType;
    modifiers: InputModifiers;
    device: PointerDevice;
};
```

- [ ] **Step 2: Update modifierKeyMap.ts**

Replace the entire file:

```ts
export type ModifierKeyMap = {
    reverse: "shiftKey" | "ctrlKey";
    alternate: "shiftKey" | "ctrlKey";
};

export const DEFAULT_MODIFIER_KEY_MAP: ModifierKeyMap = {
    reverse: "shiftKey",
    alternate: "ctrlKey",
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/input/inputAction.ts src/lib/input/modifierKeyMap.ts
git commit -m "refactor: replace InputModifier enum with InputModifiers object type"
```

Note: The build will be broken after this step — downstream consumers still reference the old types. That is expected and resolved in the following tasks.

---

### Task 2: resolveAction.ts — New Modifier Resolution

**Files:**
- Modify: `src/lib/input/resolveAction.ts`

- [ ] **Step 1: Update resolveAction.ts**

Replace the entire file:

```ts
import type { InputAction, InputModifiers, PointerDevice } from "./inputAction";
import type { InputState } from "./inputStore";
import type { ModifierKeyMap } from "./modifierKeyMap";
import { DEFAULT_MODIFIER_KEY_MAP } from "./modifierKeyMap";

const NO_MODIFIERS: InputModifiers = { reverse: false, alternate: false };

/**
 * Translates physical key state to composable modifier object.
 * Both reverse and alternate are independently active.
 */
export function resolveModifiers(
    state: InputState,
    keyMap: ModifierKeyMap = DEFAULT_MODIFIER_KEY_MAP,
): InputModifiers {
    return {
        reverse: state[keyMap.reverse],
        alternate: state[keyMap.alternate],
    };
}

function normalizeDevice(pointerType: string): PointerDevice {
    return pointerType === "touch" ? "touch" : "mouse";
}

/**
 * Pure function: raw event data in, semantic action out.
 * Touch devices force modifiers to { reverse: false, alternate: false }.
 * Returns null for unsupported button/device combinations.
 */
export function resolveAction(
    button: number,
    modifiers: InputModifiers,
    pointerType: string,
): InputAction | null {
    const device = normalizeDevice(pointerType);
    const resolved = device === "touch" ? NO_MODIFIERS : modifiers;

    if (button === 0) {
        return { type: "primary", modifiers: resolved, device };
    }
    if (button === 1) {
        if (device === "touch") return null;
        return { type: "auxiliary", modifiers: resolved, device };
    }
    if (button === 2) {
        return { type: "secondary", modifiers: resolved, device };
    }
    return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/input/resolveAction.ts
git commit -m "refactor: resolveModifiers returns composable { reverse, alternate } object"
```

---

### Task 3: Tests — resolveAction + resolveModifiers

**Files:**
- Modify: `test/resolveAction.test.ts`

- [ ] **Step 1: Rewrite resolveAction.test.ts**

Replace the entire file:

```ts
import assert from "node:assert/strict";
import { resolveModifiers, resolveAction } from "../src/lib/input/resolveAction.ts";
import type { InputState } from "../src/lib/input/inputStore.ts";
import { DEFAULT_MODIFIER_KEY_MAP } from "../src/lib/input/modifierKeyMap.ts";

console.log("  resolveModifiers");

// --- No keys held → both false ---
{
    const state: InputState = { shiftKey: false, ctrlKey: false };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: false, alternate: false });
    console.log("    ✓ no keys held returns { reverse: false, alternate: false }");
}

// --- Shift held → reverse only ---
{
    const state: InputState = { shiftKey: true, ctrlKey: false };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: true, alternate: false });
    console.log("    ✓ shift held returns { reverse: true, alternate: false }");
}

// --- Ctrl held → alternate only ---
{
    const state: InputState = { shiftKey: false, ctrlKey: true };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: false, alternate: true });
    console.log("    ✓ ctrl held returns { reverse: false, alternate: true }");
}

// --- Both held → both true (independent, no priority) ---
{
    const state: InputState = { shiftKey: true, ctrlKey: true };
    assert.deepEqual(resolveModifiers(state, DEFAULT_MODIFIER_KEY_MAP), { reverse: true, alternate: true });
    console.log("    ✓ both held returns { reverse: true, alternate: true }");
}

console.log("  ✓ resolveModifiers\n");

console.log("  resolveAction");

const NONE = { reverse: false, alternate: false };
const REV = { reverse: true, alternate: false };
const ALT = { reverse: false, alternate: true };
const BOTH = { reverse: true, alternate: true };

// --- Button 0, mouse, no modifiers → primary ---
{
    const result = resolveAction(0, NONE, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 0, mouse, none → primary");
}

// --- Button 0, mouse, reverse → primary with reverse ---
{
    const result = resolveAction(0, REV, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: REV, device: "mouse" });
    console.log("    ✓ button 0, mouse, reverse → primary with reverse");
}

// --- Button 1, mouse → auxiliary ---
{
    const result = resolveAction(1, NONE, "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 1, mouse → auxiliary");
}

// --- Button 1, mouse, alternate → auxiliary with alternate ---
{
    const result = resolveAction(1, ALT, "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifiers: ALT, device: "mouse" });
    console.log("    ✓ button 1, mouse, alternate → auxiliary with alternate");
}

// --- Button 2, mouse → secondary ---
{
    const result = resolveAction(2, NONE, "mouse");
    assert.deepEqual(result, { type: "secondary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ button 2, mouse → secondary");
}

// --- Button 0, touch → primary, modifiers forced to none ---
{
    const result = resolveAction(0, REV, "touch");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "touch" });
    console.log("    ✓ button 0, touch → primary, modifiers forced to none");
}

// --- Button 1, touch → null (no auxiliary on touch) ---
{
    const result = resolveAction(1, NONE, "touch");
    assert.equal(result, null);
    console.log("    ✓ button 1, touch → null");
}

// --- Button 2, touch → secondary ---
{
    const result = resolveAction(2, NONE, "touch");
    assert.deepEqual(result, { type: "secondary", modifiers: NONE, device: "touch" });
    console.log("    ✓ button 2, touch → secondary");
}

// --- Pen normalized to mouse ---
{
    const result = resolveAction(0, ALT, "pen");
    assert.deepEqual(result, { type: "primary", modifiers: ALT, device: "mouse" });
    console.log("    ✓ pen normalized to mouse");
}

// --- Unknown button → null ---
{
    const result = resolveAction(3, NONE, "mouse");
    assert.equal(result, null);
    console.log("    ✓ button 3 → null");
}

// --- Empty pointerType treated as mouse ---
{
    const result = resolveAction(0, NONE, "");
    assert.deepEqual(result, { type: "primary", modifiers: NONE, device: "mouse" });
    console.log("    ✓ empty pointerType treated as mouse");
}

// --- Both modifiers, button 0 → primary with both ---
{
    const result = resolveAction(0, BOTH, "mouse");
    assert.deepEqual(result, { type: "primary", modifiers: BOTH, device: "mouse" });
    console.log("    ✓ both modifiers, button 0 → primary with both");
}

console.log("  ✓ resolveAction\n");
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test`
Expected: resolveAction tests PASS (other tests may fail — downstream files not yet updated)

- [ ] **Step 3: Commit**

```bash
git add test/resolveAction.test.ts
git commit -m "test: rewrite resolveAction tests for composable modifiers"
```

---

### Task 4: nodeActions.ts — Reverse/Alternate Logic

**Files:**
- Modify: `src/lib/input/nodeActions.ts`

- [ ] **Step 1: Update nodeActions.ts**

Replace the entire file:

```ts
import type { InputAction } from "./inputAction";
import type { NodeIndex } from "../../types/tree";

export type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementByAlternate" }
    | { op: "decrementByAlternate" }
    | { op: "contextMenu" };

export type TreeBackgroundOperation =
    | { op: "contextMenu" }
    | { op: "focusInView" };

export type TabOperation =
    | { op: "activate" }
    | { op: "contextMenu" };

export type RootOperation =
    | { op: "openQuickSettings" };

/**
 * Maps an InputAction to a concrete NodeOperation.
 * Direction: isDecrement = auxiliary OR reverse (OR semantics, no cancel-out).
 * Amount: alternate toggles between +1 and +Tier based on primary action store.
 * Secondary always maps to contextMenu.
 */
export function resolveNodeAction(
    action: InputAction,
): NodeOperation {
    if (action.type === "secondary") {
        return { op: "contextMenu" };
    }

    const isDecrement = action.type === "auxiliary" || action.modifiers.reverse;
    const isAlternate = action.modifiers.alternate;

    if (isAlternate) {
        return { op: isDecrement ? "decrementByAlternate" : "incrementByAlternate" };
    }
    return { op: isDecrement ? "decrementByStore" : "incrementByStore" };
}

/**
 * Dispatches a NodeOperation to the appropriate callback.
 * Called by Tree.svelte after resolving through the pipeline.
 */
export function applyNodeOperation(
    op: NodeOperation,
    index: NodeIndex,
    callbacks: NodeOperationCallbacks,
    pos?: { x: number; y: number },
): void {
    switch (op.op) {
        case "incrementByStore":
            callbacks.incrementByStore(index);
            break;
        case "decrementByStore":
            callbacks.decrementByStore(index);
            break;
        case "incrementByAlternate":
            callbacks.incrementByAlternate(index);
            break;
        case "decrementByAlternate":
            callbacks.decrementByAlternate(index);
            break;
        case "contextMenu":
            if (!pos) throw new Error("contextMenu requires pos");
            callbacks.contextMenu(index, pos);
            break;
    }
}

export type NodeOperationCallbacks = {
    incrementByStore: (index: NodeIndex) => void;
    decrementByStore: (index: NodeIndex) => void;
    incrementByAlternate: (index: NodeIndex) => void;
    decrementByAlternate: (index: NodeIndex) => void;
    contextMenu: (index: NodeIndex, pos: { x: number; y: number }) => void;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/input/nodeActions.ts
git commit -m "refactor: simplify NodeOperation to 5 ops with reverse/alternate logic"
```

---

### Task 5: Tests — resolveNodeAction

**Files:**
- Modify: `test/resolveNodeAction.test.ts`

- [ ] **Step 1: Rewrite resolveNodeAction.test.ts**

Replace the entire file:

```ts
import assert from "node:assert/strict";
import { resolveNodeAction } from "../src/lib/input/nodeActions.ts";
import type { InputAction } from "../src/lib/input/inputAction.ts";

console.log("  resolveNodeAction");

const NONE = { reverse: false, alternate: false };
const REV = { reverse: true, alternate: false };
const ALT = { reverse: false, alternate: true };
const BOTH = { reverse: true, alternate: true };

// --- Primary, no modifiers → incrementByStore ---
{
    const action: InputAction = { type: "primary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByStore" });
    console.log("    ✓ primary + none → incrementByStore");
}

// --- Primary, reverse → decrementByStore ---
{
    const action: InputAction = { type: "primary", modifiers: REV, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ primary + reverse → decrementByStore");
}

// --- Primary, alternate → incrementByAlternate ---
{
    const action: InputAction = { type: "primary", modifiers: ALT, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByAlternate" });
    console.log("    ✓ primary + alternate → incrementByAlternate");
}

// --- Primary, reverse + alternate → decrementByAlternate ---
{
    const action: InputAction = { type: "primary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ primary + reverse + alternate → decrementByAlternate");
}

// --- Auxiliary, no modifiers → decrementByStore (inherently reverse) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ auxiliary + none → decrementByStore");
}

// --- Auxiliary, reverse → decrementByStore (Shift redundant with middle click) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: REV, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByStore" });
    console.log("    ✓ auxiliary + reverse → decrementByStore (Shift redundant)");
}

// --- Auxiliary, alternate → decrementByAlternate ---
{
    const action: InputAction = { type: "auxiliary", modifiers: ALT, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ auxiliary + alternate → decrementByAlternate");
}

// --- Auxiliary, reverse + alternate → decrementByAlternate (Shift redundant) ---
{
    const action: InputAction = { type: "auxiliary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "decrementByAlternate" });
    console.log("    ✓ auxiliary + reverse + alternate → decrementByAlternate (Shift redundant)");
}

// --- Secondary always → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifiers: NONE, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "contextMenu" });
    console.log("    ✓ secondary → contextMenu");
}

// --- Secondary with modifiers still → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifiers: BOTH, device: "mouse" };
    assert.deepEqual(resolveNodeAction(action), { op: "contextMenu" });
    console.log("    ✓ secondary + modifiers → contextMenu (modifiers ignored)");
}

// --- Touch primary → incrementByStore (modifiers forced to none by resolveAction) ---
{
    const action: InputAction = { type: "primary", modifiers: NONE, device: "touch" };
    assert.deepEqual(resolveNodeAction(action), { op: "incrementByStore" });
    console.log("    ✓ touch primary → incrementByStore");
}

console.log("  ✓ resolveNodeAction\n");
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: resolveAction and resolveNodeAction tests PASS

- [ ] **Step 3: Commit**

```bash
git add test/resolveNodeAction.test.ts
git commit -m "test: rewrite resolveNodeAction tests for reverse/alternate"
```

---

### Task 6: Barrel Exports + interactable.ts

**Files:**
- Modify: `src/lib/input/index.ts`
- Modify: `src/lib/input/interactable.ts`

- [ ] **Step 1: Update index.ts**

Replace line 1 (the type exports from inputAction):

```ts
export type { InputActionType, InputModifiers, PointerDevice, InputAction } from "./inputAction";
```

Replace line 4 (the resolveAction exports):

```ts
export { resolveModifiers, resolveAction } from "./resolveAction";
```

- [ ] **Step 2: Update interactable.ts**

In `primary` function (~line 27), replace:
```ts
        const modifier = resolveModifier(state);
        const action = resolveAction(event.button, modifier, pointerType);
```
with:
```ts
        const modifiers = resolveModifiers(state);
        const action = resolveAction(event.button, modifiers, pointerType);
```

In `secondary` function, `onContextMenu` handler (~line 88-90), replace:
```ts
        const modifier = resolveModifier(state);
        const action = resolveAction(2, modifier, "mouse");
```
with:
```ts
        const modifiers = resolveModifiers(state);
        const action = resolveAction(2, modifiers, "mouse");
```

In `secondary` function, `onPointerDown` long-press callback (~line 104-106), replace:
```ts
            const modifier = device === "touch" ? "none" : resolveModifier(get(inputStore));
            const action = resolveAction(2, modifier, device);
```
with:
```ts
            const modifiers = device === "touch" ? { reverse: false, alternate: false } : resolveModifiers(get(inputStore));
            const action = resolveAction(2, modifiers, device);
```

In `auxiliary` function (~line 150-152), replace:
```ts
        const modifier = resolveModifier(state);
        const action = resolveAction(1, modifier, "mouse");
```
with:
```ts
        const modifiers = resolveModifiers(state);
        const action = resolveAction(1, modifiers, "mouse");
```

Update the import at line 4:
```ts
import { resolveModifiers, resolveAction } from "./resolveAction";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/input/index.ts src/lib/input/interactable.ts
git commit -m "refactor: update barrel exports and interactable for composable modifiers"
```

---

### Task 7: Labels — inputLabels.ts + Tests

**Files:**
- Modify: `src/lib/input/inputLabels.ts`
- Modify: `test/inputLabels.test.ts`

- [ ] **Step 1: Update inputLabels.ts**

Replace the import at line 1:
```ts
import type { InputActionType, PointerDevice } from "./inputAction";
```

Replace `getModifierLabel` (lines 8-11):
```ts
export type ModifierName = "reverse" | "alternate";

export function getModifierLabel(modifier: ModifierName, t: TranslateFn): string {
    return t(`input.${modifier}`);
}
```

Replace `getInputLabel` (lines 21-32):
```ts
export function getInputLabel(
    type: InputActionType,
    modifier: ModifierName | null,
    device: PointerDevice,
    t: TranslateFn,
): string {
    const button = getButtonLabel(type, device, t);
    if (!modifier) return button;
    const mod = getModifierLabel(modifier, t);
    const sep = t("input.modifierSeparator");
    return mod + sep + button;
}
```

Replace `DeviceInputLabels` type and `getDeviceInputLabels` (lines 34-57):
```ts
export type DeviceInputLabels = {
    primary: string;
    secondary: string;
    auxiliary?: string;
    reversePrimary: string;
    alternatePrimary: string;
    reverseAuxiliary?: string;
    alternateAuxiliary?: string;
};

export function getDeviceInputLabels(device: PointerDevice, t: TranslateFn): DeviceInputLabels {
    const labels: DeviceInputLabels = {
        primary: getInputLabel("primary", null, device, t),
        secondary: getInputLabel("secondary", null, device, t),
        reversePrimary: getInputLabel("primary", "reverse", device, t),
        alternatePrimary: getInputLabel("primary", "alternate", device, t),
    };
    if (device === "mouse") {
        labels.auxiliary = getInputLabel("auxiliary", null, device, t);
        labels.reverseAuxiliary = getInputLabel("auxiliary", "reverse", device, t);
        labels.alternateAuxiliary = getInputLabel("auxiliary", "alternate", device, t);
    }
    return labels;
}
```

Update `getKeyboardActionLabel` — line 77, replace `t("input.macro")` with `t("input.reverse")`:
```ts
        const shiftTab = t("input.reverse") + t("input.modifierSeparator") + tab;
```

- [ ] **Step 2: Update test/inputLabels.test.ts**

Replace the entire file:

```ts
import assert from "node:assert/strict";
import { getModifierLabel, getButtonLabel, getInputLabel } from "../src/lib/input/inputLabels.ts";

// Mock translation function that returns the key as-is
const t = (key: string) => key;

console.log("  inputLabels");

// --- getModifierLabel ---
{
    assert.equal(getModifierLabel("reverse", t), "input.reverse");
    assert.equal(getModifierLabel("alternate", t), "input.alternate");
    console.log("    ✓ getModifierLabel returns correct keys");
}

// --- getButtonLabel ---
{
    assert.equal(getButtonLabel("primary", "mouse", t), "input.primary.mouse");
    assert.equal(getButtonLabel("primary", "touch", t), "input.primary.touch");
    assert.equal(getButtonLabel("secondary", "mouse", t), "input.secondary.mouse");
    assert.equal(getButtonLabel("secondary", "touch", t), "input.secondary.touch");
    assert.equal(getButtonLabel("auxiliary", "mouse", t), "input.auxiliary.mouse");
    console.log("    ✓ getButtonLabel returns correct keys");
}

// --- getInputLabel: no modifier ---
{
    const result = getInputLabel("primary", null, "mouse", t);
    assert.equal(result, "input.primary.mouse");
    console.log("    ✓ getInputLabel without modifier returns button label only");
}

// --- getInputLabel: with modifier ---
{
    const result = getInputLabel("primary", "reverse", "mouse", t);
    assert.equal(result, "input.reverse" + "input.modifierSeparator" + "input.primary.mouse");
    console.log("    ✓ getInputLabel with modifier returns 'modifier + separator + button'");
}

console.log("  ✓ inputLabels\n");
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: inputLabels tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/input/inputLabels.ts test/inputLabels.test.ts
git commit -m "refactor: rename DeviceInputLabels fields to reverse/alternate"
```

---

### Task 8: Locale Files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: Update en.json**

In the `"input"` section, rename:
- `"macro": "Shift"` → `"reverse": "Shift"`
- `"micro": "Ctrl"` → `"alternate": "Ctrl"`

In the `"onboarding"` section, update:
- `"modifierTierLabel": "{action} + Click / Middle Click"` → `"modifierReverseLabel": "{action} + Click / Middle Click"`
- `"modifierTier": "Level up/down by tier"` → `"modifierReverse": "Decrement (reverse direction)"`
- `"modifierOneLabel": "{action} + Click / Middle Click"` → `"modifierAlternateLabel": "{action} + Click"`
- `"modifierOne": "Level up/down by one"` → `"modifierAlternate": "Alternate amount (+1 or +Tier)"`

- [ ] **Step 2: Update fr.json**

Same key renames. In the `"input"` section:
- `"macro": "Maj"` → `"reverse": "Maj"`
- `"micro": "Ctrl"` → `"alternate": "Ctrl"`

Update `"onboarding"` keys to match the new key names (keep existing French translations, update descriptions).

- [ ] **Step 3: Update ja.json and zh.json**

Same key renames in both files. In the `"input"` section:
- `"macro": "Shift"` → `"reverse": "Shift"`
- `"micro": "Ctrl"` → `"alternate": "Ctrl"`

Update `"onboarding"` keys to match the new key names.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/fr.json src/locales/ja.json src/locales/zh.json
git commit -m "i18n: rename macro/micro translation keys to reverse/alternate"
```

---

### Task 9: nodeActionPreview.ts — Alternate Resolution Logic

**Files:**
- Modify: `src/lib/nodeActionPreview.ts`

- [ ] **Step 1: Update getNodeActionPreviewFromOp switch**

Replace the switch block at lines 125-150:

```ts
    switch (operation.op) {
        case "incrementByStore":
            action = primaryAction;
            isRefund = false;
            break;
        case "decrementByStore":
            action = primaryAction;
            isRefund = true;
            break;
        case "incrementByAlternate":
            action = primaryAction === NodePrimaryAction.IncrementOne
                ? NodePrimaryAction.IncrementTier
                : NodePrimaryAction.IncrementOne;
            isRefund = false;
            break;
        case "decrementByAlternate":
            action = primaryAction === NodePrimaryAction.IncrementOne
                ? NodePrimaryAction.IncrementTier
                : NodePrimaryAction.IncrementOne;
            isRefund = true;
            break;
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/nodeActionPreview.ts
git commit -m "refactor: update nodeActionPreview for alternate operations"
```

---

### Task 10: Tree.svelte — nodeCallbacks + Call Sites

**Files:**
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Update import**

At line 75, replace:
```ts
import { resolveModifier, resolveAction, resolveNodeAction, applyNodeOperation } from "./input";
```
with:
```ts
import { resolveModifiers, resolveAction, resolveNodeAction, applyNodeOperation } from "./input";
```

- [ ] **Step 2: Update nodeCallbacks**

At lines 716-734, replace the `nodeCallbacks` object:

```ts
    const nodeCallbacks: NodeOperationCallbacks = {
        incrementByStore: (index) => {
            if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) levelUp(index);
            else if ($nodePrimaryAction === NodePrimaryAction.IncrementTen) levelUpBy10(index);
            else levelUpTier(index);
        },
        decrementByStore: (index) => {
            if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) levelDown(index);
            else if ($nodePrimaryAction === NodePrimaryAction.IncrementTen) levelDownBy10(index);
            else levelDownTier(index);
        },
        incrementByAlternate: (index) => {
            if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) levelUpTier(index);
            else levelUp(index);
        },
        decrementByAlternate: (index) => {
            if ($nodePrimaryAction === NodePrimaryAction.IncrementOne) levelDownTier(index);
            else levelDown(index);
        },
        contextMenu: (index, pos) => {
            contextMenu = { index, x: pos.x, y: pos.y };
        },
    };
```

- [ ] **Step 3: Update call sites**

At line 1158 (middle click handler) and line 1198 (pointerup handler), replace both instances of:
```ts
const modifier = resolveModifier($inputStore);
const action = resolveAction(event.button, modifier, event.pointerType);
```
with:
```ts
const modifiers = resolveModifiers($inputStore);
const action = resolveAction(event.button, modifiers, event.pointerType);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "refactor: update Tree.svelte nodeCallbacks for reverse/alternate"
```

---

### Task 11: Node.svelte — Reactive Modifier Blocks

**Files:**
- Modify: `src/lib/Node.svelte`

- [ ] **Step 1: Update import**

At line 26, replace:
```ts
import { resolveModifier, resolveAction, resolveNodeAction } from "./input";
```
with:
```ts
import { resolveModifiers, resolveAction, resolveNodeAction } from "./input";
```

- [ ] **Step 2: Update reactive blocks**

At line 70, replace:
```ts
    $: modifier = resolveModifier($inputStore);
```
with:
```ts
    $: modifiers = resolveModifiers($inputStore);
```

At lines 72-75, replace:
```ts
    $: incrementOp = (() => {
        const action = resolveAction(0, modifier, "mouse");
        return action ? resolveNodeAction(action) : null;
    })();
```
with:
```ts
    $: incrementOp = (() => {
        const action = resolveAction(0, modifiers, "mouse");
        return action ? resolveNodeAction(action) : null;
    })();
```

At lines 77-80, replace:
```ts
    $: decrementOp = (() => {
        const action = resolveAction(1, modifier, "mouse");
        return action ? resolveNodeAction(action) : null;
    })();
```
with:
```ts
    $: decrementOp = (() => {
        const action = resolveAction(1, modifiers, "mouse");
        return action ? resolveNodeAction(action) : null;
    })();
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/Node.svelte
git commit -m "refactor: update Node.svelte for composable modifiers"
```

---

### Task 12: UI Consumers — Context Menu, Controls, Tabs, Onboarding

**Files:**
- Modify: `src/lib/NodeContextMenu.svelte`
- Modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte`
- Modify: `src/lib/TreeTabs.svelte`
- Modify: `src/lib/onboarding/onboardingSteps.ts`

- [ ] **Step 1: Update NodeContextMenu.svelte**

Rename all `DeviceInputLabels` field references:
- Line 274: `shortcut={mouse.microPrimary}` → `shortcut={mouse.alternatePrimary}`
- Line 304: `shortcut={mouse.macroPrimary}` → `shortcut={mouse.reversePrimary}`
- Line 319: `shortcut={mouse.microAuxiliary}` → `shortcut={mouse.alternateAuxiliary}`
- Line 345: `shortcut={mouse.macroAuxiliary}` → `shortcut={mouse.reverseAuxiliary}`

- [ ] **Step 2: Update SideMenuControlsPage.svelte**

Rename all field references:
- Line 123: `mouse.macroPrimary` → `mouse.reversePrimary`
- Line 131: `mouse.macroAuxiliary` → `mouse.reverseAuxiliary`
- Line 139: `mouse.microPrimary` → `mouse.alternatePrimary`
- Line 147: `mouse.microAuxiliary` → `mouse.alternateAuxiliary`

- [ ] **Step 3: Update onboardingSteps.ts**

At lines 122-129, update the modifier card entries:
```ts
            {
                icon: ShiftKeyIcon,
                label: translate("onboarding.modifierReverseLabel", { action: translate("input.reverse") }),
                description: translate("onboarding.modifierReverse"),
            },
            {
                icon: CtrlKeyIcon,
                label: translate("onboarding.modifierAlternateLabel", { action: translate("input.alternate") }),
                description: translate("onboarding.modifierAlternate"),
            },
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/NodeContextMenu.svelte src/lib/sideMenuPages/SideMenuControlsPage.svelte src/lib/TreeTabs.svelte src/lib/onboarding/onboardingSteps.ts
git commit -m "refactor: update UI consumers for reverse/alternate field names"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 2: Run dev server and manually verify**

Run: `npm run dev`

Verify:
- Left click increments by primary action
- Shift + Left click decrements by primary action
- Ctrl + Left click increments by alternate amount
- Ctrl + Shift + Left click decrements by alternate amount
- Middle click decrements (same as Shift + Left click)
- Ctrl + Middle click decrements by alternate amount
- Right click opens context menu (unchanged)
- Context menu shortcut hints show correct labels
- Help page (SideMenuControlsPage) shows updated modifier descriptions
- N key still cycles primary action

- [ ] **Step 3: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```
