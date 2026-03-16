# Cloud Sync Research

Research date: 2026-03-16

## Goal

Find the most intuitive and simple way to let users automatically sync their saved builds between devices and browsers for Backpack Planner.

This document is research-only. It does not propose implementation details beyond architecture-level recommendations.

## Current App State

The app is currently a client-only GitHub Pages PWA with no backend. Personal data is stored in browser `localStorage`.

The only data that should be synced to the cloud is this single key:

```text
rg-backpack-planner-build-presets
```

Example value:

```json
{"active":"0c686afe-50ea-4659-b688-94852d85e6a0","presets":[{"id":"0c686afe-50ea-4659-b688-94852d85e6a0","name":"Default","buildCode":"_"},{"id":"8a000c9f-e52d-452c-b8d5-81e5cd60e6fa","name":"Mid PvE","buildCode":";,k..k.'2.k.k..a:2;;37W"},{"id":"277601bd-a23d-42ae-bd10-efeda1263a99","name":"Shilo","buildCode":"n.k'6.a.a,E'7.h.i.1,'7.a;l.k'6.a.a,E'7.h.h.1,'7.a;m.k'6.a.a,E'7.h.h.1,'7.a;pln"},{"id":"f9d3a8a0-e3da-4e39-b957-70ac702fd007","name":"Panth - Before","buildCode":"1b.E.E.k'3.p;1c.E.E.k'3.D;1d.E.E.k.l.k.E;7Xg"},{"id":"aca434b1-bae9-4c0f-b1ab-0a4205f0d48e","name":"Panth - After","buildCode":",k'7.a.a.1;,k'7.a.a.1,k.k..k.k.'2.a;k..a,k'7.a.a.1;7Xg"},{"id":"901440b6-b245-4c98-9ac9-c73bbc9ce19f","name":"m6phistoph6l6s","buildCode":";,E.k.E.k.k.E.E.a.f.1,k.k..k.k.'2.a;k..k.'2.k.k..a,k'7.a.a.1;dTi"}]}
```

That state is already modeled centrally in [src/lib/buildPresetsStore.ts](../src/lib/buildPresetsStore.ts). The app currently persists the blob to local storage through [src/lib/storage.ts](../src/lib/storage.ts).

This is an important finding because it means the sync problem is small:

- The app does not need full database replication.
- The app does not need to sync every `localStorage` key.
- The app does not need to sync device-specific settings.
- The app can treat cloud sync as "mirror one small user-owned document."

## Explicit Constraints

- Sync must be automatic, not manual export/import.
- Sync should feel intuitive to non-technical users.
- Sync should work across devices and browsers.
- The app should avoid asking for personal information if possible.
- Device-specific settings should stay local-only.
- A leaderboard or public build gallery is optional and should not dictate the private sync design.

## Review of Existing Manual Sync Attempt

Reviewed commit:

- <https://github.com/Shilo/rg-backpack-planner/commit/a16b26392c42acc2dc23e35d8a2570529e954d55>

That attempt exported all app-prefixed `localStorage` keys as a Base64 code and allowed full import/overwrite.

Strengths:

- No backend required
- No account required
- Good as a backup or migration fallback
- Simple to reason about technically

Weaknesses:

- Fully manual
- Not realtime
- Easy for users to forget
- All-or-nothing overwrite
- No conflict handling
- Mixes sync-worthy data with device-local settings
- Does not create durable cross-device identity

Conclusion:

The export/import approach is useful as a recovery tool, but it is not a good primary sync model.

## What the Web Platform Can and Cannot Do

### `localStorage` is local, origin-scoped browser storage

MDN documents `localStorage` as storage tied to a document's origin and persisted across browser sessions on that device/browser. It is not a built-in cloud sync mechanism for websites.

Source:

- <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>

Implication:

- A normal website cannot rely on `localStorage` itself to sync across devices.
- If this app wants cross-device sync, it needs a backend or a third-party sync service.

### Background Sync is not a cross-device sync solution

The Background Synchronization API is for deferred background work from a service worker. MDN marks it as limited availability. It does not solve identity or cloud persistence.

Source:

- <https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API>

Implication:

- Background Sync is not the right primitive for this feature.

### Browser sync storage exists for extensions, not normal websites

WebExtensions have `storage.sync`, which is browser-managed sync storage for extension data. That is not available to ordinary web apps.

