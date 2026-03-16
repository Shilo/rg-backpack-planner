# Version migration: run as early as possible

When implementing the version migration system (one-time scripts on upgrade), migrations **must** run as early as possible in the app lifecycle to avoid conflicts and race conditions.

## Why

- **Storage races:** Other code (e.g. `onboardingSeen`, theme, presets) may read/write localStorage on first run. Migrations should run before any of that so the "previous version" is still in storage and migration effects are visible to subsequent reads.
- **Single execution:** Running migrations before Svelte mounts and before any stores subscribe ensures one deterministic pass with no double-run or ordering issues.
- **No UI dependency:** Migrations should not depend on i18n, theme, or DOM; they only need `getStoredVersion()`, `getCurrentVersion()`, and storage. So they can run before `initializeI18n()`, theme, or `mount(App)`.

## Where to run

Run migrations in **[src/main.ts](src/main.ts)** as the **first** executable step after the top-level imports:

1. Keep imports as they are (or add only the migration runner and version/storage it needs).
2. **Immediately** after the opening of the script (before `initThemeReactivity()`, before `initViewportTracking()`, before `initializeI18n()`), call the migration runner, e.g.:
   - `runMigrations()` — synchronous function that:
     - Reads `getStoredVersion()` and `getCurrentVersion()`.
     - If equal or both null/unknown, do nothing and return.
     - Otherwise, run each migration that applies to the upgrade path (stored → current), in order.
     - Then call `markVersionAsSeen()` so the rest of the app (including App.svelte) sees the new version as "already seen" and no other code tries to run migrations or overwrite version.
3. Do **not** run migrations inside App.svelte’s `onMount` or in any component: that runs after mount, after store subscriptions and other init, and can race with code that already read from storage.

## Contract for the migration runner

- **Synchronous:** No `async`/`await` in the runner; migrations are sync so there’s no chance of other code running before they finish.
- **No side effects beyond storage:** Migrations only change localStorage (and optionally sessionStorage) via the same storage API the rest of the app uses. They don’t depend on DOM, i18n, or Svelte.
- **Idempotent per version:** Each migration is keyed by version; running the same migration twice for the same upgrade path should be safe (e.g. migrations only run when stored !== current, and after running we set stored = current).

This ensures the version migration runs first and avoids race conditions with the rest of the app.
