# Audit Report: RG Backpack Planner

**Date**: 2026-03-13
**Scope**: Full codebase audit — accessibility, performance, theming, responsive design, anti-patterns

---

## Anti-Patterns Verdict

**Partial fail.** Three of the frontend-design skill's explicit "DON'T" items are present:

1. **Inter font** (`theme.css`, `app.css:52`) — Inter is listed as an overused font to avoid. It's the primary font-family.
2. **Cyan-on-dark default** — Dark mode is `true` by default with a cyan hue (198deg). The skill explicitly warns against "cyan-on-dark" as an AI color palette tell.
3. **Spring/bounce easing** (`theme.css:33`) — `--ease-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots past 1.0, producing a bounce effect. The skill says "Don't use bounce or elastic easing."

**However**, this app is a *game utility tool*, not a marketing page. The theming engine is genuinely sophisticated (custom OKLCH color math, dynamic palettes, colorblind support). The cyan default is contextually appropriate for a gaming PWA. The overall design is functional and purpose-built, not generic template work. Someone wouldn't immediately think "AI made this."

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 5 |
| Medium | 8 |
| Low | 6 |
| **Total** | **20** |

**Top 5 issues:**
1. Global focus ring removal blocks keyboard navigation (Critical - A11y)
2. `width` property animated instead of `transform` in progress bars (High - Perf)
3. Context menu positioned with `left`/`top` during drag (High - Perf)
4. Side menu hardcoded at 440px — breaks on small screens (High - Responsive)
5. Small button touch targets at 32px (High - A11y)

**Overall quality: Good.** This is a well-architected Svelte 5 PWA with a sophisticated theme engine, comprehensive i18n, proper ARIA roles, and reduced-motion support. The issues are refinement-level, not foundational.

---

## Detailed Findings

### Critical Issues

#### C1. Global focus ring removal blocks keyboard-only users
- **Location**: `app.css:94-99`
- **Category**: Accessibility
- **WCAG**: 2.4.7 Focus Visible (Level AA)
- **Description**: `outline: none !important` applied to `:focus`, `:focus-visible`, and `:focus-within` globally. While individual components (Button, ToggleSwitch, SegmentedControl) re-add focus rings via `:focus-visible`, any component that forgets to opt back in is silently invisible to keyboard users.
- **Impact**: Keyboard users navigating the tree nodes (the primary interactive elements) get zero visual feedback — `Node.svelte:415-419` explicitly sets `outline: none`.
- **Recommendation**: Invert the pattern — let the browser's default `:focus-visible` work, then *remove* outlines only where explicitly unwanted. Or add a visible focus indicator to nodes.
- **Suggested command**: `/harden`

---

### High-Severity Issues

#### H1. `width` animated on progress bars (layout thrashing)
- **Location**: `NodeContentMenu.svelte:480`, `TreeContextMenuList.svelte:396`, `app.css:247-250` (toast-progress)
- **Category**: Performance
- **Description**: Progress fill bars use `transition: width var(--ease)` and the toast-progress keyframe animates `width: 100%` to `width: 0%`. Animating `width` triggers layout recalculation every frame.
- **Impact**: Jank on lower-end mobile devices during progress animations.
- **Recommendation**: Use `transform: scaleX()` with `transform-origin: left` instead.
- **Suggested command**: `/optimize`

#### H2. Context menu positioned with `left`/`top` during drag
- **Location**: `ContextMenu.svelte:350`
- **Category**: Performance
- **Description**: Menu uses inline `left`/`top` styles that update on every pointermove event during drag. These trigger layout recalculation.
- **Impact**: Stuttering during menu drag on low-end devices.
- **Recommendation**: Use `transform: translate(x, y)` exclusively for positioning.
- **Suggested command**: `/optimize`

#### H3. Side menu width hardcoded at 440px
- **Location**: `app.css:12`
- **Category**: Responsive
- **Description**: `--side-menu-width: 440px` with no responsive override. Phones narrower than 440px (e.g., iPhone SE at 375px) will have the menu overflow or clip.
- **Impact**: Broken layout on small phones.
- **Recommendation**: Add `min(440px, 100vw)` or a media query to cap at viewport width on mobile.
- **Suggested command**: `/adapt`

#### H4. Small button touch targets (32px)
- **Location**: `Button.svelte:232-234`
- **Category**: Accessibility
- **WCAG**: 2.5.8 Target Size (Level AAA), WCAG 2.5.5 (Level AA - 24px minimum)
- **Description**: `.button-sm` has `height: 32px; min-width: 32px`. While above the AA minimum of 24px, it's below the recommended 44px for comfortable touch interaction.
- **Impact**: Difficult to tap accurately on mobile, especially for users with motor impairments.
- **Recommendation**: Increase to `min-height: 44px` on touch devices via `@media (pointer: coarse)`.
- **Suggested command**: `/adapt`

#### H5. Hardcoded color values in NodeContentMenu & TreeContextMenuList
- **Location**: `NodeContentMenu.svelte:404-430`, `TreeContextMenuList.svelte:291-303`
- **Category**: Theming
- **Description**: Multiple hardcoded hex values (`#ef4444`, `#fca5a5`, `#fff`, `#0ff`, `#aaa`, `#666`) used as CSS fallbacks. These bypass the dynamic theme engine and won't respond to theme changes.
- **Impact**: Visual inconsistency when users switch themes; broken contrast in some combinations.
- **Recommendation**: Replace with theme CSS variables (already defined: `--accent-danger`, `--text-muted`, `--text-disabled`, etc.).
- **Suggested command**: `/normalize`

