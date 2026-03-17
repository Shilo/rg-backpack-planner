# Cloud Save Design Spec

Date: 2026-03-16

## Overview

Add opt-in realtime cloud syncing of build preset data between devices using Firebase. Users sign in with Google, and their build presets sync automatically across all signed-in devices. Each device maintains its own active preset selection independently.

## Goals

- Automatic cross-device sync of build presets with minimal user friction
- Google Sign-In as the sole identity provider (lowest friction, broadest reach)
- Per-preset merge so two devices can edit different presets simultaneously without overwriting each other
- Forward-compatible data model for a future leaderboard feature
- No impact on app load time for users who don't use Cloud Save

## Non-Goals

- Leaderboard UI or public build publishing (future work)
- Discord login (possible future addition)
- Syncing device-local settings (theme, dark mode, colorblind, text size, haptics, onboarding, tab/menu state)
- Syncing the active preset ID (`active` stays local per device)

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

Only the `presets` array from the `rg-backpack-planner-build-presets` localStorage key is synced. The `active` field stays local — each device can independently choose which preset is active.

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

Presets are stored as a **Firestore map keyed by preset ID**, not as an array. This enables partial updates — editing one preset doesn't touch others in the document.

```json
{
  "presets": {
    "0c686afe-50ea-4659-b688-94852d85e6a0": {
      "name": "Default",
      "buildCode": "_",
      "updatedAt": 1710590400000
    },
    "8a000c9f-e52d-452c-b8d5-81e5cd60e6fa": {
      "name": "Mid PvE",
      "buildCode": ";,k..k.'2.k.k..a:2;;37W",
      "updatedAt": 1710590400000
    }
  },
  "order": [
    "0c686afe-50ea-4659-b688-94852d85e6a0",
    "8a000c9f-e52d-452c-b8d5-81e5cd60e6fa"
  ],
  "revision": 42,
  "updatedAt": "<server timestamp>"
}
```

**Field descriptions:**

- `presets` — Map of preset ID → preset data. Each preset has `name`, `buildCode`, and `updatedAt` (client timestamp in ms, used for per-preset merge).
- `order` — Array of preset IDs defining display order. Kept in sync with the `presets` map keys. Simultaneous reorder on two devices is last-write-wins on the `order` array (not merged).
- `revision` — Server-managed counter, incremented on every write via `increment()`. Used for diagnostics and displayed in the Cloud Save context menu. Not used in the merge algorithm.
- `updatedAt` — Firestore server timestamp, set on every write.

**What is NOT stored in Firestore:**

- `active` — stays in localStorage only. Each device chooses its own active preset.

### Local `BuildPreset` Type Change

The `BuildPreset` interface gains an `updatedAt` field:

```typescript
export interface BuildPreset {
    id: string;
    name: string;
    buildCode: string;
    updatedAt: number; // ms timestamp, used for cloud sync merge
}
```

This is a breaking change. No backwards compatibility shims.

**Migration:** `validatePresetsData` backfills `updatedAt: Date.now()` for any preset loaded from localStorage that lacks it. This preserves existing user presets while ensuring the invariant holds going forward.

**Callsites that must be updated:**

- `defaultPresetsData()` — include `updatedAt: Date.now()` in default preset
- `validatePresetsData()` — backfill missing `updatedAt` with `Date.now()`
- `addPreset()` — include `updatedAt: Date.now()`
- `updatePreset()` — set `updatedAt: Date.now()`
- `updateActivePresetBuildCode()` — set `updatedAt: Date.now()`
- `test/buildPresets.test.ts` — update test preset objects to include `updatedAt`

### Security Rules

- A user can only read/write their own document (`request.auth.uid == userId`)
- No public reads, no cross-user access
- Write validation: enforce max document size (~50KB). If a write is rejected by this rule, the client should detect the error and show: "Too many builds to sync. Delete some builds to resume syncing."
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

The `revision` field uses Firestore's server-side `increment()` operation on every write. This avoids client-side race conditions. The local revision is read from incoming Firestore snapshots, never managed independently by the client. It is used for diagnostics (displayed in the Cloud Save context menu) and is not part of the merge algorithm.

Initial revision for a new document: `1`.

### Write Debounce

Local preset changes are debounced before writing to Firestore (~500ms). This batches rapid edits (e.g., adjusting multiple nodes quickly) into a single write and prevents out-of-order writes when edits happen faster than Firestore round-trips.

Writes are serialized per-document: write N+1 only fires after write N completes or fails. This guarantees `updatedAt` ordering at the server.

