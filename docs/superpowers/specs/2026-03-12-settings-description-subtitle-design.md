# Settings Description/Subtitle Design

## Overview

Add optional inline description text below the label on all settings controls (ToggleSwitch, SegmentedControl, SliderSetting, Button). Follows the iOS/Android settings pattern where each setting shows a concise subtitle explaining its purpose. Redundant tooltips are removed. Preset and Tech Crystals Spent controls are excluded.

## Design Decisions

- **Layout**: Description sits directly below the label text in `--font-sm` size, `--text-disabled` color. Controls (toggle, slider) remain vertically centered against the label+description block.
- **Button**: Description appears inside the button below the label, making the button taller.
- **SegmentedControl / SliderSetting**: Description appears below the label in the header area, above the segmented buttons or slider track.
- **Tooltip removal**: When a description is present and conveys the same information as the tooltip, the tooltip is removed. The `tooltipText` prop remains optional for cases where a tooltip is still needed.
- **Description text**: Rephrased to avoid redundancy with the label. Concise enough to fit the side menu width on a single line when possible.
- **Excluded controls**: Preset selector and Tech Crystals Spent — multi-purpose controls that don't fit the label+description pattern.

## Component Changes

### ToggleSwitch.svelte

Add optional `description: string | undefined` prop. When present, render below the label in the existing flex layout:

```
[icon] [label        ] [toggle]
       [description  ]
```

- Label container switches from `align-items: center` to `align-items: flex-start` when description is present
- Description uses `font-size: var(--font-sm)`, `color: var(--text-disabled)`, `line-height: var(--leading)`
- Remove `tooltipText` usage from callers where description replaces it

### SegmentedControl.svelte

Add optional `description: string | undefined` prop. When present, render below the label in the header area:

```
[icon] [label        ]
       [description  ]
[  option  |  option  |  option  ]
```

- Same styling as ToggleSwitch description
- Remove `tooltipText` usage from callers where description replaces it

### SliderSetting.svelte

Add optional `description: string | undefined` prop. When present, render below the label in the header:

```
[icon] [label        ]  [value badge]
       [description  ]
[========slider==========]
```

- Same styling as ToggleSwitch description
- Remove `tooltipText` usage from callers where description replaces it

### Button.svelte

Add optional `description: string | undefined` prop. When present, render below the slot/label content inside the button:

```
[icon] [label        ]  [arrow?]
       [description  ]
```

- Description uses `font-size: var(--font-sm)`, `color: var(--text-disabled)`, `line-height: var(--leading)`
- Button height grows to accommodate the extra line
- Label area switches to column layout when description is present
- Remove `tooltipText` usage from callers where description replaces it

## Description Text (English)

All descriptions are rephrased to avoid repeating the label wording.

### Node Settings Page

| Setting | Label | Description | Tooltip removed? |
|---------|-------|-------------|-----------------|
| Node Primary Action | "Node {action} Action" | "Increment per tap on a node" | Yes |
| Node Level Behavior | "Node Level Behavior" | "Level one node or its full lineage" | Yes |
| Show Tier Badge | "Show Tier Badge" | "Badge overlay on each node" | Yes |
| Show Skill Name Badge | "Show Skill Name Badge" | "Name label overlay on each node" | Yes |
| Level-up Splash | "Level-up Splash" | "Brief animation when leveling nodes" | Yes |

### Appearance Settings Page

| Setting | Label | Description | Tooltip removed? |
|---------|-------|-------------|-----------------|
| Font Size | "Font Size" | "Scale for labels and UI text" | Yes |
| Tree Zoom | "Tree Zoom" | "Overall tree size in the viewport" | Yes |
| Uppercase Text | "Uppercase Text" | "Capitalize all interface text" | Yes |
| Colorblind Tree | "Colorblind Tree" | "Adjusted region colors for color vision deficiencies" | Yes |
| Focus Tree in View | "Focus Tree in View" | "Reset zoom and pan to fit" | Yes |

### General Settings Page

| Setting | Label | Description | Tooltip removed? |
|---------|-------|-------------|-----------------|
| Language | "Language" | "Application display language" | Yes |
| Haptic Feedback | "Haptic Feedback" | "Vibration on supported devices" | Yes |
| Reload Window | "Reload Window" | "Refresh and load latest version" | Yes |
| Reset Settings | "Reset Settings" | "Restore defaults without affecting progress" | Yes |
| Clear All App Data | "Clear All App Data" | "Erase everything and reload" | Yes |

### Root Settings Page

| Setting | Label | Description | Tooltip removed? |
|---------|-------|-------------|-----------------|
| Preview | "Preview" | "Preview share link, code, or premade build" | Keep tooltip (button in a different context) |

## i18n Keys

New keys added under `settings.*Description` pattern in all locale files (en, ja, zh):

```
settings.nodePrimaryActionDescription
settings.nodeLevelBehaviorDescription
settings.showTierDescription
settings.showSkillNameDescription
settings.showLevelSplashDescription
settings.textSizeDescription
settings.treeZoomDescription
settings.uppercaseTextDescription
settings.colorblindTreeColorsDescription
settings.focusTreeInViewDescription
settings.languageDescription
settings.hapticsDescription
settings.reloadWindowDescription
settings.resetSettingsDescription
settings.clearAllDataDescription
```

Existing tooltip keys (`*Tooltip`) are kept in locale files but removed from component prop usage where descriptions replace them.

## Excluded Controls

- **BuildPresetsButton** — multi-purpose preset selector with complex interaction
- **TechCrystalsButton** — displays spent crystals count with special formatting
- **Preview button** (root page) — keeps its tooltip since it's a dropdown trigger, not a standard settings control
- **Theme color selector** — the color swatch itself is descriptive enough
- **Theme mode toggle** — light/dark is self-explanatory from the icons

## Testing

- Verify all descriptions render below labels and don't overflow the side menu width
- Verify tooltips are removed where descriptions replace them
- Verify excluded controls are unchanged
- Verify i18n keys work for en, ja, zh
- Run `npm test` to ensure no regressions