---

### Medium-Severity Issues

#### M1. Spring/bounce easing
- **Location**: `theme.css:33`, `ToggleSwitch.svelte:159`
- **Category**: Visual/Anti-pattern
- **Description**: `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoots, creating bounce. Used on toggle switch thumb animation.
- **Recommendation**: Replace with exponential ease-out like `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Suggested command**: `/animate`

#### M2. Layout thrashing in settings page transitions
- **Location**: `SideMenuSettingsPage.svelte:81-127`
- **Category**: Performance
- **Description**: Reads `offsetHeight`, sets `style.height`, nested `requestAnimationFrame` calls — classic layout thrashing pattern for page slide transitions.
- **Recommendation**: Use CSS grid `grid-template-rows: 1fr` / `0fr` transitions or the FLIP technique.
- **Suggested command**: `/optimize`

#### M3. Backdrop blur on context menu
- **Location**: `ContextMenu.svelte:413-414`
- **Category**: Performance
- **Description**: `backdrop-filter: blur(4px)` is GPU-intensive, especially combined with frequent repositioning during drag.
- **Impact**: Frame drops on lower-end mobile GPUs.
- **Recommendation**: Consider removing blur or only applying on non-touch devices.
- **Suggested command**: `/optimize`

#### M4. No `<h1>` in the application
- **Location**: Entire app
- **Category**: Accessibility
- **WCAG**: 1.3.1 Info and Relationships
- **Description**: Modals use `<h2>`, sections use `<h3>`, but no `<h1>` exists. Screen readers expect a heading hierarchy starting at h1.
- **Recommendation**: Add a visually-hidden `<h1>` for the app title.
- **Suggested command**: `/harden`

#### M5. `rgba(0,0,0,...)` shadows bypass theming
- **Location**: `Node.svelte:533-534`, `ContextMenu.svelte:382`, `ModalHost.svelte:346`, `SideMenu.svelte:232`, `NumberedList.svelte:46`
- **Category**: Theming
- **Description**: Shadows use hardcoded `rgba(0,0,0,...)` instead of theme variables. In light mode, pure black shadows can look harsh.
- **Recommendation**: Use the existing `--shadow` variable or tint shadows toward the theme hue.
- **Suggested command**: `/normalize`

#### M6. Color picker focus ring uses hardcoded white
- **Location**: `ColorPickerDialog.svelte:516`
- **Category**: Accessibility/Theming
- **Description**: Color grid cell uses `outline: 2.5px solid white` instead of `var(--border-focus)`.
- **Impact**: Invisible focus ring in light mode.
- **Recommendation**: Use `var(--border-focus)`.
- **Suggested command**: `/normalize`

#### M7. No container queries used
- **Location**: App-wide
- **Category**: Responsive
- **Description**: The side menu content, settings pages, and node layouts could benefit from `@container` queries for component-level responsiveness.
- **Recommendation**: Add container queries for side menu panels and tab bar.
- **Suggested command**: `/adapt`

#### M8. Limited mobile breakpoints
- **Location**: App-wide (only 31 media queries total)
- **Category**: Responsive
- **Description**: No breakpoints for very small screens (320px), limited `@media (pointer: coarse)` usage (only Node.svelte).
- **Recommendation**: Add touch-specific sizing for all interactive elements.
- **Suggested command**: `/adapt`

---

### Low-Severity Issues

#### L1. Inter font — overused
- **Location**: `app.css:52-57`
- **Category**: Anti-pattern
- **Description**: Inter is first in the font stack but not actually loaded via `@font-face` — it falls through to system fonts. This makes the declaration misleading.
- **Recommendation**: Either load Inter properly or remove it from the stack.

