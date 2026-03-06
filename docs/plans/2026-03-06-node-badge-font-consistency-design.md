# Node Badge Font Consistency Design (2026-03-06)

## Summary
Stabilize node badge text rendering across mobile and desktop while keeping native system fonts. The fix is CSS-focused and scoped to badge typography/alignment, with a small global text-scaling guard for mobile.

Approved preference:
- Keep native system fonts.
- Increase badge text size to `12px`.
- Use `bold` for badge weight.

## Goals
- Remove perceived 1px badge text drift on iOS/Android compared to desktop.
- Keep badge legibility stable under tree zoom levels.
- Avoid broad typography regressions across the app.

## Non-goals
- No custom webfont adoption.
- No changes to node-level behavior, tree math, or gesture interactions.
- No visual redesign of badges beyond stability/alignment.

## Current State
- Global typography inherits from a mixed stack in `src/app.css`.
- Badge text in `src/lib/Node.svelte` uses tiny metrics and asymmetric vertical padding, which is sensitive to platform font differences.
- Badge anchors counter-scale (`1 / scale`) while the tree canvas itself scales, producing fractional transform combinations on mobile.

## Selected Approach
Use a scoped badge typography/alignment hardening strategy, plus mobile text-size-adjust safeguards.

### Why this approach
- Targets the inconsistency directly where it appears.
- Preserves native system-font strategy.
- Minimizes risk to the rest of the UI.

## Detailed Design

### 1) Badge typography and centering hardening (`src/lib/Node.svelte`)
- Keep existing badge anchor counter-scaling behavior.
- Normalize badge content centering with layout-based alignment:
  - `display: inline-flex`
  - `align-items: center`
  - `justify-content: center`
  - fixed or minimum badge height to avoid font-metric drift
- Replace asymmetric vertical spacing with symmetric vertical treatment.
- Keep badge typography explicit:
  - `font-size: 12px`
  - `font-weight: bold`
  - `font-variant-numeric: tabular-nums`
  - explicit system font stack on `.node-badge` (system-ui / platform system fallbacks)

### 2) Mobile text inflation guard (`src/app.css`)
Add the following on `html, body`:
- `text-size-adjust: 100%`
- `-webkit-text-size-adjust: 100%`

This prevents browser auto text-size inflation from shifting tiny badge labels on mobile.

### 3) Screenshot export parity (`src/lib/buildImageExport/captureService.ts`)
- Extend inline-copied badge style properties to include typography-critical properties used by the updated badge styles (font family/size/weight, line height, letter spacing, numeric variant where applicable).
- Keep existing anchor transform normalization used by capture.

## Error Handling / Edge Cases
- 1-digit and multi-digit badge values remain centered.
- Tier badges (`Tn`) and star badges maintain proper alignment.
- Zoomed-out states (where anchor counter-scaling > 1) preserve badge readability.

## Testing Strategy
1. Manual visual checks on desktop + mobile-sized viewport:
- Compare node level and tier badges at default zoom and zoomed-out states.
- Confirm no obvious up/left drift.

2. Screenshot capture regression check:
- Verify exported tree images preserve updated badge typography/positioning.

3. Standard validation:
- Run `npm test` before merge of implementation changes.

## Acceptance Criteria
- Mobile badges no longer appear consistently offset versus desktop.
- Badge text remains centered and legible for common values.
- No regressions in screenshot/export badge appearance.

## Risks and Mitigations
- Risk: fixed badge height could clip unusual glyphs on some locales.
- Mitigation: use min-height and verify with locale set(s) in QA.

- Risk: `bold` maps slightly differently across platforms.
- Mitigation: combine with centering layout and size increase; revisit to numeric `700` only if drift persists.

## Rollout
- Implement as a focused CSS/visual parity patch.
- Validate with `npm test` and quick manual viewport checks before merge.
