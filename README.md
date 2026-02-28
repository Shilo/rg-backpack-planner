# Backpack Planner

<img src="public/icon.svg" alt="Backpack Planner icon" width="96" />

Backpack Planner is a Svelte 5 + TypeScript PWA for planning and sharing Backpack Tech builds for *Run! Goddess*.

Live app: https://shilo.github.io/rg-backpack-planner  
Game: [Run! Goddess](https://rungoddess.topgamesinc.com)

## Overview

The app lets you plan all three Backpack Tech trees:

- Guardian
- Vanguard
- Cannon

It is built for quick iteration while playing: you can level nodes, track Tech Crystal cost, save multiple builds locally, and share builds through compact URLs.

## Features

### Planning

- Interactive tree planner with tap, click, right-click, and long-press support
- Per-node controls to increase, decrease, max, or reset levels
- Tree-level actions to focus the active tree in view or reset it
- Pan and zoom support for desktop and touch devices
- Optional "Single Level Up" mode for one-step increments
- Optional "Close-up View" mode for a tighter default zoom

### Tracking

- Tech Crystal owned / spent tracking
- Per-tree and overall totals
- Statistics panel with copy-to-clipboard support
- Visual node state feedback for locked, available, active, and maxed nodes

### Build Management

- Auto-save using `localStorage`
- Multiple named local build presets
- Rename, reorder, create, and delete presets
- Load a build from a shared link or a raw build code
- Preview shared builds without overwriting your personal saved presets
- Clone a preview build into your own presets
- Premade preview builds from `package.json`

### Sharing

- Shareable hash-based URLs
- Optional build names encoded into the share string
- Native share sheet support where available
- Clipboard fallback for share links
- Copy a combined screenshot of all three trees to the clipboard

### App / Platform

- Installable PWA
- Offline support through `vite-plugin-pwa`
- Responsive layout for desktop and mobile
- Theme color controls, toasts, tooltips, and haptic feedback where supported

## How Sharing Works

Build data is stored in the URL hash using a custom compact, URL-safe format implemented in `src/lib/buildData/`.

The encoder:

- stores node levels as arrays indexed by tree node position
- groups values by branch (yellow, orange, blue)
- trims trailing zeroes
- uses base62 for numeric values
- applies run-length encoding for repeated values and repeated trees
- can include a URL-encoded build name before the build data

This keeps shared URLs short enough to be practical while still round-tripping cleanly through the decoder.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The app uses the GitHub Pages base path, so during local development the intended URL is:

`http://localhost:5173/rg-backpack-planner/`

## Available Scripts

```bash
npm run dev         # start the Vite dev server
npm run build       # production build + copy index.html to 404.html
npm run preview     # preview the built dist/ output
npm run check       # svelte-check + TypeScript checks
npm test            # npm run check + tsx test/index.ts
npm run pwa:assets  # regenerate PWA assets from public/icon.svg
```

## Testing

The automated test suite is focused on the build-data encoder and decoder.

Run it with:

```bash
npm test
```

That command runs:

1. `npm run check`
2. `tsx test/index.ts`

For more detail on the encoder test suite, see [test/README.md](test/README.md).

## Project Structure

```text
src/
  config/            Tree definitions and shared tree metadata
  lib/               Components, stores, build-data logic, helpers
public/              Static assets, icons, manifest inputs
scripts/             Build helpers
test/                Encoder test suite and docs
dist/                Production output (generated)
```

## Deployment Notes

- The deployed base path is `/rg-backpack-planner/`.
- `npm run build` copies `index.html` to `404.html` so GitHub Pages can route SPA URLs correctly.
- If `public/icon.svg` changes, run `npm run pwa:assets` to refresh generated PWA icons.
