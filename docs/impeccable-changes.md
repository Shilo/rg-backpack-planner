# Impeccable Polish Pass — Change Walkthrough

All 18 impeccable skills were run across the codebase. **53 files changed, +1263 / -339 lines.** 65/65 tests pass, 0 type errors.

Each change is tagged:
- **User-facing** — Visible to users (visual, behavioral, or copy changes)
- **Cleanup** — Internal only (token substitutions, dead code removal, documentation)

---

## `/harden` — Accessibility & Resilience

**Files:** app.css, FabMenu, Toasts, RootNode, ColorPickerDialog, FullscreenModal, 4 locale files

| Change | Type | Details |
|--------|------|---------|
| Global focus ring fix | **User-facing** | Replaced `outline: none !important` on all elements with `:focus:not(:focus-visible)`. Keyboard users now see focus rings when tabbing through buttons, tabs, toggles. Mouse/touch users still see no rings. **This is the single most impactful accessibility fix.** |
| FabMenu ARIA localization | Cleanup | "Floating action menu" / "Close menu" → `$t()` calls. Screen reader users in ja/fr/zh hear native labels. |
| Toast dismiss ARIA | Cleanup | "Dismiss" → `$t("common.dismiss")`. Same screen reader benefit. |
| RootNode `:focus-visible` | **User-facing** | Root node gear button now shows a 2px focus ring when tabbed to via keyboard. |
| ColorPicker `:focus-visible` | **User-facing** | Hex color input shows focus ring on keyboard focus. |
| FullscreenModal `aria-label` | Cleanup | Dialog element now has an accessible name for screen readers. |
| Toast button `:focus-visible` | **User-facing** | Dismiss and action buttons in toasts show focus rings on keyboard. |
| New locale keys | Cleanup | Added `common.closeMenu`, `common.dismiss`, `common.actionMenu` to en/ja/fr/zh. |

**To revert:** Reverting the `app.css` focus fix would re-break keyboard accessibility. The component-level `:focus-visible` additions are safe to revert individually.

---

## `/optimize` — Performance

**Files:** App.svelte, TreeTabs.svelte

| Change | Type | Details |
|--------|------|---------|
| Remove `transition: left` on `.top-left-actions` | Cleanup | Was dead code — `left: 0` never changes. |
| Replace `transition: right` with `transform: translateX` | Cleanup | `.top-right-actions` now slides via GPU-composited transform instead of layout-triggering `right` property. |
| Remove `will-change: transform, opacity` from starfield | Cleanup | Starfield pseudo-elements no longer permanently consume GPU compositor layers. 35s/45s animations don't need `will-change`. |

**To revert:** All safe to revert. Purely internal performance improvements with no visual change.

---

## `/normalize` — Design Token Alignment

**Files:** ToggleSwitch, ColorPickerDialog, themeEngine.ts, NodeContextMenu, PrimaryActionIndicator, ProgressBar, Spinner, Toasts, UndoRedoToolbar, TreeContextMenuList, OnboardingCard, OnboardingFooterNote

| Change | Type | Details |
|--------|------|---------|
| ToggleSwitch thumb → `var(--toggle-thumb)` | **User-facing** | Thumb was hard-coded `oklch(0.97 0 0)`. Now theme-aware via new `--toggle-thumb` token (dark: 0.97, light: 0.99). Slightly brighter in light mode for better contrast. |
| ColorPicker preview border → `var(--border-subtle)` | Cleanup | Hard-coded `rgba(128,128,128,0.3)` replaced with theme token. |
| `border-radius: 999px` → `var(--radius-full)` (7 places) | Cleanup | UndoRedoToolbar, Toasts, Spinner, PrimaryActionIndicator, OnboardingFooterNote. |
| `border-radius: 6px` → `var(--radius-sm)` (3 places) | Cleanup | NodeContextMenu, TreeContextMenuList. |
| Raw `px` spacing → tokens (10 places) | Cleanup | `gap: 2px` → `var(--spacing-xs)`, `4px` → `var(--spacing-sm)`, etc. in NodeContextMenu, OnboardingCard, OnboardingFooterNote. |

**To revert:** The ToggleSwitch thumb token change is the only one that could be visually noticeable (slightly brighter in light mode). All others are invisible token substitutions.

---

## `/arrange` — Spacing Scale & Layout

