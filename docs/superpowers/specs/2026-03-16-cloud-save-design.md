# Cloud Save Design Spec

Date: 2026-03-16

## Overview

Add opt-in realtime cloud syncing of build preset data between devices using Firebase. Users sign in with Google, and their `rg-backpack-planner-build-presets` blob syncs automatically across all signed-in devices.

## Goals

- Automatic cross-device sync of build presets with minimal user friction
- Google Sign-In as the sole identity provider (lowest friction, broadest reach)
- Forward-compatible data model for a future leaderboard feature
- No impact on app load time for users who don't use Cloud Save

## Non-Goals

- Leaderboard UI or public build publishing (future work)
- Discord login (possible future addition)
- Syncing device-local settings (theme, dark mode, colorblind, text size, haptics, onboarding, tab/menu state)
- Complex conflict resolution or offline merge strategies

## Architecture

### Stack

- Firebase Auth (Google Sign-In only)
- Cloud Firestore (one document per user)
- Firebase JS SDK (modular API, tree-shakeable)

### Data Flow

```
localStorage ←→ buildPresetsStore ←→ cloudSyncService ←→ Firestore document
                                                          ↕ (realtime listener)
                                                       Other devices
```

### Sync Scope

Only one localStorage key is synced:

```
rg-backpack-planner-build-presets
```

Its full JSON value (active preset ID + all presets with names and build codes) is stored as native Firestore fields in a single document per user.

Everything else stays device-local.

## Authentication

### Provider

Google Sign-In only, via Firebase Auth.

### Cascading Sign-In Flow

When the user taps "Cloud Save":

1. Try Google One Tap (`.prompt()`) — works if user is signed into Google in a browser tab. One click, seamless.
2. If One Tap fails → try `signInWithPopup` — opens Google sign-in popup.
3. If popup fails → fall back to `signInWithRedirect` — navigates to Google, then back. Always works including standalone PWA on iOS.

The user never sees the cascade. They tap one button and end up signed in.

### Session Persistence

Firebase Auth persists the session in IndexedDB by default. The user stays signed in across app restarts and service worker update reloads until they explicitly sign out.

### No Anonymous Auth

No anonymous step. No deferred sign-up. No email/password. One provider, one flow.

### User Data Stored

Only the Firebase UID (used as the document owner key). Email, display name, and profile photo are read from the Firebase Auth user object for display in the Cloud Save context menu but are not stored in Firestore.

## Firestore Structure

### Document Path

```
sync/{firebaseUid}
```

One flat document per user. No subcollections.

### Document Shape

```json
{
  "active": "preset-uuid",
  "presets": [
    {
      "id": "preset-uuid",
      "name": "Default",
      "buildCode": "_"
    }
  ],
  "revision": 42,
  "updatedAt": "<server timestamp>"
}
```

`active` and `presets` are stored as native Firestore fields (not a stringified JSON blob). This makes the document inspectable in the Firebase console and indexable if needed.

### Security Rules

- A user can only read/write their own document (`request.auth.uid == userId`)
- No public reads, no cross-user access
- Write validation: enforce max document size (~50KB)
- Require authentication on all operations

### Firestore Offline Persistence

Firestore's built-in offline persistence (IndexedDB cache) is explicitly disabled. The app already uses localStorage as its local cache, and a second cache layer would add complexity without benefit.

### Future Leaderboard Path (Not Built Now)

```
publishedBuilds/{documentId}
```

Separate top-level collection, publicly readable, writable only by owning user. The Firebase UID is the owner key for both sync and leaderboard. This is noted here for forward-compatibility only — no code or schema is implemented.

## Sync Logic

### Revision Counter

The `revision` field uses Firestore's server-side `increment()` operation on every write. This avoids client-side race conditions. The local revision is read from incoming Firestore snapshots, never managed independently by the client.

Initial revision for a new document: `1`.

### On Sign-In (First Time — No Remote Document)

1. Read Firestore document for this user → does not exist
2. Create it from current localStorage data with `revision: 1`
3. Attach realtime listener

### On Sign-In (Existing Remote Document)

1. Read Firestore document → exists
2. Remote wins. Write remote data to localStorage and update `buildPresetsStore`.
3. Attach realtime listener

