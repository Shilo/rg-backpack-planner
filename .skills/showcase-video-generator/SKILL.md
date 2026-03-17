---
name: showcase-video-generator
description: Generate, update, or refine the promotional showcase video for the Backpack Planner using Remotion and Playwright. Make sure to use this skill whenever the user mentions creating a video, generating a showcase, updating the promotional video, capturing fresh screenshots, or working with the Remotion project for the app.
---

# Showcase Video Generator (Dual-Frame Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, featuring dual portrait mobile frames per slide with iOS/Android styling.

## Workflow

1.  **Capture Assets**: Run the capture script to record 8 mobile screenshots across 2 browser contexts:
    - **Context 1 (Onboarding Suppressed)**: iPhone 14 Pro Max (393x852) @ 3x scale. Sets `rg-backpack-planner-onboarding-seen` to `"true"` via `addInitScript`. Captures Late PvE, Late PvP with context menu, Statistics, Compose Screenshot stats, Settings (post-Clone), and General Settings.
    - **Context 2 (Onboarding Enabled)**: Same device, but sets onboarding to `"false"`. Captures Onboarding Step 1 and Step 2.
2.  **Navigation**: Uses index-based navigation (`.nth(i).click()`) for tab switching, `Escape` key for menu closing, `F9` for opening ComposeScreenshot, `[data-page="general"]` for General Settings, and `button[aria-label="Next step"]` for advancing onboarding.
3.  **Authentic Clone Flow**: Performs real Clone + Confirm sequence in Settings to exit "Preview" mode for professional settings screenshots.
4.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Background: TreeTabs-style radial gradient + polkadot pattern (surface-to-bg gradient with border-subtle dots).
    - Colors: Accent `#00adfc`, surface `#041d2a`, bg `#00040e` (derived from default theme h=234, c=0.18).
    - Layout: **Text left, dual mobile frames right** per slide.
    - Frames: iOS style (silver bezel, 32px radius) and Android style (dark bezel, 26px radius), both with 5px border and 880px height.
5.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Two browser contexts: onboarding-suppressed and onboarding-enabled.
- **Index Navigation**: Uses `.nth(i).click()` on tab buttons for locale-safe navigation.
- **Onboarding Control**: Uses `addInitScript` to set `rg-backpack-planner-onboarding-seen` in `localStorage`.
- **State Management**: Performs authentic Clone sequence for settings screenshots.
- **Context Menu**: Right-clicks node 7 (`button[data-node-id="7"]`) for NodeContentMenu.
- **ComposeScreenshot**: Opens via `F9` key, switches to stats tab via `.nth(1)`.
- **General Settings**: Navigates via `[data-page="general"]` selector.
- **Onboarding Steps**: Advances via `button[aria-label="Next step"]`.
- Saves all assets to `showcase-video/public/`.

### 2. Screenshots
| File | Context | Content |
|------|---------|---------|
| `mobile_late_pve.png` | Suppressed | Late PvE build (Slide 1 Left) |
| `mobile_late_pvp_context.png` | Suppressed | Late PvP with NodeContentMenu on node 7 (Slide 1 Right) |
| `mobile_onboarding_step1.png` | Enabled | Onboarding Step 1 (Slide 2 Left) |
| `mobile_onboarding_step2.png` | Enabled | Onboarding Step 2 (Slide 2 Right) |
| `mobile_stats.png` | Suppressed | Late PvE statistics (Slide 3 Left) |
| `mobile_compose_stats.png` | Suppressed | Compose Screenshot stats tab (Slide 3 Right) |
| `mobile_settings.png` | Suppressed | Settings after Clone (Slide 4 Left) |
| `mobile_general_settings.png` | Suppressed | General Settings page (Slide 4 Right) |

### 3. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Dual-frame landscape composition with 4 slides.
- **Background**: TreeTabs-style gradient + polkadot pattern using theme tokens.
- **Frame Variants**: `PhoneFrame` component with `ios` and `android` variants (different bezel colors and corner radii).
- **Logo**: Displayed on every slide in creative positions (top-left for intro/outro, top-right or bottom-right for middle slides).
- **Text Casing**: Sentence casing for feature text, preserving Proper Nouns (Tech Crystal, PvE, PvP).

**Slides:**
1. **Intro (0-90)**: Logo, "Backpack Planner", "For Run! Goddess", description with line break, rgbp.app link, GitHub link. Frames: Late PvE (iOS) + Late PvP context menu (Android).
2. **Plan Your Build (90-240)**: Features list. Frames: Onboarding Step 1 (iOS) + Step 2 (Android).
3. **Track Your Progress (240-390)**: Features list. Frames: Statistics (iOS) + Compose stats (Android).
4. **Plan, Track and Share (390-540)**: Features list, rgbp.app link, GitHub link. Frames: Settings (iOS) + General Settings (Android).

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
- **Dual Frames**: Every slide shows two portrait mobile frames (iOS + Android style) for visual variety.
- **Enabled Interface**: Always perform a real "Clone" sequence for settings screenshots.
- **Index Navigation**: Use indices for tab navigation to ensure cross-locale compatibility.
- **Onboarding Control**: Suppress on most captures; enable specifically for onboarding step screenshots.
- **TreeTabs Background**: Polkadot + gradient background matches the in-app TreeTabs aesthetic.
- **Modern Device Styling**: Reduced corner radius and thin bezels for a natural device look.
- **Sentence Casing**: Non-title text uses sentence casing, preserving game-specific Proper Nouns.
- **Late-Game Focus**: Highlight complex builds (Late PvP/PvE) to demonstrate app depth.
- **Premium Finish**: Sky-blue accents (`#00adfc`) with consistent typography.

## Latest Results
- Output video: `showcase-video/out/video.mp4` (6.1 MB).