**Files:** theme.css, SideMenu, SideMenuSection, SettingsPage, SideMenuSettingsPage, SideMenuControlsPage, GeneralSettingsPage, AboutSettingsPage, SettingsNavButton, SettingsLinkItem, Accordion

| Change | Type | Details |
|--------|------|---------|
| New `--spacing-xl: 20px` and `--spacing-2xl: 32px` | Cleanup | Added to theme.css. Only used by files in this diff. |
| Side menu content gap: 12px → 20px | **User-facing** | More breathing room between top-level sections in all side menu tabs. |
| Settings page panel gap: 12px → 20px | **User-facing** | More space between header, content, and footer during page transitions. |
| Settings page content gap: 12px → 20px | **User-facing** | Section-to-section spacing within settings sub-pages. |
| Section content gap: 8px → 12px | **User-facing** | Slightly more room between controls within a section. |
| Danger zone gap: 8px → 12px | **User-facing** | Better separation between destructive action controls. |
| About page padding increase | **User-facing** | App identity card, version row, game rules all have more generous padding. |
| Settings nav button padding increase | **User-facing** | Navigation buttons less cramped (4px → 8px vertical padding). |
| Accordion header padding increase | **User-facing** | Slightly more vertical breathing room (4px → 8px top padding). |

**To revert:** All user-facing. If the settings pages feel too loose, revert the SideMenu/SettingsPage/SideMenuSection gap changes.

---

## `/typeset` — Typography Hierarchy

**Files:** theme.css, SettingsPage, Accordion, SideMenuSection, CollapsibleSection, AboutSettingsPage, SettingsNavButton, GeneralSettingsPage

| Change | Type | Details |
|--------|------|---------|
| New `--font-2xl: 1.625rem` (26px) | Cleanup | Token only used by SettingsPage titles. |
| New `--weight-medium: 500` | Cleanup | Token only used by SettingsNavButton. |
| New `--tracking-tight: -0.01em` | Cleanup | Token only used by headings. |
| New `--leading-tight: 1.15` | Cleanup | Token only used by headings. |
| Settings page title: 22px → 26px, bold, tight tracking | **User-facing** | Settings sub-page headings are now larger and more dominant. |
| Accordion title: 13px → 14px, bold (was semibold) | **User-facing** | Accordion headers are slightly bigger and bolder, no longer uppercase with wide tracking. |
| SideMenuSection title: 13px → 11px, text-disabled (was text-muted) | **User-facing** | Section overlines are now smaller and more subtle — serves as category labels, not headings. |
| CollapsibleSection title: upgraded to bold | **User-facing** | Controls page sections slightly heavier. |
| About app name: 14px → 18px | **User-facing** | App name in the about card is a clear focal point. |
| SettingsNavButton: added weight-medium (500) | **User-facing** | Nav items slightly heavier than body text. |

**To revert:** The 3-tier heading hierarchy is the main typeset contribution. To revert, restore Accordion titles to `--font-sm` + `--weight-semibold` + `--tracking-wide` + uppercase, and SideMenuSection titles to `--font-sm` + `--text-muted`.

---

## `/clarify` — UX Copy Improvements

**Files:** en.json only (34 string changes)

| Change | Type | Details |
|--------|------|---------|
| Toast messages more informative | **User-facing** | "Reset node" → "Node reset to level 0", "Focused tree in view" → "Tree centered in view", "Copied" → "Copied to clipboard", etc. |
| Settings descriptions clarified | **User-facing** | "Solo Only" → "Single Node", "Sync Lineage" → "With Prerequisites", "Badge overlay on each node" → "Display tier badge on each node". |
| Skill descriptions shortened | **User-facing** | Removed filler words, clarified "final damage" description. |
| Confirmation dialogs state consequences | **User-facing** | Delete preset now says "This cannot be undone." Clear all data leads with "This will permanently delete..." |
| Error messages suggest alternatives | **User-facing** | "Unable to share" → "Unable to share. Try copying the link instead." |
| Load build: "Type" → "Paste" | **User-facing** | More realistic action verb. |
| Controls descriptions more specific | **User-facing** | "Show helpful and common options" → "Open quick settings for theme, zoom, and reset". |

**To revert:** All user-facing string changes. Revert the entire `en.json` diff to restore original copy. Note: ja/fr/zh were NOT updated with clarify changes (only harden ARIA keys and delight milestone/branch keys were added to other locales).

