# Primary Action Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent bottom-left pill button showing the active NodePrimaryAction (+1/+10/+Tier) with click-to-cycle and a keyboard shortcut.

**Architecture:** New `PrimaryActionIndicator.svelte` component in a `bot-left-actions` container mirroring the existing `bot-right-actions` pattern. New `cyclePrimaryAction` keyboard action bound to `N`. Toast overlap avoidance extended to cover both bottom corners.

**Tech Stack:** Svelte 5 (legacy syntax), TypeScript, phosphor-svelte icons, svelte-whisper i18n

**Spec:** `docs/superpowers/specs/2026-03-20-primary-action-indicator-design.md`

---

## File Map

| File | Role |
|------|------|
| `src/lib/input/keyboardAction.ts` | Add `cyclePrimaryAction` type, `Key.n`, binding |
| `src/lib/input/index.ts` | Already re-exports everything needed — no changes |
| `src/locales/en.json` | Add `input.keyboard.cyclePrimaryAction` + 2 controls keys |
| `src/locales/fr.json` | Same keys (French) |
| `src/locales/ja.json` | Same keys (Japanese) |
| `src/locales/zh.json` | Same keys (Chinese) |
| `test/keyboardAction.test.ts` | Add tests for `cyclePrimaryAction` binding |
| `src/lib/PrimaryActionIndicator.svelte` | **New** — pill component |
| `src/app.css` | Add `.bot-left-actions` positioning |
| `src/App.svelte` | Add `bot-left-actions` container, render indicator |
| `src/lib/TreeTabs.svelte` | Wire `cyclePrimaryAction` keyboard handler |
| `src/lib/Toasts.svelte` | Extend overlap check to include `.bot-left-actions` |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Add keyboard shortcut to help display |

---

### Task 1: Add `cyclePrimaryAction` keyboard action

**Files:**
- Modify: `src/lib/input/keyboardAction.ts:16-27` (type), `30-45` (Key), `67-83` (bindings)

- [ ] **Step 1: Add `cyclePrimaryAction` to `KeyboardActionType`**

In `src/lib/input/keyboardAction.ts`, add `"cyclePrimaryAction"` to the union type:

```typescript
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
    | "budget"
    | "focusTrap"
    | "cyclePrimaryAction";
```

Also update the doc comment at the top to include:
```
 * cyclePrimaryAction — N (cycle node primary action: +1 / +10 / +Tier)
```

- [ ] **Step 2: Add `Key.n` and the binding**

Add `n: "n"` to the `Key` constant (after the `b` entry):

```typescript
    b: "b",
    n: "n",
} as const;
```

Add the binding to `KEYBOARD_ACTION_BINDINGS` (after the `budget` entry):

```typescript
    { action: "budget", key: Key.b, ctrl: false },
    { action: "cyclePrimaryAction", key: Key.n, ctrl: false },
    { action: "focusTrap", key: Key.Tab },
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/input/keyboardAction.ts
git commit -m "feat(input): add cyclePrimaryAction keyboard action bound to N"
```

---

### Task 2: Add tests for `cyclePrimaryAction`

**Files:**
- Modify: `test/keyboardAction.test.ts`

- [ ] **Step 1: Add resolveKeyboardAction tests**

After the `"Budget: b without Ctrl"` block (~line 85), add:

```typescript
// cyclePrimaryAction: n without Ctrl
{
    assert.equal(resolveKeyboardAction(mockEvent({ key: "n" })), "cyclePrimaryAction");
    assert.equal(resolveKeyboardAction(mockEvent({ key: "n", ctrlKey: true })), null, "Ctrl+N should not trigger cyclePrimaryAction");
    console.log("    ✓ n → cyclePrimaryAction, Ctrl+N → null");
}

// Caps Lock bugfix: N without Ctrl should be cyclePrimaryAction
{
    assert.equal(
        resolveKeyboardAction(mockEvent({ key: "N" })),
        "cyclePrimaryAction",
        "Caps Lock + N (event.key='N') should resolve to cyclePrimaryAction",
    );
    console.log("    ✓ Caps Lock + N → cyclePrimaryAction (bugfix)");
}
```