Source:

- <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync>

Implication:

- The app cannot "just use browser sync" the way an extension can.
- A real website needs its own backend-backed sync model.

## How Popular Products Usually Handle Sync

### Browsers

Modern browsers generally sync through a signed-in identity and a cloud service.

Chrome:

- Google account-backed sync
- Syncs browser data across signed-in Chrome instances
- Source: <https://support.google.com/chrome/answer/185277>

Firefox:

- Mozilla account-backed Firefox Sync
- Mozilla documents end-to-end encryption properties for synced data
- Sources:
- <https://support.mozilla.org/en-US/topics/sync-data/firefox>
- <https://support.mozilla.org/en-US/kb/how-firefox-sync-keeps-your-data-safe-even-if-synced>

iCloud / Safari:

- Apple Account-backed sync across Apple devices
- Source: <https://support.apple.com/en-au/guide/icloud/mm203ae070a2/icloud>

Common pattern:

- Stable identity first
- Cloud-stored structured data second
- Local cache on each device
- Sync is transparent once the identity is established

### Modern web apps

Most modern web apps do not sync raw browser storage across devices. They sync application records owned by a user identity.

Common pattern:

- The app keeps a local cache for responsiveness and offline support.
- The canonical copy lives in a cloud database.
- The client subscribes to server changes and applies them live.
- The user identity can be visible or mostly invisible.

## Key Architecture Insight

For Backpack Planner, the hard part is not data storage. The data is tiny.

The hard part is identity.

To sync automatically across devices, the system must know that device A and device B belong to the same user or sync vault. In practice that means one of these:

- A real account
- A passkey-backed identity
- A secret vault shared across devices
- A one-time device pairing flow that transfers a stable secret

Without one of those, there is no robust way to know which remote data belongs to which person.

## Option 1: Firestore + Lightweight Identity

### Summary

Store one private cloud document per user containing the exact `build-presets` blob. Use local `localStorage` as the on-device cache. Subscribe to the cloud document for realtime updates.

### Why it fits this app

- The data shape is already a single blob
- Realtime listeners are built in
- Offline support on web is built in
- Very common and well-documented
- Firestore is a better match than a heavier local-first replication stack

### Relevant Firebase research

Anonymous auth:

- Firebase supports anonymous authentication for web.
- Source: <https://firebase.google.com/docs/auth/web/anonymous-auth>

Account linking:

- Firebase supports linking an existing anonymous account to a stronger identity later.
- Source: <https://firebase.google.com/docs/auth/web/account-linking>

Realtime listeners:

- Firestore supports live listeners to documents and queries.
- Source: <https://firebase.google.com/docs/firestore/query-data/listen>

Offline support:

- Firestore supports local persistence and offline usage.
- Source: <https://firebase.google.com/docs/firestore/manage-data/enable-offline>

Firestore vs Realtime Database:

- Firebase recommends Cloud Firestore for new apps in most cases.
- Source: <https://firebase.google.com/docs/database/rtdb-vs-firestore>

### Best version of this option

Use Firestore with one document per user:

```json
{
  "active": "preset-id",
  "presets": [
    {
      "id": "preset-id",
      "name": "Default",
      "buildCode": "_"
    }
  ],
  "updatedAt": "server timestamp",
  "revision": 42
}
```

Keep local `localStorage` as a fast cache. The remote document is the cross-device source of truth.

### Identity choices inside this option

#### 1. Anonymous auth only

Pros:

- Extremely low friction
- User does not type email or password
- Easy first-run onboarding

Cons:

- Weak recovery story
- Hard to move to a brand new device reliably unless the anonymous account is linked or transferred
- Not sufficient alone for long-term durable cross-device sync

Important Firebase note:

- Anonymous auth is frictionless, but it is still a server identity. It is not the same as "no identity."

#### 2. Anonymous auth first, then optional upgrade

Pros:

- Best first-run UX
- Lets the app introduce stronger identity only when the user wants sync durability
- Good migration path

Cons:

- Slightly more product complexity

#### 3. Passkey-backed identity

Pros:

- Feels close to "no account"
- No passwords
- Strong recovery when tied to the user's passkey ecosystem
- Good fit for users who just want "it syncs"

Cons:

- Slightly more auth integration work than pure anonymous auth
- Still an identity system, just a less annoying one

