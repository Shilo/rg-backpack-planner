# Design Critique: Backpack Planner

**Date:** 2026-03-13

---

## Anti-Patterns Verdict

**Pass.** This does not read as AI-generated work. The interface has a clear purpose-built identity — it's a game tool, not a generic dashboard. No gradient text, no hero metrics, no identical card grids, no glassmorphism abuse, no sparkline decoration. The OKLCH color engine, custom hexagonal node shapes, and game-specific iconography (Guardian/Vanguard/Cannon class icons, tech crystal currency) give it genuine personality that couldn't be mistaken for a template.

**One tell to watch:** The default theme is cyan-on-dark — the single most common AI color choice. The app allows customization (rose, amber, blue, green, neutral, custom), but the first impression on launch is the one that matters most. Cyan-on-dark is the "I didn't make a design decision" palette. The rest of the design is strong enough that this default undermines it.

## Overall Impression

This is a **confident, well-engineered tool** with a mature component system, thoughtful accessibility, and genuine design care. The OKLCH theming is rare in production apps and shows real ambition. The motion design is restrained and purposeful. The i18n support (EN/JA/ZH) with CJK considerations shows professionalism.

The single biggest opportunity: **the Side Menu experience is doing too much.** It's simultaneously a settings panel, a statistics dashboard, a controls reference guide, and an about page. The information density is high but the visual differentiation between sections is low — everything is the same text-muted-on-bg-raised pattern.

## What's Working

1. **The node system is excellent.** Circular nodes with hexagonal leaf nodes, region-colored badges, tier stars, crown icons for maxed state, skill icons filling the node — this is rich, purposeful visual communication. The `color-contrast()` CSS function for badge readability is a standout detail. The node states (locked → available → active → maxed) use brightness filters and color shifts that create a clear visual progression without being noisy.

2. **Motion design is mature.** Exponential easing (`cubic-bezier(0.05, 0.7, 0.1, 1)` for decel), staggered side-menu item entrances with cascading delays (15ms → 115ms), toast enter animations with overshoot (`scale(1.02)`), and a progress bar that drains as the toast expires. All motion respects `prefers-reduced-motion`. This is production-quality motion work.

3. **The OKLCH color system is genuinely impressive.** Dynamic theme generation from hue/chroma, perceptual uniformity across surfaces, chroma capping for AMOLED safety, colorblind-mode hue rotation rather than desaturation, harmonized danger/success colors tinted toward the theme — this is far beyond what most apps attempt.

## Priority Issues

### 1. Default theme sends the wrong signal

- **What**: Cyan accent on dark background is the default. It's the single most overused AI-era color palette.
- **Why it matters**: First impressions define perception. Users who don't customize themes see the most generic possible color choice, which contradicts the craftsmanship everywhere else.
- **Fix**: Default to amber or rose — warm hues that feel more "game" and less "AI dashboard." Or lean into the game's identity: if Run! Goddess has brand colors, use them.
- **Command**: `/colorize`

### 2. Side menu sections lack visual differentiation

- **What**: Statistics, Settings, and Controls tabs all render as the same pattern: `SideMenuSection` title → list of rows with icon + label + description. Every row uses `--text-muted` descriptions under `--text` labels on `--bg-raised`. The About page, Node settings, Appearance settings, and General settings sub-pages use the same visual weight.
- **Why it matters**: When everything looks the same, nothing stands out. Users scanning the settings panel can't quickly find what they want because there's no visual landmark differentiating "Build Presets" from "Font Size" from "Haptic Feedback." Cognitive load is high for a dense side panel.
- **Fix**: Vary the visual weight of sections. Group related settings into cards with distinct surface treatments. Use the accent color or region colors to create visual landmarks for high-priority actions (Share, Reset, Presets). The Controls page could use a more compact layout — icon grids rather than verbose list items.
- **Command**: `/distill`

### 3. Typography is safe to a fault

- **What**: Inter + system fallback stack. Font sizes range from 0.6rem to 1.1rem — a narrow band. Everything reads at a similar visual weight. The type hierarchy relies almost entirely on bold weight and slightly larger font-size rather than style variation.
- **Why it matters**: The narrow type scale means the visual hierarchy between "section heading" and "body text" is barely perceptible, especially in the side menu where `--font-base` (0.9rem) and `--font-sm` (0.8rem) are only 0.1rem apart.
- **Fix**: Widen the type scale. Section headings should be meaningfully larger than body text. Consider using `--font-lg` or even a larger size for section titles. The 0.1rem difference between base and small is too subtle. For a game tool with CJK support, the system font choice is defensible — but the hierarchy needs more contrast.
- **Command**: `/bolder`

### 4. The Controls page is a wall of text

- **What**: `SideMenuControlsPage.svelte` renders 12+ control items as a dense list with icon + label + description, repeated across Touch, Mouse, Keyboard, and HUD sections. Each section looks identical.
- **Why it matters**: This is reference documentation, not an interface. Users need to find one specific control quickly, but they're presented with a sequential scroll through 30+ items. The visual monotony makes scanning impossible.
- **Fix**: Use a more compact reference format — two-column key-value pairs, or icon-only with label (description on hover/tap). Group by action type (navigate, interact, view) instead of input device. Consider making this an accordion or searchable.
- **Command**: `/distill`

### 5. Toast notifications lack personality

- **What**: Toasts are `--bg-raised` boxes with bold text and a thin progress bar. Positive and negative toasts differ only in color (success vs danger). There's no icon, no animation differentiation.
- **Why it matters**: Toasts are one of the few moments where the interface "talks back" to the user. A reset confirmation, a successful share, and an error all feel the same — they're just colored boxes. These moments are opportunities for the interface to have personality.
- **Fix**: Add a small icon (checkmark, warning, info) to toasts. Give negative toasts a slightly different entrance animation (faster, more abrupt) to match their urgency. The progress bar is a nice touch — lean into it.
- **Command**: `/delight`

## Minor Observations

- The side menu backdrop uses `backdrop-filter: blur(8px)`. This is a glassmorphism pattern, but here it's functional (dimming the tree canvas behind the panel), not decorative. It's fine.
- Button `:active` state uses `scale(0.96)` — good tactile feel, well-calibrated.
- The `brightness(1.2)` hover filter is a blunt instrument. On some theme colors, this can wash out or blow out. Consider `color-mix` with a highlight color instead.
- `tabular-nums` on node badges for numerical alignment — excellent detail.
- The fullscreen button in the tab bar feels orphaned. It's visually identical to the menu button but serves a very different purpose. Most users won't discover it.
- Scrollbar styling with accent-mixed color is a nice touch for dark mode cohesion.

## Questions to Consider

- **"What if the default theme reflected the game's identity?"** Run! Goddess presumably has a visual identity — colors, energy, style. The planner tool should feel like an extension of the game, not a neutral utility.
- **"Does the Controls tab earn its space as a primary navigation destination?"** It's reference material that most users consult once. Could it be a collapsible section within Settings instead, freeing the tab for something more actionable?
- **"What would a more confident version of the side menu look like?"** Right now it's uniform and safe. What if the Statistics page used data visualization instead of just numbers? What if Build Presets were visually prominent rather than buried in a button?
- **"Is the tree canvas background intentionally empty?"** The subtle radial gradient is nice, but the vast dark space between nodes could carry more atmosphere — faint grid lines, subtle particle effect, or branch connection glow that reinforces the "tech tree" metaphor.
