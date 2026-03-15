# Root Node Gear Shape Design

**Date:** 2026-03-14
**Status:** Approved

## Goal

Replace the current root node (32px transparent button + floating GearSix icon) with a gear-shaped button that feels like a real tree node — same visual language as hex leaf nodes: solid fill, visible border outline following the gear silhouette, and a drop shadow.

## Shape

A 6-tooth angular gear defined as a 24-point percentage-based CSS polygon stored in `--gear-clip`. No center hole — entirely solid. Outer radius ~45%, inner radius ~32% of the bounding box.

The polygon alternates 4 points per tooth (inner-approach, outer-leading, outer-trailing, inner-departure), totalling 24 points for 6 teeth.

```
--gear-clip: polygon(
  79.67% 38.01%, 94.32% 42.19%, 94.32% 57.81%, 79.67% 61.99%,
  75.22% 69.70%, 78.93% 84.47%, 65.39% 92.29%, 54.45% 81.69%,
  45.55% 81.69%, 34.61% 92.29%, 21.07% 84.47%, 24.78% 69.70%,
  20.33% 61.99%,  5.68% 57.81%,  5.68% 42.19%, 20.33% 38.01%,
  24.78% 30.30%, 21.07% 15.53%, 34.61%  7.71%, 45.55% 18.31%,
  54.45% 18.31%, 65.39%  7.71%, 78.93% 15.53%, 75.22% 30.30%
);
```

## Size

`ROOT_SIZE = 44` (up from 32). This constant is local to `RootNode.svelte` and used only to set the `width`/`height` inline style on `root-wrapper`. No other file imports it.

## Styling

Mirrors hex leaf nodes (`node-hexagon`) exactly:

| Property | Value | Notes |
|---|---|---|
| `clip-path` | `var(--gear-clip)` | On the button element itself — constrains pointer events to gear shape |
| `position` | `relative` | Required for absolutely-positioned pseudo-elements |
| `overflow` | `visible` | Required — drop-shadow extends beyond clip bounds |
| `isolation` | `isolate` | Prevents filter bleed onto neighbouring elements |
| `background` | `transparent` | Button bg is transparent; fill comes from `::after` |
| `border` | `none` | No rectangular border — shape border comes from `::before` |
| `box-shadow` | `none` | Shadow comes from `filter: drop-shadow()` |
| `filter` (resting) | `drop-shadow(var(--shadow-node-hex))` | Same shadow token as hex nodes |
| `filter` (hover) | `var(--brightness-hover)` | Replaces the drop-shadow entirely on hover — identical to hex node hover pattern |
| `filter` (active) | `var(--brightness-hover)` + `transform: scale(0.96)` | Same as other nodes |
| Focus outline | `outline: none` | Intentional — same as all tree nodes |

CSS custom properties defined on the `.root-node-gear` rule:

```css
--gear-fill: var(--surface);          /* neutral surface fill */
--gear-border-color: var(--border);   /* neutral outline — not a region accent */
--gear-border-width: 2px;             /* slightly thinner than hex (3px) */
```

Border effect via two pseudo-elements:
- `::before`: `inset: 0`, `clip-path: var(--gear-clip)`, `background: var(--gear-border-color)` — border layer
- `::after`: `inset: var(--gear-border-width)`, `clip-path: var(--gear-clip)`, `background: var(--gear-fill)` — fill layer

Because `--gear-clip` uses percentage coordinates, the `inset` on `::after` shrinks the element's box and the percentage polygon rescales proportionally. This produces a visually acceptable border approximation (teeth tips shrink ~4.5% at 2px/44px — imperceptible in practice), identical in mechanism to `--hex-clip`.

## Structure

**Current accessibility problem:** `root-wrapper` div has `role="button"`, `tabindex="0"`, and `aria-label` while containing a `<Button>` (`<button>`) — nested interactive elements.

**New structure:**

```html
<div class="root-wrapper" style="...">
    <button
        class="root-node-gear"
        data-node-id="root"
        tabindex="0"
        aria-label={$t("quickSettings.ariaLabel")}
        on:keydown={handleKeydown}
    ></button>
</div>
```

Key decisions:
- `root-wrapper` becomes a plain positioning div — remove `role`, `tabindex`, `aria-label`, `on:keydown`, `data-node-id` from it.
- `data-node-id="root"` moves to the `<button>` — Tree.svelte's canvas pointer handler uses `target.closest("[data-node-id]")` and then checks if the returned attribute equals `"root"`, so moving the attribute to the button is compatible.
- **No `on:click` handler needed on the button.** Mouse clicks bubble to Tree.svelte's canvas-level pointer handler, which already calls `onRootNodeClick` and `triggerHaptic()`. Adding a click handler here would double-fire both.
- `on:keydown` moves from wrapper to button with identical logic (calls `onRootNodeClick` with center coords from `getBoundingClientRect()`, or `onFocusView` fallback + `triggerHaptic()` when `onRootNodeClick` is null).

**Remove:** `Button` component import, `GearSix` icon import (gear shape is pure CSS).

**Add:** `triggerHaptic` import from `./hapticsStore` (used by the keyboard handler only).

## Files Changed

### `src/lib/RootNode.svelte`
Full rework of markup and styles; `ROOT_SIZE` updated to 44.

### `src/lib/buildImageExport/captureStyles.css`
Add a pin for `--gear-border-width` to ensure the `::after` inset survives snapdom's DOM cloning (same issue as `--hex-border-width` pinned on `.node-wrapper`):

```css
html.snapdom-capture .root-node-gear {
    --gear-border-width: 2px !important;
}
```

## Out of Scope

- No changes to `RootNodeQuickSettings.svelte`, `Tree.svelte`, or `TreeTabs.svelte`
- No i18n changes (aria-label key unchanged)
- No new shadow tokens (reuse `--shadow-node-hex`)
