# Strikethrough Pattern for "Ignore" and "Resistance" Icons

How to add a diagonal strikethrough to any node icon to create its "ignore" or "resistance" variant.

## Direction

Top-left to bottom-right (`\` diagonal). All ignore/resistance icons use this same direction for consistency.

## Line Dimensions

| Property | Value | Rationale |
|----------|-------|-----------|
| Visible line width | `20` | Matches the base icon's stroke/arm weight |
| Mask line width | `60` | Creates 20px gap on each side of the visible line (20 + 20 + 20) |
| Gap around line | `20` per side | Matches the gap between strokes in the base icon |

The gap around the strikethrough should always equal the gap between strokes/arms in the base icon. Formula:

```
mask-width = line-width + (2 × gap)
```

## Line Length

The endpoints should sit just outside the base icon's content boundary, so only the very tips extend beyond the icon shape. The line should NOT span the full viewBox — it cuts through the icon, not past it.

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
                  stroke="black" stroke-width="60" stroke-linecap="round" />
        </mask>
    </defs>

    <!-- Base icon with mask applied (gap cut out) -->
    <path fill="currentColor" mask={`url(#${maskId})`} d="..." />

    <!-- Visible strikethrough line on top -->
    <line x1="X1" y1="Y1" x2="X2" y2="Y2"
          fill="none" stroke="currentColor" stroke-width="20"
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
                  stroke="black" stroke-width="60" stroke-linecap="round" />
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
          fill="none" stroke="currentColor" stroke-width="20"
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
6. Add the mask `<defs>` block with the black line at `stroke-width="60"`
7. Add the visible line at `stroke-width="20"`
8. Position endpoints (`x1,y1,x2,y2`) so tips just extend past the icon boundary
9. Verify both ends of the `\` extend equally past the icon