- [ ] **Step 2: Add isKeyboardAction tests**

After the budget block (~line 192), add:

```typescript
// cyclePrimaryAction blocked by Ctrl
{
    assert.equal(isKeyboardAction(mockEvent({ key: "n" }), "cyclePrimaryAction"), true);
    assert.equal(isKeyboardAction(mockEvent({ key: "n", ctrlKey: true }), "cyclePrimaryAction"), false, "Ctrl+N is not cyclePrimaryAction");
    assert.equal(isKeyboardAction(mockEvent({ key: "N" }), "cyclePrimaryAction"), true, "Caps Lock + N is cyclePrimaryAction");
    console.log("    ✓ isKeyboardAction cyclePrimaryAction respects ctrl constraint");
}
```

- [ ] **Step 3: Update keyForAction tests**

In the `keyForAction` section (~line 232), add:

```typescript
    assert.equal(keyForAction("cyclePrimaryAction"), "n");
```

Update the `allActions` array to include `"cyclePrimaryAction"`:

```typescript
    const allActions: KeyboardActionType[] = [
        "dismiss", "back", "cycle", "confirm", "activate", "console", "undo", "redo", "screenshot", "budget", "focusTrap", "cyclePrimaryAction",
    ];
```

- [ ] **Step 4: Run tests to verify**

Run: `npm test`
Expected: All tests pass including the new `cyclePrimaryAction` tests.

- [ ] **Step 5: Commit**

```bash
git add test/keyboardAction.test.ts
git commit -m "test(input): add cyclePrimaryAction keyboard action tests"
```

---

### Task 3: Add locale keys

**Files:**
- Modify: `src/locales/en.json`, `src/locales/fr.json`, `src/locales/ja.json`, `src/locales/zh.json`

- [ ] **Step 1: Add keys to en.json**

Under `input.keyboard` (after `"budget": "B"`, before `"focusTrap": "Tab"`), add with proper comma handling:

```json
"budget": "B",
"cyclePrimaryAction": "N",
"focusTrap": "Tab"
```

Under `controls` (after `"keyboardBudgetDescription": "Open Tech Crystal budget modal"`, ~line 526), add:

```json
"keyboardCyclePrimaryActionLabel": "Cycle Node Action",
"keyboardCyclePrimaryActionDescription": "Switch between +1, +10, and +Tier increment modes"
```

- [ ] **Step 2: Add keys to fr.json**

Under `input.keyboard`:
```json
"cyclePrimaryAction": "N"
```

Under `controls`:
```json
"keyboardCyclePrimaryActionLabel": "Changer l'action du nœud",
"keyboardCyclePrimaryActionDescription": "Basculer entre les modes d'incrément +1, +10 et +Palier"
```

- [ ] **Step 3: Add keys to ja.json**

Under `input.keyboard`:
```json
"cyclePrimaryAction": "N"
```

Under `controls`:
```json
"keyboardCyclePrimaryActionLabel": "ノードアクション切替",
"keyboardCyclePrimaryActionDescription": "+1、+10、+ティアの増分モードを切り替え"
```

- [ ] **Step 4: Add keys to zh.json**

Under `input.keyboard`:
```json
"cyclePrimaryAction": "N"
```

Under `controls`:
```json
"keyboardCyclePrimaryActionLabel": "切换节点操作",
"keyboardCyclePrimaryActionDescription": "在+1、+10和+阶增量模式之间切换"
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/fr.json src/locales/ja.json src/locales/zh.json
git commit -m "i18n: add cyclePrimaryAction locale keys for all 4 languages"
```

---

### Task 4: Create `PrimaryActionIndicator.svelte`

