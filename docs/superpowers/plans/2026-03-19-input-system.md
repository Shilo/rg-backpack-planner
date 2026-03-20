# Input System Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize all pointer, touch, and modifier input handling into a shared `src/lib/input/` module with pure action resolvers and composable Svelte actions.

**Architecture:** Raw pointer/touch events are resolved through a pure-function pipeline (`resolveModifier` → `resolveAction` → `resolveNodeAction`) into semantic operations. Three composable Svelte `use:` actions (`primary`, `secondary`, `auxiliary`) handle event wiring for standalone UI elements, while Tree.svelte calls the resolvers directly at the viewport level for gesture disambiguation. Modifier keys are abstracted as `macro` (Shift) and `micro` (Ctrl), decoupled from physical keys via a configurable map.

**Tech Stack:** Svelte 5 (writable stores, derived stores, Svelte actions), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-19-input-system-design.md`

---

## File Map

### New Files (in `src/lib/input/`)

| File | Responsibility |
|---|---|
| `inputAction.ts` | Core types: `InputActionType`, `InputModifier`, `PointerDevice`, `InputAction` |
| `modifierKeyMap.ts` | `ModifierKeyMap` type, `DEFAULT_MODIFIER_KEY_MAP` constant |
| `resolveAction.ts` | `resolveModifier()`, `resolveAction()` pure functions |
| `nodeActions.ts` | `NodeOperation` type, `resolveNodeAction()`, `applyNodeOperation()`, convenience wrappers |
| `interactable.ts` | `primary`, `secondary`, `auxiliary` Svelte `use:` actions |
| `inputLabels.ts` | `getModifierLabel()`, `getButtonLabel()`, `getInputLabel()` locale helpers |
| `index.ts` | Barrel re-export |

### New Test Files

| File | Tests |
|---|---|
| `test/resolveAction.test.ts` | `resolveModifier`, `resolveAction` — all button/modifier/device combos |
| `test/resolveNodeAction.test.ts` | `resolveNodeAction` — all InputAction → NodeOperation mappings |
| `test/inputLabels.test.ts` | Label composition for all device/modifier combos |

### Modified Files

| File | Changes |
|---|---|
| `src/lib/inputStore.ts` | Add `ctrlKey` to `InputState`, sync from PointerEvent + keydown/keyup, remove `shiftKeyHeld` export |
| `src/lib/nodePrimaryActionStore.ts` | Remove `shiftKeyHeld` re-export |
| `src/lib/nodeActionPreview.ts` | Add `getNodeActionPreviewFromOp()` alongside existing function |
| `src/lib/Tree.svelte` | Replace `applyPrimaryNodeAction`/`applyOppositeNodeAction`/`middleClickCandidates` with resolver pipeline |
| `src/lib/Node.svelte` | Modifier-aware two-row tooltip, suppress tooltip on touch |
| `src/lib/Button.svelte` | Replace raw event forwarding with `use:primary`/`use:secondary` |
| `src/lib/TreeTabs.svelte` | Tab/background interactions via `use:primary`/`use:secondary` |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Generate labels via `getInputLabel()` + `$t()` templates |
| `src/lib/onboarding/OnboardingOverlay.svelte` | Use `getInputLabel()` for platform labels |
| `src/lib/RootNodeQuickSettings.svelte` | Use `getInputLabel()` for platform label |
| `src/locales/en.json` | Add `input.*` keys, update `controls.*` templates |
| `src/locales/fr.json` | Add `input.*` keys, update `controls.*` templates |
| `src/locales/ja.json` | Add `input.*` keys, update `controls.*` templates |
| `src/locales/zh.json` | Add `input.*` keys, update `controls.*` templates |
| `test/index.ts` | Register new test files |

---

### Task 1: Core Types, Modifier Key Map, and inputStore Expansion

This task creates the foundational types, expands `inputStore` with `ctrlKey`, and removes `shiftKeyHeld` — all as a single atomic change so intermediate commits never break the build.

**Files:**
- Create: `src/lib/input/inputAction.ts`
- Create: `src/lib/input/modifierKeyMap.ts`
- Modify: `src/lib/inputStore.ts`
- Modify: `src/lib/nodePrimaryActionStore.ts`
- Modify: `src/lib/Node.svelte`
- Modify: `src/lib/Tree.svelte`

- [ ] **Step 1: Create `inputAction.ts` with core types**

Create `src/lib/input/inputAction.ts`:

```ts
export type InputActionType = "primary" | "secondary" | "auxiliary";
export type InputModifier = "none" | "macro" | "micro";
export type PointerDevice = "mouse" | "touch";

export type InputAction = {
    type: InputActionType;
    modifier: InputModifier;
    device: PointerDevice;
};
```

- [ ] **Step 2: Create `modifierKeyMap.ts`**

Create `src/lib/input/modifierKeyMap.ts`:

```ts
export type ModifierKeyMap = {
    macro: "shiftKey" | "ctrlKey";
    micro: "shiftKey" | "ctrlKey";
};

export const DEFAULT_MODIFIER_KEY_MAP: ModifierKeyMap = {
    macro: "shiftKey",
    micro: "ctrlKey",
};
```

- [ ] **Step 3: Expand `inputStore.ts` with `ctrlKey` and remove `shiftKeyHeld`**

Replace `src/lib/inputStore.ts` entirely:

```ts
import { writable } from "svelte/store";

export type InputState = {
    shiftKey: boolean;
    ctrlKey: boolean;
};

const initialState: InputState = {
    shiftKey: false,
    ctrlKey: false,
};

/** Global input state (modifier keys). Updated by useInputStore. */
export const inputStore = writable<InputState>({ ...initialState });

