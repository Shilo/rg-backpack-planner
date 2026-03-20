# Keyboard Key Constants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate hardcoded keyboard key strings, add declarative action bindings, and consolidate global hotkey handlers.

**Architecture:** `Key` constant object + `canonicalKey()` normalizer + `KEYBOARD_ACTION_BINDINGS` array in `keyboardAction.ts`. `resolveKeyboardAction` iterates bindings instead of hardcoded `if` chain. TreeTabs consolidates 4 global listeners into 1, App.svelte replaces inline key checks with resolver. All other files swap string literals for `Key.*` constants.

**Tech Stack:** Svelte 5, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-keyboard-key-constants-design.md`

---

## File Map

### Modified Files

| File | Changes |
|---|---|
| `src/lib/input/keyboardAction.ts` | Add `Key`, `canonicalKey`, `KeyBinding`, `KEYBOARD_ACTION_BINDINGS`. Refactor `resolveKeyboardAction`. |
| `src/lib/input/index.ts` | Add barrel exports for `Key`, `canonicalKey`, `KEYBOARD_ACTION_BINDINGS`, `KeyBinding` |
| `src/lib/input/inputStore.ts` | `"Shift"` → `Key.Shift`, `"Control"` → `Key.Control` |
| `src/lib/TreeTabs.svelte` | Replace 4 handlers with 1 consolidated `handleGlobalKeydown` |
| `src/App.svelte` | Replace inline key checks with `resolveKeyboardAction`, swap synthetic dispatch string |
| `test/appHotkeys.test.ts` | Update F9 regex to match refactored code |

### Modified Files (string swaps only)

| File | Key strings replaced |
|---|---|
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

### New Test File

| File | Tests |
|---|---|
| `test/keyboardAction.test.ts` | `canonicalKey`, `resolveKeyboardAction` bindings, Caps Lock edge cases |

---

### Task 1: Key Constants, canonicalKey, Bindings, and Refactored Resolver with Tests

This task adds all new types and code to `keyboardAction.ts`, updates the barrel export, and adds tests. No consumers change yet — the existing `resolveKeyboardAction` is replaced in-place with equivalent behavior (plus Caps Lock bugfix).

**Files:**
- Modify: `src/lib/input/keyboardAction.ts`
- Modify: `src/lib/input/index.ts`
- Create: `test/keyboardAction.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write failing tests**

Create `test/keyboardAction.test.ts`:

```ts
import assert from "node:assert/strict";
import { Key, canonicalKey, resolveKeyboardAction, KEYBOARD_ACTION_BINDINGS } from "../src/lib/input/keyboardAction.ts";

// --- canonicalKey ---
console.log("  canonicalKey");

{
    assert.equal(canonicalKey("z"), "z");
    assert.equal(canonicalKey("Z"), "z", "uppercase Z normalized to z");
    assert.equal(canonicalKey("b"), "b");
    assert.equal(canonicalKey("B"), "b", "uppercase B normalized to b");
    assert.equal(canonicalKey("`"), "`");
    assert.equal(canonicalKey(" "), " ");
    assert.equal(canonicalKey("Escape"), "Escape", "named keys pass through");
    assert.equal(canonicalKey("ArrowLeft"), "ArrowLeft");
    assert.equal(canonicalKey("F9"), "F9");
    console.log("    ✓ normalizes single-char keys to lowercase, passes named keys through");
}

console.log("  ✓ canonicalKey\n");

// --- resolveKeyboardAction ---
console.log("  resolveKeyboardAction");

function mockEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
        key: "",
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        ...overrides,
    } as KeyboardEvent;
}

// Basic action bindings
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape" })), "dismiss");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Backspace" })), "back");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Tab" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "ArrowLeft" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "ArrowRight" })), "cycle");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Enter" })), "confirm");
    assert.equal(resolveKeyboardAction(mockEvent({ key: " " })), "confirm");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "`" })), "console");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "F9" })), "screenshot");
    console.log("    ✓ basic action bindings");
}

// Undo: Ctrl+Z (no shift, no alt)
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true })), "undo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", metaKey: true })), "undo");
    console.log("    ✓ Ctrl+Z and Meta+Z → undo");
}

// Undo blocked by shift or alt
{
    assert.notEqual(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true })), "undo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, altKey: true })), null);
    console.log("    ✓ Ctrl+Shift+Z → not undo, Ctrl+Alt+Z → null");
}

