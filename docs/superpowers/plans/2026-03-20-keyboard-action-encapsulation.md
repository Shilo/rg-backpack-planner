# Keyboard Action Encapsulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encapsulate the `Key` constant inside `src/lib/input/` so no external file references raw key values — components use action-based helpers instead.

**Architecture:** Add three helper functions (`isKeyboardAction`, `getCycleDirection`, `keyForAction`) to `keyboardAction.ts`. Split the "confirm" action into "confirm" (Enter only) and "activate" (Enter + Space). Migrate all 14 external `Key.*` consumers to use action-based helpers, then un-export `Key`.

**Tech Stack:** Svelte 5, TypeScript, node:assert/strict tests

---

## File Structure

**Modified:**
- `src/lib/input/keyboardAction.ts` — add 3 functions, split confirm/activate, update JSDoc, un-export Key
- `src/lib/input/index.ts` — update barrel exports
- `test/keyboardAction.test.ts` — update existing tests, add new tests
- `src/locales/en.json`, `fr.json`, `ja.json`, `zh.json` — add "activate" keyboard label
- 14 component files (listed per task below)

---

### Task 1: Core API — new functions, confirm/activate split, tests, locale keys

**Files:**
- Modify: `src/lib/input/keyboardAction.ts`
- Modify: `src/lib/input/index.ts`
- Modify: `test/keyboardAction.test.ts`
- Modify: `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ja.json`, `src/locales/zh.json`

- [ ] **Step 1: Write failing tests for the 3 new functions and confirm/activate split**

In `test/keyboardAction.test.ts`, add the following after the existing test blocks (before the closing of the file). Also update the existing assertion on line 44 (`Space → "confirm"` becomes `Space → "activate"`).

Update line 44:
```ts
// OLD: assert.equal(resolveKeyboardAction(mockEvent({ key: " " })), "confirm");
assert.equal(resolveKeyboardAction(mockEvent({ key: " " })), "activate");
```

Add new test blocks at the end of the file (after the `KEYBOARD_ACTION_BINDINGS` test block, before `console.log("  ✓ resolveKeyboardAction\n");` — or at the very end of the file):

```ts
// --- isKeyboardAction ---
console.log("  isKeyboardAction");

{
    // dismiss
    assert.equal(isKeyboardAction(mockEvent({ key: "Escape" }), "dismiss"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "dismiss"), false);
    // confirm = Enter only
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "confirm"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: " " }), "confirm"), false, "Space is NOT confirm");
    // activate = Enter + Space
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "activate"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: " " }), "activate"), true);
    // cycle
    assert.equal(isKeyboardAction(mockEvent({ key: "Tab" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowLeft" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "ArrowRight" }), "cycle"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "Enter" }), "cycle"), false);
    // undo respects modifiers
    assert.equal(isKeyboardAction(mockEvent({ key: "z", ctrlKey: true }), "undo"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "z" }), "undo"), false, "z without Ctrl is not undo");
    // canonicalKey: Caps Lock B → budget
    assert.equal(isKeyboardAction(mockEvent({ key: "B" }), "budget"), true);
    console.log("    ✓ isKeyboardAction matches action bindings correctly");
}

console.log("  ✓ isKeyboardAction\n");

// --- getCycleDirection ---
console.log("  getCycleDirection");

{
    assert.equal(getCycleDirection(mockEvent({ key: "Tab" })), 1);
    assert.equal(getCycleDirection(mockEvent({ key: "Tab", shiftKey: true })), -1);
    assert.equal(getCycleDirection(mockEvent({ key: "ArrowLeft" })), -1);
    assert.equal(getCycleDirection(mockEvent({ key: "ArrowRight" })), 1);
    console.log("    ✓ getCycleDirection returns correct direction");
}

console.log("  ✓ getCycleDirection\n");

// --- keyForAction ---
console.log("  keyForAction");

{
    assert.equal(keyForAction("dismiss"), "Escape");
    assert.equal(keyForAction("confirm"), "Enter");
    assert.equal(keyForAction("cycle"), "Tab");
    // Every action in KEYBOARD_ACTION_BINDINGS should return a non-empty string
    const allActions: KeyboardActionType[] = [
        "dismiss", "back", "cycle", "confirm", "activate", "console", "undo", "redo", "screenshot", "budget",
    ];
    for (const action of allActions) {
        assert.ok(keyForAction(action).length > 0, `keyForAction("${action}") should return a non-empty string`);
    }
    console.log("    ✓ keyForAction returns first bound key for each action");
}

console.log("  ✓ keyForAction\n");
```

