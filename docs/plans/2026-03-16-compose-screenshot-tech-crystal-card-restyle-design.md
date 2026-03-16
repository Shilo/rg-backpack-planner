# Compose Screenshot Tech Crystal Card Restyle Design

**Date:** 2026-03-16

## Summary

Refine the newly introduced screenshot metadata cards so they read more like compact editorial nameplates than repurposed in-app badges. The title should become the primary visual element, while the tech crystal row should shift into a smaller, muted supporting role. The overall plaque should feel more modern and premium over the tree screenshots, even if it does not exactly match the app's component styling.

This is a presentation-only follow-up to the screenshot tech crystal card work. It should keep the same data flow, card placement, and labels-toggle behavior while improving hierarchy, color treatment, and surface design.

## Goals

- Make the title line the clearest focal point in each screenshot card.
- Reduce the visual weight of the tech crystal icon and value by using a smaller, muted treatment.
- Modernize the plaque surface so it feels more polished over the tree imagery.
- Keep the cards looking comfortable next to the trees without requiring exact design-system parity.
- Preserve the current measured corner placement and screenshot export flow.

## Non-Goals

- Do not change screenshot payload structure or tech crystal calculations.
- Do not alter the card anchor positions or labels-toggle behavior.
- Do not add animations, DOM overlays, or extra export passes.
- Do not introduce loud accent colors or flashy game-UI framing.

## Interaction Model

- Labels toggle behavior is unchanged:
  - when labels are enabled, all screenshot cards render
  - when labels are disabled, no screenshot cards render
- Tree screenshots still render one top-right card each.
- The combined screenshot still renders one bottom-right card.

## Content Hierarchy

- The title line is the hero element:
  - slightly larger than the supporting row
  - brighter and higher-contrast
  - subtly more letterspaced
- The tech crystal row is secondary metadata:
  - slightly smaller than the current implementation
  - muted in tone compared to the title
  - icon and value share the same supporting color
- The tech crystal row should feel informative, not attention-seeking.

## Visual Direction

- Treat the plaque as a compact nameplate rather than a node badge.
- Keep the surface dark, restrained, and readable over varied tree backgrounds.
- Move away from the current "locked node badge" look by refining:
  - corner radius
  - border weight
  - shadow softness
  - internal surface layering
- The card should feel more premium and contemporary, but still calm.

## Surface Treatment

- Use a two-layer plaque surface:
  - a deep semi-opaque base derived from existing neutral/theme-aware surface colors
  - a subtle top highlight wash to give the plaque more crafted depth
- Use a thinner, quieter border than the current locked-node border treatment.
- Use a softer, broader shadow so the card floats over the tree rather than appearing stamped onto it.
- Avoid bright accent fills, glassmorphism, or high-contrast gradient effects.

## Color Strategy

- Keep the title color near the existing high-contrast text color.
- Shift the tech crystal icon and value away from `--accent` and into a muted neutral/theme-aware supporting tone.
- Prefer theme-derived variables from `themeEngine.ts`, especially:
  - `--text`
  - `--text-muted`
  - `--node-locked-bg`
  - `--node-locked-border`
  - existing shadow variables and neutral palette behavior
- The result does not need to mirror app chrome exactly, but it should still feel at home against the tree colors produced by the theme system.

## Rendering Strategy

- Keep all changes inside `src/lib/buildImageExport/captureService.ts`.
- Reuse the current metadata-card measurement and placement logic so corner clamping does not regress.
- Adjust the renderer to support separate styling for:
  - title typography
  - tech crystal row typography
  - tech crystal row color
  - plaque background/border/highlight/shadow
- Keep the canvas hex icon helper, but recolor it to match the muted tech crystal row instead of the accent color.

## Testing

- Add fail-first source-contract coverage that the metadata renderer uses distinct title and tech crystal row styling.
- Add fail-first coverage that the tech crystal row no longer uses accent-color emphasis.
- Keep the existing placement/bounds coverage intact so the visual refresh does not reintroduce excessive edge padding.
- Run the full repo verification command after the restyle is implemented.