This means if a user signs out, edits locally for a while, and signs back in, remote data overwrites local. This is an accepted tradeoff — the cloud document is the cross-device source of truth. Users who want to preserve local edits should not sign out. This scenario is expected to be extremely rare.

### On Local Preset Change

1. Existing path unchanged: `buildPresetsStore` → localStorage
2. If Cloud Save active → write to Firestore with `increment(1)` on revision and server timestamp

### On Remote Change (Firestore Listener)

1. Compare incoming `revision` to last-known local `revision`
2. If remote is newer → update localStorage and `buildPresetsStore`
3. If same or older → ignore (own write echoing back)

### On Sign-Out

1. Detach Firestore listener
2. Local data stays in localStorage untouched
3. No cloud data deletion

### On `clearAll()` (Clear All Data from Settings)

1. Sign out of Firebase Auth
2. Detach Firestore listener
3. Local data is wiped (existing `clearAll()` behavior)
4. Cloud data is NOT deleted — re-enabling Cloud Save later restores from cloud

### On App Boot (Already Signed In)

1. Load from localStorage immediately (fast, offline-capable)
2. Firestore listener attaches and brings in remote updates within ~1-2 seconds

### Write Failures

If a Firestore write fails (network error, quota, permission), the local change is already saved to localStorage. The failed cloud write is not retried. The next local preset change triggers a new write attempt that brings the cloud document up to date.

### Conflict Strategy

Last-write-wins at the document level using the server-managed `revision` counter. No merge, no conflict UI. The realtime listener naturally serializes edits across simultaneously-open devices in the common case. True simultaneous edits (same 1-2 second window) result in last-write-wins, which is acceptable given the app's discrete edit pattern.

Always write the full document on every sync. Do not use Firestore partial array operations (`arrayUnion`, `arrayRemove`) — they would break the revision-based conflict model.

## Side Menu UX

### Cloud Save Button

Located in the side menu alongside existing settings.

- **Off state:** Cloud icon + "Cloud Save" label. Tapping triggers Google Sign-In cascade.
- **On state (idle):** Cloud-check or similar active icon + "Cloud Save" label. Tapping opens a Cloud Save context menu.
- **On state (syncing):** Animated cloud icon (same as HUD indicator) + "Cloud Save" label.

No onboarding prompt. No first-run popup. Users discover it when they want it.

### Cloud Save Context Menu

Opens as a `ContextMenu` component (existing pattern in the app). The implementation computes the Cloud Save button's bounding rect and passes `(x, y)` coordinates to position the menu, consistent with how other context menus in the app are anchored.

**Profile section (top):**

- Google profile picture (circular avatar)
- Display name
- Email address

**Sync info:**

- Last synced timestamp ("Last synced 2 min ago" or "Just now")
- Revision number (small, subtle)
- Number of presets synced (e.g., "6 builds synced")

**Actions:**

- **Sync now** — manual force-refresh. Non-destructive.
- **Sign out** — detaches cloud sync, keeps local data. No confirmation prompt.
- **Delete cloud data** — permanently removes Firestore document and signs out. Confirmation prompt: "This permanently removes your builds from the cloud. This cannot be undone. Builds on this device will be kept."

**Footer note:** Small muted text below the actions explaining what Sign Out does: "Signing out keeps your builds on this device but stops syncing." Replaces confirmation dialogs for non-destructive actions.

### Sign-In Feedback

After successful sign-in, the button transitions to the on state. A brief non-blocking toast: "Cloud Save enabled." No modal.

### Error Feedback

If sign-in fails (user cancels, network error), the button stays off. Brief toast: "Couldn't connect. Try again."

## Sync Status Indicator

### Side Menu Toggle Button (HUD)

The existing side menu toggle button is extracted into its own modular component.

- **Cloud Save off:** ListIcon (no change from current behavior)
- **Cloud Save on (idle):** ListIcon (no change — sync is active but not worth advertising)
- **Cloud Save on (syncing):** Briefly replaces ListIcon with animated cloud icon for the duration of the sync operation. Returns to ListIcon when done.
- **Cloud Save on (error/offline):** Replaces ListIcon with cloud-warning icon. Returns to ListIcon when connection recovers.

The icon replacement approach was chosen for simplicity and zero extra screen real estate. Because the component is modular, it can easily be changed to a badge overlay or other treatment later.

