# Toast Action Button Redesign + Icon Fix

## Problem

The toast action button (added for budget enforcement) has three UX issues:

1. **Indistinguishable from text** — The action is styled as uppercase colored text with no border or background, so users can't tell it's a button.
2. **Squishes the message** — The action label (`IGNORE BUDGET`) sits inline with `flex-shrink: 0` and `white-space: nowrap`, stealing horizontal space from the message.
3. **Misclick dismissal** — Tapping anywhere on the toast dismisses it. If a user reaches for the action but misses, the toast vanishes and they don't know if they hit the button.

Additionally, the `CurrencyCircleDollarIcon` on the "Ignore Tech Crystal Budget" toggle doesn't fit the game context.

## Changes

### 1. Icon swap

Replace `CurrencyCircleDollarIcon` with `CoinsIcon` (from phosphor-svelte) on the "Ignore Tech Crystal Budget" toggle in NodeSettingsPage.svelte. Coins reads as "budget/spending" — the toggle controls a budget behavior, not the crystal resource itself.

### 2. Stacked toast layout when action is present

When a toast has an `action`, switch from a single-row flex layout to a two-row stacked layout:

- **Row 1:** Icon + message (full width, no competition for space)
- **Row 2:** Action button, right-aligned

Regular toasts (no action) keep the current single-row layout unchanged.

**Layout structure:**
```
┌─────────────────────────────────┐
│ [icon]  Message text here       │
│                    [ ACTION ]   │
│▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░│ ← progress bar
└─────────────────────────────────┘
```

**CSS changes to Toasts.svelte:**

The `.toast` container gains a conditional class `.toast--has-action` when `toast.action` exists. This class switches the layout:

```css
.toast--has-action {
    flex-direction: column;
    align-items: stretch;
    padding-bottom: var(--spacing-md);
}
```

The message row (icon + text) keeps the existing flex row layout via a new `.toast__row` wrapper:

```css
.toast__row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}
```

The action button moves to its own row, right-aligned:

```css
.toast__action-row {
    display: flex;
    justify-content: flex-end;
    padding: var(--spacing-xs) var(--spacing-sm) 0 0;
}
```

### 3. Action button: outlined pill

Replace the text-only action with a visible outlined pill button.

**Styling:**

```css
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
    /* Default (positive) tone */
    color: var(--accent);
    border: var(--border-width) solid color-mix(in srgb, var(--accent) 30%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.toast--negative .toast__action {
    color: var(--danger-text);
    border-color: color-mix(in srgb, var(--danger-text) 30%, transparent);
    background: color-mix(in srgb, var(--danger-text) 8%, transparent);
}
```

**Interaction states:**

```css
@media (hover: hover) {
    .toast__action:hover {
        opacity: 0.85;
    }
}

.toast__action:active {
    opacity: 0.65;
    transform: scale(0.96);
}
```

The `padding: var(--spacing-md) var(--spacing-lg)` (8px 12px) with `min-height: 36px` gives a generous tap target.

### 4. Disable tap-to-dismiss on action toasts

When a toast has an `action`, the toast body click/keydown handlers become no-ops. The toast only dismisses via:

- **Timer** — the progress bar auto-dismiss (unchanged)
- **Action button click** — fires the callback, then dismisses

Regular toasts (no `action`) keep the current behavior: tap anywhere to dismiss.

**Implementation in Toasts.svelte:**

The existing `on:click` and `on:keydown` handlers on the toast `div` are conditionally gated:

```svelte
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
```

The `role="button"`, `tabindex="0"`, and `cursor: pointer` are conditionally omitted from the DOM when the toast has an action (the toast body is no longer an interactive surface — only the action button is):

```css
.toast--has-action {
    cursor: default;
}
```

The action button itself retains its existing behavior: `on:click|stopPropagation` fires the callback + dismisses + triggers haptic.

## Files changed

- **`src/lib/Toasts.svelte`** — Stacked layout, pill button styling, conditional dismiss behavior
- **`src/lib/sideMenuPages/NodeSettingsPage.svelte`** — Icon swap (`CurrencyCircleDollarIcon` → `CoinsIcon`)

## No new theme tokens

All button colors derive from existing tokens using `color-mix()`:
- Positive tone: `--accent` at 30% (border) and 8% (background)
- Negative tone: `--danger-text` at 30% (border) and 8% (background)

This pattern is already used throughout the codebase (Spinner.svelte, OnboardingFooterNote.svelte, ActionSheet.svelte, etc.).

## No test changes

These are purely visual/interaction changes in Svelte components. The existing toast functional tests (showToast, dismissToast, action callback) remain valid. The budgetEnforcement.test.ts and ignoreTechCrystalBudgetStore.test.ts are unaffected.
