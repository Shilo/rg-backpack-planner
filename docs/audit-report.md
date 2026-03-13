# Audit Report: RG Backpack Planner

**Date**: 2026-03-13
**Scope**: Full codebase audit — accessibility, performance, theming, responsive design, anti-patterns

---

## Anti-Patterns Verdict

**PASS.** This does not look AI-generated. The codebase exhibits strong design discipline with zero AI slop tells:

- No cyan-on-dark — default hue is OKLCH 234 (sky blue matching the game brand `#00adfc`), not neon cyan
- No purple-to-blue gradients, no gradient text anywhere
- No glassmorphism abuse — `backdrop-filter: blur()` used only on modal backdrops and context menu overlay (functional, not decorative)
- No hero metric layouts, no identical card grids, no sparkline decorations
- No bounce/elastic easing — all curves use professional deceleration (`cubic-bezier(0.05, 0.7, 0.1, 1)`, `cubic-bezier(0.16, 1, 0.3, 1)`, `cubic-bezier(0.2, 0, 0, 1)`)
- No neon accents, no glow effects
- The OKLCH color system is hand-rolled with hue harmonization, colorblind support, and perceptual uniformity — the opposite of a template

Inter is listed first in the font stack (`app.css:53`) — flagged by the frontend-design skill's DON'T list — but it's not loaded via `@font-face` and falls through to system fonts. For a companion utility tool prioritizing clarity over personality, this is acceptable.

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 3 |
| Medium | 5 |
| Low | 4 |
| **Total** | **12** |

**Top issues:**
1. Accordion button missing keyboard focus indicator (High — A11y)
2. Three layout-property animations cause unnecessary reflows (High — Perf)
3. Hard-coded badge text colors bypass the theme system (High — Theming)

**Overall quality: Very High.** This is a well-architected Svelte 5 PWA with a sophisticated OKLCH theme engine, comprehensive ARIA usage, container queries, reduced-motion support, grid-based accordion animation, and minimal dependencies. Issues are refinement-level, not foundational.

---

## Detailed Findings

### High-Severity Issues

#### H1. Accordion button missing focus indicator

- **Location**: `Accordion.svelte:41` — `.accordion-header` button
- **Category**: Accessibility
- **WCAG**: 2.4.7 Focus Visible (Level AA)
- **Description**: The accordion toggle is a `<button>` but has no `:focus-visible` style. Since `app.css:96-101` globally suppresses all focus outlines (`outline: none !important`), this button is invisible to keyboard users when focused. The project uses a deliberate "suppress globally, restore per-component" pattern — 18+ components correctly add `:focus-visible` outlines (Button, SegmentedControl, TabBar, SliderSetting, ToggleSwitch, FabMenu, SettingsNavButton, etc.). The Accordion is the gap.
- **Impact**: Keyboard-only users cannot see which accordion they're about to activate.
- **Recommendation**: Add `:focus-visible` outline matching the project pattern (`2px solid var(--border-focus)`, `outline-offset: 2px`).
- **Suggested command**: `/harden`

#### H2. Layout property animations on HUD actions and toast container

- **Location**: `App.svelte:605` (`transition: left 0.15s`), `App.svelte:611` (`transition: right 0.15s`), `Toasts.svelte:91` (`transition: bottom 0.2s`)
- **Category**: Performance
- **Description**: Animating `left`, `right`, and `bottom` causes layout recalculation every frame. These should use `transform: translateX()` / `translateY()` which are compositor-only and run at 60fps without layout thrashing. The rest of the codebase correctly uses transforms for animation (modal entrances, toast items, side menu slide, fab actions).
- **Impact**: Jank on low-end mobile devices during HUD repositioning and toast container movement.
- **Recommendation**: Replace with `transform` equivalents. E.g., `left: 0` + `transition: left` → position with `left: 0` statically, animate offset via `transform: translateX()`.
- **Suggested command**: `/optimize`

#### H3. Hard-coded badge text colors bypass theming

