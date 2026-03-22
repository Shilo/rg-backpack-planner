# Controls Page Redesign

Redesign the Controls tab (third side menu tab) from an input-first accordion layout to an action-first table with device-adaptive input chips.

## Goals

- Remove all non-controls content (app header card, tutorial button, in-game instructions)
- Restructure from input-type grouping (mouse/touch/keyboard/HUD) to action-based grouping (HUD/Node/Tree)
- Show multiple input methods per action as vertically stacked, color-tinted chips
- Only display inputs relevant to the user's detected device capabilities
- Build reusable generic components (collapsible table, table row) that the controls page composes

## Removed Elements

- App identity card (icon, name, description, version, GitHub link)
- "Show Tutorial" button
- "In-game Instructions" accordion
- Separate HUD accordion (content merged into action-based sections)

## Component Architecture

### Generic Components

**`CollapsibleTable.svelte`** — Grouped list with collapsible sticky section headers.

- Props: section titles, open/closed state per section
- Content via slots — each section body is slotted, not data-driven
- Section headers: full-width darker band (style B — `background: rgba surface mix`, top/bottom borders, edge-to-edge), collapsible with chevron
- Headers use `position: sticky; top: 0` so they pin when scrolling through expanded content
- Expand/collapse animation: `grid-template-rows` transition (same pattern as existing `Accordion.svelte`)
- Accessibility: `aria-expanded` on header buttons, `Enter`/`Space` to toggle

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
- Device detection: reuses existing `detectInputSupport()` pattern to determine which `InputBinding.device` values to show
- Chip stacking: filtered bindings rendered vertically (`flex-direction: column; gap: 3px; align-items: flex-end`)

### Reused Components

- **`InputChip.svelte`** — Unified pill with inset dividers between segments. Existing component, used as-is. Supports `tint` prop for color coding (keyboard=blue, mouse=green, touch=amber).
- **`InputChips.svelte`** — Handles `" / "` alternative separator, rendering multiple `InputChip` instances. Existing component, used as-is.

## Data Model

```typescript
type InputBinding = {
    keys: string;           // "Left Click", "Ctrl + Z", "Tap", etc.
    tint: "keyboard" | "mouse" | "touch";
    device: "mouse" | "touch" | "keyboard";
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
- Flex row: `align-items: flex-start`, `gap: 10px`, `padding: 10px 16px`
- Bottom border: `1px solid` at ~4% white
- Icon: 18×18px, `color: --text-muted`, fixed-height container for alignment
- Title: `--font-base` (13px), `color: --text` (85% white)
- Description: `--font-sm` (11px), `color: --text-disabled` (38% white), 1px margin-top
- Chips: right-aligned, `flex-direction: column`, `gap: 3px`

### Input Chips
- Reuses existing `InputChip.svelte` styling
- Color tints via OKLCH: keyboard blue `oklch(0.72 0.14 260)`, mouse green `oklch(0.75 0.12 145)`, touch amber `oklch(0.75 0.12 75)`
- Inset dividers between combo segments (no `+` separator)
- Modifier segments at 72% opacity

### Icon Alignment Detail
- Icon container height matches title line + first description line
- Calculated from: `--font-base` × `--leading` (1.3) + `--font-sm` × `--leading` (1.3) + 1px gap ≈ 32px
- Icon vertically centered within this container
- Container uses `align-self: flex-start` — stays pinned when row content grows

## Default Section States

- **HUD**: open by default
- **Node**: open on mouse/hybrid devices, collapsed on touch-only
- **Tree**: collapsed by default

## Localization

- Action titles and descriptions use existing `$t()` translation keys where possible
- New translation keys will be needed for some renamed/merged actions
- Input chip text comes from existing `getDeviceInputLabels()` and `getKeyboardActionLabel()` functions

## Files Changed

- `src/lib/sideMenuPages/SideMenuControlsPage.svelte` — complete rewrite
- `src/lib/CollapsibleTable.svelte` — new generic component
- `src/lib/TableRow.svelte` — new generic component
- `src/lib/sideMenuPages/ControlsTable.svelte` — new domain wrapper (or inline in SideMenuControlsPage)
- `src/locales/en.json` (and other locales) — new/updated translation keys for action-first labels
