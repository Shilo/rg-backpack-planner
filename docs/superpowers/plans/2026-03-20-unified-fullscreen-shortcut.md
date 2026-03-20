# Unified Fullscreen Shortcut (F11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intercept F11 and route it through the Fullscreen API so the FullscreenToggle button stays in sync with all fullscreen state changes.

**Architecture:** Add `"fullscreen"` as a new keyboard action in the existing input system, handle it in App.svelte's global keydown handler (same pattern as F9/screenshot), and wire shortcut tooltip + flash feedback to the FullscreenToggle button.

**Tech Stack:** Svelte 5, TypeScript, existing keyboard action system (`src/lib/input/`)

**Spec:** `docs/superpowers/specs/2026-03-20-unified-fullscreen-shortcut-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/input/keyboardAction.ts` | Modify | Add `"fullscreen"` to type, `F11` to Key, binding to array |
| `test/keyboardAction.test.ts` | Modify | Add tests for F11 → fullscreen resolution |
| `src/locales/en.json` | Modify | Add `"fullscreen": "F11"` to `input.keyboard` |
| `src/App.svelte` | Modify | Add `case "fullscreen"` to handleKeyDown switch |
| `src/lib/buttons/FullscreenToggle.svelte` | Modify | Add `shortcut` and `flashOnAction` props to Button |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Modify | Add Kbd shortcut to fullscreen HUD entry |

---

### Task 1: Register the `fullscreen` keyboard action

**Files:**
- Modify: `src/lib/input/keyboardAction.ts:12-87`
- Modify: `test/keyboardAction.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `test/keyboardAction.test.ts`:

In the `resolveKeyboardAction` basic action bindings block (after the `F9 → screenshot` assert near line 48):
```ts
assert.equal(resolveKeyboardAction(mockEvent({ key: "F11" })), "fullscreen");
```

In the `isKeyboardAction` remaining actions block (after the `F9 → screenshot` asserts near line 192-194):
```ts
assert.equal(isKeyboardAction(mockEvent({ key: "F11" }), "fullscreen"), true);
assert.equal(isKeyboardAction(mockEvent({ key: "F1" }), "fullscreen"), false);
console.log("    ✓ isKeyboardAction covers fullscreen");
```

In the `keyForAction` block (after `screenshot` near line 256):
```ts
assert.equal(keyForAction("fullscreen"), "F11");
```

Update the `allActions` array (line 261-262) to include `"fullscreen"`:
```ts
const allActions: KeyboardActionType[] = [
    "dismiss", "back", "cycle", "confirm", "activate", "console", "undo", "redo", "screenshot", "budget", "focusTrap", "cyclePrimaryAction", "fullscreen",
];
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `"fullscreen"` is not a valid `KeyboardActionType`, `resolveKeyboardAction` returns `null` for F11

- [ ] **Step 3: Implement the keyboard action**

In `src/lib/input/keyboardAction.ts`:

Add to the JSDoc comment (after `screenshot — F9` on line 12):
```
 * fullscreen          — F11 (toggle fullscreen via Fullscreen API)
```

Add `"fullscreen"` to `KeyboardActionType` (after `"cyclePrimaryAction"` on line 29):
```ts
    | "fullscreen";
```

Add `F11` to the `Key` constant (after `F9: "F9",` on line 43):
```ts
    F11: "F11",
```

Add the binding to `KEYBOARD_ACTION_BINDINGS` (after the `screenshot` binding on line 83):
```ts
    { action: "fullscreen", key: Key.F11 },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/input/keyboardAction.ts test/keyboardAction.test.ts
git commit -m "feat: add fullscreen keyboard action (F11)"
```

---

### Task 2: Add locale string

**Files:**
- Modify: `src/locales/en.json:656`

- [ ] **Step 1: Add the locale entry**

In `src/locales/en.json`, in the `input.keyboard` object, after `"focusTrap": "Tab"` (line 656), add a comma and the new entry:

Change:
```json
"focusTrap": "Tab"
```
To:
```json
"focusTrap": "Tab",
"fullscreen": "F11"
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json
git commit -m "feat: add F11 fullscreen locale string"
```

---

### Task 3: Handle F11 in App.svelte