### CloudSyncIndicator Component

A modular component that renders the appropriate icon based on sync state. Used by both the HUD toggle button and the Cloud Save menu button. Easily modifiable in isolation.

### Animation Principles

- Short duration (~0.5-1s), only while a Firestore operation is in-flight
- Triggers on actual sync events, not timers
- Respects `prefers-reduced-motion` — falls back to no animation

## Module Structure

### New Files

- `src/lib/cloudSync/config.ts` — Firebase app initialization and config values (lazy loaded)
- `src/lib/cloudSync/auth.ts` — Google Sign-In cascade, sign-out, auth state listener (lazy loaded)
- `src/lib/cloudSync/firestore.ts` — Firestore document read/write/listen (lazy loaded)
- `src/lib/cloudSync/service.ts` — Orchestrator connecting `buildPresetsStore` ↔ Firestore (lazy loaded)
- `src/lib/cloudSyncStore.ts` — Svelte store exposing sync state to UI (eager, tiny, no Firebase dependency). Lives at `src/lib/` level per project convention (`*Store.ts` suffix).
- `src/lib/cloudSync/CloudSyncIndicator.svelte` — Modular icon component for sync status (eager)

### Modified Files

- `src/lib/buildPresetsStore.ts` — Add hook/callback for `cloudSyncService` to subscribe to preset changes (store does not import Firebase)
- Side menu — Add Cloud Save button
- Side menu toggle button — Extract into modular component, consume `cloudSyncStore` for icon swapping
- New Cloud Save context menu component

### Lazy Loading Strategy

All Firebase SDK modules (`firebase/app`, `firebase/auth`, `firebase/firestore`) and all files in `src/lib/cloudSync/` except `CloudSyncIndicator.svelte` are dynamically imported via `import()`.

- First load: when user taps Cloud Save for the first time
- Subsequent boots: when app detects an existing Firebase Auth session on startup

The initial bundle is unaffected for users who never enable Cloud Save.

### Dependency Direction

```
UI components → cloudSyncStore.ts (read-only, eager)
                       ↑
            cloudSync/service.ts (writes to store, lazy)
              ↙              ↘
  cloudSync/auth.ts    cloudSync/firestore.ts (lazy)
              ↘              ↙
            cloudSync/config.ts (lazy)
```

`buildPresetsStore` does not import Firebase. `cloudSyncService` subscribes to it and bridges the two worlds.

## Localization

All user-facing strings introduced by Cloud Save need locale entries in `src/locales/` (en, ja, zh, fr). This includes:

- Button labels ("Cloud Save")
- Toast messages ("Cloud Save enabled", "Couldn't connect. Try again.")
- Context menu content ("Sign out", "Delete cloud data", "Sync now", footer notes)
- Sync info labels ("Last synced", "builds synced")
- Confirmation dialog text

## Testing

### Unit Tests

- `cloudSync/service.ts` sync logic: sign-in scenarios (new user, existing user), local→remote writes, remote→local updates, revision comparison, sign-out cleanup, `clearAll()` interaction
- `cloudSync/auth.ts` cascade: mock each sign-in method to verify fallback chain

### Mocking Strategy

- Firebase SDK calls are mocked in tests. The service's dependency on `auth.ts` and `firestore.ts` makes this straightforward since those modules are the only Firebase touchpoints.

### Manual Testing

- Sign in on device A, verify data appears on device B
- Edit on one device with both open, verify realtime update
- Sign out, verify local data persists
- Clear all data, verify cloud data survives and restores on re-sign-in

## Dependencies

- `firebase` (modular SDK, tree-shakeable — only `firebase/app`, `firebase/auth`, `firebase/firestore` are imported)

## Firebase Project Setup

- Create Firebase project
- Enable Google Sign-In in Firebase Auth
- Create Firestore database
- Firebase web config stored in `config.ts` (public by design — security comes from Firestore rules, not config secrecy)

## Cost

Effectively free at the expected scale:

- Firebase Auth: free up to 50K MAUs
- Firestore free tier: 1 GiB storage, 50K reads/day, 20K writes/day
- Expected usage: ~10 MAUs, ~700 reads/month, ~500 writes/month, ~8KB stored

## UI Implementation Note

The Cloud Save context menu and related UI components should use the `/frontend-design` skill during implementation for design quality.