- **Location**: `Node.svelte:213-214` — `--badge-text-on-light: #1c1c1c` and `--badge-text-on-dark: #f2f2f2`
- **Category**: Theming
- **Description**: Badge text colors are hard-coded hex values that don't participate in the OKLCH theme system. The theme engine already generates `--node-badge-text` in `themeEngine.ts`, but these local CSS variables override it with static values. Badge backgrounds vary by region (orange, yellow, blue), so fixed text colors risk contrast failures on certain accent/region combinations.
- **Impact**: Badge text doesn't respond to theme hue changes; contrast may be insufficient on some region colors.
- **WCAG**: 1.4.3 Contrast (Minimum) — risk, not guaranteed failure
- **Recommendation**: Use the dynamic `--node-badge-text` token from the theme engine, or calculate per-region badge text color based on background lightness.
- **Suggested command**: `/normalize`

---

### Medium-Severity Issues

#### M1. Color picker preview border uses hard-coded gray

- **Location**: `ColorPickerDialog.svelte:549` — `border: 2px solid rgba(128, 128, 128, 0.3)`
- **Category**: Theming
- **Description**: Pure neutral gray ignores the theme's hue tinting. All other borders use `var(--border)` or `var(--border-subtle)`.
- **Impact**: Minor visual inconsistency — this border looks "cold" when the rest of the UI is tinted toward the theme hue.
- **Recommendation**: Replace with `var(--border-subtle)` or `color-mix(in srgb, var(--border-subtle) 60%, transparent)`.
- **Suggested command**: `/normalize`

#### M2. Light mode shadows use pure black

- **Location**: `themeEngine.ts` shadow generation (light mode path) — `rgba(0,0,0,0.08)` through `rgba(0,0,0,0.25)`
- **Category**: Theming
- **Description**: Light-mode shadows use pure black alpha. The frontend-design skill guidance states "Never use pure black — always tint." Dark mode shadows are already generated from theme-aware values. Backdrop overlays (`rgba(0,0,0,...)` in `app.css` and `themeEngine.ts`) are acceptable since they intentionally darken.
- **Impact**: Subtle — shadows work but lack brand personality in light mode. Not a functional issue.
- **Recommendation**: Generate light-mode shadow color from the theme hue (e.g., `oklchToHex(0.5, neutralChroma * 0.3, source.h)` with alpha).
- **Suggested command**: `/normalize`

#### M3. Two `px` font sizes don't scale with text size setting

- **Location**: `NumberedList.svelte:43` (`font-size: 11px`), `SideMenuControlsPage.svelte:667` (`font-size: 10px`)
- **Category**: Responsive / Accessibility
- **Description**: These use fixed `px` values instead of `rem` or the `--font-*` design tokens. They won't scale with the user's text size preference (`--text-scale`) or browser font size settings. The rest of the codebase consistently uses `rem`-based tokens.
- **Impact**: Text may be too small for users who increase text size.
- **WCAG**: 1.4.4 Resize Text (AA) — partial concern
- **Recommendation**: Replace `11px` → `var(--font-xxs)` (0.6rem) or equivalent. Replace `10px` → a calculated token value.
- **Suggested command**: `/normalize`

#### M4. Layout thrashing in settings page transitions

- **Location**: `SideMenuSettingsPage.svelte:87-102`
- **Category**: Performance
- **Description**: Reads `offsetHeight`, sets `style.height`, then reads `scrollHeight` in the same transition function. While separated by an `await tick()`, this pattern reads and writes layout properties in quick succession during page slide transitions.
- **Impact**: Potential jank during settings page navigation on low-end devices. Mitigated by the `await tick()` separation.
- **Recommendation**: Consider CSS grid `grid-template-rows: 1fr` / `0fr` transitions (already used successfully in Accordion) or the FLIP technique.
- **Suggested command**: `/optimize`

#### M5. Backdrop overlay values duplicated between CSS and JS

