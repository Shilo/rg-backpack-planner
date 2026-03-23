# About Game Rules Scroll Design

**Status:** Approved on 2026-03-22

**Goal:** When the Controls page "Game Rules" button opens the About settings page, automatically scroll the side-menu content so the Game Rules accordion is brought into view.

## Approach

Keep the behavior explicit and page-owned.

`src/lib/sideMenuPages/SideMenuControlsPage.svelte` will request About navigation with a one-time target like `"game-rules"` instead of a bare open-about callback.

`src/lib/SideMenu.svelte` and `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` will forward that target through the existing settings-page navigation flow. `SideMenuSettingsPage.svelte` will hold the pending target while the page transition runs, then pass it into `src/lib/sideMenuPages/AboutSettingsPage.svelte`.

`src/lib/sideMenuPages/AboutSettingsPage.svelte` will bind the Game Rules accordion wrapper element, wait until the page is mounted and ready, then call `scrollIntoView({ block: "start", behavior: "smooth" })` once when the pending target is `"game-rules"`. After use, the target will be cleared so ordinary visits to About do not auto-scroll.

## Behavior Notes

- Scroll only. Do not move keyboard focus.
- Keep the Game Rules accordion open as it already is today.
- Unknown targets or missing elements should no-op without errors.
- Normal About navigation from elsewhere should behave exactly as before.

## Testing

Add a focused regression test under `test/` that verifies the new source contract for targeted About navigation and the one-time scroll behavior wiring. Prefer the repo's existing source-contract test style over broad UI automation.
