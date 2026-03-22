# Controls Page Redesign

Redesign the Controls tab (third side menu tab) from an input-first accordion layout to an action-first table with device-adaptive input chips.

## Goals

- Remove all non-controls content (app header card, tutorial button, in-game instructions)
- Restructure from input-type grouping (mouse/touch/keyboard/HUD) to action-based grouping (HUD/Node/Tree)
- Show multiple input methods per action as vertically stacked, color-tinted chips
- Only display inputs relevant to the user's detected device capabilities
- Build reusable generic components (collapsible table, table row) that the controls page composes

## Removed Elements

These elements are deleted entirely (not relocated):

- App identity card (icon, name, description, version, GitHub link)
- "Show Tutorial" button
- "In-game Instructions" accordion
- Separate HUD accordion (content merged into action-based sections)

`Kbd.svelte` remains in the codebase — it is used elsewhere (tooltips, button shortcuts). It is not used by this redesign.

## Component Architecture

### Generic Components

**`CollapsibleTable.svelte`** — Grouped list with collapsible section headers.

Props:
```typescript
export let sections: { key: string; title: string; defaultOpen?: boolean }[];
```

Content is data-driven via a render callback or `{#each}` — not via named slots, since Svelte 4 cannot dynamically iterate named slots. The consumer passes section data and the component iterates with `{#each sections as section}`, rendering header + body per section. Section body content is provided via a single default slot that receives `section.key` as a let-binding, or the component accepts a `children` array alongside sections.

Alternatively, the simpler approach: `CollapsibleTable` renders only the collapsible header bars and animation wrapper. Each section is an instance of `CollapsibleSection` (header + body slot), and the parent composes N of them in a list. This avoids the slot-iteration problem entirely.

Visual:
- Section headers: full-width darker band (style B — `background: color-mix(in srgb, var(--surface) 80%, var(--text))`, top/bottom borders using `var(--border-subtle)`), collapsible with chevron
- "Full-width" means full width within the padded content area — no negative margins needed
- Expand/collapse animation: `grid-template-rows` transition (same pattern as existing `Accordion.svelte`)
- `prefers-reduced-motion`: disable transitions, matching existing `Accordion.svelte` behavior
- Chevron transition: `transform var(--ease-standard)`, rotates -90deg when collapsed

Sticky headers: Use `position: sticky; top: 0` on section headers. The scroll container is `.side-menu__content` (`overflow-y: auto`). The intermediate `.side-menu__content-inner` uses `display: grid` which does not block sticky positioning. No ancestor between the scroll container and headers has `overflow: hidden`. When multiple sections are expanded, headers stack naturally — each sticky header pushes down the previous one as the user scrolls past its section. This is the standard sticky-header-per-group behavior (like iOS contact list alphabetical headers).

Accessibility: `aria-expanded` on header buttons, `Enter`/`Space` to toggle. Standard tab-order focus navigation between headers. Full WAI-ARIA accordion pattern (`aria-controls`, panel `id` attributes) is desirable but not required for initial implementation.

**`TableRow.svelte`** — Generic row layout with leading icon, text, and trailing content.

- Props: `title: string`, `description?: string`
- Slots: `icon` (leading), default slot (trailing/right side)
- Icon alignment: icon container has a fixed height matching title + first description line (~32px based on `--font-base` at 1.3 line-height + `--font-sm` at 1.3 + 1px gap). Icon is vertically centered within this container. Container uses `align-self: flex-start` so it stays pinned regardless of how tall the row grows from wrapped description or stacked chips.
- Row uses `align-items: flex-start` with subtle bottom border separator (`1px solid` at ~4% white)

### Domain Component

**`ControlsTable.svelte`** — High-level wrapper composing `CollapsibleTable` + `TableRow` + `InputChip`.

- Defines three sections: HUD, Node, Tree
- Maps `ControlAction[]` data into `TableRow` instances with:
  - Feature/action icons in the `icon` slot (never input-method icons)
  - `InputChip` stacks in the trailing slot, filtered by device capabilities
- Device detection: implements its own detection logic inline (the existing `detectInputSupport()` is a local function in `SideMenuControlsPage.svelte`, not reusable). Detection checks `navigator.maxTouchPoints` and `matchMedia("(any-pointer: fine)")` / `matchMedia("(any-pointer: coarse)")` — same logic as the current implementation, just local to `ControlsTable`
- Chip stacking: filtered bindings rendered vertically (`flex-direction: column; gap: 3px; align-items: flex-end`)

### Reused Components

- **`InputChip.svelte`** — Unified pill with inset dividers between segments. Existing component, used as-is. Supports `tint` prop for color coding (keyboard=blue, mouse=green, touch=amber).
- **`InputChips.svelte`** — Handles `" / "` alternative separator, rendering multiple `InputChip` instances. Existing component, used as-is.