---

## `/animate` — Micro-interactions

**Files:** Button, TabBar, TreeTabs, SegmentedControl, ToggleSwitch, Node, SideMenu, ProgressBar, ContextMenu, Accordion, BottomNavBar

| Change | Type | Details |
|--------|------|---------|
| Button press: scale 0.96 → 0.93, 80ms snap | **User-facing** | Deeper, snappier button press feedback. |
| Tab bar: inset box-shadow accent line on active | **User-facing** | Active side-menu tab has top accent indicator line. |
| Tree tabs: inset bottom accent line on active | **User-facing** | Active tree tab has bottom accent indicator line. |
| Segmented control: inset bottom accent on selected | **User-facing** | Selected segment has bottom accent indicator. |
| Toggle switch: thumb stretches on press (24px → 28px) | **User-facing** | iOS-style squish effect when pressing toggles. |
| Side menu: 300ms spring open, 200ms fast close | **User-facing** | Asymmetric slide timing feels more natural. |
| Progress bar: shimmer sweep on value change | **User-facing** | Light gradient sweeps across when bar moves. |
| Context menu: scale-in from 0.96 | **User-facing** | Menus pop in with subtle scale animation. |
| Accordion: scale(0.985) on header press | **User-facing** | Subtle press feedback on accordion headers. |
| BottomNavBar: deeper press scale (0.97 → 0.93) | **User-facing** | Matches button press depth. |

**To revert:** All user-facing micro-interactions. Each is independent — you can revert individual files. The toggle stretch and button press depth are the most noticeable. All respect `prefers-reduced-motion` and `.no-animations`.

---

## `/colorize` — Strategic Color

**Files:** SideMenuSection, CodeBlockTable, SideMenuStatisticsPage, TreeContextMenuList, TreeTabs, ContextMenu, GeneralSettingsPage

| Change | Type | Details |
|--------|------|---------|
| Section titles: 2px left accent border | **User-facing** | Every `SideMenuSection` title has a subtle accent-colored left border indicator. |
| Stats table values: accent-light color, semibold | **User-facing** | Data values in stats tables are highlighted in accent color. |
| Stats card: accent-tinted border | **User-facing** | Stats container border blends with accent color (25%). |
| Tree context menu: bonus values in accent-light | **User-facing** | Non-zero skill values highlighted. Crystal icon uses accent color. Stats area has tinted background. |
| Active tree tab: stronger accent (65% vs 78%), text promoted | **User-facing** | Active tab is more vibrant with accent glow. |
| Context menu hover: accent-tinted background | **User-facing** | Hovering context menu items shows tinted background. |
| Danger zone: tinted container with border | **User-facing** | "Clear all data" section wrapped in visible danger-colored container. Separator replaced with container border. |

**To revert:** All user-facing. The danger zone container and section title borders are the most visually distinctive. Each file is independent.

---

## `/delight` — Moments of Joy

**Files:** LevelUpSplash, Node, Tree, treeMilestoneStore.ts (NEW), App, BuildPresetsButton, TechCrystalDisplay, ProgressBar, AboutSettingsPage, app.css, 4 locale files

| Change | Type | Details |
|--------|------|---------|
| Max-level splash: crown + "MAX" + dramatic spring | **User-facing** | When a node hits max level, splash shows a crown icon with multi-bounce spring animation instead of just the level number. |
| Crown glow on maxed node | **User-facing** | Crown badge plays a scale bounce + brightness pulse + accent drop-shadow when a node first reaches max. |
| Tree completion milestones | **User-facing** | Toasts appear at branch 100%, tree 50%/75%/100%. E.g., "Guardian Yellow branch complete!" New `treeMilestoneStore.ts` tracks progress. |
| Crystal icon shimmer | **User-facing** | Crystal icon brightness-pulses when crystal count changes (synced with existing pulse animation). |
| Progress bar 100% celebration | **User-facing** | When a progress bar reaches 100%, an accent-light sweep flashes across it. |
| Version easter egg | **User-facing** | Tapping the version number 7 times within 2 seconds shows "You found a secret! Nice." toast. One-time per session. |
| Locale strings | Cleanup | Added `trees.branches.*`, `milestones.*`, `about.easterEggToast` to all 4 locales. |

