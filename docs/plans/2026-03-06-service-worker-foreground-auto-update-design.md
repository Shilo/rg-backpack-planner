# Service Worker Foreground Auto-Update Design (2026-03-06)

## Summary
Refactor service worker update wiring out of `src/main.ts` into a dedicated module that keeps immediate auto-apply behavior and removes the manual user reload requirement by proactively checking for updates whenever the app returns to foreground.

## Goals
- Keep immediate update application once a new service worker takes control (existing `controllerchange -> reload` behavior).
- Trigger update checks automatically when the app window/tab becomes active (`focus` and `visibilitychange` to `visible`).
- Preserve both update-related toasts:
  - `toast.updatingToast` (`"Updating..."`) during worker lifecycle changes.
  - `toast.updatedVersionToast` (`"Updated to v{version}"`) after reload into a new app version.
- Reduce `src/main.ts` complexity by moving update logic into a focused module with cleanup support.

## Non-goals
- No changes to service worker generation strategy in Vite PWA plugin config.
- No UI copy changes for existing update/reload controls.
- No change to settings "Reload Window" behavior (keep current forced reload path).

## Current State
- `vite.config.ts` already uses `registerType: "autoUpdate"`.
- `src/main.ts` owns all service worker listener wiring (`controllerchange`, `updatefound`, `statechange`) and reload logic.
- Manual settings reload path exists in `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` (`registration.update()` attempt + `window.location.reload()`).
- `"Updated to v{version}"` toast is shown by version-detection flow in `src/App.svelte` and is independent from service worker listener placement.

## Selected Approach
Create `src/lib/serviceWorkerAutoUpdate.ts` with an initializer that encapsulates service worker lifecycle listeners plus foreground-triggered update checks.

### Why this approach
- Keeps behavior centralized and testable.
- Removes manual action dependency by polling only at meaningful lifecycle moments (foreground resume).
- Avoids noisy interval polling while still remaining responsive to deployments.

## Detailed Design

### 1) Module API
Add `initServiceWorkerAutoUpdate(options)` in `src/lib/serviceWorkerAutoUpdate.ts`.

Proposed API shape:
- Input:
  - `showUpdatingToast: () => void`
  - optional throttle setting (defaulted in module for simplicity).
- Output:
  - cleanup function `() => void` that removes all attached listeners.

`src/main.ts` integration:
- Build the localized toast callback in main (`showToast(tr("toast.updatingToast"))` once-per-session behavior).
- Call `initServiceWorkerAutoUpdate({ showUpdatingToast })`.
- Register returned cleanup in `import.meta.hot.dispose`.

### 2) Service worker lifecycle behavior
Inside module:
- Capture `hadController = !!navigator.serviceWorker.controller` at init time.
- On `controllerchange`:
  - if `hadController` is `false`, no-op (first install).
  - otherwise show updating toast and call `window.location.reload()`.
- On `updatefound`:
  - track current `registration.installing`.
  - attach `statechange` listener to current installing worker.
- On installing worker `statechange`:
  - when state is `installing`, `installed`, or `activating`, invoke `showUpdatingToast`.
  - ensure old worker listener is removed before swapping tracked worker.

### 3) Foreground-triggered update checks
Add foreground listeners:
- `window` `focus`
- `document` `visibilitychange` (only when `document.visibilityState === "visible"`)

Both listeners call a shared `requestUpdateCheck()` that:
- returns early if registration not available.
- returns early if a previous check is still in flight.
- throttles repeated checks within a short interval (to avoid double-trigger from focus + visibilitychange).
- calls `registration.update()` and logs errors without user-facing failure toast.

This keeps automatic update fetches lightweight while app is actively used.

### 4) Toast guarantees
- `"Updating..."` remains tied to worker lifecycle events and is still shown once per update session.
- `"Updated to v{version}"` remains unchanged in `App.svelte` new-version flow (`latestUsedVersionStore`); module extraction does not alter that behavior.

### 5) Settings page behavior
No change to `handleReloadWindow`:
- continue attempting `registration.update()`.
- continue hard reload afterwards.

This preserves the existing manual fallback path.

## Error Handling and Edge Cases
- Service worker unsupported: initializer is a no-op and returns noop cleanup.
- Missing registration: keep listeners that do not require registration and retry registration update checks only after registration is available.
- `registration.update()` failures/timeouts: catch and log warning; app remains functional and will retry on later foreground events.
- HMR: cleanup detaches listeners from navigator/document/window/registration/worker.

## Testing Strategy
1. Refactor/update source-level service worker toast test to target the new module and preserve existing expectations for:
   - `toast.updatingToast` invocation.
   - immediate reload on `controllerchange` for update scenario.
2. Add/extend test coverage for foreground update checks:
   - presence of `focus` and `visibilitychange` handlers.
   - throttled/in-flight guarded `registration.update()` calls.
3. Keep existing version toast behavior coverage in App flow unchanged (`toast.updatedVersionToast` still emitted on new version).
4. Run full regression via `npm test`.

## Risks and Mitigations
- Risk: Duplicate foreground events causing redundant network checks.
  - Mitigation: in-flight guard + throttle window.
- Risk: Behavior drift during refactor from `main.ts` to module.
  - Mitigation: preserve existing event sequencing and update source-level tests to assert key contracts.
- Risk: Missing cleanup in HMR.
  - Mitigation: explicit cleanup function returned from module and called in `import.meta.hot.dispose`.

## Rollout
- Implement module extraction and main integration in one change.
- Keep settings fallback unchanged.
- Validate with `npm test`.
- Deploy normally; update pickup becomes automatic on foreground resume without requiring manual reload action.
