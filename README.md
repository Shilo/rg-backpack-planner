# Backpack Planner

<img src="public/icon.svg" alt="Backpack Planner icon" width="96" />

Backpack Planner is a Svelte 5 + TypeScript PWA for planning and sharing Backpack Tech builds for *Run! Goddess*.

Live app: https://rgbp.app  
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

The automated test suite covers both:

- the build-data encoder and decoder
- tier-level propagation and bulk-leveling behavior on the shared branch-shape
  fixture used by the hand-written tier suite

Run it with:

```bash
npm test
```

That command runs:

1. `npm run check`
2. `tsx test/index.ts`

**Note on Test Execution:**
- All tests run sequentially.
- Console output for all tests is mirrored to a global log file at `test/index.output.log`.
- If *any* test fails, the entire suite instantly aborts, prints a failure message, and exits with code 1.
- You will only see the `🎉 All tests completed successfully!` message and the final log file link if every single test passes.

For more detail on the hand-written CLI suites, see [test/README.md](test/README.md).

## Tier Leveling Rules

Tier leveling uses a stable-tier model with hysteresis:

- the target node always moves to the exact requested level after clamping
- if a level change drops the target to `0`, the target still lands at `0`, but
  non-target propagation uses a virtual tier floor of `1` for that rebase
- each operation is evaluated from the node you just changed; previously raised
  neighbors do not become independent reactive drivers
- reactive nodes are updated every time the target changes, not only when the
  visible target tier label changes
- ancestor nodes react to the target's propagation tier
- all other connected nodes in the branch react as wrapped nodes and use
  `target propagation tier - 1`

Reactive thresholds depend on the node's `maxLevel`:

- `100` cap nodes react upward when the target reaches `1`, `21`, `41`, `61`,
  and `81`
- `50` cap nodes react upward when the target reaches `1`, `11`, `21`, `31`,
  and `41`
- `1` cap nodes react upward when the target reaches `1`

On the way down, the system uses hysteresis, so the reactive tier does not drop
at the same number it rose:

- a `100` cap node that already reached tier 2 at `21` keeps tier 2 support at
  `20` and only drops to tier 1 when it reaches `19`
- more generally, `100` cap nodes drop reactive support when they fall below
  `20`, `40`, `60`, or `80`
- `50` cap nodes drop reactive support when they fall below `10`, `20`, `30`,
  or `40`
- a `1` cap node drops its own stable tier when it returns to `0`
- if a decrement lands on `0`, ancestors still rebase against tier `1`, while
  wrapped nodes (including descendants) rebase against tier `0`

Once the next stable tier is known, reactive nodes use directional clamping:

- on an increment, each reactive node becomes `max(current, assigned tier upper
  bound)`
- on a decrement, each reactive node becomes `min(current, assigned tier upper
  bound)`

This means a same-tier decrement can still lower other nodes. If the target
stays in the same stable tier but the assigned bound is lower than the current
reactive level, the branch is rebased downward immediately.

## Project Structure

```text
src/
  config/            Tree definitions and shared tree metadata
  lib/               Components, stores, build-data logic, helpers
public/              Static assets, icons, manifest inputs
scripts/             Build helpers
test/                CLI test suites and docs
dist/                Production output (generated)
```

## Credits

This project uses the following third-party assets:

* **[250 Sci-fi Flat Icons](https://katgrabowska.itch.io/250-sci-fi-flat-icons)** by [KatGrabowska](https://katgrabowska.itch.io/) (Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Original icons were converted to SVG format and resized for this project.

## Deployment

The app deploys to GitHub Pages automatically on every push to `main` via the `.github/workflows/static.yml` workflow. If deploys aren't working, check the following:

1. In your repo go to **Settings → Pages → Build and deployment** and set the **Source** to **GitHub Actions** (not "Deploy from a branch").
2. Go to **Settings → Actions → General → Workflow permissions** and select **Read and write permissions**.
3. Push to `main` to trigger a deploy.

The workflow bumps the app version, builds, deploys to Pages, and commits the version bump back to `main`.

### Notes

- The deployed base path is `/rg-backpack-planner/`.
- `npm run build` copies `index.html` to `404.html` so GitHub Pages can route SPA URLs correctly.
- If `public/icon.svg` changes, run `npm run pwa:assets` to refresh generated PWA icons.