/** Only attach key listeners when device likely has a keyboard. */
function hasKeyboard(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function syncModifiers(shiftKey: boolean, ctrlKey: boolean) {
    inputStore.update((s) =>
        s.shiftKey === shiftKey && s.ctrlKey === ctrlKey
            ? s
            : { ...s, shiftKey, ctrlKey },
    );
}

/**
 * Svelte action: attaches window key and pointer listeners and updates inputStore.
 * Pointer events sync Shift and Ctrl on click/move; key events sync on press/release
 * but may not fire until after a user activation (first click). Only attaches key listeners
 * on devices with fine pointer; no-op on touch-only.
 * Use on a root element (e.g. app shell) so the store is updated while mounted.
 */
export function useInputStore(_node: HTMLElement): void | { destroy(): void } {
    const onPointer = (e: PointerEvent) => syncModifiers(e.shiftKey, e.ctrlKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointer);
    window.addEventListener("pointermove", onPointer);

    if (!hasKeyboard()) {
        return {
            destroy() {
                window.removeEventListener("pointerdown", onPointer);
                window.removeEventListener("pointerup", onPointer);
                window.removeEventListener("pointermove", onPointer);
                inputStore.set({ ...initialState });
            },
        };
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Shift") inputStore.update((s) => (s.shiftKey ? s : { ...s, shiftKey: true }));
        if (e.key === "Control") inputStore.update((s) => (s.ctrlKey ? s : { ...s, ctrlKey: true }));
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") inputStore.update((s) => (!s.shiftKey ? s : { ...s, shiftKey: false }));
        if (e.key === "Control") inputStore.update((s) => (!s.ctrlKey ? s : { ...s, ctrlKey: false }));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return {
        destroy() {
            window.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("pointerup", onPointer);
            window.removeEventListener("pointermove", onPointer);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            inputStore.set({ ...initialState });
        },
    };
}
```

- [ ] **Step 4: Remove `shiftKeyHeld` re-export from `nodePrimaryActionStore.ts`**

Delete line 4 from `src/lib/nodePrimaryActionStore.ts`:

```ts
export { shiftKeyHeld } from "./inputStore";
```

- [ ] **Step 5: Patch `Node.svelte` to remove `shiftKeyHeld` import**

In `src/lib/Node.svelte`:
- Remove `shiftKeyHeld` from the import on line 14 (`import { nodePrimaryAction, shiftKeyHeld }` → `import { nodePrimaryAction }`)
- Change `$: isRefund = $shiftKeyHeld;` (line 64) to `$: isRefund = false;`

This is a temporary bridge — Task 8 will replace this with the modifier-aware tooltip.

- [ ] **Step 6: Patch `Tree.svelte` to remove `event.shiftKey` reference**

In `src/lib/Tree.svelte`, find the `shouldDecrement` line (~line 1180-1181):

```ts
const shouldDecrement =
    event.pointerType === "mouse" && event.shiftKey;
```

Replace with:

```ts
const shouldDecrement = false;
```

This temporarily disables Shift+click decrement. Task 7 will replace this with the resolver pipeline.

- [ ] **Step 7: Run `npm run check` to verify build passes**

Run: `npm run check`
Expected: No errors

- [ ] **Step 8: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/lib/input/inputAction.ts src/lib/input/modifierKeyMap.ts src/lib/inputStore.ts src/lib/nodePrimaryActionStore.ts src/lib/Node.svelte src/lib/Tree.svelte
git commit -m "feat(input): add core types, expand inputStore with ctrlKey, remove shiftKeyHeld"
```

---

### Task 2: `resolveAction` and `resolveModifier` with Tests

**Files:**
- Create: `src/lib/input/resolveAction.ts`
- Create: `test/resolveAction.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write failing tests**

Create `test/resolveAction.test.ts`:

```ts
import assert from "node:assert/strict";
import { resolveModifier, resolveAction } from "../src/lib/input/resolveAction.ts";
import type { InputState } from "../src/lib/inputStore.ts";
import { DEFAULT_MODIFIER_KEY_MAP } from "../src/lib/input/modifierKeyMap.ts";

console.log("  resolveModifier");

// --- No keys held → "none" ---
{
    const state: InputState = { shiftKey: false, ctrlKey: false };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "none");
    console.log("    ✓ no keys held returns 'none'");
}

// --- Shift held → "macro" ---
{
    const state: InputState = { shiftKey: true, ctrlKey: false };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "macro");
    console.log("    ✓ shift held returns 'macro'");
}

// --- Ctrl held → "micro" ---
{
    const state: InputState = { shiftKey: false, ctrlKey: true };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "micro");
    console.log("    ✓ ctrl held returns 'micro'");
}

// --- Both held → "macro" wins ---
{
    const state: InputState = { shiftKey: true, ctrlKey: true };
    assert.equal(resolveModifier(state, DEFAULT_MODIFIER_KEY_MAP), "macro");
    console.log("    ✓ both held returns 'macro' (macro priority)");
}

console.log("  ✓ resolveModifier\n");

console.log("  resolveAction");

// --- Button 0, mouse, no modifier → primary ---
{
    const result = resolveAction(0, "none", "mouse");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 0, mouse, none → primary");
}

// --- Button 0, mouse, macro → primary with macro ---
{
    const result = resolveAction(0, "macro", "mouse");
    assert.deepEqual(result, { type: "primary", modifier: "macro", device: "mouse" });
    console.log("    ✓ button 0, mouse, macro → primary with macro");
}

// --- Button 1, mouse → auxiliary ---
{
    const result = resolveAction(1, "none", "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 1, mouse → auxiliary");
}

// --- Button 1, mouse, macro → auxiliary with macro ---
{
    const result = resolveAction(1, "macro", "mouse");
    assert.deepEqual(result, { type: "auxiliary", modifier: "macro", device: "mouse" });
    console.log("    ✓ button 1, mouse, macro → auxiliary with macro");
}

// --- Button 2, mouse → secondary ---
{
    const result = resolveAction(2, "none", "mouse");
    assert.deepEqual(result, { type: "secondary", modifier: "none", device: "mouse" });
    console.log("    ✓ button 2, mouse → secondary");
}

// --- Button 0, touch → primary, modifier forced to none ---
{
    const result = resolveAction(0, "macro", "touch");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "touch" });
    console.log("    ✓ button 0, touch → primary, modifier forced to none");
}

