# Controls Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Controls tab from input-first accordion layout to an action-first table with collapsible sticky section headers and device-adaptive input chips.

**Architecture:** Build a generic `CollapsibleSection` component (sticky header + animated body), a `TableRow` component (icon + text + trailing slot), and compose them in `SideMenuControlsPage.svelte` with domain-specific controls data from `controlsData.ts`. Reuse existing `InputChip`/`InputChips` for shortcut chips with color tinting by device type.

**Tech Stack:** Svelte 5 (Svelte 4 compat syntax: `export let`, `$:` reactive), OKLCH theme CSS variables, phosphor-svelte icons, svelte-whisper i18n

**Spec:** `docs/superpowers/specs/2026-03-22-controls-page-redesign.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/CollapsibleSection.svelte` | Create | Generic collapsible section with sticky header, expand/collapse animation, slotted body content |
| `src/lib/TableRow.svelte` | Create | Generic row layout: leading icon slot, title+description text, trailing slot |
| `src/lib/sideMenuPages/controlsData.ts` | Create | `ControlAction[]` data definitions, `InputBinding` types, device filtering utility |
| `src/lib/sideMenuPages/SideMenuControlsPage.svelte` | Rewrite | Compose `CollapsibleSection` + `TableRow` + `InputChips` using data from `controlsData.ts` |
| `src/locales/en.json` | Modify | Add `controls.actions.*` keys (21 title/desc pairs) + `input.gestures.*` keys (8 gesture labels) |

**Design decision — `CollapsibleSection` over `CollapsibleTable`:** The spec offers two approaches. We use the simpler one: individual `CollapsibleSection` instances composed by the parent. Each is a self-contained header + slotted body with its own sticky positioning. The parent composes N of them in a list. This avoids Svelte 4's slot-iteration limitations entirely.

**Localization approach for input chip text:** The spec says "input chip text comes from existing `getDeviceInputLabels()` and `getKeyboardActionLabel()` functions." We use those for standard inputs (Left Click, Tap, Ctrl+Z, etc.). For gesture-type inputs not covered by existing functions (Drag, Scroll, Pinch, Hover, etc.), we add new `input.gestures.*` i18n keys.

---

### Task 1: Add translation keys

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add `controls.actions.*` keys to en.json**

Add all 21 title/description pairs (42 keys) from the spec's localization table under a new `actions` object inside the existing `controls` section. Keep existing `controls.*` keys intact.

```json
"actions": {
    "primaryAction": "Primary Action Indicator",
    "primaryActionDesc": "Cycle between +1, +10, +Tier modes",
    "budget": "Tech Crystal Budget",
    "budgetDesc": "Open budget modal",
    "sideMenu": "Side Menu",
    "sideMenuDesc": "Open or close the panel",
    "resetTree": "Reset Active Tree",
    "resetTreeDesc": "Refund Tech Crystals for tree",
    "undo": "Undo",
    "undoDesc": "Undo last node or budget change",
    "redo": "Redo",
    "redoDesc": "Redo previously undone change",
    "rootQuickSettings": "Root Node Quick Settings",
    "rootQuickSettingsDesc": "Open quick settings",
    "screenshot": "Share Screenshot",
    "screenshotDesc": "Preview and share tree image(s)",
    "fullscreen": "Fullscreen",
    "fullscreenDesc": "Toggle fullscreen mode",
    "cycleTabs": "Cycle Tabs",
    "cycleTabsDesc": "Switch between side menu tabs",
    "previewIndicator": "Preview Build Indicator",
    "previewIndicatorDesc": "View and edit a shared build",
    "swipeBack": "Swipe Back",
    "swipeBackDesc": "Go back or close side menu",
    "levelUp": "Level Up",
    "levelUpDesc": "Add levels by node action setting (+1, +10, +Tier)",
    "levelUpAlt": "Level Up (Alternate)",
    "levelUpAltDesc": "Add levels by alternate amount (+Tier, +1)",
    "levelDown": "Level Down",
    "levelDownDesc": "Remove levels by node action setting (-1, -10, -Tier)",
    "levelDownAlt": "Level Down (Alternate)",
    "levelDownAltDesc": "Remove levels by alternate amount (-Tier, -1)",
    "nodeOptions": "Node Options",
    "nodeOptionsDesc": "Show node context menu",
    "pan": "Pan",
    "panDesc": "Pan around tree",
    "zoom": "Zoom",
    "zoomDesc": "Zoom in and out",
    "treeOptions": "Tree Options",
    "treeOptionsDesc": "Show tree context menu",
    "tooltip": "Tooltip",
    "tooltipDesc": "Show tooltip on nodes or buttons"
}
```

