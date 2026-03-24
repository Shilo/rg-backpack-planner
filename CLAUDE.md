# Repo Guide

Svelte 5 + TypeScript PWA for planning Run! Goddess Backpack Tech builds.

## Structure

- `src/lib/` — Components, stores (`*Store.ts`), helpers
  - `buildData/`, `buildImageExport/`, `sideMenuPages/`, `onboarding/`, `modals/`, `input/`, `buttons/`, `icons/`, `migrations/`, `dev/`
  - `themeEngine.ts`, `themeApply.ts` — OKLCH color system
- `src/config/` — Tree defs (base, guardian, vanguard, cannon), skill metadata/icons/values
- `test/` — CLI test suites; see [test/README.md](test/README.md)

## Commands

- `npm run dev` — Dev server
- `npm run build` — Prod build + SPA 404 fallback
- `npm run check` — svelte-check + tsc (no ESLint)
- `npm test` — check + full test suite
- `npm run test:ui:tier` — Playwright tier UI (only when explicitly requested)
- `npm run pwa:assets` — Regen PWA assets from `public/icon.svg`

## Conventions

- 4-space indent. Match nearby style.
- PascalCase components/types. camelCase `*Store` stores. `SCREAMING_SNAKE` constants.
- **No backwards compat**: No unused params, legacy paths, shims. Update all callers. Delete dead code.

## Notes

- GitHub Pages base: `/rg-backpack-planner/`; keep SPA-safe.
- `npm test` mirrors to `test/index.output.log`, exits 1 on first failure.
- When committing, use `npm test` only. Skip `test:ui:tier` unless requested.
- Client-only PWA, no backend. `npm run dev` is all needed.
- Skills in `.skills/`.

## Design

Clean, focused companion tool for gamers — not a flashy portal. OKLCH theming is first-class. Minimal foundation with playful energy and juice. See [`.impeccable.md`](.impeccable.md) for full design context (users, personality, aesthetic direction, emotional goals).

**Principles**: Content over chrome. Juice without jank. Respect the player (assume expertise). Accessible by default (colorblind, reduced motion, keyboard, screen readers). Earned playfulness (polish > decoration).

**Anti-patterns**: Generic dashboards, cluttered gaming sites, template aesthetics.

**References**: Mobalytics, PoE Ninja, D2 Armor Picker (utility); Linear, Raycast, Arc (quality bar).