// Redo: Ctrl+Y, Ctrl+Shift+Z
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "y", ctrlKey: true })), "redo");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true })), "redo");
    console.log("    ✓ Ctrl+Y and Ctrl+Shift+Z → redo");
}

// Redo blocked by alt
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "y", ctrlKey: true, altKey: true })), null);
    assert.equal(resolveKeyboardAction(mockEvent({ key: "z", ctrlKey: true, shiftKey: true, altKey: true })), null);
    console.log("    ✓ Ctrl+Alt+Y and Ctrl+Alt+Shift+Z → null");
}

// Budget: b without Ctrl
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "b" })), "budget");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "b", ctrlKey: true })), null, "Ctrl+B should not trigger budget");
    console.log("    ✓ b → budget, Ctrl+B → null");
}

// Caps Lock bugfix: Z without shift should still be undo when Ctrl held
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "Z", ctrlKey: true, shiftKey: false })),
        "undo",
        "Caps Lock + Ctrl+Z (event.key='Z', shiftKey=false) should resolve to undo",
    );
    console.log("    ✓ Caps Lock + Ctrl+Z → undo (bugfix)");
}

// Caps Lock bugfix: B without Ctrl should be budget
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "B" })),
        "budget",
        "Caps Lock + B (event.key='B') should resolve to budget",
    );
    console.log("    ✓ Caps Lock + B → budget (bugfix)");
}

// Unknown key → null
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "x" })), null);
    assert.equal(resolveKeyboardAction(mockEvent({ key: "F1" })), null);
    console.log("    ✓ unknown keys → null");
}

// Dismiss works regardless of modifiers held
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape", ctrlKey: true })), "dismiss");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "Escape", shiftKey: true, altKey: true })), "dismiss");
    console.log("    ✓ Escape resolves to dismiss regardless of modifiers");
}

// KEYBOARD_ACTION_BINDINGS is a frozen/readonly array
{
    assert.ok(Array.isArray(KEYBOARD_ACTION_BINDINGS), "bindings is an array");
    assert.ok(KEYBOARD_ACTION_BINDINGS.length > 0, "bindings is not empty");
    console.log("    ✓ KEYBOARD_ACTION_BINDINGS is a non-empty array");
}

console.log("  ✓ resolveKeyboardAction\n");
```

- [ ] **Step 2: Register test in `test/index.ts`**

Add `"keyboardAction.test.ts"` to the `TEST_FILES` array after `"inputLabels.test.ts"` (line 26):

```ts
    "inputLabels.test.ts",
    "keyboardAction.test.ts",
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Key`, `canonicalKey`, `KEYBOARD_ACTION_BINDINGS` not exported from `keyboardAction.ts`

- [ ] **Step 4: Implement `Key`, `canonicalKey`, `KeyBinding`, `KEYBOARD_ACTION_BINDINGS`, and refactor `resolveKeyboardAction`**

Replace `src/lib/input/keyboardAction.ts` entirely:

```ts
/**
 * Semantic names for keyboard actions, analogous to pointer InputActionType.
 *
 * dismiss  — Escape (close menu, cancel, back out)
 * back     — Backspace (undo last step, reset state)
 * cycle    — Tab / ← / → (cycle between tabs/sections)
 * confirm  — Enter / Space (activate, submit)
 * console  — ` (backtick / tilde — toggle overlay panel, e.g. quick settings)
 * undo     — Ctrl+Z
 * redo     — Ctrl+Y / Ctrl+Shift+Z
 * screenshot — F9
 * budget   — B (open tech crystal budget modal)
 */
export type KeyboardActionType =
    | "dismiss"
    | "back"
    | "cycle"
    | "confirm"
    | "console"
    | "undo"
    | "redo"
    | "screenshot"
    | "budget";

/** All KeyboardEvent.key values used in the app, in canonical form. */
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

/**
 * Returns the canonical form of a KeyboardEvent.key value.
 * Lowercases single-character keys so comparisons are
 * independent of Caps Lock or Shift casing.
 */
export function canonicalKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
}

