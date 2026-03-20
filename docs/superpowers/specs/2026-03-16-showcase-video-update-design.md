# Showcase Video Update — Theme, Onboarding, and Content Refresh

## Goal

Update the showcase video generator to match the app's default theme colors, feature the `NodeContextMenu` in the intro, show the onboarding system on the "Plan Your Builds" slide, and refresh the outro copy.

## Changes

### 1. Video Color Palette

Replace all hardcoded colors in `showcase-video/src/Showcase.tsx` with values derived from the default theme (h=234, c=0.18, dark mode):

| Role | Old | New | Where in Showcase.tsx |
|------|-----|-----|----------------------|
| Background | `#0f172a` | `#00040e` | Outer `AbsoluteFill` (line 130) and intro `AbsoluteFill` (line 137) |
| Accent | `#06b6d4` | `#00adfc` | Title color, `CheckCircle2` icon color, `rgbp.app` Link icon, outro title |
| Text primary | `#ffffff` / `white` | `#d7ebf7` | "For Run! Goddess" subtitle, `rgbp.app` text, feature item text |
| Text secondary | `#94a3b8` | `#a7bbc6` | Description paragraph ("Plan and share…") |
| Frame border | `#1e293b` | `#223b49` | `MobileFrame` and `DesktopFrame` border color |
| Feature box bg | `rgba(30,41,59,0.4)` | `rgba(7,19,26,0.6)` | `FeatureList` item background |
| Feature box border | `rgba(255,255,255,0.08)` | `rgba(167,187,198,0.1)` | `FeatureList` item border |

### 2. Capture Script Changes

File: `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`

#### Onboarding Control

Use `context.addInitScript` on each browser context to set the localStorage value before the app reads it:

```js
// Suppress onboarding for mobile captures
await mobileContext.addInitScript(() => {
    localStorage.setItem('rg-backpack-planner-onboarding-seen', 'true');
});
```

For the desktop context that captures the "Plan Your Builds" slide, set `"false"` instead so the first onboarding step renders.

#### Intro Screenshot (Mobile Late_PvP + NodeContextMenu)

Replace the current `mobile_late_pve.png` capture:
1. Navigate to Late_PvP hash on mobile (393x852 @ 3x)
2. Wait for render (3s)
3. Right-click node 9: `page.locator('[data-node-id="9"]').click({ button: 'right' })`
   - Playwright dispatches a `contextmenu` event even in mobile-emulation mode, which the app's `Tree.svelte` handler intercepts to open the `NodeContextMenu`.
4. Wait for menu: `await page.waitForSelector('.context-menu', { state: 'visible', timeout: 5000 })`
5. Capture as `mobile_late_pvp_context.png`

#### "Plan Your Builds" Desktop Screenshot

Change the desktop context from 1920x1080 to **1280x720** @ 2x:
1. Use `addInitScript` to set `rg-backpack-planner-onboarding-seen` to `"false"`
2. Navigate to Late_PvP hash
3. Wait for onboarding overlay to render (first step highlights nodes)
4. Capture as `desktop_plan_onboarding.png`

#### Stats Screenshot (Mobile)

Recapture `mobile_stats.png` — same flow (Late PvE → open menu → Statistics tab) but with updated app theme. Onboarding suppressed via `addInitScript`.

#### Settings Screenshot (Mobile)

Recapture `mobile_settings.png` — same Clone sequence flow but with updated app theme. Onboarding suppressed via `addInitScript`.

#### Removed Captures

- `mobile_mid_pve.png` — currently captured but unused in video; remove from capture script.

### 3. Showcase.tsx Component Changes

#### Intro Slide (Frames 0–90)
- Asset: `mobile_late_pvp_context.png` (was `mobile_late_pve.png`)

#### "Plan Your Builds" Slide (Frames 90–240)
- Asset: `desktop_plan_onboarding.png` (was `desktop_late_pvp.png`)
- Scale up `DesktopFrame` to `width: 1000px, height: 563px` (16:9 ratio, fills more of the right panel to make the lower-res UI elements easier to read)

#### Outro Slide (Frames 390–540)
Update feature items:
1. "Create Multiple Build Presets"
2. "Share and Preview Builds"
3. "Use Anywhere, Offline and in Your Language"

### 4. Skill Doc Update

Update `.skills/showcase-video-generator/SKILL.md` to reflect:
- New color palette (theme-derived, not hardcoded cyan)
- New screenshot names and descriptions
- Updated capture flow (onboarding control, context menu, lower desktop resolution)
- Updated outro copy

### 5. Asset Cleanup

All screenshots are recaptured fresh (app theme/design has changed). Delete all old screenshots from `showcase-video/public/` before running the capture script:
- `mobile_late_pve.png` → replaced by `mobile_late_pvp_context.png`
- `desktop_late_pvp.png` → replaced by `desktop_plan_onboarding.png`
- `mobile_mid_pve.png` → removed (was unused)
- `mobile_stats.png` → recaptured with new theme
- `mobile_settings.png` → recaptured with new theme

## Files Modified

1. `.skills/showcase-video-generator/scripts/capture_screenshots.cjs` — capture flow
2. `showcase-video/src/Showcase.tsx` — colors, assets, copy, DesktopFrame sizing
3. `.skills/showcase-video-generator/SKILL.md` — skill documentation
4. `showcase-video/public/` — new screenshot assets added, obsolete ones removed
