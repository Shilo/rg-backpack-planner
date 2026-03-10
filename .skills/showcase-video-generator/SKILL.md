# Showcase Video Generator (Mixed-Device Layout)

This skill automates the creation of a professional 1080p landscape showcase video for the Backpack Planner app, utilizing a mix of mobile portrait and desktop landscape screenshots.

## Workflow

1.  **Capture Assets**: Run the capture script to record assets for both devices:
    - **Mobile**: iPhone 14 Pro Max (393x852) @ 3x scale. Uses **Index-based Navigation** to switch between **Statistics** and **Settings** tabs reliably.
    - **Desktop**: 1080p (1920x1080) @ 2x scale. Used for high-impact build planning.
2.  **Authentic Flow**: The capture script performs a real **Clone** and **Confirm** sequence in Settings to genuinely exit "Preview" mode. This ensures all UI buttons (Share, Presets, etc.) are enabled and professional.
3.  **CSS Injection**: Uses `addStyleTag` as a fallback or surgical tool to hide specific HUD elements (like preview banners) that might persist across transitions.
4.  **Update Remotion**:
    - Resolution: **1920x1080** (Landscape).
    - Layout: **Split-screen** (Text left, Media right).
    - Transitions: Switch between `MobileFrame` and `DesktopFrame` per slide.
5.  **Render**: Use the Remotion CLI to render the final MP4.

## Core Components

### 1. Capture Script
Located at `.skills/showcase-video-generator/scripts/capture_screenshots.cjs`.
- Automatically toggles between mobile and desktop contexts.
- **Robust Navigation**: Uses `.nth(i).click()` on tab buttons to avoid localization/capitalization issues with text-based selectors.
- **State Management**: Clears `localStorage` and performs authentic build cloning to reset the app to a "Personal" state for the outro.
- **UI Cleaning**: Inject CSS surgically to hide temporary HUD indicators or persistent preview banners.
- Saves mixed assets (`mobile_*.png`, `desktop_*.png`) to `showcase-video/public/`.

### 2. Remotion Project
Located in `showcase-video/`.
- `Showcase.tsx`: Implements the split-screen landscape composition.
- **Intro Branding**: Frame 0 must show app icon, split-line "For Run! Goddess" (Capital F), and the URL **rgbp.app**.
- **Content Strategy**: Mentions optimization for **Late Game PvE and PvP** and **Multiple Build Presets**.

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
- **Mixed Variety**: Alternate between mobile and desktop frames to show responsiveness.
- **Instant Impact**: Frame 0 must contain the icon, description, URL, and a high-tier build screenshot.
- **Late-Game Focus**: Highlight complex builds (Late PvP/PvE) to demonstrate the app's power.
- **Premium Finish**: Use cyan accents (#06b6d4) and consistent typography (Outfit/Inter).
