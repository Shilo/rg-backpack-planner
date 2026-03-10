# Showcase Video Generator (Mobile-First)

This skill automates the creation of a polished, user-facing showcase video for the Backpack Planner web app, optimized for mobile viewing (9:16).

## Workflow

1.  **Capture Assets**: Run the capture script to record portrait screenshots (390x844).
2.  **Update Remotion**: Ensure `showcase-video/src/Showcase.tsx` uses 9:16 aspect ratio and high-level, 3-step benefit-driven copy.
3.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
This script uses Playwright to:
- Navigate to the local dev server with a mobile viewport (390x844).
- Capture **three distinct states**:
    1. **Late PvE** build (initial showcase).
    2. **Mid-Game** build (secondary showcase).
    3. **Settings Menu** (to demonstrate customization).
- Save high-quality screenshots to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- Vertical 9:16 composition.
- Slide structure: Each scene must feature **3 distinct points/steps**.
- **Terminological Accuracy**: Always use "Tech Crystals" (capitalized, plural).

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
- **Mobile First**: Design for small screens. Keep text large and icons bold.
- **Three-Step Logic**: Every feature slide should break down value into 3 easy-to-digest steps.
- **Tech Crystals Only**: Never use "Crystals" in isolation; always "Tech Crystals".
- **Visual Variety**: Show different builds and the settings menu to demonstrate app depth.