Passkey references:

- <https://passkeys.dev/docs/intro/what-are-passkeys/>
- <https://web.dev/articles/webauthn-discoverable-credentials>

### Overall assessment

This is the strongest option for Backpack Planner.

It aligns with the actual size of the data, gives realtime sync, keeps the app simple, and avoids overengineering.

## Option 2: Supabase + Private Sync Row

### Summary

Store the `build-presets` blob in a private row, probably JSONB, owned by one auth user. Subscribe to database changes or fetch/update as needed.

### Relevant Supabase research

Anonymous sign-ins:

- Supabase supports anonymous users.
- Source: <https://supabase.com/docs/guides/auth/auth-anonymous>

Realtime:

- Supabase supports Postgres changes subscriptions.
- Source: <https://supabase.com/docs/guides/realtime/postgres-changes>

Security:

- Row Level Security is a core part of keeping rows private to the authenticated user.
- Source: <https://supabase.com/docs/guides/database/postgres/row-level-security>

### Pros

- Great if public leaderboards or public build browsing become important
- SQL is flexible for future features
- JSONB can hold the blob directly
- Easy to separate private sync rows from public leaderboard rows

### Cons

- More schema and policy work than Firestore for this exact use case
- Anonymous auth needs abuse controls
- Slightly more moving pieces than necessary for "sync one small blob"

### Overall assessment

A strong second choice, especially if the roadmap starts prioritizing leaderboards and public build publishing. For private build sync alone, it is a bit more infrastructure than needed.

## Option 3: Appwrite + Anonymous Session + Document Store

### Summary

Use Appwrite auth plus a private document per user, with realtime subscriptions if desired.

### Relevant Appwrite research

Auth overview:

- <https://appwrite.io/docs/products/auth>

Anonymous auth:

- <https://appwrite.io/docs/products/auth/anonymous>

Realtime:

- <https://appwrite.io/docs/apis/realtime>

### Pros

- Good all-in-one backend platform
- Supports anonymous entry points
- Has realtime features

### Cons

- Less commonly chosen than Firebase for this exact lightweight PWA sync case
- Still requires identity design and backend setup
- Does not provide a meaningfully simpler mental model than Firestore here

### Overall assessment

Viable, but not the clearest winner.

## Option 4: Secret Vault + Device Pairing, No Traditional Account

### Summary

Instead of asking for an account, generate a random vault identifier plus a secret. Store the `build-presets` blob in a private cloud record under that vault. New devices join by scanning a QR code or entering a short pairing code from an already-authorized device.

### Why this matters

This is the strongest way to preserve the "no account, no personal info" ideal while still enabling automatic sync after the initial pairing.

### Pros

- No email
- No username
- No password
- Very private
- Sync can feel almost magical after the first pairing

### Cons

- Recovery is weaker if the user loses every authorized device
- First-time pairing UX has to be designed carefully
- Slightly more custom product work than using a standard auth flow

### Overall assessment

This is the best strict no-account model, but it has tradeoffs in recovery and support. It is a strong product option if the app wants privacy and minimal friction as a core identity principle.

## Options That Are Not Recommended

### Sync all `localStorage` keys

Not recommended because:

- It syncs device-local state that should stay local
- It creates noisy cross-device conflicts
- It couples unrelated data together
- It makes future migrations harder

### Use IP address as user identity

Not recommended because:

- IP addresses are unstable
- Multiple people can share an IP
- Mobile networks change IPs frequently
- It is bad for account recovery
- It is weak as a security boundary

IP can still be useful for abuse controls, rate limits, analytics, or fraud detection. It should not be the main sync identity.

### Heavy local-first replication systems

Examples:

- Replicache
- RxDB replication
- ElectricSQL

These are powerful tools, but they are not the best fit here because:

- The app only needs to sync one small blob
- The app does not need collaborative editing
- The app does not need conflict-free replicated structures
- The extra complexity does not buy much for this use case

## How This App Should Scope Sync

Only sync:

- `rg-backpack-planner-build-presets`

Do not sync:

- theme choice
- dark mode
- colorblind setting
- text size
- haptics
- onboarding seen state
- active tab
- menu state
- any other device-specific preference

Reason:

These are personal device preferences, not cross-device content. Syncing them would create surprise and make the app feel less reliable.

## Recommended Product Direction

### Recommendation

