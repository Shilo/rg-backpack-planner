# Settings Paging Design

## Overview

Refactor the settings side menu from a single scrollable page into a root page with category-based subpages. Reduces vertical scrolling while keeping high-priority actions immediately accessible. Navigation follows iOS/Android conventions: subpages slide in from right with a back button, one page loaded at a time.

## Page Structure

### Root Page (`RootSettingsPage.svelte`)

Contains build actions and tree operations — things users do every session.

**Preview section** (conditional, at top):
- `SideMenuPreviewSection` — shown when `$isPreviewMode` is true (same as current behavior)

**Build section** (unchanged controls):
- BuildPresetsButton
- TechCrystalsButton
- ShareBuildButton + Preview dropdown button
- `PreviewBuildsDropdown` — portaled dropdown (state lives in this component: `previewButtonElement`, `dropdownMenuX`, `dropdownMenuY`, `dropdownMenuOpen`)

**[Active Tree Name] section**:
- FocusInViewButton (use existing `src/lib/buttons/FocusInViewButton.svelte` with `onPress={() => onClose?.()}` to close menu after focus, `viewState={activeTreeViewState}`, `focusViewState={activeTreeFocusViewState}`)
- Reset Tree (ResetTreeButton — accesses `$treeLevels` store directly, same as current)
- Reset All Trees (ResetAllTreesButton — accesses `$treeLevels` store directly, same as current)

**Settings navigation** (new `SettingsNavButton` links):
- **Node** — icon: `CursorClickIcon`, description: "Primary action, level behavior"
- **Appearance** — icon: `PaletteIcon`, description: "Theme, zoom, text size"
- **General** — icon: `GearSixIcon`, description: "Language, haptics, reset"

**Props received from shell:**
- `activeTreeName: string`
- `activeTreeIndex: number`
- `activeTreeViewState: TreeViewState | null`
- `activeTreeFocusViewState: TreeViewState | null`
- `onClose: (() => void) | null`
- `onResetAll: (() => void) | null`
- `onResetTree: (() => void) | null`
- `onFocusInView: (() => void) | null`
- `onNavigate: (page: SettingsPageId) => void` — triggers page transition in shell

### Node Subpage (`NodeSettingsPage.svelte`)

- Node Primary Action (segmented: +1 / +10 / +Tier)
- Node Level Behavior (segmented: Solo / Sync)
- Show Skill Name (toggle)
- Show Tier (toggle)

**Props:** `onBack: () => void`

### Appearance Subpage (`AppearanceSettingsPage.svelte`)

- Theme Color selector + Dark Mode toggle (button-group row)
- Tree Zoom (segmented: Fit / Close-Up)
- Colorblind Tree Colors (toggle)
- Uppercase Text (toggle)
- Text Size (slider)

**Props:** `onBack: () => void`

### General Subpage (`GeneralSettingsPage.svelte`)

Main content:
- Language dropdown
- Haptics (toggle)
- Fullscreen (toggle)
- Install App (button)
- Reload Window (button)

Danger zone (via `SettingsPage` named slot):
- Reset Settings (negative button, opens confirm modal)
- Clear All Data (negative button, opens confirm modal)

**Props:** `onBack: () => void`, `onClose: (() => void) | null` (needed for Reset Settings which closes the menu after resetting)

## Components

### `SettingsPage.svelte` — Base component

Wraps all settings pages (root and subpages).

**Props:**
- `title: string | undefined = undefined` — page title displayed in header. When undefined, no header is rendered (root page).
- `onBack: (() => void) | null = null` — renders back button in header when set

**Slots:**
- Default — main settings content
- `advancedSettings` — collapsible "Advanced" section. Uses the existing `Accordion.svelte` component internally with the title set to the `$t("settings.advanced")` i18n key. Collapsed by default. Resets to collapsed on page unload. Only renders the accordion if the slot has content.
- `dangerZone` — always-visible section at bottom. Tinted separator line (using `--danger-border` color) + "Danger Zone" label in `--danger-text` color + slot content with grid layout matching `SideMenuSection` content gap.

**Section ordering:** main content → advanced settings → danger zone.