### Partial Writes

Firestore writes use `update()` with dot notation to only touch the changed fields:

**On preset edit:**
```
update(doc, {
  "presets.{presetId}.name": "...",
  "presets.{presetId}.buildCode": "...",
  "presets.{presetId}.updatedAt": Date.now(),
  revision: increment(1),
  updatedAt: serverTimestamp()
})
```

**On preset add:**
```
update(doc, {
  "presets.{presetId}": { name, buildCode, updatedAt },
  order: newOrderArray,
  revision: increment(1),
  updatedAt: serverTimestamp()
})
```

**On preset delete:**
```
update(doc, {
  "presets.{presetId}": deleteField(),
  order: newOrderArray,
  revision: increment(1),
  updatedAt: serverTimestamp()
})
```

**On reorder only:**
```
update(doc, {
  order: newOrderArray,
  revision: increment(1),
  updatedAt: serverTimestamp()
})
```

This means device A editing preset 1 and device B editing preset 2 don't overwrite each other — Firestore merges the partial writes server-side.

### Pending Local Deletions

The service maintains a `pendingLocalDeletions: Set<string>` to prevent a race condition where a locally-deleted preset reappears from a Firestore snapshot that arrives before the delete write completes.

- When a local delete fires a Firestore `deleteField()` write, the preset ID is added to `pendingLocalDeletions`.
- When the write succeeds or fails, the ID is removed from the set.
- During merge, any preset ID in `pendingLocalDeletions` is skipped (not re-added from remote).

### Per-Preset Merge (On Remote Snapshot)

When a Firestore realtime snapshot arrives, the client merges remote and local state per-preset using `updatedAt`:

1. For each preset ID in **remote**:
   - Skip if the ID is in `pendingLocalDeletions`
   - If local has it: compare `updatedAt` — take whichever is newer. **On tie, keep local** (avoids unnecessary churn from own-write echoes).
   - If local doesn't have it: add it (new from another device)

2. For each preset ID in **local only** (not in remote):
   - If it was in the previous remote snapshot: it was deleted on another device → remove locally
   - If it was NOT in the previous remote snapshot: it's a local addition not yet synced → keep

3. **Order:** Use remote order as the base. Append any local-only additions at the end. Remove any IDs that no longer exist in the merged presets.

4. **Active preset validation:** After merge, if the local `active` ID no longer exists in the merged presets, fall back to the first preset's ID. This reuses the same logic as the existing `validatePresetsData` fallback.

5. **Empty presets:** If the merge results in zero presets (all deleted across devices), create a default preset using the existing `defaultPresetsData()` logic. The cloud document should always have at least one preset.

6. Write merged result to localStorage and update `buildPresetsStore`.

**Tracking "previous remote snapshot":** The service keeps a `lastRemotePresetIds: Set<string>` in memory, updated each time a remote snapshot is processed. This is needed to distinguish "deleted remotely" from "added locally." It starts as an empty set — on the first merge after sign-in, all local presets are treated as local additions (correct behavior, since there is no previous remote state to compare against).

**Delete-vs-edit conflict:** If device A deletes a preset and device B edits the same preset simultaneously, the outcome depends on Firestore server-side write ordering. If the delete lands last, the preset is gone. If the edit lands last, it recreates the preset field. Both devices converge on the next snapshot. This is accepted last-write-wins behavior.

### On Sign-In (First Time — No Remote Document)

1. Read Firestore document for this user → does not exist
2. Create it from current localStorage presets (converted to map format) with `revision: 1`
3. Attach realtime listener

### On Sign-In (Existing Remote Document)

1. Read Firestore document → exists
2. Merge remote presets with local presets using the per-preset merge algorithm
3. Attach realtime listener

On first sign-in on a new device, local will typically only have the "Default" preset. The merge adds all remote presets and the Default preset's `updatedAt` determines whether it survives or gets overwritten by the remote version.

### On Local Preset Change

