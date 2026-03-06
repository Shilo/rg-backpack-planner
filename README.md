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

## Behavior Contracts

### Tier Leveling (Level Sync)

Current implementation uses linked level syncing (effectively ON for connected nodes).

#### 1. Target Rule

- The target node always lands at the requested level after clamp to `[0, maxLevel]`.
- Each operation is evaluated from the node you changed; previously adjusted nodes do not become independent propagation drivers.
- Reactive updates are evaluated on every target change, not only when the visible target tier label changes.

#### 2. Reachability Rule

- On increment: only connected ancestors react.
- On decrement: connected ancestors and connected descendants react.
- Descendants use strict child-direction traversal from the target.
- Unrelated nodes are never adjusted.
- Topology boundary cases:
  - a root node has no ancestors to propagate into
  - a leaf node has no descendants to propagate into

#### 3. Propagation Tier Assignment

- Ancestors use `target propagation tier`.
- Descendants use `target propagation tier - 1`.
- Descendant levels do not gate or cap increment progression.

#### 4. Boundary/Hysteresis Contract

Tier boundaries are every `X0`, but directional reactive triggers are:

- increment reacts at `X1` (one above boundary)
- decrement reacts at `X9` (one below boundary)

Example (`100` cap, tier-2 boundary):

- `19 -> 20`: no reactive change
- `20 -> 21`: reactive change
- `21 -> 20`: no reactive change
- `20 -> 19`: reactive change

Reactive thresholds by `maxLevel`:

- `100` cap: upward trigger levels `1`, `21`, `41`, `61`, `81`
- `50` cap: upward trigger levels `1`, `11`, `21`, `31`, `41`
- `1` cap: upward trigger level `1`

On decrements, hysteresis keeps support until the lower trigger is crossed:

- `100` cap support drops below `20`, `40`, `60`, `80`
- `50` cap support drops below `10`, `20`, `30`, `40`
- `1` cap stable tier drops only at `0`

#### 5. Zero-Rebase Rule

- If target drops to `0`, target still becomes `0`.
- Non-target propagation uses a virtual floor of tier `1` for the operation.
- In that zero-rebase case:
  - ancestors rebase against tier `1`
  - descendants rebase against tier `0`

#### 6. Directional Clamp Rule

After propagation tier assignment:

- increment uses `max(current, assigned tier upper bound)`
- decrement uses `min(current, assigned tier upper bound)`

Consequences:

- same-tier decrements can still lower reactive nodes immediately
- on decrements, propagation does not resolve below the target's own current tier (prevents same-tier ancestor collapse, e.g. `100 -> 99`)

### Global Leaf Node Cap

Leaf leveling has a global limit across Guardian + Vanguard + Cannon:

- at most 3 leaf nodes may have `level > 0` at once
- once capped, remaining `level = 0` leaves are locked from increment
- increments that do not increase leveled-leaf count are still allowed
- already leveled leaves remain editable, so decrement/reset frees slots

## Features

### Planning

- Interactive tree planner with tap, click, right-click, and long-press support
- Per-node controls to increase, decrease, max, or reset levels
- Tree-level actions to focus the active tree in view or reset it
- Pan and zoom support for desktop and touch devices
- Optional "Single Level Up" mode for one-step increments
- Optional "Close-up View" mode for a tighter default zoom

### Tracking

- Tech Crystal owned/spent tracking
- Per-tree and overall totals
- Statistics panel with copy-to-clipboard support
- Visual state feedback for locked, available, active, and maxed nodes

### Build Management

- Auto-save using `localStorage`
- Multiple named local build presets
- Rename, reorder, create, and delete presets
- Load from shared links or raw build codes
- Preview shared builds without overwriting local presets
- Clone preview builds into local presets
- Premade preview builds from `package.json`

### Sharing

- Shareable hash-based URLs
- Optional build names encoded into the share string
- Native share sheet support where available
- Clipboard fallback for share links
- Combined screenshot copy for all three trees

### App / Platform

- Installable PWA
- Offline support through `vite-plugin-pwa`
- Responsive desktop/mobile layout
- Theme controls, toasts, tooltips, and haptics where supported

## Share Format

Build data is stored in the URL hash using a compact URL-safe format in `src/lib/buildData/`.

Encoding strategy:

- store levels as arrays indexed by tree position
- group values by branch (yellow, orange, blue)
- trim trailing zeroes
- use base62 for numeric values
- apply run-length encoding for repeated values and repeated trees
- optionally include URL-encoded build name before encoded build data

## Local Development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Local URL (GitHub Pages base path aware):

`http://localhost:5173/rg-backpack-planner/`

## Scripts

```bash
npm run dev         # start Vite dev server
npm run build       # production build + copy index.html to 404.html
npm run preview     # preview dist output
npm run check       # svelte-check + TypeScript checks
npm test            # npm run check + tsx test/index.ts
npm run pwa:assets  # regenerate PWA assets from public/icon.svg
```

## Testing

Automated coverage includes:

- build-data encoder/decoder behavior
- tier-level propagation and bulk-leveling behavior on the shared branch fixture

Run all tests:

```bash
npm test
```

`npm test` runs:

1. `npm run check`
2. `tsx test/index.ts`

Test-run behavior:

- tests execute sequentially
- all output is mirrored to `test/index.output.log`
- first failure aborts the run and exits with code `1`
- final success summary appears only if all tests pass

For hand-written tier suite details, see [test/README.md](test/README.md).

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

## Deployment

GitHub Pages deploys on pushes to `main` via `.github/workflows/static.yml`.

If deploys fail to trigger/work:

1. In Settings -> Pages -> Build and deployment, set Source to GitHub Actions.
2. In Settings -> Actions -> General -> Workflow permissions, set Read and write permissions.
3. Push to `main` (or manually run the workflow).

Workflow behavior:

- bumps app version
- builds and deploys Pages
- commits version bump back to `main`

Notes:

- deployed base path: `/rg-backpack-planner/`
- `npm run build` copies `index.html` to `404.html` for SPA routing
- if `public/icon.svg` changes, run `npm run pwa:assets`

### Deployment Troubleshooting

If a push is registered but no workflow run appears:

1. Check [Actions tab](https://github.com/Shilo/rg-backpack-planner/actions) for a run for that commit.
2. If setup failed with service/internal errors, check [GitHub Status](https://www.githubstatus.com/) or [Downdetector](https://downdetector.com/status/github/), then re-run.
3. If no run exists, manually run **Deploy Vite app to Pages** from Actions or run `gh workflow run "Deploy Vite app to Pages"`.

CI note: version-bump commits use `GITHUB_TOKEN`, which does not trigger new workflow runs by design:
https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow

## Credits

This project uses:

- **[250 Sci-fi Flat Icons](https://katgrabowska.itch.io/250-sci-fi-flat-icons)** by [KatGrabowska](https://katgrabowska.itch.io/) (licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Original icons were converted to SVG and resized for this project.
