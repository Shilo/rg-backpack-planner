# Reduce Motion Design

**Status:** Approved on 2026-03-23

**Goal:** Add a user-facing setting that disables all app animations and transitions for performance, motion comfort, and instant feedback, while preserving current behavior exactly when the setting is off.

## Product Decision

The setting will live in `src/lib/sideMenuPages/GeneralSettingsPage.svelte` under Accessibility.

- Label: `Reduce Motion`
- Description: explain that it disables animations and transitions for instant feedback, lower rendering work, and improved motion comfort

The setting is a manual app-level override with this precedence:

1. If the app setting is enabled, all motion is disabled.
2. If the app setting is disabled, fall back to the OS/browser `prefers-reduced-motion` preference.

This means the app exposes one effective “no animations” policy without changing current behavior for users who leave the setting off.

## Architecture

Add a new persisted store at `src/lib/reduceMotionStore.ts` that follows the existing boolean-setting store pattern already used by settings like haptics and uppercase text.

The module should expose:

- The persisted manual store value
- A shared effective helper/getter for runtime checks, such as `prefersNoAnimations()`
- Root-class reactivity so CSS can respond globally

The effective helper is the single source of truth for motion policy in JavaScript and Svelte transition code.

## CSS Strategy

Add a root class such as `html.no-animations` from startup reactivity, similar to the existing theme and uppercase reactivity in `src/lib/themeApply.ts`.

When the class is present, global CSS in `src/app.css` should disable:

- CSS animations
- CSS transitions
- theme-switch transitions

This broad kill switch is the main enforcement layer for pulsing, keyframes, hover transitions, background motion, context menu animation, toast animation, and similar CSS-driven effects.

## Runtime Coverage

CSS alone does not disable Svelte transition directives or JavaScript animation loops, so the following paths must also read the effective helper and switch to instant behavior:

- `src/lib/sideMenuPages/AppearanceSettingsPage.svelte`
  - Remove the theme icon fade transition when animations are disabled
- `src/lib/Tree.svelte`
  - Make tree mount/fade instant
  - Skip animated focus/pan/zoom paths
  - Skip wheel zoom chase interpolation when motion is disabled
  - Ensure animated link energy flow is also disabled by CSS
- `src/lib/ModalHost.svelte`
  - Make backdrop and shell transitions instant
  - Make sheet settle/dismiss timing instant when motion is disabled
- `src/lib/SideMenu.svelte`
  - Make menu open/close transitions instant
- `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`
  - Make settings page slide transitions instant
- `src/lib/onboarding/OnboardingOverlay.svelte`
  - Make step transitions instant
  - Make dismiss timing instant

Other CSS-driven motion such as `TreeTabs` background movement, toast entry/progress animation, context menu entry animation, splash/pulse effects, and hover transitions should be covered by the root CSS kill switch.

## Non-Regression Requirement

Behavior when the setting is off must remain unchanged.

Acceptance criteria:

- Existing animation timing and feel remain the same when the setting is off and the OS does not request reduced motion.
- Existing reduced-motion behavior still works when the setting is off and the OS requests reduced motion.
- The new setting only changes motion policy; it must not alter unrelated interaction behavior, persistence, focus handling, rendering order, or state transitions.
- Reset Settings restores the default behavior.

## Testing

Add focused tests that verify:

- Store precedence: manual setting on overrides OS preference, manual setting off falls back to OS preference
- Root-class reactivity is driven by the effective motion policy
- General settings reset includes the new setting
- Source-contract coverage for the critical runtime checks in `Tree.svelte`, `ModalHost.svelte`, `OnboardingOverlay.svelte`, `SideMenu.svelte`, and `SideMenuSettingsPage.svelte`

Verification should include:

- `npm run check`
- `npm test`

## Audit Plan

Before calling the change complete, do a deliberate regression audit for the “setting off” path.

That audit should verify:

- The helper defaults to current behavior
- Components only branch on the effective helper and do not change logic unrelated to motion
- CSS overrides are gated behind the root class and do not affect normal rendering
- All modified interaction flows still behave as before when motion remains enabled