**Files:**
- Create: `src/lib/PrimaryActionIndicator.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import {
        CaretUpIcon,
        CaretDoubleUpIcon,
        CaretLineUpIcon,
    } from "phosphor-svelte";
    import {
        nodePrimaryAction,
        NodePrimaryAction,
        isNodePrimaryAction,
    } from "./nodePrimaryActionStore";
    import { triggerHaptic } from "./hapticsStore";
    import { showToast } from "./toast";
    import { tooltip } from "./tooltip";
    import { t } from "svelte-whisper";
    import { getInputLabel, getKeyboardActionLabel, buildShortcutTooltip } from "./input";

    let isTouchPlatform = false;

    onMount(() => {
        const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
        const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
        isTouchPlatform =
            !hasFinePointer &&
            (hasCoarsePointer || navigator.maxTouchPoints > 0);
    });

    const ICONS = {
        [NodePrimaryAction.IncrementOne]: CaretUpIcon,
        [NodePrimaryAction.IncrementTen]: CaretDoubleUpIcon,
        [NodePrimaryAction.IncrementTier]: CaretLineUpIcon,
    };

    function labelKey(action: NodePrimaryAction): string {
        switch (action) {
            case NodePrimaryAction.IncrementOne:
                return "nodeMenu.incrementOne";
            case NodePrimaryAction.IncrementTen:
                return "nodeMenu.incrementTen";
            case NodePrimaryAction.IncrementTier:
                return "nodeMenu.incrementTier";
        }
    }

    $: currentAction = $nodePrimaryAction;
    $: icon = ICONS[currentAction];
    $: label = $t(labelKey(currentAction));
    $: shortcutKey = getKeyboardActionLabel("cyclePrimaryAction", $t);

    $: settingLabel = $t("settings.nodePrimaryActionTitle", {
        primaryAction: getInputLabel(
            "primary",
            "none",
            isTouchPlatform ? "touch" : "mouse",
            $t,
        ),
    });

    $: ariaLabel = `${settingLabel}: ${label}`;
    $: tooltipContent = buildShortcutTooltip(ariaLabel, shortcutKey);

    export function cycle() {
        const next = ((currentAction + 1) % 3) as NodePrimaryAction;
        if (!isNodePrimaryAction(next)) return;
        nodePrimaryAction.set(next);
        triggerHaptic();
        const nextLabel = $t(labelKey(next));
        showToast(`${settingLabel}: ${nextLabel}`);
    }

    function handleClick() {
        cycle();
    }
</script>

<button
    class="primary-action-indicator"
    type="button"
    aria-label={ariaLabel}
    use:tooltip={tooltipContent}
    on:click={handleClick}
>
    <svelte:component this={icon} size={16} weight="bold" />
    <span class="primary-action-indicator__label">{label}</span>
</button>

<style>
    .primary-action-indicator {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-sm);
        height: 38px;
        padding: 0 var(--spacing-md);
        border-radius: 999px;
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 28%, var(--border));
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-raised));
        color: color-mix(in srgb, var(--accent) 60%, var(--text));
        font-family: inherit;
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        letter-spacing: var(--tracking);
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition:
            background var(--ease),
            border-color var(--ease),
            color var(--ease),
            scale var(--ease);
    }

    .primary-action-indicator:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    .primary-action-indicator:active {
        scale: 0.95;
    }

    @media (hover: hover) {
        .primary-action-indicator:hover {
            background: color-mix(in srgb, var(--accent) 20%, var(--bg-raised));
        }
    }

    .primary-action-indicator__label {
        line-height: var(--leading);
    }
</style>
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/PrimaryActionIndicator.svelte
git commit -m "feat: add PrimaryActionIndicator pill component"
```

---

### Task 5: Add `bot-left-actions` container and render indicator

**Files:**
- Modify: `src/app.css:34-60`
- Modify: `src/App.svelte:743-776` (template), `829-883` (CSS)

- [ ] **Step 1: Add `.bot-left-actions` CSS to `src/app.css`**

The existing `bot-right-actions` styles live in `App.svelte`'s scoped `<style>`. Add the new `bot-left-actions` rule there to mirror it. However, the `pointer-events` rule and onboarding rule reference `bot-left-actions` from `app.css`. Add to `app.css` after the `.bot-right-actions` onboarding rule (after line 58):

No changes needed in `app.css` — the `.hud-safe-area > *` rule on line 41 already applies `pointer-events: auto` to all direct children. The onboarding overlay rule on line 49 (`body.has-onboarding-overlay .hud-safe-area *`) already disables pointer events for all HUD children.

- [ ] **Step 2: Add `bot-left-actions` styles in `App.svelte` CSS**