Update the import on line 2 to include the new functions:
```ts
import { canonicalKey, resolveKeyboardAction, KEYBOARD_ACTION_BINDINGS, isKeyboardAction, getCycleDirection, keyForAction } from "../src/lib/input/keyboardAction.ts";
import type { KeyboardActionType } from "../src/lib/input/keyboardAction.ts";
```

Note: `Key` is still in the import for now (existing tests use it). It will be removed in Task 5.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `isKeyboardAction`, `getCycleDirection`, `keyForAction` are not exported; Space still resolves to "confirm"

- [ ] **Step 3: Implement the 3 new functions and confirm/activate split**

In `src/lib/input/keyboardAction.ts`:

**Update the JSDoc comment** at the top (lines 1-13) — replace the `confirm` line and add `activate`:
```ts
/**
 * Semantic names for keyboard actions, analogous to pointer InputActionType.
 *
 * dismiss    — Escape (close menu, cancel, back out)
 * back       — Backspace (undo last step, reset state)
 * cycle      — Tab / ← / → (cycle between tabs/sections)
 * confirm    — Enter (form submission, input finalization)
 * activate   — Enter / Space (button clicks, selections, menu item activation)
 * console    — ` (backtick / tilde — toggle overlay panel, e.g. quick settings)
 * undo       — Ctrl+Z
 * redo       — Ctrl+Y / Ctrl+Shift+Z
 * screenshot — F9
 * budget     — B (open tech crystal budget modal)
 */
```

**Update `KeyboardActionType`** (lines 14-23) — add `"activate"` after `"confirm"`:
```ts
export type KeyboardActionType =
    | "dismiss"
    | "back"
    | "cycle"
    | "confirm"
    | "activate"
    | "console"
    | "undo"
    | "redo"
    | "screenshot"
    | "budget";
```

**Update `KEYBOARD_ACTION_BINDINGS`** (lines 63-77) — replace the two `"confirm"` entries with the confirm/activate split:
```ts
export const KEYBOARD_ACTION_BINDINGS: readonly KeyBinding[] = [
    { action: "dismiss", key: Key.Escape },
    { action: "back", key: Key.Backspace },
    { action: "cycle", key: Key.Tab },
    { action: "cycle", key: Key.ArrowLeft },
    { action: "cycle", key: Key.ArrowRight },
    { action: "confirm", key: Key.Enter },
    { action: "activate", key: Key.Enter },
    { action: "activate", key: Key.Space },
    { action: "console", key: Key.Backtick },
    { action: "undo", key: Key.z, ctrl: true, shift: false, alt: false },
    { action: "redo", key: Key.y, ctrl: true, alt: false },
    { action: "redo", key: Key.z, ctrl: true, shift: true, alt: false },
    { action: "screenshot", key: Key.F9 },
    { action: "budget", key: Key.b, ctrl: false },
];
```

**Add the 3 new functions** after the existing `resolveKeyboardAction` function (after line 98):

```ts
/**
 * Checks whether a keyboard event matches a specific action's key binding(s).
 * Respects modifier constraints defined in KEYBOARD_ACTION_BINDINGS.
 */
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

/**
 * Returns the cycle direction for a cycle keyboard event.
 * ArrowLeft / Shift+Tab → -1 (backward), ArrowRight / Tab → 1 (forward).
 * Only meaningful when called on events that match the "cycle" action.
 */
export function getCycleDirection(event: KeyboardEvent): 1 | -1 {
    const key = canonicalKey(event.key);
    if (key === Key.ArrowLeft) return -1;
    if (key === Key.ArrowRight) return 1;
    return event.shiftKey ? -1 : 1;
}

/**
 * Returns the first bound key string for the given action.
 * Used for constructing synthetic keyboard events.
 */