**To revert:** The milestone system is the most complex addition (new store file + App.svelte integration + BuildPresetsButton reset). Revert `treeMilestoneStore.ts`, the App.svelte milestone imports/lifecycle, and the BuildPresetsButton `resetMilestones()` call to remove it entirely. The other changes are CSS-only per file.

---

## `/onboard` — Empty State Hints

**Files:** App.svelte, TreeTabs.svelte, 4 locale files

| Change | Type | Details |
|--------|------|---------|
| Post-onboarding hint | **User-facing** | After dismissing onboarding with an empty build, toast: "Tap a node to start your build". |
| Post-reset hint | **User-facing** | After resetting a tree/branch/all that leaves the active tree empty, toast: "Tree reset — tap a node to rebuild" (replaces the negative reset toast). |
| Post-preview exit hint | **User-facing** | After exiting preview mode back to an empty personal build, shows empty state hint toast. |
| Locale strings | Cleanup | Added `tree.emptyStateHint` and `tree.resetEmptyHint` to all 4 locales. |

**To revert:** Revert the App.svelte `handleOnboardingDismiss` and `didStopPreview` changes, and TreeTabs.svelte `resetBranchByIndex`/`resetTreeByIndex`/`resetAllTrees` toast changes to restore original behavior.

---

## `/adapt` — Cross-Device Adaptation

**Files:** tooltip.ts, Node.svelte, Tree.svelte, NodeContextMenu.svelte

| Change | Type | Details |
|--------|------|---------|
| Touch action preview tooltips | **User-facing** | Touch users now see node action previews (level/cost) 80ms after touching a node. Previously completely hidden on touch. Desktop hover behavior unchanged. |
| Touch pressed state tracking | Cleanup | New `pressed` state on Node survives pointer capture for reactive tooltip computation. |
| Tree pan dismisses tooltip | Cleanup | `hideTooltip()` called when pan gesture begins, so touch preview disappears when dragging. |
| NodeContextMenu responsive width | **User-facing** | `min-width: 310px` → `min(310px, calc(100vw - 32px))`. Context menu no longer overflows on 320px viewports. |

**To revert:** The touch preview is the key user-facing change. Revert tooltip.ts `touchPreviewMs` additions and Node.svelte's removal of the `$touchPrimary` early-return to restore original behavior (no tooltips on touch).

---

## `/distill` — Strip Unnecessary Complexity

**Files:** app.css, Accordion, ActionSheet, CollapsibleSection, SegmentedControl, SideMenu, SliderSetting, TabBar, Toasts, UndoRedoToolbar, SideMenuStatisticsPage

| Change | Type | Details |
|--------|------|---------|
| Remove dead `.kbd` CSS (app.css) | Cleanup | Legacy styles superseded by InputChip. No references existed. |
| Remove orphaned keyframes (app.css) | Cleanup | `@keyframes modal-shell-in`, `fab-action-in`, `toast-enter-negative` — no references. |
| Merge `toast-enter-negative` into `toast-enter` | Cleanup | Nearly identical animation merged. Negative toast now just overrides duration. |
| Simplify accordion arrow opacity | **User-facing** (subtle) | Removed imperceptible 0.85→1 icon opacity change, kept color change. Arrow opacity simplified to steady 0.5. |
| Simplify CollapsibleSection arrow | **User-facing** (subtle) | Same arrow simplification. |
| Remove ActionSheet inset highlights | **User-facing** (subtle) | Removed subtle top-edge inset highlight from choice cards and icon wraps. |
| Consolidate UndoRedoToolbar hover rules | Cleanup | Three identical rules grouped into one selector. |
| Remove `gap: 0` / `padding: 0` defaults | Cleanup | Removed no-op CSS defaults from SideMenu, TabBar, SegmentedControl, SliderSetting, SideMenuStatisticsPage. |

**To revert:** Almost all cleanup. The subtle visual changes (arrow opacity, ActionSheet highlights) are barely perceptible.

---

## `/bolder` — Amplify Energy

**Files:** TreeTabs, Node, NodeFlash, SideMenu, TechCrystalDisplay, BuildPresetsButton, OnboardingOverlay, OnboardingPane, OnboardingCard, app.css