// --- Button 1, touch → null (no auxiliary on touch) ---
{
    const result = resolveAction(1, "none", "touch");
    assert.equal(result, null);
    console.log("    ✓ button 1, touch → null");
}

// --- Button 2, touch → secondary ---
{
    const result = resolveAction(2, "none", "touch");
    assert.deepEqual(result, { type: "secondary", modifier: "none", device: "touch" });
    console.log("    ✓ button 2, touch → secondary");
}

// --- Pen normalized to mouse ---
{
    const result = resolveAction(0, "macro", "pen");
    assert.deepEqual(result, { type: "primary", modifier: "macro", device: "mouse" });
    console.log("    ✓ pen normalized to mouse");
}

// --- Unknown button → null ---
{
    const result = resolveAction(3, "none", "mouse");
    assert.equal(result, null);
    console.log("    ✓ button 3 → null");
}

// --- Unknown pointerType treated as mouse ---
{
    const result = resolveAction(0, "none", "");
    assert.deepEqual(result, { type: "primary", modifier: "none", device: "mouse" });
    console.log("    ✓ empty pointerType treated as mouse");
}

console.log("  ✓ resolveAction\n");
```

- [ ] **Step 2: Register test in `test/index.ts`**

Add `"resolveAction.test.ts"` to the `TEST_FILES` array in the "Core State & Logic" section (after `"nodeActionPreview.test.ts"`).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `resolveAction.ts` module not found

- [ ] **Step 4: Implement `resolveAction.ts`**

Create `src/lib/input/resolveAction.ts`:

```ts
import type { InputAction, InputModifier, PointerDevice } from "./inputAction";
import type { InputState } from "../inputStore";
import type { ModifierKeyMap } from "./modifierKeyMap";
import { DEFAULT_MODIFIER_KEY_MAP } from "./modifierKeyMap";

/**
 * Translates physical key state to abstract modifier.
 * Macro takes priority if both keys are held.
 */
export function resolveModifier(
    state: InputState,
    keyMap: ModifierKeyMap = DEFAULT_MODIFIER_KEY_MAP,
): InputModifier {
    if (state[keyMap.macro]) return "macro";
    if (state[keyMap.micro]) return "micro";
    return "none";
}

function normalizeDevice(pointerType: string): PointerDevice {
    return pointerType === "touch" ? "touch" : "mouse";
}

/**
 * Pure function: raw event data in, semantic action out.
 * Accepts raw pointerType string — normalizes "pen" to "mouse" internally.
 * Returns null for unsupported button/device combinations.
 */
