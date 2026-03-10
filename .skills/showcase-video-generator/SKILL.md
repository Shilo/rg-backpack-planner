# Showcase Video Generator (Landscape Split-Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, featuring mobile portrait screenshots in a split-screen design.

## Workflow

1.  **Capture Assets**: Run the capture script to record high-res portrait screenshots (deviceScaleFactor: 3).
2.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Layout: **Split-screen** (Text/Features on the left, Mobile Portrait on the right).
    - Intro: Must show app icon, **split-line header**, and **Late PvE screenshot** at **Frame 0**.
3.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Uses Playwright with a mobile viewport (393x852).
- Captures the **entire screen** including bottom navigation bars.
- Uses robust locator-based clicking for the Settings menu.
- Saves assets to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Implements the split-screen logic and smooth text entry animations.
- **Three-Step Logic**: Every feature slide must break down value into 3 distinct points.
- **Terminology**: Always use "Tech Crystals" (capitalized, plural).
- **Outro**: Features a Link icon and clean URL (`rgbp.app`) without `https://`.

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
- **Instant Impact**: Ensure Frame 0 is visually complete (Icon + Split Header + Screenshot) for thumbnails.
- **Visual Depth**: Use mobile portrait screenshots to show real-world app usage.
- **Fluidity**: Maintain smooth `spring` and `interpolate` transitions for all text and assets.
- **Strategic Focus**: Contrast PvE and PvP optimization; highlight user-facing features like Build Presets and Sharing.
