# Onboarding Overlay Design

**Date:** 2026-03-13
**Status:** Approved

## Problem

New users land on an empty tech tree with no guidance on how to interact with nodes or navigate the tree. The Controls tab in the side menu has comprehensive help content, but it's buried behind a menu button and organized as a wall of text. Users must discover interactions through trial and error.

## Solution

A contextual overlay shown once on first-ever app load. It displays a real cloned Node component as a visual anchor, surrounded by input-aware control chips that teach the two core interaction categories: node controls and tree controls.

## Audience

Active Run! Goddess players who understand the game's backpack tech tree mechanics (tiers, crystals, branches) but need to learn the tool's UI controls.

## Design

### Layout: Two-Zone Spotlight + Chips

The overlay has two visual zones separated by a subtle divider:

**Nodes zone** (accent-colored, with spotlight node):
- A cloned `Node` component rendered with representative props (`skillId="attack_boost"`, `state="available"`, `level=0`, `region="right"`, `showSkillName=true`, `showTier=true`)
- Shows skill name badge above and level/tier badge below — exactly like a real tree node
- Control chips below the node with Phosphor icons

**Tree zone** (neutral/muted chips, no spotlight):
- Control chips for tree-level interactions
- Visually subordinate to the node zone (muted colors vs accent)

### Input-Aware Chips

Detected via `matchMedia("(pointer: coarse)")` — same pattern used by `ContextMenu.svelte`, `ModalHost.svelte`, and `NodeSettingsPage.svelte`.

**Mouse user (6 chips):**

| Zone | Icon | Label | Description |
|------|------|-------|-------------|
| Nodes | MouseLeftClickIcon | Left Click | Level up |
| Nodes | MouseRightClickIcon | Right Click | Options |
| Nodes | MouseMiddleClickIcon | Middle Click | Level down |
| Tree | MouseRightClickIcon | Right Click | Tree options |
| Tree | ArrowsOutCardinalIcon | Click + Drag | Pan |
| Tree | MouseScrollIcon | Scroll | Zoom |

**Touch user (5 chips):**

| Zone | Icon | Label | Description |
|------|------|-------|-------------|
| Nodes | HandTapIcon | Tap | Level up |
| Nodes | LongPressIcon | Long Press | Options |
| Tree | LongPressIcon | Long Press | Tree options |
| Tree | HandGrabbingIcon | Swipe | Pan |
| Tree | PinchIcon | Pinch | Zoom |

### Dismissal

- Click/tap anywhere dismisses the overlay
- Dismiss hint at the bottom: "Click anywhere to start" (mouse) / "Tap anywhere to start" (touch)

## Architecture

### New Files

**`src/lib/OnboardingOverlay.svelte`**

The overlay component. Renders inside `Tree.svelte` to inherit `getContext("tree")` required by the cloned `Node` component.

Structure:
- Fixed-position overlay covering the full viewport
- Dark semi-transparent backdrop (`rgba(0,0,0,0.75)`)
- Centered content: section labels, cloned Node, chip groups, dismiss hint
- Listens for `click`/`pointerdown` on the overlay to dismiss

The cloned Node is non-interactive (pointer-events disabled on the node itself). It serves purely as a visual anchor.

**`src/lib/onboardingStore.ts`**

LocalStorage-backed store following existing patterns (`storage.ts` helpers).

- Key: `rg-backpack-planner-onboarding-seen`
- Value: boolean
- Read once on mount; set to `true` when overlay is dismissed
- Separate from version tracking (`latestUsedVersionStore.ts`) — only fires on first-ever load, not version updates

### Modified Files

**`src/lib/Tree.svelte`**

- Import `OnboardingOverlay.svelte` and `onboardingStore`
- Conditionally render the overlay when the store indicates first load
- Pass dismiss callback that updates the store

### Icons

All icons are already imported in `SideMenuControlsPage.svelte` and available in the project:
- From `phosphor-svelte`: `MouseLeftClickIcon`, `MouseRightClickIcon`, `MouseMiddleClickIcon`, `MouseScrollIcon`, `HandTapIcon`, `HandGrabbingIcon`, `ArrowsOutCardinalIcon`
- Custom: `LongPressIcon` (`src/lib/icons/LongPressIcon.svelte`), `PinchIcon` (`src/lib/icons/PinchIcon.svelte`)

## i18n

Reuse existing locale keys where possible:
- `controls.pointerNodeLabel` → "Left Click a Node"
- `controls.pointerNodeMenuLabel` → "Right Click a Node"
- `controls.touchNodeLabel` → "Tap a Node"
- `controls.touchNodeMenuLabel` → "Long Press a Node"

New keys needed (short chip labels and descriptions):
- `onboarding.nodesSection` → "Nodes"
- `onboarding.treeSection` → "Tree"
- `onboarding.levelUp` → "Level up"
- `onboarding.options` → "Options"
- `onboarding.levelDown` → "Level down"
- `onboarding.treeOptions` → "Tree options"
- `onboarding.pan` → "Pan"
- `onboarding.zoom` → "Zoom"
- `onboarding.dismissClick` → "Click anywhere to start"
- `onboarding.dismissTap` → "Tap anywhere to start"
- Chip action labels: `onboarding.leftClick`, `onboarding.rightClick`, `onboarding.middleClick`, `onboarding.clickDrag`, `onboarding.scroll`, `onboarding.tap`, `onboarding.longPress`, `onboarding.swipe`, `onboarding.pinch`

All keys added to `en.json`, `ja.json`, `zh.json`.

## Animation

**Enter:**
- Backdrop fades in (opacity 0 → 1, 300ms)
- Node scales up from 0.9 → 1 with opacity (250ms, `--ease-decel`)
- Chips stagger in with 50ms delays (opacity + translateY)

**Exit:**
- Everything fades out together (200ms)

**Reduced motion:**
- `prefers-reduced-motion`: instant show/hide, no scale or stagger animations

## Persistence

- Uses `storage.ts` helpers with the existing `rg-backpack-planner-` prefix
- Key: `onboarding-seen`
- Never shown again after dismissal — no "show tutorial again" option (users can find controls in the side menu)
- Independent of `latestUsedVersionStore` — version updates do not re-trigger onboarding

## Scope Boundaries

**In scope:**
- OnboardingOverlay component
- onboardingStore
- Integration into Tree.svelte
- i18n keys for all three locales
- Enter/exit animations with reduced-motion support

**Out of scope:**
- "Show tutorial again" setting
- Multi-step or paginated walkthrough
- Tooltips or progressive disclosure on individual features
- Changes to the Controls page