Use Cloud Firestore as the backend and sync only the `build-presets` blob.

Preferred identity strategy:

- Start with a very low-friction identity flow
- Make cross-device sync opt-in
- Use passkeys or a device-linking flow as the durable identity layer

Recommended variants:

#### Best balance of simplicity and durability

- Firestore
- Low-friction auth
- Passkey for durable cross-device ownership

This is the best "it just syncs" experience while still giving real recovery.

#### Best strict no-account experience

- Firestore or similar document backend
- Secret vault
- QR/device pairing

This is the best choice if avoiding personal info is more important than easy account recovery.

### Why Firestore is the leading recommendation

- The app's data model is document-shaped already
- Firestore is realtime
- Firestore supports offline behavior on the web
- Firebase auth and Firestore are commonly used together
- The feature can be scoped narrowly to one document
- This avoids overengineering

## Optional Leaderboard / Public Builds

The leaderboard should be treated as a separate feature, not as part of private sync.

Private sync problem:

- "Keep my saved builds synced everywhere"

Public leaderboard problem:

- "Let me publish a build or let the app store public build data for browsing/ranking"

Recommended separation:

- Private sync uses a private per-user document
- Public builds require explicit publish action
- Leaderboard rows should be stored separately from private presets

This avoids accidental publication of private builds.

If leaderboard becomes a serious roadmap item, Supabase becomes a stronger contender because SQL tables and public querying are a natural fit. If private sync remains the main priority, Firestore still stays simpler.

## Suggested UX Principles

- Do not call it "account creation" unless it truly is one
- Frame it as "Enable Sync"
- Keep local-only mode as the default if desired
- Make sync opt-in and reversible
- Keep manual export/import as a backup tool
- Never auto-publish builds publicly
- Make public publishing a separate deliberate action

## Final Recommendation

The most intuitive and simple approach is:

1. Store the exact `rg-backpack-planner-build-presets` JSON blob in one private cloud document.
2. Keep `localStorage` as the local cache.
3. Add realtime subscription so changes from another device appear automatically.
4. Use a low-friction identity model so the same person can access the same document across devices.
5. Keep all device settings local-only.
6. Keep manual sync-code import/export only as a fallback backup or migration tool.

Best overall pick:

- Cloud Firestore + passkey-backed or otherwise low-friction identity

Best strict no-account pick:

- Private cloud vault + QR/pairing-based device linking

## Source List

- MDN `localStorage`
- <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>

- MDN Background Sync API
- <https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API>

- MDN WebExtensions `storage.sync`
- <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync>

- Firebase Anonymous Auth
- <https://firebase.google.com/docs/auth/web/anonymous-auth>

- Firebase Account Linking
- <https://firebase.google.com/docs/auth/web/account-linking>

- Firestore Realtime Listeners
- <https://firebase.google.com/docs/firestore/query-data/listen>

- Firestore Offline Support
- <https://firebase.google.com/docs/firestore/manage-data/enable-offline>

- Firestore vs Realtime Database
- <https://firebase.google.com/docs/database/rtdb-vs-firestore>

- Supabase Anonymous Auth
- <https://supabase.com/docs/guides/auth/auth-anonymous>

- Supabase Realtime Postgres Changes
- <https://supabase.com/docs/guides/realtime/postgres-changes>

- Supabase Row Level Security
- <https://supabase.com/docs/guides/database/postgres/row-level-security>

- Appwrite Auth
- <https://appwrite.io/docs/products/auth>

- Appwrite Anonymous Auth
- <https://appwrite.io/docs/products/auth/anonymous>

- Appwrite Realtime
- <https://appwrite.io/docs/apis/realtime>

- Chrome Sync Overview
- <https://support.google.com/chrome/answer/185277>

- Firefox Sync Overview
- <https://support.mozilla.org/en-US/topics/sync-data/firefox>

- Firefox Sync Security
- <https://support.mozilla.org/en-US/kb/how-firefox-sync-keeps-your-data-safe-even-if-synced>

- Apple iCloud Overview
- <https://support.apple.com/en-au/guide/icloud/mm203ae070a2/icloud>

- Passkeys.dev
- <https://passkeys.dev/docs/intro/what-are-passkeys/>

- web.dev WebAuthn Discoverable Credentials
- <https://web.dev/articles/webauthn-discoverable-credentials>