- [ ] **Step 2: Add `input.gestures.*` keys to en.json**

Add gesture input labels inside the existing `input` section. These are chip labels for gesture-type inputs not covered by `getDeviceInputLabels()` or `getKeyboardActionLabel()`.

```json
"gestures": {
    "drag": "Drag",
    "oneFingerDrag": "One-Finger Drag",
    "scroll": "Scroll",
    "pinch": "Pinch",
    "hover": "Hover",
    "swipeRight": "Swipe Right",
    "rightClickEmpty": "Right Click Empty Space",
    "longPressEmpty": "Long Press Empty Space"
}
```

- [ ] **Step 3: Run type check**

Run: `npm run check`
Expected: PASS — no type errors

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json
git commit -m "feat: add action-first translation keys for controls page redesign"
```

---

### Task 2: Create `CollapsibleSection.svelte`

**Files:**
- Create: `src/lib/CollapsibleSection.svelte`

Reference `src/lib/Accordion.svelte` for the animation pattern — same `grid-template-rows` approach, but with different header styling (full-width darker band, sticky positioning) and no border-radius.

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
    import { CaretDownIcon } from "phosphor-svelte";
    import { triggerHaptic } from "./hapticsStore";

    export let title = "";
    export let isOpen = false;
</script>

<div class="section" class:is-open={isOpen}>
    <button
        class="section-header"
        on:click={() => { isOpen = !isOpen; triggerHaptic(); }}
        aria-expanded={isOpen}
    >
        <span class="section-title">{title}</span>
        <span class="section-arrow">
            <CaretDownIcon size={12} weight="bold" />
        </span>
    </button>
    <div class="section-body" aria-hidden={!isOpen}>
        <div class="section-content">
            <slot />
        </div>
    </div>
</div>

<style>
    .section {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-lg);
        background: color-mix(in srgb, var(--surface) 80%, var(--text));
        border-top: var(--border-width) solid var(--border-subtle);
        border-bottom: var(--border-width) solid var(--border-subtle);
        border-left: none;
        border-right: none;
        color: var(--text-muted);
        cursor: pointer;
        text-align: left;
        position: sticky;
        top: 0;
        z-index: 1;
    }

    .section-header:hover {
        filter: var(--brightness-hover);
    }

    .section-title {
        flex: 1;
        font-size: var(--font-sm);
        font-weight: var(--weight-semibold);
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--text-muted);
    }

    .section-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.4;
        color: var(--text-muted);
        transform: rotate(-90deg);
        transition: transform var(--ease-standard);
    }

    .is-open .section-arrow {
        transform: rotate(0deg);
    }

    .section-body {
        display: grid;
        grid-template-rows: 0fr;
        overflow: hidden;
        transition: grid-template-rows var(--ease-emphasis);
    }

    .is-open .section-body {
        grid-template-rows: 1fr;
    }

    .section-content {
        min-height: 0;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .is-open .section-content {
        opacity: 1;
        transition: opacity 0.2s 0.05s ease;
    }

    @media (prefers-reduced-motion: reduce) {
        .section-arrow,
        .section-body,
        .section-content {
            transition: none;
        }
    }
</style>
```