- **Location**: `app.css:22-24` vs `themeEngine.ts` shadow generation
- **Category**: Theming (maintenance)
- **Description**: `--backdrop-overlay` is defined in `app.css` as `rgba(0,0,0,0.35)` but overwritten by `themeEngine.ts` as `rgba(0,0,0,0.4)`. The CSS values serve as fallbacks before JS loads, but the mismatch (0.35 vs 0.4, 0.5 vs 0.55) is confusing for maintainers.
- **Impact**: No functional issue — JS values always win after initialization. Maintenance confusion only.
- **Recommendation**: Add a comment in `app.css` documenting the fallback relationship, or align the values.
- **Suggested command**: `/polish`

---

### Low-Severity Issues

#### L1. Inter font listed but not loaded

- **Location**: `app.css:53-58`
- **Category**: Anti-pattern (minor)
- **Description**: Inter is first in the font stack but not loaded via `@font-face` or a CDN link. It falls through to "Segoe UI" on Windows and system-ui elsewhere. The declaration is misleading since Inter is never actually used unless the user has it installed locally.
- **Recommendation**: Either self-host Inter (adds ~20KB WOFF2) or remove it from the stack and lead with the system fonts actually used. For a PWA prioritizing minimal bundle, removing it is cleaner.
- **Suggested command**: `/polish`

#### L2. SVG viewBox dimensions inconsistent across node icons

- **Location**: `src/assets/nodes/` — e.g., AttackBoost (`480.877 x 479.975`), CounterattackResistance (`329.953 x 372.454`), Dodge (`411.183 x 399.787`)
- **Category**: Consistency
- **Description**: Node icon SVGs have varying viewBox dimensions with decimal precision. While `preserveAspectRatio="xMidYMid meet"` handles display correctly, normalizing to consistent dimensions (e.g., `0 0 512 512`) would be cleaner.
- **Impact**: No functional issue — icons render correctly. Maintainability concern only.

#### L3. Context menu backdrop blur on mobile

- **Location**: `ContextMenu.svelte:415-416` — `backdrop-filter: blur(var(--blur-xs))`
- **Category**: Performance
- **Description**: `backdrop-filter: blur()` is GPU-intensive. The blur is small (`--blur-xs: 2px`) so the impact is minimal, but on low-end mobile GPUs it could contribute to frame drops when combined with the context menu's repositioning.
- **Impact**: Minor — the blur value is small and the context menu is short-lived.
- **Recommendation**: Consider removing blur on touch devices via `@media (pointer: coarse)` or accepting the current tradeoff.
- **Suggested command**: `/optimize`

#### L4. Mixed `em`/`rem` units in a few components

- **Location**: `LevelUpSplash.svelte` (`0.75em`), `SideMenuControlsPage.svelte:748` (`0.85em`)
- **Category**: Consistency
- **Description**: Most of the codebase uses `rem` via `--font-*` tokens. A few components use `em` for relative sizing. The `em` usage may be intentional (scaling relative to parent font size) but is inconsistent with the dominant pattern.
- **Impact**: No functional issue. The `em` values in `SideMenuControlsPage` are used for the external link `↗` indicator, where relative sizing is appropriate.
- **Recommendation**: Review case-by-case. If `em` is intentional for relative scaling, keep as-is.

---

## Patterns & Systemic Issues

1. **Focus indicator strategy is sound but has one gap.** The project uses a deliberate pattern: global suppression in `app.css` + per-component `:focus-visible` restoration. 18+ components implement this correctly. The only gap is the Accordion header button (H1). The Node component intentionally suppresses focus rings with a documented comment explaining that Tab key cycles tree tabs instead.

2. **The theme system is excellent with 3 minor escapees.** Out of 50+ generated CSS variables, only the badge text colors (H3) and the color picker border (M1) bypass the system. Everything else — surfaces, text, accents, semantic colors, region colors, shadows — flows through the OKLCH engine.

3. **Layout property animation is localized, not systemic.** Only 3 instances across the entire codebase animate `left`/`right`/`bottom`. All other animations correctly use `transform` and `opacity` (modal entrances, toast items, side menu slide, fab actions, accordion arrows, button press feedback).

---

## Positive Findings

