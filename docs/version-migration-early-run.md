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
     - If current is "unknown", or **stored is null** (no version ever saved — treat as already on current), or stored ≥ current, do nothing and return.
     - Otherwise, runs every migration whose `toVersion` is strictly after stored and at or before current (`stored < toVersion ≤ current`), in version order. E.g. 0.9 → 1.2 runs 1.0 and 1.1; 1.2 → 1.3 runs only the 1.3 migration. Does **not** call `markVersionAsSeen()` — App.svelte does that after `runInitialization()` so the "updated" toast can still show.

## Version values

- **Stored:** From localStorage key `latest-used-version`. It is **null** when the key was never set (first launch, or before this feature existed). When null, we do not run migrations (user is treated as already on current).
- **Current:** From `package.json` version. It is **"unknown"** only if that field is missing (should not happen in normal builds). When "unknown", we skip migrations.
3. Do **not** run migrations inside App.svelte’s `onMount` or in any component: that runs after mount, after store subscriptions and other init, and can race with code that already read from storage.

## Contract for the migration runner

- **Synchronous:** No `async`/`await` in the runner; migrations are sync so there’s no chance of other code running before they finish.
- **No side effects beyond storage:** Migrations only change localStorage (and optionally sessionStorage) via the same storage API the rest of the app uses. They don’t depend on DOM, i18n, or Svelte.
- **Idempotent per version:** Each migration is keyed by version; a given migration runs only when its `toVersion` is in the open-closed interval (stored, current]. After the user is marked as having seen the new version in App.svelte, the next load has stored = current so no migrations run again.

This ensures the version migration runs first and avoids race conditions with the rest of the app.
