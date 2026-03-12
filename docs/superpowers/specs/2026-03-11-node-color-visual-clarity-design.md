# Node Color Visual Clarity — Design Spec

**Date:** 2026-03-11
**Branch:** `cursor/node-color-visual-clarity-15c6`
**File changed:** `src/lib/themeEngine.ts`

---

## Problem Statement

The Cursor AI branch attempted to improve tree node colors but introduced four critical bugs:

1. **Orange hue 18** — maps to red, not orange (too close to OKLCH hue 0 = red)
2. **Yellow hue 78** — moved *closer* to orange (was 95), opposite of the stated colorblind-safety goal
3. **Chroma 0.11 uniform** — too low; active/available/locked nodes were muddy and hard to distinguish
4. **Dark accent L=0.58** — below the system's `--accent-danger` anchor (0.62), making accents visually inconsistent

The requirements to meet:
- Reduce brightness/neon look, especially on mobile
- Use static CSS variable colors — no dynamic hue harmonization toward the theme source color
- Be red/green colorblind friendly: orange and yellow must be clearly distinct from each other and from red/green

---

## Design Decisions

### 1. Static Colors (No Harmonization)

Region hues are fixed constants. The `harmonize()` function, which was previously blending region hues toward the active theme's source hue, is not called for region palettes.

This ensures node colors look the same regardless of theme preset (cyan, blue, rose, amber, neutral). The theme only affects the app chrome (backgrounds, borders, accent, etc.), not the tree node regions.

### 2. Hue Selection

| Region | Hue | Reasoning |
|--------|-----|-----------|
| Orange | 38  | Solidly in warm-orange range; not reddish (hue 0=red, hue 38=clear orange) |
| Yellow | 95  | Amber/golden; 57° from orange — distinct for colorblind users |
| Blue   | 255 | Clean blue; clearly distinct from both warm colors |

OKLCH hue reference: 0=red, 30=red-orange, 38=orange, 95=amber-yellow, 255=blue.

Orange (38) and yellow (95) are 57° apart. This is sufficient for colorblind distinction since protanopia/deuteranopia (red-green colorblind) primarily confuse red with green, not orange with yellow. The palette avoids red and green entirely.

### 3. Chroma Values

Each region uses chroma 0.15–0.16 for accent colors. Background variants scale down via multipliers:
- `bg-available`: `c × 0.45` — subtle tint, dimmed by `brightness(0.65)` filter
- `bg-active`: `c × 0.55` — clearly colored
- `bg-maxed`: `c × 0.60` — slightly richer than active

Background chroma multipliers (dark mode — light mode uses lower values, e.g. `bg-available: c × 0.25`):

Higher chroma than the Cursor branch (0.11) makes the available state more distinguishable while staying comfortably below neon territory.

### 4. Lightness Anchors Aligned with System Tokens

Dark mode lightness values are chosen to align with the system's existing semantic token anchors, providing visual consistency between node colors and the rest of the UI:

| Variable | Lightness | System Token Reference |
|----------|-----------|----------------------|
| `accent` | 0.65 | Midpoint of `--accent-danger` (0.62) and `--accent-success` (0.70) |
| `bg-available` | 0.22 | `--surface` |
| `bg-active` | 0.30 | `≈ --bg-raised` (0.28) |
| `bg-maxed` | 0.38 | `≈ --border` (0.42) |
| `text` | 0.78 | `--text-muted` |
| `text-maxed` | 0.88 | `≈ --text` (0.93) |

Light mode anchors: accent 0.45, bg-available 0.92, bg-active 0.84, bg-maxed 0.76, text 0.28, text-maxed 0.20.

---

## Implementation

All changes are contained in one section of `src/lib/themeEngine.ts` — the `applyTheme()` function, region palette block:

```typescript
const regions: { name: string; hue: number; chroma: number }[] = [
    { name: "orange", hue: 38,  chroma: 0.16 }, // warm orange, clearly not red
    { name: "yellow", hue: 95,  chroma: 0.15 }, // amber/golden, 57° from orange
    { name: "blue",   hue: 255, chroma: 0.15 }, // clean blue
];

for (const region of regions) {
    const h = region.hue;
    const c = region.chroma;
    if (isDark) {
        vars[`--region-${region.name}-accent`]       = oklchToHex(0.65, c, h);
        vars[`--region-${region.name}-light`]        = oklchToHex(0.74, c, h);
        vars[`--region-${region.name}-bg-available`] = oklchToHex(0.22, c * 0.45, h);
        vars[`--region-${region.name}-bg-active`]    = oklchToHex(0.30, c * 0.55, h);
        vars[`--region-${region.name}-bg-maxed`]     = oklchToHex(0.38, c * 0.60, h);
        vars[`--region-${region.name}-text`]         = oklchToHex(0.78, c * 0.55, h);
        vars[`--region-${region.name}-text-maxed`]   = oklchToHex(0.88, c * 0.40, h);
    } else {
        vars[`--region-${region.name}-accent`]       = oklchToHex(0.45, c, h);
        vars[`--region-${region.name}-light`]        = oklchToHex(0.38, c, h);
        vars[`--region-${region.name}-bg-available`] = oklchToHex(0.92, c * 0.25, h);
        vars[`--region-${region.name}-bg-active`]    = oklchToHex(0.84, c * 0.35, h);
        vars[`--region-${region.name}-bg-maxed`]     = oklchToHex(0.76, c * 0.40, h);
        vars[`--region-${region.name}-text`]         = oklchToHex(0.28, c * 0.55, h);
        vars[`--region-${region.name}-text-maxed`]   = oklchToHex(0.20, c * 0.40, h);
    }
}
```

---

## Verification

Screenshots captured via `test/colorVisualReview.ui.ts` across 5 theme presets × 2 modes × 2 viewports = 20 screenshots.

Each screenshot shows all three node states simultaneously:
- **Locked** (16 nodes): gray, dimmed `brightness(0.7)`
- **Available** (5 nodes): subtly tinted, dimmed `brightness(0.65)`
- **Active** (9 nodes): fully colored

All 3 states confirmed visible in logged state counts: `{"locked":16,"available":5,"active":9,"maxed":0}`.

Screenshots saved to `test/output/color-review/`.
