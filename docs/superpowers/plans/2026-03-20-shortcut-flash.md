# Shortcut Flash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual feedback (brief pressed appearance) to toolbar buttons when their corresponding keyboard shortcuts fire.

**Architecture:** A writable store broadcasts the last-activated `KeyboardActionType`. Button.svelte gains an opt-in `flashOnAction` prop that reactively applies a CSS class when the store matches. App.svelte triggers the store in its existing hotkey handler.

**Tech Stack:** Svelte 5 (legacy mode — `export let`, `$:`, `$store`), TypeScript, CSS transitions

**Spec:** `docs/superpowers/specs/2026-03-20-shortcut-flash-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/input/shortcutFlashStore.ts` | Create | Store + trigger function |
| `src/lib/input/index.ts` | Modify | Re-export store + trigger |
| `test/shortcutFlash.test.ts` | Create | Unit tests for store behavior |
| `test/index.ts` | Modify | Register new test file in `TEST_FILES` array |
| `src/lib/Button.svelte` | Modify | `flashOnAction` prop, `$shortcutFlash` subscription, `button-flash` CSS |
| `src/App.svelte` | Modify | Call `triggerShortcutFlash` in hotkey handler |
| `src/lib/UndoRedoToolbar.svelte` | Modify | Wire `flashOnAction` prop to undo/redo buttons |

---

### Task 1: Flash Store — Test

**Files:**
- Create: `test/shortcutFlash.test.ts`

- [ ] **Step 1: Write tests for the flash store**

Tests use the project's test pattern: `node:assert/strict`, console logging, no test framework. Uses `setTimeout` + promises to test the auto-clear timer.

```typescript
import assert from "node:assert/strict";
import { get } from "svelte/store";
import { shortcutFlash, triggerShortcutFlash, FLASH_DURATION_MS } from "../src/lib/input";

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log("  shortcutFlash");

// --- initial state ---
{
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ initial state is null");
}

// --- trigger sets value ---
{
    triggerShortcutFlash("undo");
    assert.equal(get(shortcutFlash), "undo");
    console.log("    ✓ triggerShortcutFlash sets store value");
}

// --- auto-clears after FLASH_DURATION_MS ---
{
    triggerShortcutFlash("redo");
    assert.equal(get(shortcutFlash), "redo");
    await wait(FLASH_DURATION_MS + 50);
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ store auto-clears after FLASH_DURATION_MS");
}

// --- rapid calls reset the timer ---
{
    triggerShortcutFlash("undo");
    await wait(FLASH_DURATION_MS - 50);
    // Still active because we haven't exceeded duration
    assert.equal(get(shortcutFlash), "undo");
    // Re-trigger — should reset the timer
    triggerShortcutFlash("undo");
    await wait(FLASH_DURATION_MS - 50);
    // Should still be active (timer was reset)
    assert.equal(get(shortcutFlash), "undo");
    await wait(100);
    // Now it should have cleared
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ rapid triggers reset the timer");
}

// --- switching action replaces previous ---
{
    triggerShortcutFlash("undo");
    triggerShortcutFlash("redo");
    assert.equal(get(shortcutFlash), "redo");
    await wait(FLASH_DURATION_MS + 50);
    assert.equal(get(shortcutFlash), null);
    console.log("    ✓ triggering a different action replaces the previous");
}

console.log("  ✓ shortcutFlash\n");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/shortcutFlash.test.ts`
Expected: FAIL — module `../src/lib/input/shortcutFlashStore.ts` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add test/shortcutFlash.test.ts
git commit -m "test: add shortcut flash store tests (red)"
```

---

### Task 2: Flash Store — Implementation

**Files:**
- Create: `src/lib/input/shortcutFlashStore.ts`
- Modify: `src/lib/input/index.ts`

- [ ] **Step 1: Create the flash store**

```typescript
import { writable } from "svelte/store";
import type { KeyboardActionType } from "./keyboardAction";

export const FLASH_DURATION_MS = 250;

const store = writable<KeyboardActionType | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

export const shortcutFlash = { subscribe: store.subscribe };

export function triggerShortcutFlash(action: KeyboardActionType): void {
    if (timer != null) clearTimeout(timer);
    store.set(action);
    timer = setTimeout(() => {
        store.set(null);
        timer = null;
    }, FLASH_DURATION_MS);
}
```

- [ ] **Step 2: Re-export from index.ts**

Add to `src/lib/input/index.ts`:

```typescript
export { shortcutFlash, triggerShortcutFlash, FLASH_DURATION_MS } from "./shortcutFlashStore";
```

- [ ] **Step 3: Register test in test/index.ts**

Add `"shortcutFlash.test.ts"` to the `TEST_FILES` array in `test/index.ts`, after `"keyboardAction.test.ts"` (in the "Core State & Logic" section):

```typescript
    "keyboardAction.test.ts",
    "shortcutFlash.test.ts",
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx test/shortcutFlash.test.ts`
Expected: All 5 assertions pass.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/input/shortcutFlashStore.ts src/lib/input/index.ts test/index.ts
git commit -m "feat: add shortcut flash store"
```

