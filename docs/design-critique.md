# Design Critique: Backpack Planner

**Date:** 2026-03-13

---

## Anti-Patterns Verdict

**Pass.** This does not look AI-generated. Here's the honest breakdown:

| AI Tell | Status | Notes |
|---------|--------|-------|
| Cyan-on-dark AI palette | Borderline | Sky blue (h:234) on dark is close, but justified by the game's own palette and backed by a full OKLCH engine — not a one-off hex color |
| Dark mode with glowing accents | Mitigated | Dark is default but the accent is restrained — no glows, no neon, no bloom |
| Gradient text | Clean | None anywhere |
| Glassmorphism | Clean | Backdrop-blur exists only on side menu overlay — functional, not decorative |
| Identical card grids | Clean | Onboarding cards are similar but structurally justified (instruction tuples) |
| Hero metric layout | Clean | None |
| Generic fonts (Inter) | Flag | Inter is the primary and only font — more below |
| Rounded rects with shadows | Mitigated | Nodes use circles/hexagons; buttons have shadows in service of depth hierarchy |
| Cards wrapping everything | Clean | Content is unwrapped; trees fill viewport; side menu uses flat list |
| Generic drop shadows | Clean | Shadow system is mode-aware and hue-tinted |

**The test:** If you showed this to someone, they'd say "this feels like a focused indie tool" — not "AI made this." The bespoke tree rendering, hexagonal leaf nodes, OKLCH-generated region colors, and thoughtful gesture system all signal human craft. The theming engine alone (100+ CSS variables from a single hue/chroma source) is too opinionated to be template-generated.

---

## Overall Impression

This is a **confident, well-engineered tool** with a mature component system, thoughtful accessibility, and genuine design care. The OKLCH theming is rare in production apps and shows real ambition. The motion design is restrained and purposeful. The i18n support (EN/JA/ZH) with CJK considerations shows professionalism.

**Single biggest opportunity:** The typography and spacing system is too uniform. Everything is set in one font at a narrow range of sizes (0.6–1.4rem) with only 4 spacing values (2/4/8/12px). This creates a subtle flatness — the interface feels *consistent* but lacks *rhythm*. The content hierarchy relies almost entirely on color (muted vs. accent) when it could also use spatial contrast to create breathing room and visual landmarks.

---

## What's Working

1. **Tree-as-canvas paradigm.** The skill tree fills the viewport with nodes positioned in world-space, pan/zoom controlled. This is the interface's identity. It doesn't look like a web app; it looks like an interactive diagram. The circle-for-interior, hexagon-for-leaf distinction is a smart visual signal that adds meaning without explanation.

2. **OKLCH color engine.** Generating 100+ CSS variables from a single hue+chroma input, with perceptually uniform lightness steps, colorblind-aware region hues, and mode-dependent shadow tinting. This is above the quality bar of most production apps. Theme switching feels cohesive because *every surface* responds to the source color.

3. **Interaction model.** Left/right/middle click, long-press, shift-click, pinch-zoom, swipe-dismiss — every gesture is mapped purposefully. The onboarding overlay with SVG-masked spotlight cutouts is well-executed: it teaches the *interaction model* through spatial context, not a modal tutorial.

---

## Priority Issues

### 1. Compressed Spacing Scale Creates Visual Monotony

- **What**: The spacing system has only 4 values: `--spacing-xs: 2px`, `--spacing-sm: 4px`, `--spacing-md: 8px`, `--spacing-lg: 12px`. The largest gap in the entire system is 12px.
- **Why it matters**: When the maximum breathing room is 12px, sections blur into each other. The side menu content, settings pages, and accordion groups all use `--spacing-lg` (12px) as their primary separator — making everything feel equidistant. Users can't visually chunk the interface at a glance. The design principle "content over chrome" doesn't mean "no whitespace."
- **Fix**: Extend the scale with `--spacing-xl: 20px` and `--spacing-2xl: 32px`. Use larger values between major sections (e.g., between accordion groups in settings) and tighter values within groups. This creates the "tight groupings, generous separations" rhythm the interface needs.
- **Command**: `/polish`

### 2. Inter as the Sole Typeface

- **What**: The entire app uses Inter (with Segoe UI / system-ui fallback). There is no display font, no heading differentiation beyond weight and size. Font sizes range from 0.6rem to 1.4rem — a narrow band where `--font-base` (0.9rem) and `--font-sm` (0.8rem) are only 0.1rem apart.
- **Why it matters**: Inter is a fine workhorse font, but it's the #1 most common font in AI-generated interfaces and developer tools. For a gaming companion app, it reads as "I didn't choose a font" rather than "I chose this font." The design context references Linear and Raycast — both have strong typographic identity. The narrow type scale means the visual hierarchy between "section heading" and "body text" is barely perceptible.
- **Fix**: Keep Inter for body/UI text (it earns its place there), but consider a tighter, more geometric display face for section headers — something like Geist, General Sans, or Satoshi. Even just using Inter's tighter tracking + heavier weight at larger sizes for headers would create more differentiation. Widen the type scale: section headings should be meaningfully larger than body text. Consider `clamp()` for fluid heading sizes.
- **Command**: `/bolder`

