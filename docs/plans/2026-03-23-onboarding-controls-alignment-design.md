# Onboarding Controls Alignment Design

**Date:** 2026-03-23

## Summary

Align onboarding with the Controls page so matching walkthrough cards reuse `controls.actions.*` titles and descriptions wherever possible. Keep `onboarding.*` copy only for onboarding-only concepts that do not exist as controls actions.

## Goals

- Match onboarding copy to the current Controls page for shared actions.
- Add the missing onboarding step for the Primary Action HUD button.
- Surface desktop hotkeys in onboarding when the controls page supports them.
- Keep touch onboarding touch-first and avoid implying unavailable keyboard input.
- Preserve the existing spotlight and pane layout behavior.

## Non-Goals

- Redesign the onboarding layout engine.
- Rework the controls page structure.
- Expand localization beyond any newly needed onboarding-only fallback strings.

## Approach

### Content Source of Truth

Use an action-id driven model in `onboardingSteps.ts`.

- For cards that correspond to a real control, reference the control action by ID and resolve its title and description from `getControlActions(...)`.
- For cards that describe onboarding-only behavior, continue using `onboarding.*` strings.
- If a referenced action ID is unavailable, fall back to explicit onboarding copy rather than rendering blank text.

### Step Structure

Keep the walkthrough data-driven, but split the current HUD guidance into separate spotlighted steps:

1. Nodes
2. Locked nodes
3. Root node
4. Tree
5. Budget HUD
6. Primary Action HUD
7. Preview indicator
8. Undo/Redo/Reset toolbar
9. Bottom bar

The new Primary Action step should spotlight the `PrimaryActionIndicator` button rendered in `App.svelte`.

### Device-Specific Inputs

Use onboarding card input labels and icons that stay natural for each device mode.

- Touch onboarding shows touch interactions only.
- Mouse/keyboard onboarding shows the pointer interaction and adds the relevant keyboard shortcut when one exists.
- Only show keyboard shortcuts that are actually defined in the app’s keyboard bindings and already surfaced by the controls page.

### Component Updates

`OnboardingCard.svelte` and `OnboardingPane.svelte` should support cards that show multiple input labels cleanly, especially on desktop where pointer and keyboard inputs may appear together.

The changes should remain stylistically narrow:

- keep the existing pane placement and animation model
- keep the current header/footer flow
- adjust only what is needed to present richer card input labels without hurting compact layouts

## Data Model

Introduce a small onboarding card model with two card source types:

- `controlActionId`: use control action metadata for title/description
- `custom`: use explicit onboarding fallback copy

The step definitions should remain responsible for:

- spotlight target
- preferred pane direction
- per-card icon/input presentation
- optional fallback copy keys for onboarding-only behavior

## Testing Strategy

- Update onboarding step tests to expect the new Primary Action step and the revised order.
- Add coverage for the onboarding card data resolution so control-action-backed cards and fallback cards both resolve correctly.
- Keep existing pane layout tests passing by avoiding placement-engine changes.
- Run `npm run check` and the relevant CLI onboarding/input tests after implementation.

## Risks and Mitigations

- Drift between onboarding and controls: mitigated by resolving copy from `controls.actions.*` by ID.
- Missing control IDs causing blank UI: mitigated by explicit fallback copy handling.
- Touch/Desktop mismatch: mitigated by resolving device-specific inputs in step generation, not in locale copy.
