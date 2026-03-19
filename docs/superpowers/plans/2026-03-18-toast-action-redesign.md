# Toast Action Button Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix toast action button UX — make the button look like a button, stop squishing the message, and prevent misclick dismissals.

**Architecture:** Replace the inline text-only action with a stacked two-row layout (message row + action row) using an outlined pill button. Disable tap-to-dismiss on toasts that have actions. Swap the budget toggle icon from CurrencyCircleDollarIcon to CoinsIcon.

**Tech Stack:** Svelte 5 (file uses Svelte 4-style `$:` reactivity and `on:click` syntax), CSS with theme tokens + color-mix(), phosphor-svelte icons

**Spec:** `docs/superpowers/specs/2026-03-18-toast-action-redesign.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/Toasts.svelte` | Modify | Stacked layout, pill button CSS, conditional dismiss |
| `src/lib/sideMenuPages/NodeSettingsPage.svelte` | Modify | Icon swap |
| `test/toastActionRedesign.test.ts` | Create | Source-level assertions for new layout/styling |
| `test/index.ts` | Modify | Register new test file |

---

### Task 1: Icon swap (NodeSettingsPage)

**Files:**
- Modify: `src/lib/sideMenuPages/NodeSettingsPage.svelte:4,105`

- [ ] **Step 1: Swap the icon import**

In `src/lib/sideMenuPages/NodeSettingsPage.svelte`, replace the `CurrencyCircleDollarIcon` import with `CoinsIcon`:

```svelte
<script lang="ts">
    import {
        ArrowUpIcon,
        CoinsIcon,
        GraphIcon,
        TagIcon,
        MedalIcon,
        SparkleIcon,
    } from "phosphor-svelte";
```

And on line 105, replace the icon prop:

```svelte
            icon={CoinsIcon as unknown as Component}
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: 0 errors, 0 warnings

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass (the existing `ignoreTechCrystalBudgetStore.test.ts` does not assert the icon name)

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/NodeSettingsPage.svelte
git commit -m "fix: swap budget toggle icon from CurrencyCircleDollarIcon to CoinsIcon"
```

---

### Task 2: Stacked toast layout (markup)

**Files:**
- Modify: `src/lib/Toasts.svelte:54-100`

- [ ] **Step 1: Restructure the toast markup for stacked layout**

Replace the template section (lines 54–100) in `src/lib/Toasts.svelte`. The key changes:
- Add `class:toast--has-action={toast.action}` to the toast container
- Conditionally omit `role="button"` and `tabindex="0"` when toast has an action
- Gate click/keydown handlers with `if (toast.action) return;`
- Wrap icon + spinner + message in a `.toast__row` div
- Move the action button into its own `.toast__action-row` div

