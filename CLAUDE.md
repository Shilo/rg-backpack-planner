# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backpack Planner is a PWA for planning and sharing Backpack Tech builds for "Run! Goddess" game. Users can build and compare three skill trees (Guardian, Vanguard, Cannon) while tracking tech crystal budgets.

**Live App:** https://shilo.github.io/rg-backpack-planner

## Development Commands

```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Build for production (copies index.html to 404.html for SPA routing)
npm run preview      # Preview production build
npm run check        # Type check with svelte-check and tsc
npm run pwa:assets   # Generate PWA assets from icon.svg
```

## Tech Stack

- **Framework:** Svelte 5 with TypeScript
- **Build:** Vite with vite-plugin-pwa
- **State:** Svelte stores (writable + derived)
- **Icons:** phosphor-svelte
- **Screenshot:** @zumer/snapdom

## Architecture

### State Management
All global state uses Svelte stores in `src/lib/*Store.ts` files:
- `treeLevelsStore.ts` - Tree node levels (3D array)
- `techCrystalStore.ts` - Crystal budget tracking
- `previewModeStore.ts` - Preview build state
- Stores persist to localStorage automatically

### Build Data Encoding
Custom compact format for URL sharing (`src/lib/buildData/`):
- Base62 numbers with separators: `.` (node), `,` (branch), `;` (tree)
- RLE (Run-Length Encoding) for repeated values
- Hash-fragment routing: `/#encoded_build_data`
- Round-trip encoding tested in `test/encoder.test.ts`

### Tree Structure
Each tree has 30 nodes defined in `src/config/`:
- `baseTree.ts` - Shared structure (10 yellow, 10 orange, 10 blue)
- `guardianTree.ts`, `vanguardTree.ts`, `cannonTree.ts` - Tree-specific skills

### Component Organization
- `src/App.svelte` - Root component managing tabs, side menu, modals, toasts
- `src/lib/Tree.svelte` - Tree visualization with pan/zoom/gestures
- `src/lib/Node.svelte` - Individual skill node
- `src/lib/buttons/` - Specialized button components
- `src/lib/modals/` - Modal dialogs (Confirm, Input, TextInput, LoadBuild)
- `src/lib/sideMenuPages/` - Settings, Statistics, Controls pages

### Gesture System
- Long-press: 270ms threshold with 10px tolerance (`longPress.ts`)
- Pan/Zoom: Pointer events with CSS transforms
- Haptic feedback via Vibration API (`haptics.ts`)

### Modal System
Types: `"confirm"`, `"input"`, `"textInput"`, `"loadBuild"`

```typescript
import { openModal } from "./modalStore";

openModal({
    type: "confirm",
    title: "Delete Build?",
    message: "This cannot be undone.",
    confirmNegative: true,  // red confirm button
    onConfirm: () => { /* handle confirm */ },
    onCancel: () => { /* optional cancel handler */ }
});
```

To add a new modal type:
1. Add type to `ModalType` union in `modalStore.ts`
2. Create component in `src/lib/modals/`
3. Add conditional render in `ModalHost.svelte`

## Naming Conventions

- **Components:** PascalCase (`ShareBuildButton.svelte`)
- **Stores:** camelCase with Store suffix (`treeLevelsStore.ts`)
- **Types:** PascalCase (`Tree`, `BuildData`, `NodeState`)
- **Constants:** SCREAMING_SNAKE_CASE (`DEFAULT_DURATION_MS`)

## Preview (Claude Code)

Server configs live in `.claude/launch.json` (`dev` on port 5173, `preview` on port 4173).

To start the dev server, call `preview_start` with name `"dev"`.

**Base path:** The app is served at `/rg-backpack-planner/` (matching GitHub Pages). The root `/` shows a blank page. Always use the full URL: `http://localhost:5173/rg-backpack-planner/`

**After starting or restarting the server**, always navigate explicitly:
```js
preview_eval: window.location.href = 'http://localhost:5173/rg-backpack-planner/'
```
Then wait for the page and take a screenshot before interacting. The browser may be on `chrome-error://` after a server restart and will not auto-recover.

**HMR errors persist in console** from editing sessions even after code is fixed. If you see stale Vite HMR errors, restart the server (`preview_stop` then `preview_start`) and navigate again. Do not chase stale console errors.

**Opening the side menu:** Use a single `preview_click` on `.menu-button`. Do NOT double-click (it opens then immediately closes). After opening, the side menu content is scrollable — use `preview_eval` to scroll:
```js
preview_eval: document.querySelector('.side-menu__content').scrollTop = document.querySelector('.side-menu__content').scrollHeight
```

**ContextMenu dropdowns** (theme color, preview builds, etc.) close automatically on any `pointerup` outside the menu. When testing dropdown items:
- Use `preview_click` with a CSS selector (not JS `.click()`) to select items
- Or set store values directly via `localStorage.setItem(...)` + page reload to bypass UI interaction

**Viewport size matters:** At mobile width (< 500px), the side menu slides over the full screen. Use `preview_resize` to 800x600 or wider to see the side menu alongside the tree.

**Preview pane must be open:** The preview tools (`preview_screenshot`, `preview_snapshot`, etc.) stall indefinitely if the Preview pane is not already open in Claude Desktop. There is no way to programmatically open it. If a preview call hangs, the user must manually open the Preview pane in Claude Desktop for it to complete. Avoid chaining multiple preview verification steps without confirming the pane is responsive.

**Other caveats:**
- On Windows, `launch.json` uses `node` directly (`node node_modules/vite/bin/vite.js`) instead of `npm run dev` because `preview_start` cannot spawn `.cmd` shims.
- Run `npm run build` before using the `preview` server (it serves the `dist/` folder).

## Deployment

- GitHub Pages at `/rg-backpack-planner/` base path
- 404.html is a copy of index.html (GitHub Pages fallback for non-existent paths)
- PWA with offline support via service worker

## Key Types

```typescript
type NodeState = "locked" | "available" | "active" | "maxed"
type SkillId = string // e.g., "skill-id-name"
type LevelsByIndex = number[] // Node levels for one tree
```
