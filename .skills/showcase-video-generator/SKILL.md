---
name: showcase-video-generator
description: Generate, update, or refine the promotional showcase video for the Backpack Planner using Remotion and Playwright. Make sure to use this skill whenever the user mentions creating a video, generating a showcase, updating the promotional video, capturing fresh screenshots, or working with the Remotion project for the app.
---

# Showcase Video Generator (Dual-Frame Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, featuring dual portrait mobile frames per slide with iOS/Android styling and background music.

## Workflow

1.  **Capture Assets**: Run the capture script to record 8 mobile screenshots across 2 browser contexts:
    - **Context 1 (Onboarding Suppressed)**: iPhone 14 Pro Max (393x852) @ 3x scale. Sets `rg-backpack-planner-onboarding-seen` to `"true"` via `addInitScript`. Captures Late PvE, Late PvP with context menu (+Tier clicked), Statistics, Compose Screenshot stats, Settings (post-Clone), and General Settings.
    - **Context 2 (Onboarding Enabled)**: Same device, but sets onboarding to `"false"`. Captures Onboarding Step 1 and Step 2.
2.  **Navigation**: Uses index-based navigation (`.nth(i).click()`) for tab switching, `Escape` key for menu closing, `F9` for opening ComposeScreenshot, `[data-page="general"]` for General Settings, and `button[aria-label="Next step"]` for advancing onboarding.
3.  **Authentic Clone Flow**: Performs real Clone + Confirm sequence in Settings to exit "Preview" mode for professional settings screenshots.
4.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Background: TreeTabs-style radial gradient + polkadot pattern (surface-to-bg gradient with border-subtle dots).
    - Colors: Accent `#00adfc`, surface `#041d2a`, bg `#00040e` (derived from default theme h=234, c=0.18).
    - Layout: **Text left, dual mobile frames right** per slide.
    - Frames: Pixel style (dark bezel `#2a2a2a`, 26px radius) on the left, Apple style (silver bezel `#e8e8e8`, 32px radius) on the right, both with 5px border and 880px height.
    - **Music**: Background music via Remotion `<Audio>` component from `showcase-video/public/music.mp3`.
5.  **Render**: Use the Remotion CLI to render the final MP4.
6.  **Snapshot**: Generate `snapshot.png` from frame 0 for README preview.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Two browser contexts: onboarding-suppressed and onboarding-enabled.
- **Index Navigation**: Uses `.nth(i).click()` on tab buttons for locale-safe navigation.
- **Onboarding Control**: Uses `addInitScript` to set `rg-backpack-planner-onboarding-seen` in `localStorage`.
- **State Management**: Performs authentic Clone sequence for settings screenshots.
- **Context Menu**: Right-clicks node 7 (`button[data-node-id="7"]`) for NodeContentMenu, then clicks +Tier button (`.context-menu button.node-ctx-btn.positive` nth 2) before capturing.
- **ComposeScreenshot**: Opens via `F9` key, switches to stats tab via `.nth(1)`.
- **General Settings**: Navigates via `[data-page="general"]` selector.
- **Onboarding Steps**: Advances via `button[aria-label="Next step"]`.
- Saves all assets to `showcase-video/public/`.

### 2. Screenshots
| File | Context | Content |
|------|---------|---------|
| `mobile_late_pve.png` | Suppressed | Late PvE build (Slide 1 Left) |
| `mobile_late_pvp_context.png` | Suppressed | Late PvP with NodeContentMenu on node 7, +Tier clicked (Slide 1 Right) |
| `mobile_onboarding_step1.png` | Enabled | Onboarding Step 1 (Slide 2 Left) |
| `mobile_onboarding_step2.png` | Enabled | Onboarding Step 2 (Slide 2 Right) |
| `mobile_stats.png` | Suppressed | Late PvE statistics (Slide 3 Left) |
| `mobile_compose_stats.png` | Suppressed | Compose Screenshot stats tab (Slide 3 Right) |
| `mobile_settings.png` | Suppressed | Settings after Clone (Slide 4 Left) |
| `mobile_general_settings.png` | Suppressed | General Settings page (Slide 4 Right) |

### 3. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Dual-frame landscape composition with 4 slides and background music.
- **Background**: TreeTabs-style gradient + polkadot pattern using theme tokens.
- **Frame Variants**: `PhoneFrame` component with `apple` and `pixel` variants (different bezel colors and corner radii). Pixel (dark) always on left, Apple (silver) always on right.
- **Logo**: Displayed on every slide at 80px, in creative positions:
    - Slide 1 (Intro): Inline with text, top-left area.
    - Slide 2: Absolute positioned near top-right of list items (with padding from device frames).
    - Slide 3: Below list items, roughly left-aligned.
    - Slide 4 (Outro): Inline with URL/GitHub badges, bottom-right area.
- **Music**: `<Audio src={staticFile('music.mp3')} />` at composition root. Music naturally fades around video end.
- **Text Casing**: Sentence casing for feature text, preserving Proper Nouns (Tech Crystal, PvE, PvP).
- **Frame 0**: All elements visible at frame 0 (midpoint snapshot for thumbnails) via `introVisible` pattern.

**Slide timing (25s total at 30fps):**
1. **Intro (0-120, 4s)**: Logo, "Backpack Planner", "For Run! Goddess", description, rgbp.app link, GitHub link. Frames: Late PvE (Pixel) + Late PvP context menu (Apple).
2. **Plan Your Build (120-330, 7s)**: Features list. Frames: Onboarding Step 1 (Pixel) + Step 2 (Apple).
3. **Track Your Progress (330-540, 7s)**: Features list. Frames: Statistics (Pixel) + Compose stats (Apple).
4. **Plan, Track and Share (540-750, 7s)**: Features list, rgbp.app link, GitHub link. Frames: Settings (Pixel) + General Settings (Apple).

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

### Generate Snapshot
```bash
cd showcase-video
npx remotion still src/index.ts Showcase out/backpack_planner_snapshot.png --frame=0
```

## Output Files
- Video: `showcase-video/out/backpack_planner_showcase.mp4`
- Snapshot: `showcase-video/out/backpack_planner_snapshot.png` (frame 0, used as README preview)

## Music
- File: `showcase-video/public/music.mp3`
- Source: [Cinematic Trailer Music - Collection](https://gregor-quendel.itch.io/cinematic-trailer-music-collection) by Gregor Quendel (CC BY-NC 4.0)
- Credit in `README.md` under Credits section.

## Guiding Principles
- **Dual Frames**: Every slide shows two portrait mobile frames (Pixel left, Apple right) for visual variety.
- **Enabled Interface**: Always perform a real "Clone" sequence for settings screenshots.
- **Index Navigation**: Use indices for tab navigation to ensure cross-locale compatibility.
- **Onboarding Control**: Suppress on most captures; enable specifically for onboarding step screenshots.
- **TreeTabs Background**: Polkadot + gradient background matches the in-app TreeTabs aesthetic.
- **Modern Device Styling**: Reduced corner radius and thin bezels for a natural device look.
- **Sentence Casing**: Non-title text uses sentence casing, preserving game-specific Proper Nouns.
- **Late-Game Focus**: Highlight complex builds (Late PvP/PvE) to demonstrate app depth.
- **Premium Finish**: Sky-blue accents (`#00adfc`) with consistent typography.
- **Consistent Logo**: Same 80px size on every slide, positioned creatively to appear natural.
- **Export Filename**: Always `backpack_planner_showcase.mp4`.
