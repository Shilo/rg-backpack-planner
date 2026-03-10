# Showcase Video Generator (Mixed-Device Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, utilizing a mix of mobile portrait and desktop landscape screenshots.

## Workflow

1.  **Capture Assets**: Run the capture script to record assets for both devices:
    - **Mobile**: iPhone 14 Pro Max (393x852) @ 3x scale.
    - **Desktop**: 1080p (1920x1080) @ 2x scale.
2.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Layout: **Split-screen** (Text/Features on the left, Assets on the right).
    - Assets: Use `MobileFrame` for intro/crystals and `DesktopFrame` for planning/outro.
3.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Automatically toggles between mobile and desktop contexts.
- Uses Playwright locators for robust navigation to the Settings menu.
- Saves mixed assets (`mobile_*.png`, `desktop_*.png`) to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Implements both `MobileFrame` and `DesktopFrame` components.
- **Branding**: Intro must show app icon, "For Run! Goddess" (Capital F), and "optimized" builds.
- **Mixed Layout**: Video transitions between mobile and desktop views for variety and impact.

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
- **Modern Variety**: Alternate between mobile and desktop frames to show responsiveness.
- **Instant Impact**: Frame 0 must be complete (Icon + Header + URL + Screenshot).
- **Strategic Detail**: Show specific builds (Late PvP, Mid-Game PvE) to demonstrate app depth.
- **Premium Finish**: Use consistent cyan accents (#06b6d4) and smooth spring animations.
