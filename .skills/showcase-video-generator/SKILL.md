---
name: showcase-video-generator
description: Generate a professional showcase video for the Backpack Planner app. Use this skill when the user wants to create a new showcase video, update existing video assets with current app state, or modify the video's content and animations. This skill automates the capture of app screenshots (including specific builds like 'Late PvE') and rendering via Remotion.
---

# Showcase Video Generator

This skill automates the creation of a polished, user-facing showcase video for the Backpack Planner web app.

## Workflow

1.  **Capture Assets**: Run the capture script to record the latest app UI state.
2.  **Update Remotion**: Modify `showcase-video/src/Showcase.tsx` to include new scenes or updated features.
3.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
This script uses Playwright to:
- Navigate to the local dev server.
- Select the "Late PvE" recommended build from presets.
- Interact with nodes to show leveling behavior.
- Open and scroll through the settings panel.
- Save screenshots to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- `src/Showcase.tsx`: The primary video composition.
- Follow the "Premium Dark" aesthetic: Slate backgrounds, Cyan/Orange accents.
- Focus on high-level features: Interactive Planning, Real-time Stats, Build Sharing.

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
- **Polished & Professional**: Use spring animations and smooth transitions.
- **User-Centric**: Avoid technical jargon (e.g., don't mention "Svelte 5" or "localStorage").
- **High-Fidelity**: Always capture live app state; do not use placeholders.
