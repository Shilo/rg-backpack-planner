# Repo Guide

- Svelte 5 + TypeScript PWA for planning and sharing Run! Goddess Backpack Tech builds.
- Main code: `src/lib/`; stores: `src/lib/*Store.ts`; tree data: `src/config/`; static assets: `public/`; tests: `test/`.

## Commands

- `npm run dev` - Vite dev server
- `npm run build` - production build + copy `index.html` to `404.html`
- `npm run preview` - preview `dist/`
- `npm run check` - `svelte-check` + TypeScript
- `npm test` - checks + test suite
- `npm run pwa:assets` - regenerate PWA assets from `public/icon.svg`

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