## Data Model

```typescript
type InputDevice = "mouse" | "touch" | "keyboard";

type InputBinding = {
    keys: string;           // "Left Click", "Ctrl + Z", "Tap", etc.
    device: InputDevice;    // determines both filtering AND chip tint color
};

type ControlAction = {
    id: string;
    title: string;          // localized via $t()
    description: string;    // localized via $t()
    icon: Component;        // feature/action icon
    inputs: InputBinding[];
    section: "hud" | "node" | "tree";
};
```

The `device` field serves double duty: it determines both (1) whether the chip is shown based on detected device capabilities, and (2) the `tint` prop passed to `InputChip` (keyboard=blue, mouse=green, touch=amber). This eliminates redundancy since the tint always matches the device type.

At render time, `inputs` is filtered by detected device capabilities:
- Touch-only device: only `device: "touch"` bindings
- Desktop (mouse+keyboard): `device: "mouse"` and `device: "keyboard"` bindings
- Hybrid: all bindings

Remaining chips stack vertically in priority order (primary device first).

## Section Content

### HUD (static UI elements around the game view)

| Action | Description | Inputs |
|--------|-------------|--------|
| Primary Action Indicator | Cycle between +1, +10, +Tier modes | `Left Click` (mouse), `A` (keyboard), `Tap` (touch) |
| Tech Crystal Budget | Open budget modal | `B` (keyboard) |
| Side Menu | Open or close the panel | `Esc` (keyboard) |
| Reset Active Tree | Refund Tech Crystals for tree | `Backspace` (keyboard) |
| Undo | Undo last node or budget change | `Ctrl + Z` (keyboard) |
| Redo | Redo previously undone change | `Ctrl + Y` (keyboard) |
| Root Node Quick Settings | Open quick settings | `` ` `` (keyboard) |
| Share Screenshot | Preview and share tree image(s) | `F9` (keyboard) |
| Fullscreen | Toggle fullscreen mode | `F11` (keyboard) |
| Cycle Tabs | Switch between side menu tabs | `Tab / Shift + Tab / ← / →` (keyboard) |
| Preview Build Indicator | View and edit a shared build | (no input — display-only info row) |
| Swipe Back | Go back or close side menu | `Swipe Right` (touch) |

### Node (leveling individual nodes)

| Action | Description | Inputs |
|--------|-------------|--------|
| Level Up | Add levels by node action setting (+1, +10, +Tier) | `Left Click` (mouse), `Tap` (touch) |
| Level Up (Alternate) | Add levels by alternate amount (+Tier, +1) | `Ctrl + Left Click` (mouse) |
| Level Down | Remove levels by node action setting (-1, -10, -Tier) | `Middle Click` (mouse), `Shift + Left Click` (mouse) |
| Level Down (Alternate) | Remove levels by alternate amount (-Tier, -1) | `Ctrl + Middle Click` (mouse), `Ctrl + Shift + Left Click` (mouse) |
| Node Options | Show node context menu | `Right Click` (mouse), `Long Press` (touch) |

### Tree (navigating the node cluster)

| Action | Description | Inputs |
|--------|-------------|--------|
| Pan | Pan around tree | `Drag` (mouse), `One-Finger Drag` (touch) |
| Zoom | Zoom in and out | `Scroll` (mouse), `Pinch` (touch) |
| Tree Options | Show tree context menu | `Right Click Empty Space` (mouse), `Long Press Empty Space` (touch) |
| Tooltip | Show tooltip on nodes or buttons | `Hover` (mouse) |

## Visual Design

### Section Headers (Style B)
- Full-width darker band, edge-to-edge within the side menu content area
- Background: surface mix at ~10% white
- Top and bottom borders at ~6% white
- Title: 13px, semibold, 60% white
- Chevron: 12px, 40% opacity, rotates -90deg when collapsed
- Sticky: pins to top of scroll container when scrolling

### Action Rows
- Flex row: `align-items: flex-start`, `gap: var(--spacing-md)`, `padding: var(--spacing-md) var(--spacing-lg)`
- Bottom border: `var(--border-width) solid var(--border-subtle)`
- Icon: 18×18px, `color: var(--text-muted)`, fixed-height container for alignment
- Title: `font-size: var(--font-base)` (14px / 0.875rem), `color: var(--text)`
- Description: `font-size: var(--font-xs)` (11px / 0.6875rem), `color: var(--text-disabled)`, `margin-top: 1px`
- Chips: right-aligned, `flex-direction: column`, `gap: 3px`
- Display-only rows (e.g. Preview Build Indicator): same layout but with no chips in the trailing area — the row simply has no trailing content. No special visual treatment needed; the absence of chips is self-explanatory

### Input Chips
- Reuses existing `InputChip.svelte` styling
- Color tints via OKLCH: keyboard blue `oklch(0.72 0.14 260)`, mouse green `oklch(0.75 0.12 145)`, touch amber `oklch(0.75 0.12 75)`
- Inset dividers between combo segments (no `+` separator)
- Modifier segments at 72% opacity

### Icon Alignment Detail
- Icon container height matches title line + first description line
- Calculated from: `--font-base` (14px) × `--leading` (1.3) + `--font-xs` (11px) × `--leading` (1.3) + 1px gap ≈ 33px
- Icon vertically centered within this container
- Container uses `align-self: flex-start` — stays pinned when row content grows

## Default Section States

- **HUD**: open by default
- **Node**: open on mouse/hybrid devices, collapsed on touch-only
- **Tree**: collapsed by default

## Localization

Input chip text comes from existing `getDeviceInputLabels()` and `getKeyboardActionLabel()` functions — no new input keys needed.

Action titles and descriptions need new translation keys under a `controls.actions.*` namespace. The existing `controls.*` keys are input-first (e.g. `controls.pointerNodeLabel`) and don't map cleanly to the action-first model. New keys needed:

| Key | Example EN value |
|-----|-----------------|
| `controls.actions.primaryAction` | Primary Action Indicator |
| `controls.actions.primaryActionDesc` | Cycle between +1, +10, +Tier modes |
| `controls.actions.budget` | Tech Crystal Budget |
| `controls.actions.budgetDesc` | Open budget modal |
| `controls.actions.sideMenu` | Side Menu |
| `controls.actions.sideMenuDesc` | Open or close the panel |
| `controls.actions.resetTree` | Reset Active Tree |
| `controls.actions.resetTreeDesc` | Refund Tech Crystals for tree |
| `controls.actions.undo` | Undo |
| `controls.actions.undoDesc` | Undo last node or budget change |
| `controls.actions.redo` | Redo |
| `controls.actions.redoDesc` | Redo previously undone change |
| `controls.actions.rootQuickSettings` | Root Node Quick Settings |
| `controls.actions.rootQuickSettingsDesc` | Open quick settings |
| `controls.actions.screenshot` | Share Screenshot |
| `controls.actions.screenshotDesc` | Preview and share tree image(s) |
| `controls.actions.fullscreen` | Fullscreen |
| `controls.actions.fullscreenDesc` | Toggle fullscreen mode |
| `controls.actions.cycleTabs` | Cycle Tabs |
| `controls.actions.cycleTabsDesc` | Switch between side menu tabs |
| `controls.actions.previewIndicator` | Preview Build Indicator |
| `controls.actions.previewIndicatorDesc` | View and edit a shared build |
| `controls.actions.swipeBack` | Swipe Back |
| `controls.actions.swipeBackDesc` | Go back or close side menu |
| `controls.actions.levelUp` | Level Up |
| `controls.actions.levelUpDesc` | Add levels by node action setting (+1, +10, +Tier) |
| `controls.actions.levelUpAlt` | Level Up (Alternate) |
| `controls.actions.levelUpAltDesc` | Add levels by alternate amount (+Tier, +1) |
| `controls.actions.levelDown` | Level Down |
| `controls.actions.levelDownDesc` | Remove levels by node action setting (-1, -10, -Tier) |
| `controls.actions.levelDownAlt` | Level Down (Alternate) |
| `controls.actions.levelDownAltDesc` | Remove levels by alternate amount (-Tier, -1) |
| `controls.actions.nodeOptions` | Node Options |
| `controls.actions.nodeOptionsDesc` | Show node context menu |
| `controls.actions.pan` | Pan |
| `controls.actions.panDesc` | Pan around tree |
| `controls.actions.zoom` | Zoom |
| `controls.actions.zoomDesc` | Zoom in and out |
| `controls.actions.treeOptions` | Tree Options |
| `controls.actions.treeOptionsDesc` | Show tree context menu |
| `controls.actions.tooltip` | Tooltip |
| `controls.actions.tooltipDesc` | Show tooltip on nodes or buttons |

Existing `controls.*` keys can be left in place (used by other locales' translators as reference) or cleaned up in a follow-up.

## Files Changed

- `src/lib/sideMenuPages/SideMenuControlsPage.svelte` — complete rewrite
- `src/lib/CollapsibleTable.svelte` — new generic component
- `src/lib/TableRow.svelte` — new generic component
- `src/lib/sideMenuPages/ControlsTable.svelte` — new domain wrapper (or inline in SideMenuControlsPage)
- `src/locales/en.json` (and other locales) — new/updated translation keys for action-first labels
