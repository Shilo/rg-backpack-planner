# Repo Guide

Svelte 5 + TypeScript PWA for planning Run! Goddess Backpack Tech builds.

## Structure

- `src/lib/` — Components, stores (`*Store.ts`), helpers
  - `buildData/`, `buildImageExport/`, `compare/`, `sideMenuPages/`, `onboarding/`, `modals/`, `input/`, `buttons/`, `icons/`, `migrations/`, `dev/`
  - `themeEngine.ts`, `themeApply.ts` — OKLCH color system and global theme reactivity
- `src/config/` — Tree defs (base, guardian, vanguard, cannon), skill metadata/icons/values
- `src/locales/` — App strings (`en.json` is the source), `glossary/` fixed in-game terms, `TRANSLATING.md` translation rules
- `test/` — CLI test suites; see [test/README.md](test/README.md)

## Commands

- `npm run dev` — Dev server
- `npm run build` — Prod build + SPA 404 fallback
- `npm run check` — svelte-check + tsc (no ESLint)
- `npm test` — check + `svelte-whisper check --usage src` + curated CLI suite
- `npm run test:ui` — Full Playwright UI sweep (only when explicitly requested)
- `npm run test:ui:tier` — Playwright tier UI (only when explicitly requested)
- `npm run pwa:assets` — Regen PWA assets from `public/icon.svg`

## Conventions

- 4-space indent. Match nearby style.
- PascalCase components/types. camelCase `*Store` stores. `SCREAMING_SNAKE` constants.
- **No backwards compat**: No unused params, legacy paths, shims. Update all callers. Delete dead code.

## Notes

- GitHub Pages base: `/rg-backpack-planner/`; keep SPA-safe.
- `npm test` mirrors to `test/index.output.log` and exits 1 if any listed suite fails.
- When committing, use `npm test` only. Skip `test:ui*` unless requested.
- Client-only PWA, no backend. `npm run dev` is all needed.
- Skills in `.skills/`. Localization skills ship with svelte-whisper in `node_modules/svelte-whisper/skills/` (`whisper-setup`, `whisper-translate`, `whisper-audit`); install them for your agent with `npx skills add Shilo/svelte-whisper`.

## Localization

- i18n is svelte-whisper 2.x (see `node_modules/svelte-whisper/llms.txt`), set up in `src/lib/i18n.ts`. `tr()` and `formatPercent()` no longer exist.
- Components without runes (`export let`, `$:`), which is most of `src/lib/`: Svelte only follows stores there, so write `$t("key", vars)` and `$locale` (`$locale = id` or `locale.set(id)` to switch), and pass the locale to formatters: `formatNumber(n, options, $locale)`. A helper that translates or formats takes `$t` or `$locale` as an argument (`getDisplayPresetName(name, $t)`, `formatByteSize(bytes, $locale)`), otherwise its result goes stale after a language switch.
- Runes components and `.ts` modules use the functions: `t("key")`, `getLocale()`, `setLocale(id)`, `formatNumber(n)`.
- One sentence, one key: never join translated fragments. Use a plural group (`{ "one": …, "other": … }` selected by a numeric `count`) wherever a count is shown.
- Format numbers in UI text with `formatNumber`, never `toLocaleString()`, `toFixed()` or a hand-appended `%` (use `{ style: "percent" }`).
- After changing `en.json`, translate with the `whisper-translate` skill (rules in `src/locales/TRANSLATING.md`) and confirm `npx svelte-whisper check --usage src` passes.

## Design

Clean, focused companion tool for gamers — not a flashy portal. OKLCH theming is first-class. Minimal foundation with playful energy and juice. See [`.impeccable.md`](.impeccable.md) for full design context (users, personality, aesthetic direction, emotional goals).

**Principles**: Content over chrome. Juice without jank. Respect the player (assume expertise). Accessible by default (colorblind, reduced motion, keyboard, screen readers). Earned playfulness (polish > decoration).

**Anti-patterns**: Generic dashboards, cluttered gaming sites, template aesthetics.

**References**: Mobalytics, PoE Ninja, D2 Armor Picker (utility); Linear, Raycast, Arc (quality bar).
