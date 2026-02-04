# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Svelte 5 + TypeScript app code. Shared state lives in `src/lib/*Store.ts`, and feature UI is organized under `src/lib/` (buttons, modals, side menu pages).
- `src/config/`: Tree definitions for Guardian/Vanguard/Cannon.
- `public/`: Static assets (PWA icons, manifest inputs).
- `test/`: Build-data encoder tests and documentation.
- `scripts/`: Build helpers like `scripts/copy-404.cjs`.
- `dist/`: Production build output (generated).

## Build, Test, and Development Commands
- `npm run dev`: Start the Vite dev server with hot reload.
- `npm run build`: Production build and copies `index.html` to `404.html` for GitHub Pages routing.
- `npm run preview`: Serve the production build locally.
- `npm run check`: Run `svelte-check` and TypeScript type checking.
- `npm run pwa:assets`: Generate PWA assets from `public/icon.svg`.

## Coding Style & Naming Conventions
- Indentation: follow existing files (4 spaces in JSON; Svelte/TS uses 4-space blocks in this repo).
- Components: PascalCase (e.g., `ShareBuildButton.svelte`).
- Stores: camelCase with `Store` suffix (e.g., `treeLevelsStore.ts`).
- Types: PascalCase; constants: `SCREAMING_SNAKE_CASE`.
- No dedicated formatter is configured; keep changes consistent with nearby code.

## Testing Guidelines
- Tests focus on build-data encoding in `test/encoder.test.ts`.
- Preferred run method: `npm run dev`, then in the browser console:
  `import("./test/encoder.test.js");`
- Test expectations are documented in `test/README.md`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (e.g., `feat: add preview build dropdown`).
- PRs should include:
  - Clear summary and scope.
  - Linked issue (if applicable).
  - Screenshots or short clips for UI changes.
  - Notes on test steps (manual console tests or `npm run check`).

## Configuration & Deployment Notes
- GitHub Pages deploys from `/rg-backpack-planner/`; ensure routing remains SPA-friendly.
- PWA assets originate from `public/icon.svg`; regenerate after icon changes.
- For architecture details, see `CLAUDE.md`.