---

### Task 3: Button.svelte — Flash Prop and CSS

**Files:**
- Modify: `src/lib/Button.svelte`

- [ ] **Step 1: Add the flashOnAction prop and reactive subscription**

Add `shortcutFlash` to the existing import from `"./input"` (line 6), and add a separate type import:

```typescript
import { primary, secondary, buildShortcutTooltip, shortcutFlash } from "./input";
import type { KeyboardActionType } from "./input";
```

Add the new prop after the existing `shortcut` prop:

```typescript
export let flashOnAction: KeyboardActionType | undefined = undefined;
```

Add reactive statement (after existing `$:` declarations, before `computedClass`):

```typescript
$: isFlashing = !!flashOnAction && $shortcutFlash === flashOnAction;
```

- [ ] **Step 2: Add button-flash to computedClass**

Modify the existing `computedClass` reactive statement — add `isFlashing ? "button-flash" : ""` to the array:

```typescript
$: computedClass = [
    "button",
    small ? "button-sm" : "button-md",
    negative ? "button-negative" : positive ? "button-positive" : accent ? "button-accent" : "",
    ghost ? "button-ghost" : "",
    restClass,
    icon || arrow ? "with-icon" : "",
    arrow ? "with-arrow" : "",
    isFlashing ? "button-flash" : "",
]
    .filter(Boolean)
    .join(" ");
```

- [ ] **Step 3: Add CSS for button-flash**

Add in the `<style>` block, after the existing `.button:not(:disabled):active` rule:

```css
.button.button-flash:not(:disabled) {
    filter: var(--brightness-hover);
    transform: scale(0.96);
}
```

- [ ] **Step 4: Run type check and full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/Button.svelte
git commit -m "feat: add flashOnAction prop to Button"
```

---

### Task 4: App.svelte — Trigger Flash on Hotkey

**Files:**
- Modify: `src/App.svelte`

- [ ] **Step 1: Import triggerShortcutFlash**

Add `triggerShortcutFlash` to the existing import from `"./lib/input"` in App.svelte. Find the line that imports `resolveKeyboardAction, keyForAction, onKeyDown` and add `triggerShortcutFlash`:

```typescript
import { resolveKeyboardAction, keyForAction, onKeyDown, triggerShortcutFlash } from "./lib/input";
```

- [ ] **Step 2: Add flash trigger in undo branch**

In the `handleKeyDown` function, in the undo branch (`action === "undo" && get(canUndo)`), add `triggerShortcutFlash("undo")` right after `lastUndoRedoTime = Date.now();`:

```typescript
lastUndoRedoTime = Date.now();
triggerShortcutFlash("undo");
```

- [ ] **Step 3: Add flash trigger in redo branch**

Same pattern in the redo branch (`action === "redo" && get(canRedo)`), right after `lastUndoRedoTime = Date.now();`:

```typescript
lastUndoRedoTime = Date.now();
triggerShortcutFlash("redo");
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte
git commit -m "feat: trigger shortcut flash on undo/redo hotkey"
```

---

### Task 5: UndoRedoToolbar — Wire Props

**Files:**
- Modify: `src/lib/UndoRedoToolbar.svelte`

- [ ] **Step 1: Add flashOnAction to undo button**

On the undo `<Button>` (the one with `icon={ArrowArcLeftIcon}`), add the prop:

```svelte
<Button
    class="undo-redo-toolbar__btn"
    aria-label={$t("common.undo")}
    tooltipText={$t("common.undo")}
    shortcut={keyUndo}
    icon={ArrowArcLeftIcon}
    small
    disabled={!$canUndo}
    flashOnAction="undo"
    on:click={handleUndo}
/>
```

- [ ] **Step 2: Add flashOnAction to redo button**

On the redo `<Button>` (the one with `icon={ArrowArcRightIcon}`), add the prop:

```svelte
<Button
    class="undo-redo-toolbar__btn"
    aria-label={$t("common.redo")}
    tooltipText={$t("common.redo")}
    shortcut={keyRedo}
    icon={ArrowArcRightIcon}
    small
    disabled={!$canRedo}
    flashOnAction="redo"
    on:click={handleRedo}
/>
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Test in browser:
1. Make some changes to a tree (so undo history has entries)
2. Press Ctrl+Z — undo button should briefly scale down and brighten
3. Press Ctrl+Y or Ctrl+Shift+Z — redo button should flash
4. Hold Ctrl+Z — button should stay pressed while held, releasing briefly between repeats
5. Press Ctrl+Z when undo is disabled (no history) — no flash (button stays dim)

- [ ] **Step 5: Commit**

```bash
git add src/lib/UndoRedoToolbar.svelte
git commit -m "feat: wire shortcut flash to undo/redo toolbar buttons"
```
