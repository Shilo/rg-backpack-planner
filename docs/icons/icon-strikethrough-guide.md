# Icon Strikethrough Guide

How to add a diagonal strikethrough to any node icon to create its "ignore" or "resistance" variant.

## Direction

Top-left to bottom-right (`\` diagonal) at **45 degrees**. All ignore/resistance icons use this same direction and angle for consistency.

## Visual Consistency Across Icons

Icons have different viewBox sizes, but render at the same display size via `preserveAspectRatio="xMidYMid meet"`. Stroke widths and line positions must be **scaled per-icon** so the strikethrough looks identical across all icons.

### Reference baseline

IgnoreStun (viewBox 196-unit) is the reference. Its values:

| Property | Value | Visual size |
|----------|-------|-------------|
| Visible line width | `20` | 10.2% of container |
| Mask line width | `60` | 30.6% of container |
| Gap per side | `20` | 10.2% of container |

### Scaling formula

For an icon with scale factor `S/D` where `D = max(viewBox width, viewBox height)`:

```
visible_stroke = round(20 × D / 196)
mask_stroke    = 3 × visible_stroke
```

The mask:visible ratio is always **3:1** (gap on each side equals the visible line width).

### Line position

The line spans **7% to 93%** of the rendered container in both axes, centered on the icon. Convert container-space coordinates back to viewBox coordinates accounting for `xMidYMid meet` scaling and offset:

```
scale = min(container_size / vb_width, container_size / vb_height)
offset_x = (container_size - vb_width × scale) / 2
offset_y = (container_size - vb_height × scale) / 2

vb_x = vb_origin_x + (container_pos - offset_x) / scale
vb_y = vb_origin_y + (container_pos - offset_y) / scale
```

Ensure `Δx = Δy` (45 degrees). Line endpoints may extend outside the viewBox for narrow/tall icons — SVG clips naturally.

### Current icon values

| Icon | ViewBox | Scale (D) | Visible | Mask | Line |
|------|---------|-----------|---------|------|------|
| IgnoreStun | 30 30 196 196 | 196 | 20 | 60 | (44,44)→(212,212) |
| IgnoreDodge | 0 0 411 400 | 411 | 42 | 126 | (29,23)→(382,376) |
| PierceResistance | 0 0 372 465 | 465 | 48 | 144 | (-14,33)→(386,433) |
| SkillCritResistance | 0 0 392 396 | 396 | 40 | 120 | (26,28)→(366,368) |

## Mask Technique

The strikethrough uses an SVG mask to cleanly cut through the base icon, then draws the visible line on top. This creates a clear gap between the icon and the line rather than overlapping.

### Unique Mask IDs

Each component needs a unique mask ID to avoid conflicts when multiple instances render on the same page:

```svelte
<script module lang="ts">
    let nextMaskId = 0;
</script>

<script lang="ts">
    const maskId = `ignore-SKILLNAME-mask-${++nextMaskId}`;
</script>
```

### Structure

There are two cases depending on whether the base icon uses a `<g>` wrapper with a `transform`.

#### Case A: Base icon is a `<path>` (no `<g>` transform)

Apply the mask directly to the `<path>`:

```svelte
<svg viewBox="..." preserveAspectRatio="xMidYMid meet" {...props}>
    <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse"
              x="VB_X" y="VB_Y" width="VB_W" height="VB_H">
            <!-- White rect = show everything -->
            <rect x="VB_X" y="VB_Y" width="VB_W" height="VB_H" fill="white" />
            <!-- Black line = hide the strikethrough area from the base icon -->
            <line x1="X1" y1="Y1" x2="X2" y2="Y2"
                  stroke="black" stroke-width="MASK_WIDTH" stroke-linecap="round" />
        </mask>
    </defs>

    <!-- Base icon with mask applied (gap cut out) -->
    <path fill="currentColor" mask={`url(#${maskId})`} d="..." />

    <!-- Visible strikethrough line on top -->
    <line x1="X1" y1="Y1" x2="X2" y2="Y2"
          fill="none" stroke="currentColor" stroke-width="VISIBLE_WIDTH"
          stroke-linecap="round" />
</svg>
```

#### Case B: Base icon uses `<g transform="...">` wrapper

**CRITICAL:** Never put the mask on the `<g>` that has the `transform`. The mask coordinates are in viewBox space, but the transform creates a different coordinate space — the mask region becomes a tiny sliver and hides the entire icon.

Instead, wrap the transformed `<g>` in an **outer `<g>`** that carries the mask:

```svelte
<svg viewBox="..." preserveAspectRatio="xMidYMid meet" {...props}>
    <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse"
              x="VB_X" y="VB_Y" width="VB_W" height="VB_H">
            <rect x="VB_X" y="VB_Y" width="VB_W" height="VB_H" fill="white" />
            <line x1="X1" y1="Y1" x2="X2" y2="Y2"
                  stroke="black" stroke-width="MASK_WIDTH" stroke-linecap="round" />
        </mask>
    </defs>

    <!-- Outer g = mask in viewBox space, inner g = transform -->
    <g mask={`url(#${maskId})`}>
        <g transform="..." fill="currentColor" stroke="none">
            <path d="..." />
        </g>
    </g>

    <!-- Visible strikethrough line on top -->
    <line x1="X1" y1="Y1" x2="X2" y2="Y2"
          fill="none" stroke="currentColor" stroke-width="VISIBLE_WIDTH"
          stroke-linecap="round" />
</svg>
```

### How to tell which case

Look at the base icon's SVG content:
- If the `<path>` elements sit directly inside `<svg>` with no wrapping `<g transform>` → **Case A**
- If the paths are inside `<g transform="translate(...) scale(...)">` → **Case B**

Most icons exported from design tools use Case B with a `scale(0.1, -0.1)` transform.

### General rules

The mask `x/y/width/height` should match the SVG's `viewBox` values.

Both `<line>` elements (mask and visible) use the **same endpoints** — only `stroke-width` differs.

## Checklist for New Ignore/Resistance Icons

1. Copy the base icon's SVG content (path data, viewBox, transform) exactly
2. Add the `<script module>` and `<script>` blocks for unique mask IDs
3. Check if the base icon uses `<g transform="...">` (Case A vs Case B)
4. Apply the mask — on the `<path>` for Case A, on an **outer** `<g>` wrapper for Case B
5. **Never** put `mask={...}` on the same `<g>` that has `transform`
6. Compute stroke widths using the scaling formula (`visible = round(20 × D / 196)`, `mask = 3 × visible`)
7. Compute line endpoints by mapping 7%→93% container position back to viewBox coordinates
8. Ensure `Δx = Δy` for exact 45-degree angle
9. Verify both ends of the `\` extend equally past the icon
10. Compare visually against existing strikethrough icons at rendered size
