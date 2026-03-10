---
name: showcase-video-generator
description: Generate a professional showcase video for the Backpack Planner app. Use this skill when the user wants to create a new showcase video focused on high-level features like building and sharing backpack layouts. Automates the capture of the 'Late PvE' build and rendering via Remotion.
---

# Showcase Video Generator

This skill automates the creation of a polished, user-facing showcase video for the Backpack Planner web app, focusing on core value: **Plan. Strategize. Build.**

## Workflow

1.  **Capture Assets**: Run the capture script to record the 'Late PvE' build and sharing UI.
2.  **Update Remotion**: Ensure `showcase-video/src/Showcase.tsx` uses high-level benefit-driven copy.
3.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
This script uses Playwright to:
- Navigate to the local dev server.
- Select the **"Late PvE"** build from the preview presets.
- Capture the build state and the sharing interface.
- Save high-quality screenshots to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- `src/Showcase.tsx`: The primary video composition.
- Follow the "Premium Dark" aesthetic.
- **Strictly High-Level Features**:
    - Building Powerful Synergies
    - Real-time Performance Tracking
    - One-Click Build Sharing

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
- **Value Over Vitals**: Don't explain *how* the UI works (e.g., skip "context menus" or "intuitive"). Explain what the user *achieves* (e.g., "Build the Ultimate Strategy").
- **Authenticity**: Always showcase the 'Late PvE' build to demonstrate complexity and depth.
- **Polish**: Maintain smooth spring animations and transitions.