export type KeyBinding = {
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

/**
 * Maps a keyboard event to a semantic KeyboardActionType.
 * Returns null for unrecognized or unhandled key combinations.
 */
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

- [ ] **Step 5: Update barrel export in `src/lib/input/index.ts`**

Replace line 10-11:

```ts
export type { KeyboardActionType } from "./keyboardAction";
export { resolveKeyboardAction } from "./keyboardAction";
```

With:

```ts
export type { KeyboardActionType, KeyBinding } from "./keyboardAction";
export { Key, canonicalKey, KEYBOARD_ACTION_BINDINGS, resolveKeyboardAction } from "./keyboardAction";
```

- [ ] **Step 6: Run `npm run check` to verify build passes**

Run: `npm run check`
Expected: No errors

- [ ] **Step 7: Run `npm test` to verify all tests pass**

Run: `npm test`
Expected: All tests pass including new `keyboardAction.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/lib/input/keyboardAction.ts src/lib/input/index.ts test/keyboardAction.test.ts test/index.ts
git commit -m "feat(input): add Key constants, canonicalKey, declarative bindings, refactor resolveKeyboardAction"
```

---

### Task 2: Swap Key Strings in `inputStore.ts`

**Files:**
- Modify: `src/lib/input/inputStore.ts`

- [ ] **Step 1: Add import and replace key strings**

Add import at the top of `src/lib/input/inputStore.ts`:

```ts
import { Key } from "./keyboardAction";
```

Replace all four occurrences of `"Shift"` with `Key.Shift` and all four occurrences of `"Control"` with `Key.Control` in the `onKeyDown` and `onKeyUp` handlers (lines 53-59):

```ts
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === Key.Shift) inputStore.update((s) => (s.shiftKey ? s : { ...s, shiftKey: true }));
        if (e.key === Key.Control) inputStore.update((s) => (s.ctrlKey ? s : { ...s, ctrlKey: true }));
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === Key.Shift) inputStore.update((s) => (!s.shiftKey ? s : { ...s, shiftKey: false }));
        if (e.key === Key.Control) inputStore.update((s) => (!s.ctrlKey ? s : { ...s, ctrlKey: false }));
    };
```

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/input/inputStore.ts
git commit -m "refactor(input): use Key constants in inputStore"
```

---

### Task 3: Consolidate TreeTabs.svelte Global Handlers

**Files:**
- Modify: `src/lib/TreeTabs.svelte`

- [ ] **Step 1: Add import for `resolveKeyboardAction` and `Key`**

In `src/lib/TreeTabs.svelte`, update the existing import from `"./input"` (line 22):

```ts
    import { secondary, getKeyboardActionLabel, getDeviceInputLabels, resolveKeyboardAction, Key } from "./input";
```

- [ ] **Step 2: Replace the 4 handler functions with 1 consolidated handler**

Delete `handleTabKeydown` (lines 101-128), `handleBackspaceKeydown` (lines 130-141), `handleConsoleKeydown` (lines 143-158), and `handleBudgetKeydown` (lines 160-168).

Replace with:

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

- [ ] **Step 3: Update `onMount` listener registration**

In `onMount` (line 170+), replace the 4 `addEventListener` calls (lines 182-185):

```ts
        window.addEventListener("keydown", handleTabKeydown, true);
        window.addEventListener("keydown", handleBackspaceKeydown, true);
        window.addEventListener("keydown", handleConsoleKeydown, true);
        window.addEventListener("keydown", handleBudgetKeydown, true);
```

With:

```ts
        window.addEventListener("keydown", handleGlobalKeydown, true);
```

Replace both cleanup blocks (lines 188-191 and 200-203) similarly. Each block of 4 `removeEventListener` calls becomes:

```ts
                window.removeEventListener("keydown", handleGlobalKeydown, true);
```

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 5: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/TreeTabs.svelte
git commit -m "refactor(input): consolidate TreeTabs global hotkey handlers into resolveKeyboardAction"
```

---

### Task 4: Consolidate App.svelte Global Handler

**Files:**
- Modify: `src/App.svelte`
- Modify: `test/appHotkeys.test.ts`

- [ ] **Step 1: Add import for `resolveKeyboardAction` and `Key`**

In `src/App.svelte`, add to the imports (near the top `<script>` block):

```ts
    import { resolveKeyboardAction, Key } from "./lib/input";
```

- [ ] **Step 2: Replace synthetic Escape dispatch**

At line 101, replace:

```ts
                new KeyboardEvent("keydown", { key: "Escape" }),
```

With:

```ts
                new KeyboardEvent("keydown", { key: Key.Escape }),
```

- [ ] **Step 3: Refactor `handleKeyDown` to use `resolveKeyboardAction`**

Replace the `handleKeyDown` function (lines 547-661). The undo/redo deferred logic stays identical — only the key matching changes. The full replacement:

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
                    if (
                        e.repeat &&
                        Date.now() - lastUndoRedoTime < UNDO_REDO_REPEAT_MS
                    )
                        return;
                    lastUndoRedoTime = Date.now();
                    const result = undoHistory.undoDeferred();
                    if (result != null) {
                        const switchedTab =
                            result.activeTreeIndex !== activeTreeIndex;
                        activeTreeIndex = result.activeTreeIndex;
                        const gen = ++undoRedoApplyGen;
                        const TREE_FADE_MS = 150;
                        tick().then(() => {
                            if (gen !== undoRedoApplyGen) return;
                            if (switchedTab) {
                                setTimeout(() => {
                                    if (gen !== undoRedoApplyGen) return;
                                    result.apply();
                                }, TREE_FADE_MS);
                            } else {
                                requestAnimationFrame(() => {
                                    if (gen !== undoRedoApplyGen) return;
                                    result.apply();
                                });
                            }
                        });
                    }
                    return;
                }
                if (action === "redo" && get(canRedo)) {
                    e.preventDefault();
                    if (
                        e.repeat &&
                        Date.now() - lastUndoRedoTime < UNDO_REDO_REPEAT_MS
                    )
                        return;
                    lastUndoRedoTime = Date.now();
                    const result = undoHistory.redoDeferred();
                    if (result != null) {
                        const switchedTab =
                            result.activeTreeIndex !== activeTreeIndex;
                        activeTreeIndex = result.activeTreeIndex;
                        const gen = ++undoRedoApplyGen;
                        const TREE_FADE_MS = 150;
                        tick().then(() => {
                            if (gen !== undoRedoApplyGen) return;
                            if (switchedTab) {
                                setTimeout(() => {
                                    if (gen !== undoRedoApplyGen) return;
                                    result.apply();
                                }, TREE_FADE_MS);
                            } else {
                                requestAnimationFrame(() => {
                                    if (gen !== undoRedoApplyGen) return;
                                    result.apply();
                                });
                            }
                        });
                    }
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
                        if (!sideMenuRef?.tryGoBack?.()) {
                            closeMenu();
                        }
                    } else {
                        isMenuOpen = true;
                    }
                    break;
                case "back":
                    if (!isMenuOpen || e.defaultPrevented || !e.isTrusted) break;
                    if (isFormField(document.activeElement) || hasOnboardingOverlay()) break;
                    e.preventDefault();
                    if (!sideMenuRef?.tryGoBack?.()) {
                        closeMenu();
                    }
                    break;
                case "screenshot":
                    if (hasOnboardingOverlay()) break;
                    e.preventDefault();
                    openComposeScreenshot();
                    break;
            }
        };