Key differences from `Accordion.svelte`:
- No `border-radius` (full-width band, not a card)
- `position: sticky; top: 0; z-index: 1` on header
- Background: `color-mix(in srgb, var(--surface) 80%, var(--text))`
- No `transform: scale(0.98)` on active (sticky headers shouldn't bounce)
- No outer border (top/bottom borders only)

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/CollapsibleSection.svelte
git commit -m "feat: add CollapsibleSection generic component with sticky headers"
```

---

### Task 3: Create `TableRow.svelte`

**Files:**
- Create: `src/lib/TableRow.svelte`

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
    export let title: string;
    export let description: string | undefined = undefined;
</script>

<li class="table-row">
    <span class="table-row-icon">
        <slot name="icon" />
    </span>
    <div class="table-row-text">
        <span class="table-row-title">{title}</span>
        {#if description}
            <span class="table-row-desc">{description}</span>
        {/if}
    </div>
    <div class="table-row-trailing">
        <slot />
    </div>
</li>

<style>
    .table-row {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: var(--border-width) solid var(--border-subtle);
    }

    .table-row:last-child {
        border-bottom: none;
    }

    .table-row-icon {
        width: 18px;
        height: 33px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        align-self: flex-start;
        color: var(--text-muted);
    }

    .table-row-icon :global(svg) {
        width: 18px;
        height: 18px;
        display: block;
    }

    .table-row-text {
        flex: 1;
        min-width: 0;
        overflow-wrap: break-word;
    }

    .table-row-title {
        display: block;
        font-size: var(--font-base);
        color: var(--text);
        line-height: var(--leading);
    }

    .table-row-desc {
        display: block;
        font-size: var(--font-xs);
        color: var(--text-disabled);
        margin-top: 1px;
        line-height: var(--leading);
    }

    .table-row-trailing {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 3px;
        flex-shrink: 0;
    }
</style>
```

Icon container height (33px) is calculated from: `--font-base` (14px) × `--leading` (1.3) + `--font-xs` (11px) × `--leading` (1.3) + 1px gap ≈ 33px. The icon is vertically centered within this container. Container uses `align-self: flex-start` to stay pinned regardless of row height.

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/TableRow.svelte
git commit -m "feat: add TableRow generic component with icon alignment"
```

---

### Task 4: Create controls data module

**Files:**
- Create: `src/lib/sideMenuPages/controlsData.ts`

- [ ] **Step 1: Create the data module**

Define types, build the `ControlAction[]` array with localized input labels, and export a device filter utility.

```typescript
import type { Component } from "svelte";
import {
    CaretUpIcon,
    ListIcon,
    TrashSimpleIcon,
    ArrowArcLeftIcon,
    ArrowArcRightIcon,
    ImageIcon,
    CornersOutIcon,
    SquaresFourIcon,
    EyeIcon,
    ArrowsOutCardinalIcon,
    MagnifyingGlassPlusIcon,
    ArrowLineLeftIcon,
    PlusCircleIcon,
    MinusCircleIcon,
    DotsThreeOutlineIcon,
} from "phosphor-svelte";
import { TechCrystalIcon, RootNodeIcon } from "../customIcons";
import { getDeviceInputLabels, getKeyboardActionLabel } from "../input";

export type InputDevice = "mouse" | "touch" | "keyboard";

export type InputBinding = {
    keys: string;
    device: InputDevice;
};

export type ControlAction = {
    id: string;
    title: string;
    description: string;
    icon: Component;
    inputs: InputBinding[];
    section: "hud" | "node" | "tree";
};

export const SECTIONS = ["hud", "node", "tree"] as const;
export type ControlSection = (typeof SECTIONS)[number];

type TranslateFn = (key: string) => string;

export function getControlActions(t: TranslateFn): ControlAction[] {
    const mouse = getDeviceInputLabels("mouse", t);
    const touch = getDeviceInputLabels("touch", t);
    function kbd(action: Parameters<typeof getKeyboardActionLabel>[0]): string {
        return getKeyboardActionLabel(action, t);
    }
    const gesture = (key: string) => t(`input.gestures.${key}`);

    return [
        // ── HUD ──
        {
            id: "hud-primary-action",
            title: t("controls.actions.primaryAction"),
            description: t("controls.actions.primaryActionDesc"),
            icon: CaretUpIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: kbd("cyclePrimaryAction"), device: "keyboard" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "hud",
        },
        {
            id: "hud-budget",
            title: t("controls.actions.budget"),
            description: t("controls.actions.budgetDesc"),
            icon: TechCrystalIcon,
            inputs: [{ keys: kbd("budget"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-side-menu",
            title: t("controls.actions.sideMenu"),
            description: t("controls.actions.sideMenuDesc"),
            icon: ListIcon,
            inputs: [{ keys: kbd("dismiss"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-reset-tree",
            title: t("controls.actions.resetTree"),
            description: t("controls.actions.resetTreeDesc"),
            icon: TrashSimpleIcon,
            inputs: [{ keys: kbd("back"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-undo",
            title: t("controls.actions.undo"),
            description: t("controls.actions.undoDesc"),
            icon: ArrowArcLeftIcon,
            inputs: [{ keys: kbd("undo"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-redo",
            title: t("controls.actions.redo"),
            description: t("controls.actions.redoDesc"),
            icon: ArrowArcRightIcon,
            inputs: [{ keys: kbd("redo"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-root-quick-settings",
            title: t("controls.actions.rootQuickSettings"),
            description: t("controls.actions.rootQuickSettingsDesc"),
            icon: RootNodeIcon,
            inputs: [{ keys: kbd("console"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-screenshot",
            title: t("controls.actions.screenshot"),
            description: t("controls.actions.screenshotDesc"),
            icon: ImageIcon,
            inputs: [{ keys: kbd("screenshot"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-fullscreen",
            title: t("controls.actions.fullscreen"),
            description: t("controls.actions.fullscreenDesc"),
            icon: CornersOutIcon,
            inputs: [{ keys: kbd("fullscreen"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-cycle-tabs",
            title: t("controls.actions.cycleTabs"),
            description: t("controls.actions.cycleTabsDesc"),
            icon: SquaresFourIcon,
            inputs: [{ keys: kbd("cycle"), device: "keyboard" }],
            section: "hud",
        },
        {
            id: "hud-preview-indicator",
            title: t("controls.actions.previewIndicator"),
            description: t("controls.actions.previewIndicatorDesc"),
            icon: EyeIcon,
            inputs: [], // display-only, no input
            section: "hud",
        },
        {
            id: "hud-swipe-back",
            title: t("controls.actions.swipeBack"),
            description: t("controls.actions.swipeBackDesc"),
            icon: ArrowLineLeftIcon,
            inputs: [{ keys: gesture("swipeRight"), device: "touch" }],
            section: "hud",
        },
        // ── Node ──
        {
            id: "node-level-up",
            title: t("controls.actions.levelUp"),
            description: t("controls.actions.levelUpDesc"),
            icon: PlusCircleIcon,
            inputs: [
                { keys: mouse.primary, device: "mouse" },
                { keys: touch.primary, device: "touch" },
            ],
            section: "node",
        },
        {
            id: "node-level-up-alt",
            title: t("controls.actions.levelUpAlt"),
            description: t("controls.actions.levelUpAltDesc"),
            icon: PlusCircleIcon,
            inputs: [{ keys: mouse.alternatePrimary, device: "mouse" }],
            section: "node",
        },
        {
            id: "node-level-down",
            title: t("controls.actions.levelDown"),
            description: t("controls.actions.levelDownDesc"),
            icon: MinusCircleIcon,
            inputs: [
                { keys: mouse.auxiliary!, device: "mouse" },
                { keys: mouse.reversePrimary, device: "mouse" },
            ],
            section: "node",
        },
        {
            id: "node-level-down-alt",
            title: t("controls.actions.levelDownAlt"),
            description: t("controls.actions.levelDownAltDesc"),
            icon: MinusCircleIcon,
            inputs: [
                { keys: mouse.alternateAuxiliary!, device: "mouse" },
                { keys: mouse.reverseAlternatePrimary!, device: "mouse" },
            ],
            section: "node",
        },
        {
            id: "node-options",
            title: t("controls.actions.nodeOptions"),
            description: t("controls.actions.nodeOptionsDesc"),
            icon: DotsThreeOutlineIcon,
            inputs: [
                { keys: mouse.secondary, device: "mouse" },
                { keys: touch.secondary, device: "touch" },
            ],
            section: "node",
        },
        // ── Tree ──
        {
            id: "tree-pan",
            title: t("controls.actions.pan"),
            description: t("controls.actions.panDesc"),
            icon: ArrowsOutCardinalIcon,
            inputs: [
                { keys: gesture("drag"), device: "mouse" },
                { keys: gesture("oneFingerDrag"), device: "touch" },
            ],
            section: "tree",
        },
        {
            id: "tree-zoom",
            title: t("controls.actions.zoom"),
            description: t("controls.actions.zoomDesc"),
            icon: MagnifyingGlassPlusIcon,
            inputs: [
                { keys: gesture("scroll"), device: "mouse" },
                { keys: gesture("pinch"), device: "touch" },
            ],
            section: "tree",
        },
        {
            id: "tree-options",
            title: t("controls.actions.treeOptions"),
            description: t("controls.actions.treeOptionsDesc"),
            icon: DotsThreeOutlineIcon,
            inputs: [
                { keys: gesture("rightClickEmpty"), device: "mouse" },
                { keys: gesture("longPressEmpty"), device: "touch" },
            ],
            section: "tree",
        },
        {
            id: "tree-tooltip",
            title: t("controls.actions.tooltip"),
            description: t("controls.actions.tooltipDesc"),
            icon: EyeIcon,
            inputs: [{ keys: gesture("hover"), device: "mouse" }],
            section: "tree",
        },
    ];
}

export function filterByDevice(
    inputs: InputBinding[],
    showMouse: boolean,
    showTouch: boolean,
    showKeyboard: boolean,
): InputBinding[] {
    return inputs.filter((b) => {
        if (b.device === "mouse") return showMouse;
        if (b.device === "touch") return showTouch;
        if (b.device === "keyboard") return showKeyboard;
        return false;
    });
}
```

Notes:
- `getKeyboardActionLabel("cycle", t)` already returns the full composed string `"Tab / Shift + Tab / ← / →"` with Mac adaptation — no manual composition needed
- `getDeviceInputLabels("mouse", t)` provides `primary` ("Left Click"), `secondary` ("Right Click"), `auxiliary` ("Middle Click"), `alternatePrimary` ("Ctrl + Left Click"), `reversePrimary` ("Shift + Left Click"), `alternateAuxiliary` ("Ctrl + Middle Click"), `reverseAlternatePrimary` ("Ctrl + Shift + Left Click")
- `getDeviceInputLabels("touch", t)` provides `primary` ("Tap"), `secondary` ("Long Press")
- Gesture labels come from the new `input.gestures.*` i18n keys added in Task 1
- The `device` field on `InputBinding` serves double duty: it determines both (1) whether the chip shows based on device capabilities, and (2) the `tint` prop color (keyboard=blue, mouse=green, touch=amber) since `InputChip`'s tint prop accepts the same `"keyboard" | "mouse" | "touch"` values

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/controlsData.ts
git commit -m "feat: add controls data module with action-first data model"
```

---

### Task 5: Rewrite `SideMenuControlsPage.svelte`

**Files:**
- Rewrite: `src/lib/sideMenuPages/SideMenuControlsPage.svelte`

- [ ] **Step 1: Rewrite the controls page**

Replace the entire file. The new page composes `CollapsibleSection` + `TableRow` + `InputChips` using data from `controlsData.ts`.

```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-whisper";
    import CollapsibleSection from "../CollapsibleSection.svelte";
    import TableRow from "../TableRow.svelte";
    import InputChips from "../InputChips.svelte";
    import {
        type ControlSection,
        SECTIONS,
        getControlActions,
        filterByDevice,
    } from "./controlsData";

    let showMouse = true;
    let showTouch = true;
    let showKeyboard = true;

    let sectionOpen: Record<ControlSection, boolean> = {
        hud: true,
        node: true,
        tree: false,
    };

    function detectInputSupport() {
        let supportsTouch = false;
        let supportsMouse = false;

        if (typeof navigator !== "undefined") {
            supportsTouch = (navigator.maxTouchPoints ?? 0) > 0;
        }

        if (typeof window !== "undefined" && window.matchMedia) {
            supportsMouse =
                window.matchMedia("(any-pointer: fine)").matches ||
                window.matchMedia("(pointer: fine)").matches;
            supportsTouch =
                supportsTouch ||
                window.matchMedia("(any-pointer: coarse)").matches ||
                window.matchMedia("(pointer: coarse)").matches;
        }

        if (!supportsTouch && !supportsMouse) {
            supportsMouse = true;
        }

        showMouse = supportsMouse;
        showTouch = supportsTouch;
        showKeyboard = supportsMouse;

        sectionOpen.node = supportsMouse;
    }

    onMount(detectInputSupport);

    $: actions = getControlActions($t);

    $: grouped = SECTIONS.map((key) => ({
        key,
        title: $t(`sideMenu.sections.${key}`),
        items: actions
            .filter((a) => a.section === key)
            .map((a) => ({
                ...a,
                filteredInputs: filterByDevice(
                    a.inputs,
                    showMouse,
                    showTouch,
                    showKeyboard,
                ),
            })),
    }));
</script>

<div class="controls-page">
    {#each grouped as section}
        <CollapsibleSection
            title={section.title}
            bind:isOpen={sectionOpen[section.key]}
        >
            <ul class="control-list">
                {#each section.items as action (action.id)}
                    <TableRow
                        title={action.title}
                        description={action.description}
                    >
                        <svelte:component
                            this={action.icon}
                            slot="icon"
                        />
                        {#each action.filteredInputs as input}
                            <InputChips
                                keys={input.keys}
                                tint={input.device}
                            />
                        {/each}
                    </TableRow>
                {/each}
            </ul>
        </CollapsibleSection>
    {/each}
</div>

<style>
    .controls-page {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .control-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
</style>
```

Notes:
- `input.device` is passed directly as `tint` — the `InputDevice` type (`"mouse" | "touch" | "keyboard"`) matches `InputChip`'s tint prop exactly, so no conversion function needed
- `InputChips` (not `InputChip`) is used because it handles the `" / "` separator for multi-key alternatives (e.g., `"Tab / Shift + Tab / ← / →"` → 4 chips)
- `<svelte:component this={action.icon} slot="icon" />` assigns the dynamically rendered icon into `TableRow`'s named icon slot
- The scroll container for sticky headers is `.side-menu__content` (in `SideMenu.svelte`), which has `overflow-y: auto`. The intermediate `.side-menu__content-inner` uses `display: grid` which does not block sticky positioning

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuControlsPage.svelte
git commit -m "feat: rewrite controls page with action-first layout and device-adaptive chips"
```

---

### Task 6: Visual testing and polish

**Files:**
- May modify: `src/lib/CollapsibleSection.svelte`, `src/lib/TableRow.svelte`, `src/lib/sideMenuPages/SideMenuControlsPage.svelte`

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open in browser and verify visuals**

Open the app, navigate to the side menu's Controls tab. Verify:
1. Section headers render as full-width darker bands with uppercase titles
2. Sticky headers work — scroll within an expanded section and confirm the header pins to top
3. Input chips show correct color tints (green=mouse, blue=keyboard, amber=touch)
4. Icon alignment — icons vertically centered with title + first description line
5. Display-only row (Preview Build Indicator) renders without chips in the trailing area
6. `InputChips` for "Cycle Tabs" renders as 4 separate pills: [Tab] [Shift│Tab] [←] [→]
7. Multi-modifier combos render correctly (e.g., "Ctrl + Shift + Left Click" → [Ctrl│Shift│Left Click])

- [ ] **Step 3: Test collapsed state**

Click section headers to collapse/expand. Verify:
- Chevron rotates smoothly (-90deg collapsed → 0deg open)
- Content animates in/out with grid-template-rows transition
- Collapsed sections show only the header bar

- [ ] **Step 4: Test device filtering (if possible)**

Use browser DevTools to emulate a touch-only device. Verify:
- Only touch chips display
- Mouse and keyboard chips are hidden
- Node section defaults to collapsed

- [ ] **Step 5: Fix any visual issues found**

Address spacing, alignment, color, or layout issues discovered during testing. Common things to check:
- Chip text not truncated
- Long descriptions wrap correctly without breaking icon alignment
- Section headers don't overlap content when sticky
- Check `TechCrystalIcon` renders correctly without explicit `weight="fill"` — if it looks wrong, add `weight="fill"` by extending the data model with an `iconProps` field

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: PASS — no regressions (this is a UI-only change, existing tests should pass)

- [ ] **Step 7: Commit any polish fixes**

```bash
git add -A
git commit -m "fix: polish controls page layout and visual details"
```

---

### Task 7: Final cleanup

**Files:**
- May modify: `src/lib/sideMenuPages/SideMenuControlsPage.svelte`

- [ ] **Step 1: Remove dead imports from the old controls page**

The old controls page imported components that may now be unused. Use grep to verify each is still referenced somewhere in the codebase before removing:
- `CyclingIcon.svelte` — check if used elsewhere
- `Kbd.svelte` — used in tooltips and button shortcuts per spec, do NOT remove
- `NumberedList.svelte` — used in `AboutSettingsPage.svelte`
- `InstallPwaButton.svelte` — used in `GeneralSettingsPage.svelte` and `App.svelte`
- `AppIcon.svelte` — used in `AboutSettingsPage.svelte`
- `LongPressIcon.svelte` — check if used elsewhere
- `PinchIcon.svelte` — check if used elsewhere

Only remove components/icons confirmed unused after grepping the entire `src/` directory.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove unused imports after controls page redesign"
```