In `App.svelte`'s `<style>` block, after `.bot-right-actions` (~line 877), add:

```css
    .bot-left-actions {
        position: absolute;
        bottom: calc(var(--tab-height) + var(--bar-pad));
        left: 0;
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        pointer-events: none;
        z-index: var(--z-index-hud);
    }
```

Update the `above-backdrop` rule (~line 864) to include `bot-left-actions`:

```css
    .top-right-actions.above-backdrop,
    .bot-right-actions.above-backdrop,
    .bot-left-actions.above-backdrop {
        z-index: var(--z-index-hud-above-context-backdrop);
    }
```

Update the pointer-events rule (~line 879) to include `bot-left-actions`:

```css
    .top-left-actions > :global(*),
    .top-right-actions > :global(*),
    .bot-right-actions > :global(*),
    .bot-left-actions > :global(*) {
        pointer-events: auto;
    }
```

- [ ] **Step 3: Add the container and component to `App.svelte` template**

Import `PrimaryActionIndicator` at the top of `App.svelte`:

```typescript
import PrimaryActionIndicator from "./lib/PrimaryActionIndicator.svelte";
```

In the `.hud-safe-area` div, after the `bot-right-actions` div and before the closing `</div>` (~line 776), add:

```svelte
        <div
            class="bot-left-actions"
            class:above-backdrop={$buildContextMenuOpenForOverlayRaise}
        >
            <PrimaryActionIndicator />
        </div>
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte
git commit -m "feat: add bot-left-actions container with PrimaryActionIndicator"
```

---

### Task 6: Wire keyboard handler in `TreeTabs.svelte`

**Files:**
- Modify: `src/lib/TreeTabs.svelte:6-48` (imports), `101-161` (handler)

**DRY note:** The cycle+toast logic is duplicated between this handler and `PrimaryActionIndicator.svelte`. This is a known tradeoff — the spec constrains `nodePrimaryActionStore.ts` as unchanged, and adding cross-component coupling would be worse. If the toast format or cycle logic changes, update both locations.

- [ ] **Step 1: Add required imports**

Add these imports to `TreeTabs.svelte`. None of these are currently imported:

After the existing imports (~line 47), add:

```typescript
import { get } from "svelte/store";
import {
    nodePrimaryAction,
    NodePrimaryAction,
    isNodePrimaryAction,
} from "./nodePrimaryActionStore";
import { triggerHaptic } from "./hapticsStore";
```

Update the existing `./input` import on line 22 to add `getInputLabel` and `triggerShortcutFlash`:

```typescript
    import { secondary, getKeyboardActionLabel, getInputLabel, getDeviceInputLabels, resolveKeyboardAction, isKeyboardAction, getCycleDirection, onKeyDown, triggerShortcutFlash } from "./input";
```

- [ ] **Step 2: Add the complete `cyclePrimaryAction` case**

In `handleGlobalKeydown` (~line 159), add a new case after `budget`. This is the **complete** handler block — no additional steps needed:

```typescript
            case "cyclePrimaryAction": {
                if (isMenuOpen || $isComposeScreenshotOpen || $modalStore) return;
                if (isFormField(document.activeElement)) return;
                if (event.repeat) return;
                event.preventDefault();
                const current = get(nodePrimaryAction);
                const next = ((current + 1) % 3) as NodePrimaryAction;
                if (!isNodePrimaryAction(next)) return;
                nodePrimaryAction.set(next);
                triggerHaptic();
                triggerShortcutFlash("cyclePrimaryAction");
                // Toast: duplicated from PrimaryActionIndicator.svelte (see DRY note above)
                const actionLabel = next === NodePrimaryAction.IncrementOne
                    ? $t("nodeMenu.incrementOne")
                    : next === NodePrimaryAction.IncrementTen
                      ? $t("nodeMenu.incrementTen")
                      : $t("nodeMenu.incrementTier");
                const primaryActionSettingLabel = $t("settings.nodePrimaryActionTitle", {
                    primaryAction: getInputLabel("primary", "none", "mouse", $t),
                });
                showToast(`${primaryActionSettingLabel}: ${actionLabel}`);
                break;
            }
```