1. Existing path unchanged: `buildPresetsStore` → localStorage
2. The changed preset's `updatedAt` is set to `Date.now()`
3. If Cloud Save active → debounced partial write to Firestore (only the changed preset's fields + revision increment)

### On Remote Change (Firestore Listener)

1. Run per-preset merge algorithm (described above)
2. If merge produces any changes → update localStorage and `buildPresetsStore`
3. If no changes → ignore (own write echoing back, or remote state matches local)

### On Sign-Out

1. Detach Firestore listener
2. Clear `lastRemotePresetIds` and `pendingLocalDeletions`
3. Local data stays in localStorage untouched
4. No cloud data deletion

### On `clearAll()` (Clear All Data from Settings)

1. Sign out of Firebase Auth
2. Detach Firestore listener
3. Local data is wiped (existing `clearAll()` behavior)
4. Cloud data is NOT deleted — re-enabling Cloud Save later restores from cloud

### On App Boot (Already Signed In)

1. Load from localStorage immediately (fast, offline-capable)
2. Firestore listener attaches and brings in remote updates within ~1-2 seconds
3. Per-preset merge runs on the first snapshot

### Write Failures

If a Firestore write fails (network error, quota, permission), the local change is already saved to localStorage. The failed cloud write is not retried. The next local preset change triggers a new write attempt that brings the cloud document up to date.

If the failure is a document size limit rejection, show a user-facing toast: "Too many builds to sync. Delete some builds to resume syncing."

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
- `src/lib/cloudSync/firestore.ts` — Firestore document read/write/listen for the sync document (lazy loaded)
- `src/lib/cloudSync/merge.ts` — Per-preset merge algorithm: compare local vs remote by `updatedAt`, handle additions/deletions/pending deletions, reconcile order (lazy loaded)
- `src/lib/cloudSync/service.ts` — Orchestrator connecting `buildPresetsStore` ↔ Firestore, manages `lastRemotePresetIds`, `pendingLocalDeletions`, write debounce/serialization (lazy loaded)
- `src/lib/cloudSyncStore.ts` — Svelte store exposing sync state to UI (eager, tiny, no Firebase dependency). Lives at `src/lib/` level per project convention (`*Store.ts` suffix).
- `src/lib/cloudSync/CloudSyncIndicator.svelte` — Modular icon component for sync status (eager)

### Modified Files

- `src/lib/buildPresetsStore.ts` — Add `updatedAt` field to `BuildPreset` interface. Set `updatedAt` to `Date.now()` on every preset mutation (`defaultPresetsData`, `validatePresetsData`, `addPreset`, `updatePreset`, `updateActivePresetBuildCode`). Add hook/callback for `cloudSyncService` to subscribe to preset changes. Breaking change — no backwards compatibility shims.
- `test/buildPresets.test.ts` — Update test preset objects to include `updatedAt`
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
             ↙        ↓          ↘
cloudSync/auth.ts  cloudSync/merge.ts  cloudSync/firestore.ts (lazy)
             ↘                         ↙
            cloudSync/config.ts (lazy)
```

`buildPresetsStore` does not import Firebase. `cloudSyncService` subscribes to it and bridges the two worlds. `merge.ts` is a pure function module with no Firebase dependency — easy to unit test.

## Localization

All user-facing strings introduced by Cloud Save need locale entries in `src/locales/` (en, ja, zh, fr). This includes:

- Button labels ("Cloud Save")
- Toast messages ("Cloud Save enabled", "Couldn't connect. Try again.", "Too many builds to sync.")
- Context menu content ("Sign out", "Delete cloud data", "Sync now", footer notes)
- Sync info labels ("Last synced", "builds synced")
- Confirmation dialog text

## Testing

### Unit Tests

- `cloudSync/merge.ts` — Per-preset merge algorithm: both-have-same-preset (newer wins), equal `updatedAt` (keep local), remote-only (add), local-only-was-in-previous-remote (delete), local-only-new (keep), pending local deletion (skip re-add), order reconciliation, active ID invalidation fallback, empty presets after merge (default created), delete-vs-edit conflict convergence
- `cloudSync/service.ts` — Sign-in scenarios (new user, existing user), local→remote writes, remote→local updates, write debounce, write serialization, sign-out cleanup, `clearAll()` interaction
- `cloudSync/auth.ts` — Mock each sign-in method to verify fallback chain
- `buildPresetsStore.ts` — Verify `updatedAt` is set on every mutation, verify `validatePresetsData` backfills missing `updatedAt`

### Mocking Strategy

- Firebase SDK calls are mocked in tests. The service's dependency on `auth.ts` and `firestore.ts` makes this straightforward since those modules are the only Firebase touchpoints.
- `merge.ts` is pure functions with no Firebase dependency — tested directly without mocks.

### Manual Testing

- Sign in on device A, verify data appears on device B
- Edit different presets on two devices simultaneously, verify both changes merge
- Edit the same preset on two devices, verify latest `updatedAt` wins
- Delete a preset on device A while device B has it active, verify device B falls back to first preset
- Delete a preset locally and verify it doesn't reappear from a snapshot race
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