1. **Exceptional OKLCH theme engine** — Hand-rolled color math with hue harmonization, perceptual uniformity, and zero dependencies. Generates 50+ CSS variables from a single hue/chroma source. (`themeEngine.ts`)
2. **Comprehensive ARIA implementation** — Proper `role="switch"`, `role="radio"` with `aria-checked`, `role="dialog"` with `aria-modal`, `role="menu"`, `role="application"`, `aria-expanded`, `aria-live="polite"`, `aria-valuemin/max/now/text` across all interactive components.
3. **Reduced motion support** — Global `prefers-reduced-motion` rule (`app.css:276-283`) plus component-specific overrides (Accordion disables transitions independently).
4. **Colorblind accessibility** — Dedicated hue adjustments for protanopia/deuteranopia with configurable region color shifts. First-class feature, not an afterthought.
5. **Container queries** — Modern `@container` usage in TreeTabs and TabBar with `cqw` units and `clamp()` for fluid, component-level responsiveness.
6. **Grid-based accordion animation** — Uses `grid-template-rows: 0fr` / `1fr` transition instead of animating `height`. Best practice.
7. **Focus trap in modals** — Proper Tab cycling within modal boundaries (`FullscreenModal.svelte`).
8. **Visually-hidden `<h1>`** — Proper heading hierarchy with `<h1 class="visually-hidden">` in `App.svelte:556`.
9. **Safe area inset handling** — Thorough notch/safe-area support via `env(safe-area-inset-*)` for PWA installations.
10. **Minimal production dependencies** — Only 3 runtime deps (svelte, svelte-whisper, @zumer/snapdom). Zero color/UI libraries.
11. **Smooth theme transitions** — `.theme-transitioning` class enables coordinated color animations across all surfaces.
12. **`color-contrast()` progressive enhancement** — Node badges use `@supports (color: color-contrast())` for automatic text-on-background contrast selection.
13. **Dynamic imports** — Side menu pages and screenshot module loaded on demand, keeping initial bundle lean.
14. **External link indicators** — `target="_blank"` links already have `::after { content: " ↗" }` styling (`SideMenuControlsPage.svelte:746-749`).
15. **Responsive side menu** — Already uses `min(440px, 100vw)` to prevent overflow on small screens (`app.css:12`).
16. **Context menu uses transforms** — Positioned via `transform: translate(x, y)` (`ContextMenu.svelte:350`), not layout properties.
17. **Toast progress uses `scaleX`** — `@keyframes toast-progress` correctly animates `transform: scaleX()` (`app.css:264-267`).
18. **Full i18n coverage** — 3 languages (en, ja, zh) via svelte-whisper with no hardcoded English strings in components.
19. **Button touch target documentation** — `.button-sm` at 32px includes a comment confirming WCAG 2.5.5 (AA) 24px minimum compliance.

---

## Recommendations by Priority

### Immediate (this session)
1. **H1** — Add `:focus-visible` to Accordion header button

### Short-term (this sprint)
2. **H2** — Replace `transition: left/right/bottom` with `transform: translateX/Y` in `App.svelte` and `Toasts.svelte`
3. **H3** — Wire badge text to the theme engine's `--node-badge-text` token
4. **M1** — Replace hard-coded gray border in `ColorPickerDialog.svelte`
5. **M3** — Replace `px` font sizes with `rem` tokens in `NumberedList` and `SideMenuControlsPage`

### Medium-term (next sprint)
6. **M2** — Tint light-mode shadows toward theme hue
7. **M4** — Consider CSS grid transitions for settings page slides
8. **M5** — Align or document backdrop overlay fallback values

### Long-term (nice-to-haves)
9. **L1** — Decide on Inter: self-host or remove from font stack
10. **L2** — Normalize SVG viewBox dimensions
11. **L3** — Consider reducing backdrop blur on low-end mobile

---

## Suggested Commands for Fixes

| Command | Issues Addressed | Count |
|---------|-----------------|-------|
| `/harden` | H1 | 1 |
| `/optimize` | H2, M4, L3 | 3 |
| `/normalize` | H3, M1, M2, M3 | 4 |
| `/polish` | M5, L1 | 2 |
