---
name: showcase-video-generator
description: Generate, update, or refine the promotional showcase video for the Backpack Planner using Remotion and Playwright. Make sure to use this skill whenever the user mentions creating a video, generating a showcase, updating the promotional video, capturing fresh screenshots, or working with the Remotion project for the app.
---

# Showcase Video Generator (Mixed-Device Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, utilizing a mix of mobile portrait and desktop landscape screenshots.

## Workflow

1.  **Capture Assets**: Run the capture script to record assets for both devices:
    - **Mobile**: iPhone 14 Pro Max (393x852) @ 3x scale. Suppresses onboarding via `addInitScript` (sets `rg-backpack-planner-onboarding-seen` to `"true"`). Uses **index-based navigation** (`.nth(i).click()`) to switch between tabs reliably across locales.
    - **Desktop**: 1280x720 @ 2x scale. Onboarding is **enabled** (set to `"false"`) so the first onboarding step is visible in the capture.
2.  **Intro Capture**: Navigates to the Late PvP build and right-clicks node 9 (`[data-node-id="9"]`) to open the `NodeContentMenu`, captured as `mobile_late_pvp_context.png`.
3.  **Authentic Clone Flow**: The capture script performs a real **Clone** and **Confirm** sequence in Settings to genuinely exit "Preview" mode. This ensures all UI buttons (Share, Presets, etc.) are enabled and professional for the settings screenshot.
4.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Colors: Background `#00040e`, accent `#00adfc` (sky-blue, derived from the default theme h=234, c=0.18).
    - Layout: **Split-screen** (Text left, Media right).
    - Transitions: Switch between `MobileFrame` and `DesktopFrame` per slide.
    - **DesktopFrame**: Scaled to `1000x563px` to fill more space with the lower-res 1280x720 source.
5.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Automatically toggles between mobile and desktop contexts.
- **Robust Navigation**: Uses `.nth(i).click()` on tab buttons to avoid localization/capitalization issues with text-based selectors.
- **Onboarding Control**: Uses `addInitScript` to set `rg-backpack-planner-onboarding-seen` in `localStorage` before page load -- `"true"` for mobile (suppressed), `"false"` for desktop (visible).
- **State Management**: Performs authentic build cloning to reset the app to a "Personal" state for the outro.
- **Context Menu**: Right-clicks a specific node (`[data-node-id="9"]`) to open `NodeContentMenu` for the intro screenshot.
- Saves mixed assets (`mobile_*.png`, `desktop_*.png`) to `showcase-video/public/`.

### 2. Screenshots
| File | Device | Content |
|------|--------|---------|
| `mobile_late_pvp_context.png` | Mobile | Late PvP with NodeContentMenu open (intro) |
| `desktop_plan_onboarding.png` | Desktop 1280x720 | Late PvP with first onboarding step visible (plan slide) |
| `mobile_stats.png` | Mobile | Late PvE statistics |
| `mobile_settings.png` | Mobile | Settings after Clone (outro) |

### 3. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Implements the split-screen landscape composition.
- **Intro Branding**: Frame 0 shows app icon, split-line "For Run! Goddess" (Capital F), the URL **rgbp.app**, and the Late PvP + NodeContentMenu mobile screenshot.
- **Slides**: Intro (Late PvP context menu), Plan (desktop with onboarding), Stats (mobile statistics), Outro (mobile settings with feature list).
- **Outro Copy**:
  - "Create Multiple Build Presets"
  - "Share and Preview Builds"
  - "Use Anywhere, Offline and in Your Language"

## Commands

### Capture Latest Assets
```bash
node .skills/showcase-video-generator/scripts/capture_screenshots.cjs
```

### Render Video
```bash
cd showcase-video
npm run build
```

## Guiding Principles
- **Enabled Interface**: Always perform a real "Clone" sequence for settings screenshots to ensure buttons are active and branding is legitimate.
- **Index Navigation**: Use indices for navigation items to ensure scripts work across different localization settings.
- **Onboarding Control**: Suppress onboarding on mobile for clean captures; enable it on desktop to showcase the feature.
- **Mixed Variety**: Alternate between mobile and desktop frames to show responsiveness.
- **Instant Impact**: Frame 0 must contain the icon, description, URL, and a high-tier build screenshot with context menu.
- **Late-Game Focus**: Highlight complex builds (Late PvP/PvE) to demonstrate the app's power.
- **Premium Finish**: Use sky-blue accents (`#00adfc`) and consistent typography (system-ui/sans-serif).

## Latest Results
- **Intro**: Split title layout displaying Late PvP build with NodeContentMenu open from frame 0.
- **Plan**: Desktop 1280x720 showing Late PvP build with first onboarding step visible.
- **Stats**: Mobile snapshot showing Late PvE build statistics.
- **Outro**: Clean mobile settings screenshot with active, enabled buttons (achieved via authentic Clone sequence), featuring "Create Multiple Build Presets", "Share and Preview Builds", and "Use Anywhere, Offline and in Your Language" copy.
- Output video: `showcase-video/out/video.mp4`.