```

- [ ] **Step 4: Update `test/appHotkeys.test.ts`**

Replace the F9 regex check (line 31):

```ts
if (!/else if \(e\.key === "F9".*?\)\s*\{\s*e\.preventDefault\(\);\s*openComposeScreenshot\(\);\s*\}/s.test(appSource)) {
```

With a regex that matches the new `case "screenshot":` pattern:

```ts
if (!/case "screenshot":\s*.*?e\.preventDefault\(\);\s*openComposeScreenshot\(\);/s.test(appSource)) {
```

- [ ] **Step 5: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 6: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/App.svelte test/appHotkeys.test.ts
git commit -m "refactor(input): consolidate App.svelte global hotkeys with resolveKeyboardAction"
```

---

### Task 5: Component-Local Key String Swaps (Batch 1 — Modals & Menus)

All files in this task get `Key.*` constant imports and string replacements only. No structural changes.

**Files:**
- Modify: `src/lib/ModalHost.svelte`
- Modify: `src/lib/ContextMenu.svelte`
- Modify: `src/lib/ColorPickerDialog.svelte`
- Modify: `src/lib/FabMenu.svelte`
- Modify: `src/lib/RootNodeQuickSettings.svelte`

- [ ] **Step 1: Add `Key` import and replace strings in each file**

For each file, add the import and replace all key string literals:

**`src/lib/ModalHost.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key !== "Enter"` → `event.key !== Key.Enter`
- `event.key !== " "` → `event.key !== Key.Space`
- `event.key !== "Tab"` → `event.key !== Key.Tab`
- `event.key === "Tab"` → `event.key === Key.Tab`
- `event.key === "Escape"` → `event.key === Key.Escape`
- `event.key === "Enter"` → `event.key === Key.Enter`

**`src/lib/ContextMenu.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key === "Escape"` → `event.key === Key.Escape`
- `event.key !== "Enter"` → `event.key !== Key.Enter`
- `event.key !== " "` → `event.key !== Key.Space`

**`src/lib/ColorPickerDialog.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key === "Enter"` → `event.key === Key.Enter`
- `event.key !== "Enter"` → `event.key !== Key.Enter`
- `event.key !== " "` → `event.key !== Key.Space`
- `event.key === "Escape"` → `event.key === Key.Escape`

**`src/lib/FabMenu.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key === "Escape"` → `event.key === Key.Escape`

**`src/lib/RootNodeQuickSettings.svelte`** — Add `import { Key } from "./input";` and replace:
- `e.key === "Escape"` → `e.key === Key.Escape`
- `event.key === "Escape"` → `event.key === Key.Escape`

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/ModalHost.svelte src/lib/ContextMenu.svelte src/lib/ColorPickerDialog.svelte src/lib/FabMenu.svelte src/lib/RootNodeQuickSettings.svelte
git commit -m "refactor(input): use Key constants in modals and menus"
```

---

### Task 6: Component-Local Key String Swaps (Batch 2 — Remaining Components)

**Files:**
- Modify: `src/lib/FullscreenModal.svelte`
- Modify: `src/lib/SideMenu.svelte`
- Modify: `src/lib/SegmentedControl.svelte`
- Modify: `src/lib/modals/InputModal.svelte`
- Modify: `src/lib/modals/LoadBuildModal.svelte`
- Modify: `src/lib/modals/TextInputModal.svelte`
- Modify: `src/lib/onboarding/OnboardingOverlay.svelte`

- [ ] **Step 1: Add `Key` import and replace strings in each file**

**`src/lib/FullscreenModal.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key === "Tab"` → `event.key === Key.Tab`
- `event.key === "ArrowLeft"` → `event.key === Key.ArrowLeft`
- `event.key === "ArrowRight"` → `event.key === Key.ArrowRight`
- `event.key === "Escape"` → `event.key === Key.Escape`

**`src/lib/SideMenu.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key === "Tab"` → `event.key === Key.Tab`
- `event.key === "ArrowLeft"` → `event.key === Key.ArrowLeft`
- `event.key === "ArrowRight"` → `event.key === Key.ArrowRight`

**`src/lib/SegmentedControl.svelte`** — Add `import { Key } from "./input";` and replace:
- `event.key !== " "` → `event.key !== Key.Space`
- `event.key !== "Enter"` → `event.key !== Key.Enter`

**`src/lib/modals/InputModal.svelte`** — Add `import { Key } from "../input";` and replace:
- `event.key === "Enter"` → `event.key === Key.Enter`

**`src/lib/modals/LoadBuildModal.svelte`** — Add `import { Key } from "../input";` and replace:
- `event.key === "Enter"` → `event.key === Key.Enter`

**`src/lib/modals/TextInputModal.svelte`** — Add `import { Key } from "../input";` and replace:
- `event.key === "Enter"` → `event.key === Key.Enter`

**`src/lib/onboarding/OnboardingOverlay.svelte`** — Add `import { Key } from "../input";` and replace:
- `event.key === "Enter"` → `event.key === Key.Enter`
- `event.key === " "` → `event.key === Key.Space`

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/FullscreenModal.svelte src/lib/SideMenu.svelte src/lib/SegmentedControl.svelte src/lib/modals/InputModal.svelte src/lib/modals/LoadBuildModal.svelte src/lib/modals/TextInputModal.svelte src/lib/onboarding/OnboardingOverlay.svelte
git commit -m "refactor(input): use Key constants in remaining components"
```

---

### Task 7: Final Verification

**Files:**
- Various (verification pass)

- [ ] **Step 1: Search for remaining hardcoded key strings**

Search the `src/` directory for any remaining hardcoded keyboard key strings that should have been replaced:

- `"Escape"` — should only appear in locale JSON files, not in `.ts` or `.svelte` files
- `"Backspace"` — same
- `"Tab"` — same (note: may appear in non-keyboard contexts like HTML tabindex)
- `"Enter"` — same
- `" "` used as a key comparison — should be `Key.Space`
- `"ArrowLeft"`, `"ArrowRight"` — should not appear in `.ts` or `.svelte` files
- `"Shift"`, `"Control"` — should not appear as key comparisons
- `"F9"` — should not appear in `.ts` or `.svelte` files
- `=== "z"`, `=== "y"`, `=== "b"`, `=== "B"`, `=== "Z"` — should not appear

Fix any remaining references.

- [ ] **Step 2: Run `npm run check`**

Run: `npm run check`
Expected: No errors

- [ ] **Step 3: Run `npm test`**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(input): final cleanup — remove remaining hardcoded key strings"
```