export function keyForAction(action: KeyboardActionType): string {
    const binding = KEYBOARD_ACTION_BINDINGS.find(b => b.action === action);
    if (!binding) {
        throw new Error(`No key binding for action "${action}"`);
    }
    return binding.key;
}
```

**Update barrel export** in `src/lib/input/index.ts` line 11:
```ts
// OLD:
// export { Key, canonicalKey, KEYBOARD_ACTION_BINDINGS, resolveKeyboardAction } from "./keyboardAction";
// NEW:
export { Key, canonicalKey, KEYBOARD_ACTION_BINDINGS, resolveKeyboardAction, isKeyboardAction, getCycleDirection, keyForAction } from "./keyboardAction";
```

Note: `Key` stays exported for now — it's removed in Task 5 after all consumers are migrated.

- [ ] **Step 4: Add "activate" locale key to all 4 locale files**

In each locale file, add `"activate"` after the `"confirm"` entry inside the `input.keyboard` object:

`src/locales/en.json` — after `"confirm": "Enter"`:
```json
"activate": "Enter / Space",
```

`src/locales/fr.json` — after `"confirm": "Entrée"`:
```json
"activate": "Entrée / Espace",
```

`src/locales/ja.json` — after `"confirm": "Enter"`:
```json
"activate": "Enter / Space",
```

`src/locales/zh.json` — after `"confirm": "Enter"`:
```json
"activate": "Enter / Space",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all existing tests pass (Space assertion updated), all new tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/input/keyboardAction.ts src/lib/input/index.ts test/keyboardAction.test.ts src/locales/en.json src/locales/fr.json src/locales/ja.json src/locales/zh.json
git commit -m "feat(input): add isKeyboardAction, getCycleDirection, keyForAction; split confirm/activate"
```

---

### Task 2: Migrate dismiss-only and confirm-only components

**Files:**
- Modify: `src/lib/FabMenu.svelte`
- Modify: `src/lib/RootNodeQuickSettings.svelte`
- Modify: `src/lib/modals/TextInputModal.svelte`
- Modify: `src/lib/modals/LoadBuildModal.svelte`
- Modify: `src/lib/modals/InputModal.svelte`

- [ ] **Step 1: Migrate FabMenu.svelte**

Import change (line 17):
```ts
// OLD: import { Key } from "./input";
import { isKeyboardAction } from "./input";
```

Line 52:
```ts
// OLD: if (event.key === Key.Escape && isOpen) {
if (isKeyboardAction(event, "dismiss") && isOpen) {
```

- [ ] **Step 2: Migrate RootNodeQuickSettings.svelte**

Import change (line 26):
```ts
// OLD: import { getInputLabel, Key } from "./input";
import { getInputLabel, isKeyboardAction } from "./input";
```

Line 148:
```ts
// OLD: if (e.key === Key.Escape) {
if (isKeyboardAction(e, "dismiss")) {
```

Line 169:
```ts
// OLD: if (event.key === Key.Escape) {
if (isKeyboardAction(event, "dismiss")) {
```

- [ ] **Step 3: Migrate TextInputModal.svelte**

Import change (line 8):
```ts
// OLD: import { Key } from "../input";
import { isKeyboardAction } from "../input";
```

Line 45:
```ts
// OLD: if (event.key === Key.Enter && !isConfirmDisabled) {
if (isKeyboardAction(event, "confirm") && !isConfirmDisabled) {
```

- [ ] **Step 4: Migrate LoadBuildModal.svelte**

Import change (line 15):
```ts
// OLD: import { Key } from "../input";
import { isKeyboardAction } from "../input";
```

Line 109:
```ts
// OLD: if (event.key === Key.Enter) {
if (isKeyboardAction(event, "confirm")) {
```

- [ ] **Step 5: Migrate InputModal.svelte**

Import change (line 15):
```ts
// OLD: import { Key } from "../input";
import { isKeyboardAction } from "../input";
```

Line 93:
```ts
// OLD: if (event.key === Key.Enter) {
if (isKeyboardAction(event, "confirm")) {
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS — no behavioral change, just API migration

- [ ] **Step 7: Commit**

```bash
git add src/lib/FabMenu.svelte src/lib/RootNodeQuickSettings.svelte src/lib/modals/TextInputModal.svelte src/lib/modals/LoadBuildModal.svelte src/lib/modals/InputModal.svelte
git commit -m "refactor(input): migrate dismiss/confirm components to isKeyboardAction"
```

---

### Task 3: Migrate activate-pattern and mixed components

**Files:**
- Modify: `src/lib/ContextMenu.svelte`
- Modify: `src/lib/onboarding/OnboardingOverlay.svelte`
- Modify: `src/lib/SegmentedControl.svelte`

- [ ] **Step 1: Migrate ContextMenu.svelte**

Import change (line 25):
```ts
// OLD: import { Key, onKeyDown } from "./input";
import { isKeyboardAction, onKeyDown } from "./input";
```

Line 117:
```ts
// OLD: if (event.key === Key.Escape) {
if (isKeyboardAction(event, "dismiss")) {
```

Line 157:
```ts
// OLD: if (event.key !== Key.Enter && event.key !== Key.Space) return;
if (!isKeyboardAction(event, "activate")) return;
```

- [ ] **Step 2: Migrate OnboardingOverlay.svelte**

Import change (line 9):
```ts
// OLD: import { getInputLabel, Key, onKeyDown } from "../input";
import { getInputLabel, isKeyboardAction, onKeyDown } from "../input";
```

Line 416:
```ts
// OLD: if (event.key === Key.Enter || event.key === Key.Space) {
if (isKeyboardAction(event, "activate")) {
```

- [ ] **Step 3: Migrate SegmentedControl.svelte**

Import change (line 5):
```ts
// OLD: import { Key } from "./input";
import { isKeyboardAction } from "./input";
```

Line 47:
```ts
// OLD: if (event.key !== Key.Space && event.key !== Key.Enter) return;
if (!isKeyboardAction(event, "activate")) return;
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ContextMenu.svelte src/lib/onboarding/OnboardingOverlay.svelte src/lib/SegmentedControl.svelte
git commit -m "refactor(input): migrate activate-pattern components to isKeyboardAction"
```

---

### Task 4: Migrate cycle-pattern components

**Files:**
- Modify: `src/lib/FullscreenModal.svelte`
- Modify: `src/lib/SideMenu.svelte`
- Modify: `src/lib/TreeTabs.svelte`

- [ ] **Step 1: Migrate FullscreenModal.svelte**

Import change (line 6):
```ts
// OLD: import { Key, onKeyDown } from "./input";
import { isKeyboardAction, getCycleDirection, onKeyDown } from "./input";
```

Replace lines 28-47 in `handleKeydown()`:
```ts
// OLD:
//     const isTab = event.key === Key.Tab;
//     const isArrowLeft = event.key === Key.ArrowLeft;
//     const isArrowRight = event.key === Key.ArrowRight;
//     if (event.key === Key.Escape) {
//         ...
//     } else if ((isTab || isArrowLeft || isArrowRight) && tabs.length > 1 && modalEl) {
//         ...
//         const delta =
//             isTab && event.shiftKey
//                 ? -1
//                 : isArrowLeft
//                   ? -1
//                   : 1;

// NEW:
        if (isKeyboardAction(event, "dismiss")) {
            // Let context menus and fab menus handle Escape first
            if (document.querySelector(".context-menu") || document.querySelector(".fab-menu--open")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            handleClose();
        } else if (isKeyboardAction(event, "cycle") && tabs.length > 1 && modalEl) {
            if (!isKeyboardShortcutTarget(document.activeElement, modalEl)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const currentIndex = tabs.findIndex((t) => t.id === activeTab);
            const delta = getCycleDirection(event);
            const nextIndex =
                (currentIndex + delta + tabs.length) %
                tabs.length;
            onTabChange(tabs[nextIndex].id);
            triggerHaptic();
        }
```

The full `handleKeydown` function body (lines 27-53) should become:
```ts
    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) return;
        if (isKeyboardAction(event, "dismiss")) {
            // Let context menus and fab menus handle Escape first
            if (document.querySelector(".context-menu") || document.querySelector(".fab-menu--open")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            handleClose();
        } else if (isKeyboardAction(event, "cycle") && tabs.length > 1 && modalEl) {
            if (!isKeyboardShortcutTarget(document.activeElement, modalEl)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const currentIndex = tabs.findIndex((t) => t.id === activeTab);
            const delta = getCycleDirection(event);
            const nextIndex =
                (currentIndex + delta + tabs.length) %
                tabs.length;
            onTabChange(tabs[nextIndex].id);
            triggerHaptic();
        }
    }
```

- [ ] **Step 2: Migrate SideMenu.svelte**

Import change (line 23):
```ts
// OLD: import { Key, onKeyDown } from "./input";
import { isKeyboardAction, getCycleDirection, onKeyDown } from "./input";
```

Replace the cycle logic in `handleTabKeydown()`. The existing lines 117-119 use the same isTab/isArrowLeft/isArrowRight pattern. Replace the whole `handleTabKeydown` function's key check and delta calculation with:

Lines 117-119 become:
```ts
// OLD:
//     const isTab = event.key === Key.Tab;
//     const isArrowLeft = event.key === Key.ArrowLeft;
//     const isArrowRight = event.key === Key.ArrowRight;

// NEW: (remove these 3 lines, replace the outer condition)
```

The outer `if` that used `(isTab || isArrowLeft || isArrowRight)` becomes `isKeyboardAction(event, "cycle")`.
The delta calculation becomes `getCycleDirection(event)`.

- [ ] **Step 3: Migrate TreeTabs.svelte**

Import change (line 22) — remove `Key` from the import, add `isKeyboardAction`, `getCycleDirection`:
```ts
// OLD: import { secondary, getKeyboardActionLabel, getDeviceInputLabels, resolveKeyboardAction, Key, onKeyDown } from "./input";
import { secondary, getKeyboardActionLabel, getDeviceInputLabels, resolveKeyboardAction, isKeyboardAction, getCycleDirection, onKeyDown } from "./input";
```

Lines 120-122 — replace the delta calculation:
```ts
// OLD:
//     const delta = event.shiftKey && event.key === Key.Tab
//         ? -1
//         : event.key === Key.ArrowLeft ? -1 : 1;

// NEW:
        const delta = getCycleDirection(event);
```

Also verify the surrounding condition that gates the cycle handling uses `isKeyboardAction(event, "cycle")` instead of any `Key.*` reference. Read the full `handleGlobalKeydown` function to confirm the exact replacement.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/FullscreenModal.svelte src/lib/SideMenu.svelte src/lib/TreeTabs.svelte
git commit -m "refactor(input): migrate cycle-pattern components to isKeyboardAction + getCycleDirection"
```

---

### Task 5: Migrate complex components (ColorPickerDialog, ModalHost)

**Files:**
- Modify: `src/lib/ColorPickerDialog.svelte`
- Modify: `src/lib/ModalHost.svelte`

- [ ] **Step 1: Migrate ColorPickerDialog.svelte**

Import change (line 15):
```ts
// OLD: import { Key } from "./input";
import { isKeyboardAction } from "./input";
```

Line 241 (`handleHexKeydown`):
```ts
// OLD: if (event.key === Key.Enter) {
if (isKeyboardAction(event, "confirm")) {
```

Line 320 (`handleBackdropKeydown`):
```ts
// OLD: if (event.key !== Key.Enter && event.key !== Key.Space) return;
if (!isKeyboardAction(event, "activate")) return;
```

Line 327 (`handleKeydown`):
```ts
// OLD: if (event.key === Key.Escape) {
if (isKeyboardAction(event, "dismiss")) {
```

Line 331 (`handleKeydown`):
```ts
// OLD: } else if (event.key === Key.Enter) {
} else if (isKeyboardAction(event, "confirm")) {
```

- [ ] **Step 2: Migrate ModalHost.svelte**

Import change (line 18):
```ts
// OLD: import { Key } from "./input";
import { isKeyboardAction } from "./input";
```

Line 124 (`handleBackdropKeydown`):
```ts
// OLD: if (event.key !== Key.Enter && event.key !== Key.Space) return;
if (!isKeyboardAction(event, "activate")) return;
```

Line 149 (`handleModalTabKeydown`) — **special case: raw "Tab" string for focus trapping**:
```ts
// OLD: if (event.key !== Key.Tab || !renderedModal) return;
if (event.key !== "Tab" || !renderedModal) return;
```

Line 183 (`handleKeydown`) — **special case: raw "Tab" string for focus trapping**:
```ts
// OLD: if (event.key === Key.Tab) {
if (event.key === "Tab") {
```

Line 188 (`handleKeydown`):
```ts
// OLD: if (event.key === Key.Escape) {
if (isKeyboardAction(event, "dismiss")) {
```

Line 197 (`handleKeydown`):
```ts
// OLD: if (event.key === Key.Enter) {
if (isKeyboardAction(event, "confirm")) {
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ColorPickerDialog.svelte src/lib/ModalHost.svelte
git commit -m "refactor(input): migrate ColorPickerDialog and ModalHost to isKeyboardAction"
```

---

### Task 6: Migrate App.svelte, un-export Key, finalize tests

**Files:**
- Modify: `src/App.svelte`
- Modify: `src/lib/input/keyboardAction.ts`
- Modify: `src/lib/input/index.ts`
- Modify: `test/keyboardAction.test.ts`

- [ ] **Step 1: Migrate App.svelte**

Import change (line 78):
```ts
// OLD: import { resolveKeyboardAction, Key, onKeyDown } from "./lib/input";
import { resolveKeyboardAction, keyForAction, onKeyDown } from "./lib/input";
```

Line 102:
```ts
// OLD: new KeyboardEvent("keydown", { key: Key.Escape }),
new KeyboardEvent("keydown", { key: keyForAction("dismiss") }),
```

- [ ] **Step 2: Verify no file outside `src/lib/input/` imports `Key`**

Run: search for `Key` imports in all `.svelte` and `.ts` files outside `src/lib/input/`:
```bash
grep -rn "import.*\bKey\b.*from" src/ test/ --include="*.svelte" --include="*.ts" | grep -v "src/lib/input/"
```
Expected: Only `test/keyboardAction.test.ts` should remain (handled next step). No `.svelte` files should match.

- [ ] **Step 3: Un-export `Key` from keyboardAction.ts**

In `src/lib/input/keyboardAction.ts`, line 26:
```ts
// OLD: export const Key = {
const Key = {
```

- [ ] **Step 4: Remove `Key` from barrel export**

In `src/lib/input/index.ts`, line 11:
```ts
// OLD: export { Key, canonicalKey, KEYBOARD_ACTION_BINDINGS, resolveKeyboardAction, isKeyboardAction, getCycleDirection, keyForAction } from "./keyboardAction";
export { canonicalKey, KEYBOARD_ACTION_BINDINGS, resolveKeyboardAction, isKeyboardAction, getCycleDirection, keyForAction } from "./keyboardAction";
```

- [ ] **Step 5: Update test file to remove `Key` import**

In `test/keyboardAction.test.ts`, update the import (line 2):
```ts
// OLD: import { Key, canonicalKey, resolveKeyboardAction, KEYBOARD_ACTION_BINDINGS, isKeyboardAction, getCycleDirection, keyForAction } from "../src/lib/input/keyboardAction.ts";
import { canonicalKey, resolveKeyboardAction, KEYBOARD_ACTION_BINDINGS, isKeyboardAction, getCycleDirection, keyForAction } from "../src/lib/input/keyboardAction.ts";
```

The test file currently uses `Key` nowhere besides the import (all test assertions use raw DOM strings like `"Escape"`, `"Enter"`, etc.), so removing the import is the only change needed.

**Note:** If the test file DOES still reference `Key.` in any assertion, replace with the raw DOM string:
- `Key.Escape` → `"Escape"`
- `Key.Enter` → `"Enter"`
- `Key.Space` → `" "`
- `Key.Tab` → `"Tab"`
- `Key.ArrowLeft` → `"ArrowLeft"`
- `Key.ArrowRight` → `"ArrowRight"`
- etc.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS — all tests pass, `Key` is no longer accessible outside `src/lib/input/`

- [ ] **Step 7: Final verification — no `Key` references outside input system**

```bash
grep -rn "import.*\bKey\b.*from" src/ test/ --include="*.svelte" --include="*.ts" | grep -v "src/lib/input/"
```
Expected: No matches.

```bash
grep -rn "\bKey\." src/ --include="*.svelte" --include="*.ts" | grep -v "src/lib/input/" | grep -v "node_modules"
```
Expected: No matches (or only unrelated matches like `KeyboardEvent`, `keyForAction`, etc.).

- [ ] **Step 8: Commit**

```bash
git add src/App.svelte src/lib/input/keyboardAction.ts src/lib/input/index.ts test/keyboardAction.test.ts
git commit -m "refactor(input): un-export Key, migrate App.svelte to keyForAction"
```
