# What's New in v1.1.6
-# Changes since v1.1.0
https://rgbp.app

**Summary**: Faster and more precise tech tree planning with a toggleable Primary Action Indicator, advanced keyboard shortcuts, and branch-specific resets.

## New
- Added a **Primary Action Indicator** HUD button that displays the active node operation (+1, +10, +Tier); tap it to toggle the state or use the **[A]** hotkey to cycle modes.
- Added **Unified Fullscreen** mode **[F11]** that provides a consistent immersive experience across all desktop browsers.
- Added the **Tech Crystal Budget Hotkey** **[B]** to instantly open the budget input modal from anywhere.
- Added **Cycle Action Hotkey** **[A]** to quickly rotate between +1, +10, and +Tier increment modes without opening menus.
- Added **[`] (Backtick)** keyboard shortcut to instantly open the Root Node Quick Settings panel.
- Added **Branch Reset Setting** to the Quick Settings menu for instantly clearing specific tree branches (Orange, Blue, Yellow).
- Added **Advanced Node Modifiers** for precise tree planning:
    - **[Left Click]**: Primary Action (+1, +10, or +Tier).
    - **[Shift + Left Click]** or **[Middle Click]**: Reverse Primary (-1, -10, or -Tier).
    - **[Ctrl + Left Click]**: Alternate Action (Toggles between +1 and +Tier level ups).
    - **[Ctrl + Shift + Left Click]** or **[Ctrl + Middle Click]**: Reverse Alternate (Subtract by the alternate amount).

## Improved
- Updated the **Controls & Shortcuts** page with more shortcuts and detailed node interaction descriptions.
- Redesigned the **Node Context Menu** with a dedicated "-Tier" button and a more compact, thumb-friendly layout for one-handed use.
- Improved **Undo & Redo** with repeat support; holding **[Ctrl + Z]** or **[Ctrl + Y]** now steps through multiple changes automatically.
- Enhanced **Root Node Quick Settings** with new icons and dedicated buttons for quick branch and tree resets.
- Refined **Tech Crystal Input** with a high-precision wide modal and a real-time budget display directly on the input label.
- Enhanced **Dynamic Tooltips** that now include real-time keyboard shortcut hints and modifier-aware previews.
- Expanded **Localization** with full support for the new input and control systems across English, French, Japanese, and Simplified Chinese.
- Expanded **Haptic Feedback** to all interactive surfaces, including the theme picker, onboarding flow, and menu backdrops.

## Fixed
- Fixed layout issues where toast notifications would occasionally overlap the HUD action indicators.
- Fixed node menu positioning to ensure stable alignment and prevent layout shifting during rapid interaction.
- Fixed missing haptic feedback in various menu backdrops and theme selection.
- Fixed a race condition that could cause the level-up splash to overlap and block interaction with node context menus.

## Upcoming
- **Controls Redesign**: Overhaul of the Controls & Shortcuts page will improve readability and simplicity with a more polished visual design.
- **Onboarding Updates**: Interactive tutorial will include explicit guidance for the latest keyboard hotkeys and advanced node modifiers.

---

# What's New in v1.1.0
-# Changes since v1.0.0
https://rgbp.app

## New
- Added undo and redo support with a floating toolbar to step backward and forward through node level changes.
- Added Ctrl+Z and Ctrl+Y keyboard shortcuts for undo and redo.
- Added Tech Crystal budget enforcement that caps node upgrades when they would exceed your set budget, with a toast action to override.
- Added "Ignore Tech Crystal Budget" toggle in Node settings to disable budget enforcement.
- Added a redesigned Tech Crystal button with clearer budget indication.
- Added a debug information panel in the About settings page for troubleshooting device and app state.

## Improved
- Improved budget enforcement to partially level nodes in sync lineage mode instead of blocking entirely when the budget would be exceeded.
- Updated the onboarding tutorial to cover the new undo, redo, and reset toolbar.
- Refined Tech Crystal display with unified animations for budget and spent changes.
- Added swipe-down gesture to dismiss action sheet modals for smoother navigation.
- Expanded the debug information panel with system details, reorganized sections, and improved formatting.
- Improved performance by deferring system info loading until the section is opened.
- Added a toast notification when reaching the leaf cap in a skill tree.
- Improved toast notifications with a stacked layout, pill-shaped action buttons, and automatic deduplication.

## Fixed
- Fixed dropdown menus sometimes appearing above their trigger buttons instead of below.
- Fixed service worker updates not applying reliably.
- Fixed nested context menus not handling backdrop clicks and Escape key correctly.
- Fixed Japanese and other non-English speakers being stuck on English after the app added their language in a previous update.
- Fixed Chrome's automatic page translation breaking the app's interface on Android devices.

---

# What's New in v1.0.0
-# Changes since v0.5.18
https://rgbp.app

## Improved
- Improved the recommended builds browser with a unified dropdown interface and richer build metadata.
- Added French as a supported language alongside English, Japanese, and Simplified Chinese.

---

# What's New in v0.5.12
-# Changes since v0.4.15
https://rgbp.app

## New
- Added build sharing via custom URLs and high-quality image exports.
- Added a tabbed interface for managing multiple planning trees simultaneously.
- Added a guided onboarding tutorial flow for new players.
- Added an application statistics page to track total resource spending.
- Added a quick-access settings panel via the root node gear button.
- Added support for simple math expressions in numeric input modals.
- Added full localization support for English, Japanese, and Simplified Chinese.

## Improved
- Upgraded to an interactive image viewer with detailed metadata popovers.
- Improved motion design with smooth exponential animations across the UI.
- Improved mobile experience with larger touch targets and responsive layouts.
- Improved screenshot export with consistent resolution across different devices.
- Refined the OKLCH theme engine for better visual clarity and accessibility.

## Fixed
- Fixed overlapping transitions between settings pages.
- Fixed rendering issues with badges in mobile viewports.
- Fixed mid-word hyphenation in modals, menus, and tooltips.
- Fixed tree background gradients and zoom sensitivity bugs.

---

# What's New in v0.4.14
-# Changes since v0.4.1
https://rgbp.app

## New
- Added navigable settings pages with General, Appearance, Node, and About sections.
- Added level-up splash animation when upgrading skills.
- Added tooltips that preview the next level and total cost before tapping.
- Added colorblind-safe tree regions toggle for improved accessibility.
- Added uppercase text toggle to customize label styling.
- Added skill descriptions in the node detail menu.
- Added special skills summary in the tree info menu.

## Improved
- Upgraded animations with smoother, spring-like motion across modals, menus, and toasts.
- Added glass backdrop effects to modals, side menu, and context menus.
- Improved tree region colors for better visual clarity on all displays.
- Improved toast notifications with centered placement and bolder styling.
- Added Escape and Backspace keyboard navigation throughout menus and settings.
- Added helpful descriptions below settings controls for easier understanding.

## Fixed
- Fixed screenshot export showing a white background on iOS.
- Fixed menus not closing in the correct order when pressing Escape.
- Fixed tree view not resetting focus when resizing the window.