#### L2. Default cyan-on-dark palette
- **Location**: `themeColorStore.ts`, `darkModeStore.ts`
- **Category**: Anti-pattern
- **Description**: Default theme is dark mode with cyan accent — a common AI aesthetic tell. Mitigated by 6 preset options + custom color picker.

#### L3. `NumberedList.svelte` uses `rgba(255,255,255,0.05)` background
- **Location**: `NumberedList.svelte:46`
- **Category**: Theming
- **Description**: Hardcoded white-based overlay won't work properly in light mode.
- **Suggested command**: `/normalize`

#### L4. Toast progress animates `width` in keyframe
- **Location**: `app.css:247-250`
- **Category**: Performance
- **Description**: `@keyframes toast-progress` animates `width`. Low priority since toasts are infrequent and short-lived.
- **Suggested command**: `/optimize`

#### L5. SVG viewBox dimensions inconsistent
- **Location**: `src/assets/nodes/`
- **Category**: Performance
- **Description**: Node SVGs have varying viewBox dimensions (e.g., `480.877 x 479.975`). Normalizing to `0 0 512 512` would be cleaner.

#### L6. External links missing "opens in new tab" indicator
- **Location**: `SideMenuControlsPage.svelte:52,56`
- **Category**: Accessibility
- **Description**: Links with `target="_blank"` don't visually indicate they'll open a new tab.
- **Suggested command**: `/clarify`

---

## Patterns & Systemic Issues

1. **Hardcoded fallback colors appear in 15+ locations** — NodeContentMenu, TreeContextMenuList, and Node.svelte contain hex/rgba fallbacks that bypass the otherwise excellent theme engine.
2. **Global focus suppression pattern** — The "opt-out then opt-in" approach to focus rings means any new component that forgets to re-add `:focus-visible` becomes keyboard-inaccessible by default.
3. **`width`/`height` animation** — Three separate components animate layout properties instead of transforms. This is a recurring pattern rather than an isolated incident.

---

## Positive Findings

1. **Exceptional theme engine** — Custom OKLCH color math with M3-inspired tonal palettes, zero dependencies. Genuinely impressive engineering (`themeEngine.ts`).
2. **Comprehensive ARIA implementation** — Proper `role="switch"`, `role="radiogroup"`, `role="dialog"`, `aria-modal`, `aria-checked`, `aria-expanded`, `aria-live` regions across all interactive components.
3. **Reduced motion support** — Global `prefers-reduced-motion` override plus component-specific alternatives (LevelUpSplash provides fade instead of float).
4. **Colorblind accessibility** — Dedicated hue adjustments for protanopia/deuteranopia/tritanopia.
5. **Focus trap in modals** — Proper Tab cycling within modal boundaries, focus save/restore.
6. **Safe area inset handling** — Thorough notch/safe-area support for mobile devices.
7. **Minimal production dependencies** — Only 2 runtime deps. Clean, lean bundle.
8. **Smooth theme transitions** — `.theme-transitioning` class enables coordinated color animations.
9. **`color-contrast()` progressive enhancement** — Node badges use `@supports (color: color-contrast())` for automatic text-on-background contrast.
10. **i18n coverage** — Full 3-language support with svelte-whisper.

---

## Recommendations by Priority

### Immediate (Critical blockers)
1. Add visible focus indicator to Node components — keyboard users cannot navigate the primary interface

### Short-term (This sprint)
2. Replace `width` animations with `transform: scaleX()` in progress bars
3. Move context menu positioning to `transform: translate()`
4. Make side menu width responsive (`min(440px, 100vw)`)
5. Replace hardcoded color fallbacks in NodeContentMenu/TreeContextMenuList with theme variables

### Medium-term (Next sprint)
6. Increase touch targets to 44px on `@media (pointer: coarse)`
7. Add `<h1>` for screen reader heading hierarchy
8. Replace spring easing with smooth deceleration curve
9. Replace hardcoded `rgba(0,0,0,...)` shadows with themed values
10. Fix color picker focus ring to use CSS variable

### Long-term (Nice-to-haves)
11. Add container queries for side menu content
12. Normalize SVG viewBox dimensions
13. Consider reducing/removing backdrop blur on mobile
14. Add "opens in new tab" indicators on external links

---

## Suggested Commands for Fixes

| Command | Issues Addressed | Count |
|---------|-----------------|-------|
| `/optimize` | H1, H2, M2, M3, L4 | 5 |
| `/harden` | C1, M4 | 2 |
| `/normalize` | H5, M5, M6, L3 | 4 |
| `/adapt` | H3, H4, M7, M8 | 4 |
| `/animate` | M1 | 1 |
| `/clarify` | L6 | 1 |