export function resolveAction(
    button: number,
    modifier: InputModifier,
    pointerType: string,
): InputAction | null {
    const device = normalizeDevice(pointerType);
    const resolvedModifier = device === "touch" ? "none" : modifier;

    if (button === 0) {
        return { type: "primary", modifier: resolvedModifier, device };
    }
    if (button === 1) {
        if (device === "touch") return null;
        return { type: "auxiliary", modifier: resolvedModifier, device };
    }
    if (button === 2) {
        return { type: "secondary", modifier: resolvedModifier, device };
    }
    return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/input/resolveAction.ts test/resolveAction.test.ts test/index.ts
git commit -m "feat(input): add resolveModifier and resolveAction with tests"
```

---

### Task 3: `resolveNodeAction` and `NodeOperation` with Tests

**Files:**
- Create: `src/lib/input/nodeActions.ts`
- Create: `test/resolveNodeAction.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write failing tests**

Create `test/resolveNodeAction.test.ts`:

```ts
import assert from "node:assert/strict";
import { resolveNodeAction } from "../src/lib/input/nodeActions.ts";
import type { InputAction } from "../src/lib/input/inputAction.ts";
import { NodePrimaryAction } from "../src/lib/nodePrimaryActionStore.ts";

console.log("  resolveNodeAction");

// --- Primary, none → incrementByStore ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ primary + none → incrementByStore");
}

// --- Primary, macro → incrementTier ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementTier" });
    console.log("    ✓ primary + macro → incrementTier");
}

// --- Primary, micro → incrementOne ---
{
    const action: InputAction = { type: "primary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "incrementOne" });
    console.log("    ✓ primary + micro → incrementOne");
}

// --- Auxiliary, none → decrementByStore ---
{
    const action: InputAction = { type: "auxiliary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementByStore" });
    console.log("    ✓ auxiliary + none → decrementByStore");
}

// --- Auxiliary, macro → decrementTier ---
{
    const action: InputAction = { type: "auxiliary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementTier" });
    console.log("    ✓ auxiliary + macro → decrementTier");
}

// --- Auxiliary, micro → decrementOne ---
{
    const action: InputAction = { type: "auxiliary", modifier: "micro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    assert.deepEqual(result, { op: "decrementOne" });
    console.log("    ✓ auxiliary + micro → decrementOne");
}

// --- Secondary always → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "none", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary → contextMenu");
}

// --- Secondary with modifier still → contextMenu ---
{
    const action: InputAction = { type: "secondary", modifier: "macro", device: "mouse" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    assert.deepEqual(result, { op: "contextMenu" });
    console.log("    ✓ secondary + macro → contextMenu (modifiers ignored)");
}

// --- Touch primary → incrementByStore (modifier forced to none by resolveAction) ---
{
    const action: InputAction = { type: "primary", modifier: "none", device: "touch" };
    const result = resolveNodeAction(action, NodePrimaryAction.IncrementTier);
    assert.deepEqual(result, { op: "incrementByStore" });
    console.log("    ✓ touch primary → incrementByStore");
}

// --- Result independent of NodePrimaryAction for modifier actions ---
{
    const action: InputAction = { type: "primary", modifier: "macro", device: "mouse" };
    const r1 = resolveNodeAction(action, NodePrimaryAction.IncrementOne);
    const r2 = resolveNodeAction(action, NodePrimaryAction.IncrementTen);
    const r3 = resolveNodeAction(action, NodePrimaryAction.IncrementTier);
    assert.deepEqual(r1, { op: "incrementTier" });
    assert.deepEqual(r2, { op: "incrementTier" });
    assert.deepEqual(r3, { op: "incrementTier" });
    console.log("    ✓ modifier actions are fixed regardless of store value");
}

console.log("  ✓ resolveNodeAction\n");
```

- [ ] **Step 2: Register test in `test/index.ts`**

Add `"resolveNodeAction.test.ts"` after `"resolveAction.test.ts"` in the `TEST_FILES` array.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `nodeActions.ts` module not found

- [ ] **Step 4: Implement `nodeActions.ts`**

Create `src/lib/input/nodeActions.ts`:

```ts
import type { InputAction } from "./inputAction";
import { NodePrimaryAction } from "../nodePrimaryActionStore";

export type NodeOperation =
    | { op: "incrementByStore" }
    | { op: "decrementByStore" }
    | { op: "incrementTier" }
    | { op: "decrementTier" }
    | { op: "incrementOne" }
    | { op: "decrementOne" }
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
 * Direction is determined by button (primary=increment, auxiliary=decrement).
 * Modifiers override amount: macro=tier, micro=+1.
 * Secondary always maps to contextMenu.
 */
export function resolveNodeAction(
    action: InputAction,
    _store: NodePrimaryAction,
): NodeOperation {
    if (action.type === "secondary") {
        return { op: "contextMenu" };
    }

    const isIncrement = action.type === "primary";

    if (action.modifier === "macro") {
        return { op: isIncrement ? "incrementTier" : "decrementTier" };
    }
    if (action.modifier === "micro") {
        return { op: isIncrement ? "incrementOne" : "decrementOne" };
    }

    return { op: isIncrement ? "incrementByStore" : "decrementByStore" };
}

/**
 * Dispatches a NodeOperation to the appropriate Tree.svelte action.
 * Called by Tree.svelte after resolving the action through the pipeline.
 * The `callbacks` parameter provides the actual leveling functions from Tree.svelte's scope.
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
        case "incrementTier":
            callbacks.incrementTier(index);
            break;
        case "decrementTier":
            callbacks.decrementTier(index);
            break;
        case "incrementOne":
            callbacks.incrementOne(index);
            break;
        case "decrementOne":
            callbacks.decrementOne(index);
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
    incrementTier: (index: NodeIndex) => void;
    decrementTier: (index: NodeIndex) => void;
    incrementOne: (index: NodeIndex) => void;
    decrementOne: (index: NodeIndex) => void;
    contextMenu: (index: NodeIndex, pos: { x: number; y: number }) => void;
};
```

Note: `NodeIndex` is imported from `../../types/tree`. Add the import at the top of the file:

```ts
import type { NodeIndex } from "../../types/tree";
```

The `applyNodeOperation` function takes a `callbacks` object so it remains decoupled from Tree.svelte's specific leveling functions. Tree.svelte constructs this object once from its local functions (`levelUp`, `levelDown`, `levelUpTier`, etc.) and passes it to `applyNodeOperation`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/input/nodeActions.ts test/resolveNodeAction.test.ts test/index.ts
git commit -m "feat(input): add resolveNodeAction, applyNodeOperation, and NodeOperation types with tests"
```

---

### Task 4: `getNodeActionPreviewFromOp` with Tests

**Files:**
- Modify: `src/lib/nodeActionPreview.ts`
- Modify: `test/nodeActionPreview.test.ts`

- [ ] **Step 1: Add failing tests for `getNodeActionPreviewFromOp`**

Add a new import at the **top** of `test/nodeActionPreview.test.ts` (alongside the existing imports), then append the test blocks before the final success log line `console.log("  ✓ nodeActionPreview\n");`:

```ts
import { getNodeActionPreviewFromOp } from "../src/lib/nodeActionPreview.ts";
import type { NodeOperation } from "../src/lib/input/nodeActions.ts";

// --- getNodeActionPreviewFromOp: incrementByStore delegates to store action ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementByStore" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "incrementByStore should return a preview");
    assert.equal(result.targetLevel, 10, "should increment by 10 (store = IncrementTen)");
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementByStore delegates to store");
}

// --- getNodeActionPreviewFromOp: decrementByStore ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 25;
    const op: NodeOperation = { op: "decrementByStore" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "decrementByStore should return a preview");
    assert.equal(result.targetLevel, 15, "should decrement by 10");
    assert.equal(result.isRefund, true);
    console.log("    ✓ getNodeActionPreviewFromOp: decrementByStore");
}

// --- getNodeActionPreviewFromOp: incrementTier ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementTier" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementOne,
    });
    assert.ok(result, "incrementTier should return a preview");
    assert.equal(result.targetLevel, 20, "should target tier upper (20)");
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementTier");
}

// --- getNodeActionPreviewFromOp: decrementOne ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    levels[0] = 5;
    const op: NodeOperation = { op: "decrementOne" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTen,
    });
    assert.ok(result, "decrementOne should return a preview");
    assert.equal(result.targetLevel, 4);
    assert.equal(result.isRefund, true);
    console.log("    ✓ getNodeActionPreviewFromOp: decrementOne");
}

// --- getNodeActionPreviewFromOp: contextMenu → null ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "contextMenu" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementOne,
    });
    assert.equal(result, null, "contextMenu should return null");
    console.log("    ✓ getNodeActionPreviewFromOp: contextMenu → null");
}