**Files:**
- Modify: `src/App.svelte:79-84,662-667`

- [ ] **Step 1: Add toggleFullscreen import**

In `src/App.svelte`, add a new import after the existing imports (e.g., after line 85):
```ts
import { toggleFullscreen } from "./lib/fullscreen";
```

- [ ] **Step 2: Add the fullscreen case to handleKeyDown**

In the `switch (action)` block (after the `case "screenshot"` block ending at line 666), add:

```ts
            case "fullscreen":
                e.preventDefault();
                triggerShortcutFlash("fullscreen");
                toggleFullscreen();
                break;
```

Note: `triggerShortcutFlash` is already imported from `"./lib/input"` (line 83). The `toggleFullscreen()` promise is intentionally not awaited — `fullscreenchange` handles state updates asynchronously.

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/App.svelte
git commit -m "feat: intercept F11 and route through Fullscreen API"
```

---

### Task 4: Add shortcut tooltip and flash to FullscreenToggle

**Files:**
- Modify: `src/lib/buttons/FullscreenToggle.svelte:1-73`

- [ ] **Step 1: Add import**

In `src/lib/buttons/FullscreenToggle.svelte`, add after the existing imports (after line 13):
```ts
import { getKeyboardActionLabel } from "../input";
```

- [ ] **Step 2: Add shortcut and flashOnAction to the Button**

In the `{#if iconButton}` block, update the `<Button>` (lines 64-73) to add `shortcut` and `flashOnAction` props:

```svelte
    <Button
        {...$$restProps}
        icon={(isFullscreen
            ? CornersInIcon
            : CornersOutIcon) as unknown as Component}
        tooltipText={isFullscreen
            ? $t("fullscreen.exitTooltip")
            : $t("fullscreen.enterTooltip")}
        shortcut={getKeyboardActionLabel("fullscreen", $t)}
        flashOnAction="fullscreen"
        on:click={handleToggleFullscreen}
    />
```

The `shortcut` prop is handled by Button's existing `buildShortcutTooltip` — it appends the shortcut to the tooltip on keyboard devices. The `flashOnAction` prop triggers a 250ms visual flash when F11 is pressed.

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/buttons/FullscreenToggle.svelte
git commit -m "feat: add F11 shortcut tooltip and flash to fullscreen button"
```

---

### Task 5: Add shortcut to controls page

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte:100,650-661`

- [ ] **Step 1: Add the reactive label**

In `src/lib/sideMenuPages/SideMenuControlsPage.svelte`, after the `keyRedo` label (line 100), add:

```ts
    $: keyFullscreen = getKeyboardActionLabel("fullscreen", $t);
```

`getKeyboardActionLabel` is already imported via `getDeviceInputLabels, getKeyboardActionLabel` on line 39.

- [ ] **Step 2: Add the Kbd shortcut to the fullscreen HUD entry**

In the HUD accordion, update the fullscreen `<li>` entry (lines 650-662). After the `<span class="control-desc">` closing tag (line 660), add the shortcut span:

Change:
```svelte
                        <span class="control-desc"
                            >{$t("controls.hudFullscreenDescription")}</span
                        >
                    </p>
```

To:
```svelte
                        <span class="control-desc"
                            >{$t("controls.hudFullscreenDescription")}</span
                        >
                        <span class="control-shortcut"><Kbd keys={keyFullscreen} /></span>
                    </p>
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS (type check + all tests)

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuControlsPage.svelte
git commit -m "feat: show F11 shortcut in controls page fullscreen entry"
```

---

### Task 6: Manual verification

- [ ] **Step 1: Start dev server and test**

Run: `npm run dev`

Verify:
1. Press F11 — enters fullscreen via API, button icon changes to CornersIn, button flashes
2. Press F11 again — exits fullscreen, button icon changes back to CornersOut, button flashes
3. Click the fullscreen button — enters fullscreen, then press F11 — correctly exits
4. Hover the HUD fullscreen button — tooltip shows "Exit/Enter fullscreen" with "F11" shortcut
5. Open Settings → Controls → HUD section — fullscreen entry shows "F11" kbd shortcut
6. On a touch device (or devtools touch emulation) — shortcut tooltip is hidden