| Change | Type | Details |
|--------|------|---------|
| Active tree tab: glow + inner highlight + icon tint | **User-facing** | Active tab has stronger presence with 12px accent glow, inner top highlight, and icon colored with `--accent-light`. |
| Tab transition smoothing | **User-facing** | 200ms transitions on tab switching for smooth state changes. |
| Menu button hover: accent glow | **User-facing** | Hamburger menu button gets accent border + glow on hover. |
| Node press: 0.96 → 0.92 | **User-facing** | Deeper press scale on nodes (stacks with animate's button changes). |
| Node badge press: 0.9 → 0.88 | **User-facing** | Deeper badge press. |
| Active/maxed node glow | **User-facing** | Active nodes have 8px colored glow, maxed nodes 10px. |
| State bounce: more dramatic | **User-facing** | Starts smaller (0.82 vs 0.88), peaks bigger (1.1 vs 1.06), with colored glow burst at peak. Duration 350ms → 400ms. |
| NodeFlash ring: brighter, larger | **User-facing** | Ring starts at 0.85 opacity (was 0.7), expands to -16px (was -12px). |
| Side menu: accent edge glow on open | **User-facing** | Open menu has accent-tinted left border and colored shadow glow. |
| Side menu content stagger: wider delays | **User-facing** | Items slide in from 10px (was 5px), stagger delays widened (30ms-210ms vs 15ms-115ms), 8 items instead of 6. |
| Tech crystal icon: accent-colored with glow | **User-facing** | Crystal icon changed from `--text-muted` to `--accent` with drop-shadow. Container gets accent-tinted background and border. |
| Currency pulse: more dramatic | **User-facing** | Scale 1.08 → 1.1, brightness flash added. |
| Build preset active: accent indicator bar | **User-facing** | Active preset has 3px inset left accent bar, stronger accent bleed, outer glow. |
| Onboarding spotlight: breathing glow | **User-facing** | Spotlight ring now breathes with a 2s pulsing glow cycle. Accent-tinted border. |
| Onboarding card: spring entrance | **User-facing** | Cards enter with 12px translateY + scale(0.96) and spring-like overshoot settle. |
| Onboarding pane: accent gradient + glow | **User-facing** | Header gradient intensified, accent glow shadow added, step counter redesigned as pill. |

**To revert:** Everything is user-facing and adds visual energy. The node glow, tech crystal accent color, and build preset indicator bar are the most distinctive. Each file is independent. All respect reduced motion.

---

## `/polish` — Final Quality Pass

**Files:** Accordion, CollapsibleSection, FabMenu, LevelUpSplash, TableRow, TechCrystalDisplay, TreeTabs, TextInputModal, OnboardingPane, SideMenuStatisticsPage

| Change | Type | Details |
|--------|------|---------|
| Transition tokenization | Cleanup | Raw `0.15s ease` / `250ms ease` / `350ms ease` replaced with `var(--ease-accel)` / `var(--ease-emphasis)` across 10 files. No visual change — same values. |
| Remove unitless `0px` | Cleanup | `min-height: 0px` → `0`, `border-radius: 0px` → `0` in SideMenuStatisticsPage. |

**To revert:** All cleanup. No visual changes.

---

## `/extract` — Design System Documentation

**Files:** .impeccable.md only

| Change | Type | Details |
|--------|------|---------|
| Design Tokens section (174 lines) | Documentation | Complete token reference: spacing, typography, colors, shadows, z-index. |
| Design Patterns section (67 lines) | Documentation | 7 recurring conventions documented. |
| Component Catalog section (143 lines) | Documentation | 13 components with variants and specs. |

**To revert:** Documentation only. No runtime impact.

---

## New Files

| File | Type | Details |
|------|------|---------|
| `src/lib/treeMilestoneStore.ts` | **User-facing** | New store tracking tree completion milestones. Shows toasts at branch 100%, tree 50%/75%/100%. |
| `.impeccable.md` | Documentation | Design context + token reference + component catalog (422 lines). |

---

## Regression Audit Summary

- **Tests:** 65/65 passing
- **Type check:** 0 errors, 0 warnings
- **Bugs found:** None
- **Locale coverage:** All new keys present in en/ja/fr/zh
- **Accessibility:** Net positive (focus rings restored, ARIA labels localized)
- **Performance:** Net positive (layout animations removed, will-change removed)
- **Reduced motion:** All new animations respect `prefers-reduced-motion` and `.no-animations`