Note: hardcodes `"mouse"` for the device label since keyboard shortcuts imply desktop usage.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/TreeTabs.svelte
git commit -m "feat: wire cyclePrimaryAction keyboard shortcut in TreeTabs"
```

---

### Task 7: Extend toast overlap avoidance

**Files:**
- Modify: `src/lib/Toasts.svelte:67-97`

- [ ] **Step 1: Refactor `checkOverlap` to check both HUD corners**

Replace the `checkOverlap` function with a version that loops over both selectors:

```typescript
    const HUD_OVERLAP_SELECTORS = [".bot-right-actions", ".bot-left-actions"];

    function checkOverlap() {
        if (!regionEl) return;
        const toasts = regionEl.querySelectorAll<HTMLElement>(".toast");
        if (toasts.length === 0) {
            extraBottom = 0;
            return;
        }
        let maxShift = 0;
        for (const selector of HUD_OVERLAP_SELECTORS) {
            const el = document.querySelector<HTMLElement>(selector);
            if (!el) continue;
            const eb = el.getBoundingClientRect();
            if (eb.width === 0 || eb.height === 0) continue;
            toasts.forEach((toast) => {
                const tr = toast.getBoundingClientRect();
                const natTop = tr.top + extraBottom;
                const natBottom = tr.bottom + extraBottom;
                const hOverlap =
                    Math.min(tr.right, eb.right) - Math.max(tr.left, eb.left);
                const vOverlap =
                    Math.min(natBottom, eb.bottom) - Math.max(natTop, eb.top);
                if (hOverlap > 0 && vOverlap > 0) {
                    maxShift = Math.max(maxShift, vOverlap + GAP);
                }
            });
        }
        extraBottom = maxShift;
    }
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/Toasts.svelte
git commit -m "fix: extend toast overlap avoidance to include bot-left-actions"
```

---

### Task 8: Add shortcut to SideMenuControlsPage

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte:95-97` (computed), `491-506` (template)

- [ ] **Step 1: Add the computed shortcut label**

After `$: keyBudget = getKeyboardActionLabel("budget", $t);` (~line 95), add:

```typescript
    $: keyCyclePrimaryAction = getKeyboardActionLabel("cyclePrimaryAction", $t);
```

- [ ] **Step 2: Add the icon import**

Add `CaretUpIcon` to the phosphor-svelte imports at the top (~line 5):

```typescript
    import {
        ArrowArcLeftIcon,
        ArrowArcRightIcon,
        ArrowCounterClockwiseIcon,
        CaretUpIcon,
        // ... rest
    } from "phosphor-svelte";
```

- [ ] **Step 3: Add the control row in template**

After the budget `<li>` block (~line 506), add:

```svelte
                    <li class="control-row">
                        <span class="control-icon" aria-hidden="true">
                            <CaretUpIcon />
                        </span>
                        <p class="control-inline">
                            <span class="control-label"
                                >{$t("controls.keyboardCyclePrimaryActionLabel")}</span
                            >
                            <span class="control-desc"
                                >{$t(
                                    "controls.keyboardCyclePrimaryActionDescription",
                                )}</span
                            >
                            <span class="control-shortcut">{keyCyclePrimaryAction}</span>
                        </p>
                    </li>
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuControlsPage.svelte
git commit -m "feat: add cyclePrimaryAction to keyboard shortcuts help page"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass, no type errors.

- [ ] **Step 2: Visual verification**

Run: `npm run dev`

Verify:
- Bottom-left pill shows "+1" with caret icon on load
- Clicking the pill cycles through +1 → +10 → +Tier → +1
- Toast appears on each cycle
- Haptic fires on each cycle (mobile)
- Pill is 38px tall, accent-tinted, pill-shaped
- Pill stays visible when undo toolbar is hidden
- Pill respects safe area on notched devices
- Pressing `N` on keyboard cycles the action
- Toast doesn't overlap the pill or the undo toolbar on narrow screens
- Side menu → Controls → Keyboard section shows the new shortcut
- Tooltip on hover shows setting label + "N" shortcut

- [ ] **Step 3: Commit any fixes**

If visual review reveals issues, fix and commit individually.
