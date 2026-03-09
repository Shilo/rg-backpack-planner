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
- `npm run test:ui:tier` — headed Playwright tier contract UI suite (run only when explicitly requested)

## Conventions

- Match nearby style; this repo commonly uses 4-space blocks.
- Components/types: PascalCase.
- Stores: camelCase with `Store` suffix.
- Constants: `SCREAMING_SNAKE_CASE`.

## Notes

- GitHub Pages base path is `/rg-backpack-planner/`; keep routing SPA-safe.
- If `public/icon.svg` changes, rerun `npm run pwa:assets`.
- When I ask you to commit, use only `npm test` by default. Do not run `npm run test:ui:tier` unless I explicitly request it.
- In Codex, cite sources as plain `path:line` text, not Markdown file links.

## Cursor Cloud specific instructions

- **Single service**: This is a client-only Svelte 5 + Vite PWA with no backend or database. `npm run dev` is all that's needed.
- **Dev URL**: The Vite dev server listens on `http://localhost:5173/` (or `http://localhost:5173/rg-backpack-planner/` if base path is configured).
- **Lint/check**: `npm run check` runs `svelte-check` + `tsc`. There is no separate ESLint config.
- **Tests**: `npm test` runs type checks then `tsx test/index.ts`. All suite output is mirrored to `test/index.output.log`. The runner halts instantly (exit code 1) upon the first test failure, and only prints the success summary if all tests pass. Per repo convention, do not run `npm run test:ui:tier` unless explicitly asked.
- **Build**: `npm run build` produces `dist/` and copies `index.html` to `404.html` for SPA routing on GitHub Pages.
- **Skills**: Project skills live in `.skills/` at repo root (e.g. `regenerate-locales`, `app-store-changelog`). Use them when the user asks to regenerate locales/translations or to generate release notes / changelog / "What's New".