### 3. Button Focus Rings Suppressed Globally

- **What**: `app.css:96-101` — All `:focus` and `:focus-visible` outlines are `!important`-suppressed to `none`. Only text inputs get focus rings back via a long selector list.
- **Why it matters**: Keyboard users navigating the side menu (tab/shift-tab through Statistics/Settings/Controls), toggle switches, segmented controls, and accordion headers get zero visual feedback about what's focused. The comment says "Visual policy: only text-entry fields keep a visible focus ring" — but this policy conflicts with WCAG 2.4.7 (Focus Visible, AA) for all non-text interactive elements. The design principle says "Accessible by default" — this is not that.
- **Fix**: Restore `:focus-visible` outlines on buttons, toggles, and other interactive controls *outside* the tree canvas. The tree nodes' focus suppression is justified (spatial navigation doesn't work there), but the side menu and settings panels are standard linear navigation contexts where focus rings are essential. Use `--border-focus` which already exists.
- **Command**: `/audit`

### 4. Toasts Feel Heavy for Transient Feedback

- **What**: Toasts use `--font-lg` (1.1rem) + `--weight-bold` + a progress bar. They're the loudest typographic element on screen when they appear.
- **Why it matters**: Toasts should confirm actions without demanding attention. A "Tree reset" confirmation toast currently competes visually with the tree itself. The bold weight + large size + progress bar creates three simultaneous attention demands for what should be a brief, ambient acknowledgment. This clashes with the "calm & focus" emotional goal.
- **Fix**: Drop toast font size to `--font-base` (0.9rem) and weight to `--weight-semibold`. Keep the progress bar but reduce its visual weight (lower opacity or thinner). The icon already communicates tone; the text doesn't need to shout.
- **Command**: `/quieter`

### 5. Side Menu Section Headers Lack Visual Anchoring

- **What**: Settings pages use accordion headers with `--font-sm` (0.8rem) uppercase labels. These headers use the same `--bg-raised` background as buttons and cards. Statistics, Settings, and Controls tabs all render as the same pattern: section title, list of rows with icon + label + description. Every row uses `--text-muted` descriptions under `--text` labels on `--bg-raised`.
- **Why it matters**: When everything looks the same, nothing stands out. Users scanning the settings panel can't quickly find what they want because there's no visual landmark differentiating "Build Presets" from "Font Size" from "Haptic Feedback." Cognitive load is high for a dense side panel. Section headers blend into the button controls around them.
- **Fix**: Give section headers more vertical breathing room (see issue #1) and either a distinct typographic treatment (larger, different weight) or a subtle divider line above. They need to be visually louder than the controls within them. Consider making them sticky within the scroll container. The Controls page could use a more compact reference format — two-column key-value pairs, or icon-only with label (description on hover/tap).
- **Command**: `/distill`

---

## Minor Observations

- **Node badge font-family diverges.** `Node.svelte:533-537` uses `system-ui, -apple-system, "Segoe UI", sans-serif` without Inter. Likely intentional for badge compactness, but creates a subtle typographic inconsistency — badges render in SF Pro on macOS vs. Segoe UI on Windows while everything else renders in Inter.
- **Scrollbar `color-mix` nesting.** `app.css:162` nests two `color-mix` calls for the scrollbar thumb, making it hard to tune. Consider extracting as a `--scrollbar-thumb` token.
- **Tooltip max-width** (240px) may be tight for localized content in Japanese or Chinese where character density differs significantly.
- **Uniform `--radius: 12px`** is used on almost everything — buttons, toasts, tooltips, side menu content. More radius variation (smaller on badges, larger on panels) would add visual texture.
- Button `:active` state uses `scale(0.96)` — good tactile feel, well-calibrated.
- `tabular-nums` on node badges for numerical alignment — excellent detail.
- The side menu backdrop uses `backdrop-filter: blur(var(--blur-sm))`. This is functional (dimming the tree canvas behind the panel), not decorative. It's fine.
- Accent-tinted scrollbar styling is a nice touch for dark mode cohesion.

---

## Questions to Consider

- **"What if the spacing scale had more room to breathe?"** Right now 12px is the ceiling. If the side menu settings had 24–32px between major sections, would users find settings faster?
- **"Does the tab bar need three equal-width tabs?"** Guardian/Vanguard/Cannon have different name lengths. What if the active tab was slightly wider, creating a subtle visual emphasis on "where I am"?
- **"What would a power user mode look like?"** The interface assumes familiarity with the game but treats all settings as equally accessible. What if the most-used settings (tree zoom, reset) were promoted to the HUD, and the side menu became purely for deep configuration?
- **"Is the onboarding overlay doing enough on return visits?"** First-time onboarding is solid, but is there a discoverability gap for features like F9 screenshot, shift-click level-down, or colorblind mode? These power features are buried in settings.
- **"Does the Controls tab earn its space as a primary navigation destination?"** It's reference material that most users consult once. Could it be a collapsible section within Settings instead, freeing the tab for something more actionable?
- **"What would a more confident version of the side menu look like?"** What if the Statistics page used data visualization instead of just numbers? What if Build Presets were visually prominent rather than buried in a button?
