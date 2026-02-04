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
Decoupled via `modalStore`:
```typescript
openModal({ type: "confirm", title: "...", onConfirm: () => {...} })
```

## Naming Conventions

- **Components:** PascalCase (`ShareBuildButton.svelte`)
- **Stores:** camelCase with Store suffix (`treeLevelsStore.ts`)
- **Types:** PascalCase (`Tree`, `BuildData`, `NodeState`)
- **Constants:** SCREAMING_SNAKE_CASE (`DEFAULT_DURATION_MS`)

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
