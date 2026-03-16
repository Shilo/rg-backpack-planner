# Compose Screenshot Tech Crystal Cards Design

**Date:** 2026-03-16

## Summary

Update composed screenshot exports so each rendered image gets a single, tightly anchored metadata card that includes tech crystals spent. Tree images should show the tree name plus that tree's tech crystal total. The combined build image should show the total build tech crystals and optionally include the custom build title above the total when the preset name is not default.

The new cards should feel like a refined extension of the existing export styling rather than separate floating badges. All drawn cards remain controlled by the existing labels toggle: when labels are off, no cards render at all.

## Goals

- Show one metadata card per exported image instead of separate title and value badges.
- Add tech crystal totals to all labeled screenshot exports.
- Match the statistics page's tech crystal calculations and number formatting.
- Keep cards visually tight to the image corners without clipping any painted pixels.
- Preserve the current capture pipeline and failure handling.

## Non-Goals

- Do not change the screenshot tabs, filenames, or sharing flows.
- Do not add partial-card fallbacks when capture fails.
- Do not move card rendering into live DOM overlays before capture.
- Do not add backward-compatibility wrappers for the previous label payload shape.

## Interaction Model

- The compose labels toggle continues to control every drawn overlay card.
- When labels are enabled:
  - Guardian, Vanguard, and Cannon each get one top-right metadata card.
  - The combined image gets one bottom-right metadata card.
- When labels are disabled:
  - No metadata cards render on any image, including the combined image.

## Card Content

Each tree card should contain:

- Tree name on the first line
- Tech crystal row on the second line
- `TechCrystalIcon` visually positioned to the left of the formatted amount

The combined build card should contain:

- Optional custom build title on the first line when the active preset name is not default
- Total build tech crystals on the final line
- The same tech crystal icon placed to the left of the formatted total

The combined card should always include the total tech crystal value whenever cards are enabled, even if no custom build title is shown.

## Layout And Visual Direction

- Cards should stay in the same visual family as the current screenshot labels: rounded plaque, theme-derived background, border, and text colors.
- The layout should be consolidated into a single plaque per image with a quiet, utility-first feel.
- Per-tree cards anchor to the top-right corner.
- The combined card anchors to the bottom-right corner.
- Placement should be driven by measured outer bounds, not a large fixed margin. The renderer should compute the full painted footprint, including shadow and stroke, then inset only by the minimum safe distance needed to keep every drawn pixel inside the image.
- The tech crystal row should be the visual focal point of the card, with the icon and number aligned as one composed unit.

## Data Flow

- `ComposeScreenshotContent.svelte` should continue to decide whether labels are enabled.
- When labels are enabled, it should build a complete metadata payload for all four exports:
  - per-tree names
  - per-tree tech crystal totals
  - total build tech crystal total
  - optional custom build title
- Tech crystal values should come from the same stores used by `SideMenuStatisticsPage.svelte` so exported values match the visible statistics UI exactly.
- Numbers should be formatted with `svelte-whisper` `formatNumber` before being passed to the capture layer.
- `captureService.ts` should receive ready-to-render strings plus card placement intent rather than owning stats calculations or number formatting rules.

## Rendering Strategy

- Keep the current post-capture canvas composition flow.
- Replace the simple text badge renderer with a metadata-card renderer that:
  - measures all text lines
  - reserves icon-row space
  - draws one unified plaque
  - places content according to a top-right or bottom-right anchor
- Because the export path is canvas-based, the tech crystal icon should be drawn through a dedicated canvas helper that matches the `TechCrystalIcon` silhouette closely enough for export parity without adding DOM-capture timing risk.
- The combined export flow should draw the combined card only after the three tree images have been merged.

## Error Handling

- Preserve the current toast and `null`-return behavior when capture fails.
- If any formatted tech crystal value is unavailable, fall back to `"0"` at the payload-building layer.
- If the active build name is default, omit the title line from the combined card rather than rendering placeholder text.

## Testing

- Add fail-first source-contract tests for the new screenshot metadata payload in `ComposeScreenshotContent.svelte`.
- Add fail-first source-contract tests that verify `captureService.ts` uses a single metadata-card renderer rather than separate title/value badge behavior.
- Add coverage that the capture renderer computes measured corner insets instead of relying on the old oversized card margin.
- Add coverage that the combined export path includes total tech crystals whenever cards are enabled, even without a custom build title.
- Run the repo verification command after implementation work is complete.