// --- getNodeActionPreviewFromOp: incrementOne ---
{
    const { nodes } = createYellowBranchFixture();
    const levels = createLevels(YELLOW_BRANCH_LENGTH);
    const op: NodeOperation = { op: "incrementOne" };
    const result = getNodeActionPreviewFromOp({
        nodes,
        levels,
        index: 0,
        operation: op,
        nodeLevelBehavior: NodeLevelBehavior.Solo,
        primaryAction: NodePrimaryAction.IncrementTier,
    });
    assert.ok(result, "incrementOne should return a preview");
    assert.equal(result.targetLevel, 1);
    assert.equal(result.isRefund, false);
    console.log("    ✓ getNodeActionPreviewFromOp: incrementOne (ignores store)");
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `getNodeActionPreviewFromOp` not found

- [ ] **Step 3: Implement `getNodeActionPreviewFromOp`**

Add to `src/lib/nodeActionPreview.ts`:

```ts
import type { NodeOperation } from "./input/nodeActions";

export function getNodeActionPreviewFromOp(params: {
    nodes: Node[];
    levels: LevelsByIndex;
    index: NodeIndex;
    operation: NodeOperation;
    nodeLevelBehavior: NodeLevelBehavior;
    primaryAction: NodePrimaryAction;
}): NodeActionPreview | null {
    const { operation, primaryAction } = params;

    if (operation.op === "contextMenu") return null;

    let action: NodePrimaryAction;
    let isRefund: boolean;

    switch (operation.op) {
        case "incrementByStore":
            action = primaryAction;
            isRefund = false;
            break;
        case "decrementByStore":
            action = primaryAction;
            isRefund = true;
            break;
        case "incrementTier":
            action = NodePrimaryAction.IncrementTier;
            isRefund = false;
            break;
        case "decrementTier":
            action = NodePrimaryAction.IncrementTier;
            isRefund = true;
            break;
        case "incrementOne":
            action = NodePrimaryAction.IncrementOne;
            isRefund = false;
            break;
        case "decrementOne":
            action = NodePrimaryAction.IncrementOne;
            isRefund = true;
            break;
    }

    return getNodeActionPreview({
        nodes: params.nodes,
        levels: params.levels,
        index: params.index,
        action,
        nodeLevelBehavior: params.nodeLevelBehavior,
        isRefund,
    });
}
```

Note: The import for `NodeOperation` must be added at the top of the file. The `Node`, `LevelsByIndex`, `NodeIndex` types are already imported.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/nodeActionPreview.ts test/nodeActionPreview.test.ts
git commit -m "feat(input): add getNodeActionPreviewFromOp with tests"
```

---

### Task 5: Input Label Helpers with Tests

**Files:**
- Create: `src/lib/input/inputLabels.ts`
- Create: `test/inputLabels.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write failing tests**

Create `test/inputLabels.test.ts`:

```ts
import assert from "node:assert/strict";
import { getModifierLabel, getButtonLabel, getInputLabel } from "../src/lib/input/inputLabels.ts";
import type { InputActionType, InputModifier, PointerDevice } from "../src/lib/input/inputAction.ts";

// Mock translation function that returns the key as-is
const t = (key: string) => key;

console.log("  inputLabels");

// --- getModifierLabel ---
{
    assert.equal(getModifierLabel("none", t), "");
    assert.equal(getModifierLabel("macro", t), "input.macro");
    assert.equal(getModifierLabel("micro", t), "input.micro");
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
    const result = getInputLabel("primary", "none", "mouse", t);
    assert.equal(result, "input.primary.mouse");
    console.log("    ✓ getInputLabel without modifier returns button label only");
}

// --- getInputLabel: with modifier ---
{
    const result = getInputLabel("primary", "macro", "mouse", t);
    assert.equal(result, "input.macro" + "input.modifierSeparator" + "input.primary.mouse");
    console.log("    ✓ getInputLabel with modifier returns 'modifier + separator + button'");
}

console.log("  ✓ inputLabels\n");
```

- [ ] **Step 2: Register test in `test/index.ts`**

Add `"inputLabels.test.ts"` after `"resolveNodeAction.test.ts"` in the `TEST_FILES` array.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `inputLabels.ts` module not found

- [ ] **Step 4: Implement `inputLabels.ts`**

Create `src/lib/input/inputLabels.ts`:

```ts
import type { InputActionType, InputModifier, PointerDevice } from "./inputAction";

type TranslateFn = (key: string) => string;

export function getModifierLabel(modifier: InputModifier, t: TranslateFn): string {
    if (modifier === "none") return "";
    return t(`input.${modifier}`);
}

export function getButtonLabel(
    type: InputActionType,
    device: PointerDevice,
    t: TranslateFn,
): string {
    return t(`input.${type}.${device}`);
}

export function getInputLabel(
    type: InputActionType,
    modifier: InputModifier,
    device: PointerDevice,
    t: TranslateFn,
): string {
    const button = getButtonLabel(type, device, t);
    if (modifier === "none") return button;
    const mod = getModifierLabel(modifier, t);
    const sep = t("input.modifierSeparator");
    return mod + sep + button;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/input/inputLabels.ts test/inputLabels.test.ts test/index.ts
git commit -m "feat(input): add input label helpers with tests"
```

---

### Task 6: Barrel Export and Svelte Actions

**Files:**
- Create: `src/lib/input/index.ts`
- Create: `src/lib/input/interactable.ts`

- [ ] **Step 1: Create `interactable.ts` with Svelte actions**

Create `src/lib/input/interactable.ts`:

```ts
import type { ActionReturn } from "svelte/action";
import type { InputAction } from "./inputAction";
import { inputStore } from "../inputStore";
import { resolveModifier, resolveAction } from "./resolveAction";
import { triggerHaptic } from "../hapticsStore";
import {
    startLongPress,
    clearLongPress,
    suppressNextPointerUp,
    isLongPressMovement,
    type LongPressState,
} from "../longPress";
import { get } from "svelte/store";

/**
 * use:primary — fires on click (button 0).
 * Mouse: resolves modifier from inputStore.
 * Touch: modifier always "none".
 */
export function primary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    function onClick(event: MouseEvent) {
        const pointerType = (event as PointerEvent).pointerType || "mouse";
        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(event.button, modifier, pointerType);
        if (!action || action.type !== "primary") return;
        triggerHaptic();
        handler(action);
    }

    node.addEventListener("click", onClick);

    return {
        destroy() {
            node.removeEventListener("click", onClick);
        },
    };
}

/**
 * use:secondary — fires on contextmenu (mouse) or long-press (touch).
 * Long-press auto-detected from pointerType === "touch".
 * Click/contextmenu suppressed after long-press fires via longPress.ts.
 * Touch modifier always "none" even if physical modifier held.
 */
export function secondary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    const pressState: LongPressState = { timer: null, fired: false };
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;

    function onContextMenu(event: Event) {
        event.preventDefault();
        const action = resolveAction(2, "none", "mouse");
        if (!action) return;
        triggerHaptic();
        handler(action);
    }

    function onPointerDown(event: PointerEvent) {
        if (event.pointerType !== "touch") return;
        if (event.button !== 0) return;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;

        startLongPress(pressState, () => {
            suppressNextPointerUp(event.pointerId);
            const action = resolveAction(2, "none", "touch");
            if (!action) return false;
            triggerHaptic();
            handler(action);
        });
    }

    function onPointerMove(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        if (isLongPressMovement(startX, startY, event.clientX, event.clientY)) {
            clearLongPress(pressState);
            activePointerId = null;
        }
    }

    function onPointerUp(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        clearLongPress(pressState);
        activePointerId = null;
    }

    function onPointerCancel(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        clearLongPress(pressState);
        activePointerId = null;
    }

    node.addEventListener("contextmenu", onContextMenu);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);

    return {
        destroy() {
            clearLongPress(pressState);
            node.removeEventListener("contextmenu", onContextMenu);
            node.removeEventListener("pointerdown", onPointerDown);
            node.removeEventListener("pointermove", onPointerMove);
            node.removeEventListener("pointerup", onPointerUp);
            node.removeEventListener("pointercancel", onPointerCancel);
        },
    };
}

/**
 * use:auxiliary — fires on auxclick (button 1, mouse only).
 * Never fires on touch. Includes Safari double-fire guard (50ms dedup).
 */
export function auxiliary(
    node: HTMLElement,
    handler: (action: InputAction) => void,
): ActionReturn {
    let lastFireTime = 0;
    const DEDUP_MS = 50;

    function fire(event: Event) {
        const now = Date.now();
        if (now - lastFireTime < DEDUP_MS) return;
        lastFireTime = now;

        const state = get(inputStore);
        const modifier = resolveModifier(state);
        const action = resolveAction(1, modifier, "mouse");
        if (!action) return;
        event.preventDefault();
        triggerHaptic();
        handler(action);
    }

    function onAuxClick(event: MouseEvent) {
        if (event.button !== 1) return;
        fire(event);
    }

    function onPointerUp(event: PointerEvent) {
        if (event.pointerType !== "mouse" || event.button !== 1) return;
        fire(event);
    }

    node.addEventListener("auxclick", onAuxClick);
    node.addEventListener("pointerup", onPointerUp);

    return {
        destroy() {
            node.removeEventListener("auxclick", onAuxClick);
            node.removeEventListener("pointerup", onPointerUp);
        },
    };
}
```

- [ ] **Step 2: Create barrel export `index.ts`**

Create `src/lib/input/index.ts`:

```ts
export type { InputActionType, InputModifier, PointerDevice, InputAction } from "./inputAction";
export type { ModifierKeyMap } from "./modifierKeyMap";
export { DEFAULT_MODIFIER_KEY_MAP } from "./modifierKeyMap";
export { resolveModifier, resolveAction } from "./resolveAction";
export type { NodeOperation, NodeOperationCallbacks, TreeBackgroundOperation, TabOperation, RootOperation } from "./nodeActions";
export { resolveNodeAction, applyNodeOperation } from "./nodeActions";
export { primary, secondary, auxiliary } from "./interactable";
export { getModifierLabel, getButtonLabel, getInputLabel } from "./inputLabels";
```

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: Passes (the Svelte actions don't need tests — they wire browser events which are validated by integration/manual testing)

- [ ] **Step 4: Commit**

```bash
git add src/lib/input/interactable.ts src/lib/input/index.ts
git commit -m "feat(input): add Svelte actions and barrel export"
```

---

### Task 7: Rewire `Tree.svelte` to Use Resolver Pipeline

**Files:**
- Modify: `src/lib/Tree.svelte`

This is the largest change. Tree.svelte replaces its inline `applyPrimaryNodeAction`/`applyOppositeNodeAction` functions and `middleClickCandidates` tracking with the centralized resolver pipeline.

- [ ] **Step 1: Add imports to Tree.svelte**

Add at the top of `<script>`:

```ts
import { resolveModifier, resolveAction, resolveNodeAction, applyNodeOperation } from "./input";
import type { NodeOperationCallbacks } from "./input";
```

- [ ] **Step 2: Create `nodeCallbacks` object and delete old dispatcher functions**

Delete `applyPrimaryNodeAction` and `applyOppositeNodeAction` (~lines 700-735). Add a callbacks object that maps to Tree.svelte's existing leveling functions:

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
    incrementTier: (index) => levelUpTier(index),
    decrementTier: (index) => levelDownTier(index),
    incrementOne: (index) => levelUp(index),
    decrementOne: (index) => levelDown(index),
    contextMenu: (index, pos) => openContextMenu(index, pos.x, pos.y),
};
```

Note: `nodeCallbacks` reads `$nodePrimaryAction` reactively inside the closures — this works because the closures are called at dispatch time, not at definition time.

- [ ] **Step 3: Replace the primary pointer action dispatch in `onPointerUp`**

Find the section (~line 1178-1186) that currently reads:

```ts
const shouldDecrement = false;
if (shouldDecrement) {
    applyOppositeNodeAction(pointer.nodeIndex);
} else {
    applyPrimaryNodeAction(pointer.nodeIndex);
}
```

Replace with:

```ts
const modifier = resolveModifier($inputStore);
const action = resolveAction(event.button, modifier, event.pointerType);
if (action) {
    const nodeOp = resolveNodeAction(action, $nodePrimaryAction);
    applyNodeOperation(nodeOp, pointer.nodeIndex, nodeCallbacks, { x: event.clientX, y: event.clientY });
}
```

- [ ] **Step 4: Update `middleClickCandidates` dispatch to use resolver**

Keep the `middleClickCandidates` map — it is needed for the movement-threshold check (middle-click does not initiate pan, so it tracks separately). Only replace the action dispatch.

In `onPointerUp`, replace the `middleClick` handler block (~line 1153):

```ts
applyOppositeNodeAction(middleClick.nodeIndex);
```

With:

```ts
const modifier = resolveModifier($inputStore);
const action = resolveAction(event.button, modifier, event.pointerType);
if (action) {
    const nodeOp = resolveNodeAction(action, $nodePrimaryAction);
    applyNodeOperation(nodeOp, middleClick.nodeIndex, nodeCallbacks, { x: event.clientX, y: event.clientY });
}
```

- [ ] **Step 6: Remove the Shift+click skip in long-press setup**

In `onPointerDown` (~line 1037), find the line that skips long-press setup when Shift is held:

```ts
if (event.shiftKey) { ... }
```

Remove this condition. Modifiers no longer affect whether long-press fires — the resolver handles it.

- [ ] **Step 7: Ensure `$inputStore` is imported**

Verify that `inputStore` is imported at the top. It should already be available via `import { inputStore } from "./inputStore"` or similar. If not, add it.

- [ ] **Step 8: Run `npm run check`**

Run: `npm run check`
Expected: Passes. If there are leftover references to the old functions, fix them.

- [ ] **Step 9: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "refactor(input): rewire Tree.svelte to use resolver pipeline"
```

---

### Task 8: Modifier-Aware Tooltip in `Node.svelte`

**Files:**
- Modify: `src/lib/Node.svelte`

- [ ] **Step 1: Replace `isRefund` with modifier-aware previews**

In `src/lib/Node.svelte`:

1. Remove the `isRefund` reactive declaration (currently `$: isRefund = false;` from Task 1 bridge)
2. Add imports:

```ts
import { inputStore } from "./inputStore";
import { resolveModifier, resolveAction, resolveNodeAction } from "./input";
import { getNodeActionPreviewFromOp } from "./nodeActionPreview";
import type { NodeOperation } from "./input";
```

3. Add device detection:

```ts
$: isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
```

4. Replace the single `actionPreview` with two previews (increment and decrement):

```ts
$: modifier = resolveModifier($inputStore);

$: incrementOp = (() => {
    const action = resolveAction(0, modifier, "mouse");
    return action ? resolveNodeAction(action, $nodePrimaryAction) : null;
})();

$: decrementOp = (() => {
    const action = resolveAction(1, modifier, "mouse");
    return action ? resolveNodeAction(action, $nodePrimaryAction) : null;
})();

$: incrementPreview = skillId != null && incrementOp
    ? getNodeActionPreviewFromOp({
        nodes: $treeData.nodes,
        levels: $treeData.levels,
        index: id,
        operation: incrementOp,
        nodeLevelBehavior: $nodeLevelBehavior,
        primaryAction: $nodePrimaryAction,
    })
    : null;

$: decrementPreview = skillId != null && decrementOp
    ? getNodeActionPreviewFromOp({
        nodes: $treeData.nodes,
        levels: $treeData.levels,
        index: id,
        operation: decrementOp,
        nodeLevelBehavior: $nodeLevelBehavior,
        primaryAction: $nodePrimaryAction,
    })
    : null;
```

5. Update tooltip to show two rows. Suppress tooltip entirely when `isTouch` is true. The existing tooltip section that builds `tooltipParam` should be updated to include both increment and decrement previews in the same format as `LevelUpSplash.svelte` (arrow up/down icons, level range, crystal cost).

This step requires reading the current tooltip implementation in Node.svelte to understand the exact structure. The implementer should reference:
- `src/lib/Node.svelte` lines 77-105 for current tooltip building
- `src/lib/LevelUpSplash.svelte` for the visual format to match

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 3: Commit**

```bash
git add src/lib/Node.svelte
git commit -m "feat(input): modifier-aware two-row tooltip in Node.svelte"
```

---

### Task 9: Rewire `Button.svelte` with Svelte Actions

**Files:**
- Modify: `src/lib/Button.svelte`

**Important considerations:**
- Button.svelte currently uses `createEventDispatcher` to forward `click`, `contextmenu`, and pointer events to parent consumers. Parents listen via `on:click` on the `<Button>` component.
- The `handleClick` function already calls `triggerHaptic()`. Since `use:primary` also calls `triggerHaptic()` internally, adding `use:primary` while keeping `handleClick` would cause double haptics. Solution: remove `triggerHaptic()` from `handleClick` (the Svelte action handles it), or have `use:primary`'s handler call `dispatch("click")` without the haptic.
- Pointer event forwarding (`pointerdown`, `pointermove`, `pointerup`, etc.) should remain — those are used by Tree.svelte and other gesture consumers. Only `click` and `contextmenu` are replaced by the Svelte actions.

- [ ] **Step 1: Read current `Button.svelte` implementation**

Read `src/lib/Button.svelte` to understand the full event forwarding contract and which consumers rely on dispatched events.

- [ ] **Step 2: Add `use:primary` and `use:secondary` actions**

Import the Svelte actions:

```ts
import { primary, secondary } from "./input";
```

Replace `on:click={handleClick}` with `use:primary`. The `use:primary` handler should:
1. Call `dispatch("click", action)` so parent consumers still receive the event
2. Run the existing toast/button logic from `handleClick`
3. NOT call `triggerHaptic()` (the Svelte action already does this)

Replace `on:contextmenu` forwarding with `use:secondary`. The handler should call `dispatch("contextmenu", action)`.

Keep all pointer event forwarding (`on:pointerdown`, `on:pointermove`, `on:pointerup`, etc.) unchanged.

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 4: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/Button.svelte
git commit -m "refactor(input): rewire Button.svelte with use:primary/secondary"
```

---

### Task 10: Rewire `TreeTabs.svelte` with Svelte Actions

**Files:**
- Modify: `src/lib/TreeTabs.svelte`

- [ ] **Step 1: Read current `TreeTabs.svelte` event handling**

Read `src/lib/TreeTabs.svelte` to find all `on:click`, `on:contextmenu`, and long-press handling for tabs and background area.

- [ ] **Step 2: Replace with `use:primary` and `use:secondary`**

Import and apply the Svelte actions. Tab buttons get `use:primary` for activation and `use:secondary` for context menu. Background area gets `use:secondary` for tree context menu.

Remove the manual `longPressState` / `startLongPress` / `clearLongPress` usage since `use:secondary` handles long-press internally.

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 4: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/TreeTabs.svelte
git commit -m "refactor(input): rewire TreeTabs.svelte with use:primary/secondary"
```

---

### Task 11: Add Locale Keys for Input Labels

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: Add `input` section to `en.json`**

Add to `src/locales/en.json`:

```json
"input": {
    "primary": { "mouse": "Left Click", "touch": "Tap" },
    "secondary": { "mouse": "Right Click", "touch": "Long Press" },
    "auxiliary": { "mouse": "Middle Click" },
    "macro": "Shift",
    "micro": "Ctrl",
    "modifierSeparator": " + "
}
```

- [ ] **Step 2: Update `controls` section in `en.json`**

Replace hardcoded control labels with template strings. Update the pointer controls section:

```json
"controls": {
    "nodeIncrement": "{input} a Node",
    "nodeIncrementDescription": "Add node level(s) and spend Tech Crystals",
    "nodeDecrement": "{input} a Node",
    "nodeDecrementDescription": "Remove node level(s) and refund Tech Crystals",
    "nodeIncrementTier": "{input} a Node",
    "nodeIncrementTierDescription": "Add one tier of levels",
    "nodeDecrementTier": "{input} a Node",
    "nodeDecrementTierDescription": "Remove one tier of levels",
    "nodeIncrementOne": "{input} a Node",
    "nodeIncrementOneDescription": "Add one level",
    "nodeDecrementOne": "{input} a Node",
    "nodeDecrementOneDescription": "Remove one level",
    "nodeMenu": "{input} a Node",
    "nodeMenuDescription": "Show node options",
    "treeMenu": "{input} Empty Space or Tab",
    "treeMenuDescription": "Show tree options",
    ...
}
```

Keep unchanged controls (pan, zoom, hover, keyboard, touch, HUD) as-is. The exact keys to update vs. keep should be determined by reading the current `SideMenuControlsPage.svelte` to understand which keys it references.

- [ ] **Step 3: Add `input` section to other locale files**

Add the same `input` section structure to `fr.json`, `ja.json`, and `zh.json` with translated values. Use the project's `.skills/regenerate-locales` skill if available, otherwise translate manually.

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 5: Run `npm test`**

Run: `npm test`
Expected: All tests pass (locale tests may check for key presence)

- [ ] **Step 6: Commit**

```bash
git add src/locales/en.json src/locales/fr.json src/locales/ja.json src/locales/zh.json
git commit -m "feat(input): add input locale keys, update control label templates"
```

---

### Task 12: Update Controls Page to Use Label Helpers

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte`

- [ ] **Step 1: Read current `SideMenuControlsPage.svelte`**

Read the file to understand the control item structure and how labels are currently generated.

- [ ] **Step 2: Replace hardcoded labels with `getInputLabel()` + `$t()` templates**

Import the label helpers:

```ts
import { getInputLabel } from "../input";
```

For each pointer control item, generate the label dynamically using the composable template:

```ts
label: $t("controls.nodeIncrement", {
    input: getInputLabel("primary", "none", "mouse", $t),
})
```

For modifier controls:

```ts
label: $t("controls.nodeIncrementTier", {
    input: getInputLabel("primary", "macro", "mouse", $t),
})
```

The exact changes depend on the current structure — read the file first.

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuControlsPage.svelte
git commit -m "refactor(input): controls page uses getInputLabel for dynamic labels"
```

---

### Task 13: Update Onboarding and RootNodeQuickSettings Labels

**Files:**
- Modify: `src/lib/onboarding/OnboardingOverlay.svelte`
- Modify: `src/lib/RootNodeQuickSettings.svelte`

- [ ] **Step 1: Update `OnboardingOverlay.svelte`**

Read the file. Replace inline `isTouch ? $t("onboarding.tap") : $t("onboarding.leftClick")` with:

```ts
import { getInputLabel } from "../input";

$: primaryInputLabel = getInputLabel("primary", "none", isTouch ? "touch" : "mouse", $t);
```

Update all references to use the new `primaryInputLabel`.

- [ ] **Step 2: Update `RootNodeQuickSettings.svelte`**

Read the file. Replace the platform-aware label:

```ts
import { getInputLabel } from "./input";

$: clickActionLabel = $t("settings.nodePrimaryActionTitle", {
    primaryAction: getInputLabel("primary", "none", isTouchPlatform ? "touch" : "mouse", $t),
});
```

- [ ] **Step 3: Run `npm run check`**

Run: `npm run check`
Expected: Passes

- [ ] **Step 4: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding/OnboardingOverlay.svelte src/lib/RootNodeQuickSettings.svelte
git commit -m "refactor(input): onboarding and quick settings use getInputLabel"
```

---

### Task 14: Final Cleanup and Full Test Run

**Files:**
- Various (cleanup pass)

- [ ] **Step 1: Run `npm run check` for full type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 2: Run `npm test` for full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Search for any remaining references to deleted code**

Search for:
- `shiftKeyHeld` — should not appear in any source file
- `applyPrimaryNodeAction` — should not appear in any source file
- `applyOppositeNodeAction` — should not appear in any source file
- `isRefund` in Node.svelte — should not appear

Fix any remaining references.

- [ ] **Step 4: Verify no unused imports**

Run `npm run check` one more time after any cleanup.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(input): final cleanup — remove dead references"
```
