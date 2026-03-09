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

- `npm run dev` — Vite dev server
- `npm run build` — production build + copy `index.html` to `404.html`
- `npm run preview` — preview `dist/`
- `npm run check` — svelte-check + TypeScript
- `npm test` — checks + test suite
- `npm run pwa:assets` — regenerate PWA assets from `public/icon.svg`

## Conventions

- Match nearby style; this repo commonly uses 4-space blocks.
- Components/types: PascalCase.
- Stores: camelCase with `Store` suffix.
- Constants: `SCREAMING_SNAKE_CASE`.

## Notes

- GitHub Pages base path is `/rg-backpack-planner/`; keep routing SPA-safe.
- If `public/icon.svg` changes, rerun `npm run pwa:assets`.
- `npm test` output is mirrored to `test/index.output.log`. It halts and exits 1 immediately upon the first test failure, only printing the success summary when all pass.