**Header rendering logic:**
- `title` is defined and `onBack` is set → render back button + title
- `title` is defined and `onBack` is null → render title only (no back button)
- `title` is undefined → no header at all

Note: The `advancedSettings` slot has no current consumers. It is included per explicit user request for anticipated future use, overriding the project's "no unused code" convention. No subpage currently defines advanced settings content.

### `SettingsNavButton.svelte` — Subpage navigation link

A button that navigates to a subpage.

**Props:**
- `icon: Component | null = null` — left icon (phosphor-svelte component)
- `title: string` — primary text
- `description: string` — secondary text (smaller, muted)
- `onClick: () => void` — navigation callback

**Rendering:**
- Styled like `Button.svelte` (same `--bg-raised`, `--border`, `--radius` tokens)
- Layout: flex row — icon | title+description column | `CaretRightIcon` (size 12, opacity 0.5)
- Title: `--text-muted` color, `--font-base` size
- Description: `--text-disabled` color, `--font-sm` size, `line-height: var(--leading)`
- Hover: `filter: var(--brightness-hover)`
- Active: `transform: scale(0.96)`
- Disabled state: same pattern as `Button.svelte`
- Haptic feedback on click via `triggerHaptic()`
- Focus-visible: `outline: 2px solid var(--border-focus); outline-offset: 2px`

### `SideMenuSettingsPage.svelte` — Shell (modified)

Becomes a thin navigation shell managing page state and transitions.

**State:**
```typescript
// Export from <script context="module"> so subpages can import the type
export type SettingsPageId = "root" | "node" | "appearance" | "general";
let currentPage: SettingsPageId = "root";
let transitionDirection: "forward" | "back" = "forward";
let lastNavigatedPage: SettingsPageId = "root"; // for focus restoration
```

