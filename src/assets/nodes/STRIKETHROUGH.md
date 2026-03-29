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

The mask `x/y/width/height` should match the SVG's `viewBox` values.

Both `<line>` elements (mask and visible) use the **same endpoints** — only `stroke-width` differs.

## Checklist for New Ignore/Resistance Icons

1. Copy the base icon's SVG content (path data, viewBox)
2. Add the `<script module>` and `<script>` blocks for unique mask IDs
3. Wrap the base icon's path with `mask={...}`
4. Add the mask `<defs>` block with the black line at `stroke-width="60"`
5. Add the visible line at `stroke-width="20"`
6. Position endpoints (`x1,y1,x2,y2`) so tips just extend past the icon boundary
7. Verify both ends of the `\` extend equally past the icon
