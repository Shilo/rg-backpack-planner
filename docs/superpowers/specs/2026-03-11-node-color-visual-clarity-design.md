# Node Color Visual Clarity — Design Spec

**Date:** 2026-03-11
**Branch:** `cursor/node-color-visual-clarity-15c6`
**File changed:** `src/lib/themeEngine.ts`

---

## Problem Statement

The Cursor AI branch attempted to improve tree node colors but introduced four critical bugs:

1. **Orange hue 18** — maps to red, not orange (too close to OKLCH hue 0 = red)
2. **Yellow hue 78** — moved *closer* to orange (was 95), opposite of the stated colorblind-safety goal
3. **Dark accent L=0.58** — below the system's `--accent-danger` anchor (0.62), making accents visually inconsistent

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

OKLCH hue reference: 0=red, 20=red-orange, 38=orange, 95=amber-yellow, 105=yellow, 255=blue.

At low chroma (0.11–0.12), the 57° gap between orange and yellow may not be perceptible for colorblind users, especially on wide-gamut AMOLED displays that compress the warm color range. A dedicated colorblind setting (see §5) addresses this with shifted hues.

### 3. Chroma Values

Chroma is kept low (0.11–0.12) to avoid neon appearance on wide-gamut AMOLED Android displays. Modern Android phones use Display P3 or wider, and manufacturers often default to "Vivid" display modes that expand sRGB saturation. Colors that look muted on a calibrated desktop can look eye-bleeding on mobile. Keeping chroma ≤ 0.12 is a safe threshold.

Orange gets a slight bump (0.12 vs 0.11) since the hue correction to 38 is the primary distinction — a tiny chroma boost makes the orange feel present without going vivid.

Background variants scale down via multipliers:
- `bg-available`: `c × 0.45` — subtle tint, dimmed by `brightness(0.65)` filter
- `bg-active`: `c × 0.55` — clearly colored
- `bg-maxed`: `c × 0.60` — slightly richer than active

### 4. Dark Mode Lightness

Dark accent L=0.63 is the minimum to clear the `--accent-danger` anchor (0.62). All other dark mode lightness values match the Cursor branch to preserve softness:

| Variable | Lightness |
|----------|-----------|
| `accent` | 0.63 |
| `light` | 0.70 |
| `bg-available` | 0.22 |
| `bg-active` | 0.32 |
| `bg-maxed` | 0.40 |
| `text` | 0.75 |
| `text-maxed` | 0.85 |

Light mode anchors: accent 0.45, bg-available 0.92, bg-active 0.84, bg-maxed 0.76, text 0.28, text-maxed 0.20.

### 5. Colorblind Setting

At low chroma, both orange (hue 38) and yellow (hue 95) fall in the warm color range. On wide-gamut AMOLED displays (Pixel 8, Samsung Galaxy) with adaptive color profiles, these converge for colorblind users — the warm color bucket collapses, making orange and amber indistinguishable.

A **"Colorblind tree"** toggle in **Settings → Look and Feel** shifts both warm hues when enabled:

| Region | Default | Colorblind mode |
|--------|---------|-----------------|
| Orange | hue 38 (warm orange) | hue 20 (red-orange) |
| Yellow | hue 95 (amber) | hue 105 (cleaner yellow) |
| Blue   | hue 255 | hue 255 (unchanged) |

The shifted hues increase the perceptual gap (85° vs 57°) and move orange and yellow toward more distinct anchor points: reddish vs. greenish-yellow. Chroma and lightness are unchanged — no brightness increase.

Helps: protanopia, deuteranopia, and tritanopia.

Files changed: `src/lib/colorblindTreeColorsStore.ts` (new), `src/lib/themeEngine.ts` (parameter), `src/lib/themeApply.ts` (subscription), `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` (UI), `src/locales/*.json` (i18n).

---

## Implementation

All changes are contained in one section of `src/lib/themeEngine.ts` — the `applyTheme()` function, region palette block:

```typescript
const regions: { name: string; hue: number; chroma: number }[] = [
    { name: "orange", hue: 38,  chroma: 0.12 }, // warm orange, clearly not red
    { name: "yellow", hue: 95,  chroma: 0.11 }, // amber/golden, 57° from orange
    { name: "blue",   hue: 255, chroma: 0.11 }, // clean blue
];

for (const region of regions) {
    const h = region.hue;
    const c = region.chroma;
    if (isDark) {
        vars[`--region-${region.name}-accent`]       = oklchToHex(0.63, c, h);
        vars[`--region-${region.name}-light`]        = oklchToHex(0.70, c, h);
        vars[`--region-${region.name}-bg-available`] = oklchToHex(0.22, c * 0.45, h);
        vars[`--region-${region.name}-bg-active`]    = oklchToHex(0.32, c * 0.55, h);
        vars[`--region-${region.name}-bg-maxed`]     = oklchToHex(0.40, c * 0.60, h);
        vars[`--region-${region.name}-text`]         = oklchToHex(0.75, c * 0.55, h);
        vars[`--region-${region.name}-text-maxed`]   = oklchToHex(0.85, c * 0.40, h);
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