```svelte
        {#each $toastStore as toast (toast.id)}
            <div
                class="toast toast--{toast.tone}"
                class:toast--permanent={toast.durationMs === 0}
                class:toast--has-action={toast.action}
                style="--toast-duration: {toast.durationMs}ms"
                role={toast.action ? undefined : "button"}
                tabindex={toast.action ? undefined : 0}
                out:fly={{ y: 8, duration: 150 }}
                on:click={() => {
                    if (toast.action) return;
                    triggerHaptic();
                    dismissToast(toast.id);
                }}
                on:keydown={(event) => {
                    if (toast.action) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        dismissToast(toast.id);
                    }
                }}
            >
                <div class="toast__row">
                    {#if toast.showIcon}
                        <span class="toast__icon" aria-hidden="true">
                            {#if toast.tone === "negative"}
                                <WarningCircleIcon size={20} weight="fill" />
                            {:else}
                                <CheckCircleIcon size={20} weight="fill" />
                            {/if}
                        </span>
                    {/if}
                    {#if toast.showSpinner}
                        <Spinner
                            tone={toast.tone === "negative"
                                ? "negative"
                                : "default"}
                        />
                    {/if}
                    <span class="toast__message">{toast.message}</span>
                </div>
                {#if toast.action}
                    <div class="toast__action-row">
                        <button
                            class="toast__action"
                            on:click|stopPropagation={() => {
                                triggerHaptic();
                                toast.action?.onClick();
                                dismissToast(toast.id);
                            }}
                        >
                            {toast.action.label}
                        </button>
                    </div>
                {/if}
            </div>
        {/each}
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: 0 errors (the `role` and `tabindex` conditionals use `undefined` which Svelte handles as attribute removal)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass. The existing `toastSpinnerApi.test.ts` regex assertions still match because `{#if toast.showIcon}`, `{#if toast.showSpinner}`, `<Spinner`, and the tone prop are all preserved.

- [ ] **Step 4: Commit**

```bash
git add src/lib/Toasts.svelte
git commit -m "refactor: stacked toast layout with conditional dismiss for action toasts"
```

---

### Task 3: Pill button + layout CSS

**Files:**
- Modify: `src/lib/Toasts.svelte:105-223` (style block)

- [ ] **Step 1: Replace the CSS styles**

Replace the entire `<style>` block in `src/lib/Toasts.svelte` with the updated styles. Changes:
- `.toast` loses `cursor: pointer` (moved to non-action toasts only via `:not(.toast--has-action)`)
- Add `.toast--has-action` with `flex-direction: column; align-items: stretch`
- Add `.toast__row` flex row for icon + message
- Add `.toast__action-row` for right-aligned action
- Replace `.toast__action` text-only styles with outlined pill button
- Update `.toast--negative .toast__action` to use `--danger-text` with `color-mix()`
- Update hover/active states

```css
<style>
    .toast-region {
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(
            (var(--bar-pad, 0px) + var(--tab-height, 0px)) *
                (1 - var(--is-keyboard-open, 0)) + var(--spacing-lg) +
                var(--keyboard-height, 0px) + var(--safe-bottom, 0px)
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-lg);
        z-index: var(--z-index-toast);
        pointer-events: none;
        transition: bottom 0.2s ease;
    }

    .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg) calc(var(--spacing-lg) + var(--spacing-md));
        max-width: min(
            calc(
                100vw - 2 * var(--bar-pad) - var(--safe-left, 0px) -
                    var(--safe-right, 0px)
            ),
            400px
        );
        width: fit-content;
        border-radius: var(--radius);
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border-subtle);
        box-shadow: var(--shadow);
        color: var(--text-muted);
        font-size: var(--font-lg);
        font-weight: var(--weight-bold);
        line-height: var(--leading);
        animation: toast-enter 0.25s cubic-bezier(0.05, 0.7, 0.1, 1) both;
        overflow: hidden;
        position: relative;
    }

    .toast:not(.toast--has-action) {
        cursor: pointer;
    }

    .toast--has-action {
        flex-direction: column;
        align-items: stretch;
        padding-bottom: var(--spacing-md);
    }

    .toast--negative {
        background: var(--danger-bg);
        border-color: var(--danger-border);
        color: var(--danger-text);
        animation-name: toast-enter-negative;
        animation-duration: 0.2s;
    }

    .toast::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: color-mix(in srgb, var(--accent) 50%, var(--border-subtle));
        transform-origin: left;
        animation: toast-progress var(--toast-duration, 3s) linear forwards;
    }

    .toast--negative::after {
        background: var(--danger-border);
    }

    .toast--permanent::after {
        display: none;
    }

    .toast__row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
    }

    .toast__icon {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        color: var(--accent);
    }

    .toast--negative .toast__icon {
        color: var(--danger-text);
    }

    .toast__message {
        flex: 1;
    }

    .toast__action-row {
        display: flex;
        justify-content: flex-end;
        padding: var(--spacing-xs) var(--spacing-sm) 0 0;
    }

    .toast__action {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-md) var(--spacing-lg);
        min-height: 36px;
        border-radius: 999px;
        font-size: var(--font-sm);
        font-weight: var(--weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
        transition: opacity 0.15s, transform 0.15s;
        color: var(--accent);
        border: var(--border-width) solid
            color-mix(in srgb, var(--accent) 30%, transparent);
        background: color-mix(in srgb, var(--accent) 8%, transparent);
    }

    .toast--negative .toast__action {
        color: var(--danger-text);
        border-color: color-mix(
            in srgb,
            var(--danger-text) 30%,
            transparent
        );
        background: color-mix(in srgb, var(--danger-text) 8%, transparent);
    }

    @media (hover: hover) {
        .toast__action:hover {
            opacity: 0.85;
        }
    }

    .toast__action:active {
        opacity: 0.65;
        transform: scale(0.96);
    }
</style>
```

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/lib/Toasts.svelte
git commit -m "style: pill button + stacked layout CSS for toast actions"
```

---

### Task 4: Source-level test assertions

**Files:**
- Create: `test/toastActionRedesign.test.ts`
- Modify: `test/index.ts`

- [ ] **Step 1: Write source-level test assertions**

Create `test/toastActionRedesign.test.ts` with regex assertions that verify the key structural changes in the Toasts.svelte source:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const toastsSource = readFileSync(
    resolve("src/lib/Toasts.svelte"),
    "utf8",
);

console.log("  toastActionRedesign");

// --- Stacked layout class is applied when toast has action ---
if (!/class:toast--has-action=\{toast\.action\}/.test(toastsSource)) {
    throw new Error(
        "Toast should apply toast--has-action class when toast.action exists.",
    );
}
console.log("    \u2713 applies toast--has-action class conditionally");

// --- Message content wrapped in toast__row ---
if (!/class="toast__row"/.test(toastsSource)) {
    throw new Error("Toast should wrap icon + message in a toast__row div.");
}
console.log("    \u2713 wraps icon + message in toast__row");

// --- Action button wrapped in toast__action-row ---
if (!/class="toast__action-row"/.test(toastsSource)) {
    throw new Error(
        "Toast action button should be in its own toast__action-row div.",
    );
}
console.log("    \u2713 action button in toast__action-row");

// --- Pill button uses border-radius: 999px ---
if (!/border-radius:\s*999px/.test(toastsSource)) {
    throw new Error("Toast action should use pill border-radius (999px).");
}
console.log("    \u2713 pill button border-radius");

// --- Action button uses color-mix for border ---
if (!/\.toast__action[\s\S]*?border:.*color-mix/.test(toastsSource)) {
    throw new Error(
        "Toast action should use color-mix() for border color.",
    );
}
console.log("    \u2713 action button uses color-mix for border");

// --- Tap-to-dismiss gated for action toasts ---
if (!/if \(toast\.action\) return/.test(toastsSource)) {
    throw new Error(
        "Toast click handler should early-return when toast has an action.",
    );
}
console.log("    \u2713 tap-to-dismiss gated for action toasts");

// --- role="button" conditionally omitted ---
if (!/role=\{toast\.action \? undefined : "button"\}/.test(toastsSource)) {
    throw new Error(
        'Toast should conditionally omit role="button" for action toasts.',
    );
}
console.log("    \u2713 role conditionally omitted for action toasts");

// --- NodeSettingsPage uses CoinsIcon ---
const nodeSettingsSource = readFileSync(
    resolve("src/lib/sideMenuPages/NodeSettingsPage.svelte"),
    "utf8",
);

if (!/CoinsIcon/.test(nodeSettingsSource)) {
    throw new Error(
        "NodeSettingsPage should use CoinsIcon for budget toggle.",
    );
}
if (/CurrencyCircleDollarIcon/.test(nodeSettingsSource)) {
    throw new Error(
        "NodeSettingsPage should not use CurrencyCircleDollarIcon anymore.",
    );
}
console.log("    \u2713 NodeSettingsPage uses CoinsIcon");

console.log("  \u2713 toastActionRedesign\n");
```

- [ ] **Step 2: Register the test in test/index.ts**

Add `"toastActionRedesign.test.ts"` to the `TEST_FILES` array in `test/index.ts`, right after `"toastSpinnerApi.test.ts"` on line 118 (both are toast-related):

```ts
    "toastSpinnerApi.test.ts",
    "toastActionRedesign.test.ts",
    "onboardingPaneLayout.test.ts",
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass (including the new 8 assertions)

- [ ] **Step 4: Commit**

```bash
git add test/toastActionRedesign.test.ts test/index.ts
git commit -m "test: add source-level assertions for toast action redesign"
```
