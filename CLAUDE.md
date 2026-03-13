# Repo Guide

Svelte 5 + TypeScript PWA for planning and sharing Run! Goddess Backpack Tech builds.

## Project Structure

- **`src/lib/`** — Components, stores, build-data logic, helpers
- **`src/lib/*Store.ts`** — Svelte stores
- **`src/config/`** — Tree definitions (guardian, vanguard, cannon) and shared metadata
- **`src/lib/buildData/`** — Encoder/decoder and URL handling for share links
- **`src/locales/`** — i18n (en, ja, zh)
- **`public/`** — Static assets, icons, manifest inputs
- **`scripts/`** — Build helpers (copy-404, bump-version, generate-pwa-icons)
- **`test/`** — CLI test suites; see [test/README.md](test/README.md)
- **`docs/`** — Behavior contracts, plans; see [docs/behavior-contracts.md](docs/behavior-contracts.md)

## Commands

- `npm run dev` — Vite dev server (`http://localhost:5173/` or with base path)
- `npm run build` — Production build + copy `index.html` to `404.html` for SPA routing
- `npm run preview` — Preview `dist/`
- `npm run check` — svelte-check + TypeScript
- `npm test` — Checks + full test suite
- `npm run test:ui:tier` — Headed Playwright tier contract UI suite (run only when explicitly requested)
- `npm run pwa:assets` — Regenerate PWA assets from `public/icon.svg`

## Conventions

- Match nearby style; this repo commonly uses 4-space blocks.
- Components/types: PascalCase.
- Stores: camelCase with `Store` suffix.
- Constants: `SCREAMING_SNAKE_CASE`.
- **No backwards compatibility**: Prioritize code quality over backwards compatibility. Never add unused parameters, legacy code paths, shims, or compatibility wrappers. If an API changes, update all callers. Delete dead code immediately.

## Notes

- GitHub Pages base path is `/rg-backpack-planner/`; keep routing SPA-safe.
- If `public/icon.svg` changes, rerun `npm run pwa:assets`.
- `npm test` output is mirrored to `test/index.output.log`. It halts and exits 1 immediately upon the first test failure, only printing the success summary when all pass.
- When asked to commit, use only `npm test` by default. Do not run `npm run test:ui:tier` unless explicitly requested.
- This is a client-only PWA with no backend or database. `npm run dev` is all that's needed.
- `npm run check` runs `svelte-check` + `tsc`. There is no separate ESLint config.
- Project skills live in `.skills/` at repo root (e.g. `regenerate-locales`, `app-store-changelog`). Use them when asked to regenerate locales/translations or generate release notes.

## Design Context

### Users
Run! Goddess players planning and sharing Backpack Tech builds. They understand game mechanics and want a focused tool that helps them think clearly about build choices — not a flashy game portal. They arrive with intent (plan a build, share it, compare options) and want to get in, accomplish that, and get out.

### Brand Personality
**Clean, Focused, Reliable.** A trustworthy companion tool that earns confidence through clarity and consistency. It doesn't compete with the game for attention — it complements it.

### Emotional Goals
**Calm & Focus** — "Everything I need, nothing I don't." The interface should create a zen-like planning flow where decisions feel clear and distractions are absent. Users should feel in control and never overwhelmed.

### Aesthetic Direction
**Modern & Minimal.** The OKLCH theming system does the heavy lifting — surfaces stay clean, content leads. The default sky-blue theme loosely echoes the game's own palette, grounding the tool as a familiar companion without copying the in-game UI directly.

**References:** Game companion apps (Mobalytics, PoE Ninja, D2 Armor Picker) for the "built for gamers by gamers" utility feel; polished indie tools (Linear, Raycast, Arc) for the quality bar and opinionated design sensibility.

**Anti-patterns:** Generic dashboards, cluttered gaming sites, gratuitous decoration, or anything that feels like a template. The app should feel purpose-built.

### Design Principles
1. **Content over chrome** — Every pixel should serve the build-planning task. Decoration that doesn't aid comprehension gets cut.
2. **Quiet confidence** — Quality shows in spacing, alignment, and consistency rather than flashy effects. Motion is purposeful, never performative.
3. **Respect the player** — Assume expertise. Don't over-explain, don't gate, don't patronize. Surface power when needed, stay minimal by default.
4. **Theming is identity** — The color system is a first-class feature, not a settings checkbox. Themes should feel intentional and cohesive across every surface.
5. **Accessible by default** — Colorblind modes, reduced motion, keyboard navigation, and screen readers aren't afterthoughts — they're part of the design language.