**Lazy loading — cache-variable pattern** (matching `SideMenu.svelte`'s existing approach):
```typescript
let RootPage: any = null;
let NodePage: any = null;
let AppearancePage: any = null;
let GeneralPage: any = null;

async function loadPage(page: SettingsPageId): Promise<void> {
    if (page === "root" && !RootPage) {
        RootPage = (await import("./RootSettingsPage.svelte")).default;
    } else if (page === "node" && !NodePage) {
        NodePage = (await import("./NodeSettingsPage.svelte")).default;
    } else if (page === "appearance" && !AppearancePage) {
        AppearancePage = (await import("./AppearanceSettingsPage.svelte")).default;
    } else if (page === "general" && !GeneralPage) {
        GeneralPage = (await import("./GeneralSettingsPage.svelte")).default;
    }
}

$: void loadPage(currentPage);
```

**Navigation functions:**
```typescript
function navigateTo(page: SettingsPageId) {
    transitionDirection = "forward";
    currentPage = page;
}

function navigateBack() {
    transitionDirection = "back";
    currentPage = "root";
}
```

**Rendering:** Uses `<svelte:component this={currentComponent} />` where `currentComponent` is derived from `currentPage` and the cached variables. Passes all props through to root page; passes `onBack={navigateBack}` to subpages.

## Transitions

**Approach:** CSS class-driven transitions (consistent with `SideMenu.svelte`'s existing `transform: translateX()` pattern). Not using Svelte's `transition:` directive.

**Forward (root → subpage):**
- Both pages briefly coexist in an `overflow: hidden` container
- Outgoing page: `position: absolute`, animates `transform: translateX(0) → translateX(-30%)`
- Incoming page: `position: absolute`, animates `transform: translateX(100%) → translateX(0)`
- Duration: `0.15s ease`

**Back (subpage → root):**
- Reverse: outgoing `translateX(0) → translateX(100%)`, incoming `translateX(-30%) → translateX(0)`

**Implementation:**
- Container div wraps the page content with `position: relative; overflow: hidden`
- On navigation: mount new page, apply transition CSS classes, listen for `transitionend`, then remove old page
- The `-30%` offset (instead of `-100%`) creates a subtle parallax effect matching iOS settings navigation
- During transition, container height is fixed to prevent layout shift: read `container.offsetHeight` before mounting new page, set as inline `height` style, clear after `transitionend`

**Cleanup:** After `transitionend`, remove the outgoing component and transition classes. The active page becomes `position: relative` (normal flow).

## Page Lifecycle

- Only 1 page mounted at a time (except briefly during transitions)
- Navigating to a page: mount new page alongside current, run transition, destroy old page on `transitionend`
- Closing side menu: `currentPage` persists (shell component stays mounted via `inert`). Scroll position preserved naturally.
- Reopening side menu: same page shown, same scroll position
- Tab switching away from settings: `SideMenu.svelte` may destroy the shell (its `loadTabPage` uses cache vars but `{#if activeTab === "settings"}` controls rendering). On re-mount, `currentPage` resets to `"root"` — acceptable behavior.

## Scroll Management

The scroll container is `SideMenu.svelte`'s `.side-menu__content` element. `SideMenuSettingsPage` renders inside it — it does not own a scroll container.

- `SideMenu.svelte` already resets scroll to top on tab change (line 96-98)
- For page navigation within settings: `SideMenuSettingsPage` should scroll the parent container to top after mounting a new page. Preferred approach: pass `scrollContentElement` as a prop from `SideMenu.svelte` (already bound at line 136). Fallback: `element.closest('.side-menu__content')`.
- Side menu close/reopen: scroll preserved naturally (DOM stays mounted as `inert`)

## Accessibility

- Back button: real `<button>` with `aria-label={$t("settings.pages.backToSettings")}`
- Subpage wrapper: `role="region"` with `aria-label={title}`
- Focus on subpage entry: after `tick()`, focus moves to back button
- Focus on back navigation: shell stores `lastNavigatedPage: SettingsPageId` before navigating back. After root mounts and `tick()`, focus the corresponding `SettingsNavButton` using a `data-page` attribute selector
- Advanced section: `Accordion.svelte` already handles `aria-expanded`

## File Summary

| File | Location | Type |
|------|----------|------|
| `SettingsPage.svelte` | `src/lib/sideMenuPages/` | New — base component |
| `SettingsNavButton.svelte` | `src/lib/sideMenuPages/` | New — nav button |
| `RootSettingsPage.svelte` | `src/lib/sideMenuPages/` | New — root page content |
| `NodeSettingsPage.svelte` | `src/lib/sideMenuPages/` | New — node subpage |
| `AppearanceSettingsPage.svelte` | `src/lib/sideMenuPages/` | New — appearance subpage |
| `GeneralSettingsPage.svelte` | `src/lib/sideMenuPages/` | New — general subpage |
| `SideMenuSettingsPage.svelte` | `src/lib/sideMenuPages/` | Modified — becomes navigation shell |

## i18n Keys Needed

New translation keys (add to `en.json`, `ja.json`, `zh.json`):
- `settings.pages.node` — "Node"
- `settings.pages.nodeDescription` — "Primary action, level behavior"
- `settings.pages.appearance` — "Appearance"
- `settings.pages.appearanceDescription` — "Theme, zoom, text size"
- `settings.pages.general` — "General"
- `settings.pages.generalDescription` — "Language, haptics, reset"
- `settings.pages.backToSettings` — "Back" (aria-label for back button)
- `settings.dangerZone` — "Danger Zone"
- `settings.advanced` — "Advanced"

## Testing

**Unit tests** (using existing CLI test infrastructure in `test/`):
- Test the `SettingsPageId` type and navigation logic (pure functions, no DOM)
- Test that page import paths resolve correctly

**Visual/browser tests** (manual verification):
- Slide transitions: correct direction (forward/back), smooth, no flicker
- Only one page in DOM after transition completes
- Side menu close/reopen preserves current page and scroll position
- Root page: all build actions and tree operations work as before
- Node subpage: all 4 controls function correctly
- Appearance subpage: all 6 controls function correctly
- General subpage: all controls + danger zone function correctly
- Danger zone styling: tinted separator, danger-colored label
- Advanced section (when consumers are added): accordion expand/collapse
- SettingsNavButton: hover, active, focus-visible states
- Responsive: content fits within side menu width at all text sizes
- Accessibility: focus management on navigate/back, screen reader announces regions
