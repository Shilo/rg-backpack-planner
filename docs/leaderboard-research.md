# Leaderboard Research

Research date: 2026-03-16

## Purpose

Document how an optional public leaderboard or build gallery could work for Backpack Planner while sharing the same cloud opt-in as private sync.

This is research-only documentation. It does not implement anything.

## Relationship to Private Sync

Private sync and public leaderboard features should stay separate.

Private sync problem:

- Keep a user's saved builds synced between their own devices.

Public leaderboard problem:

- Let a user explicitly publish one build so other players can browse it or see it ranked.

These are different concerns and should not share the same storage rules.

Reference:

- [cloud-sync-research.md](./cloud-sync-research.md)

## Core Assumption

This document assumes:

- Only `rg-backpack-planner-build-presets` is part of private cloud sync.
- Sync and leaderboard share one opt-in surface: `Sync + Leaderboard`.
- Enabling that toggle creates the cloud identity used for both private sync and leaderboard participation.
- Publishing a specific preset remains an explicit action.
- Private synced presets are never automatically public.
- Public leaderboard entries may include an optional username or display name chosen at publish time.

## What Data the Leaderboard Actually Needs

The private synced blob is:

```text
rg-backpack-planner-build-presets
```

A leaderboard does not need that entire private blob to be publicly visible.

It only needs a published snapshot of one chosen preset, plus a small amount of public metadata.

Recommended public entry shape:

```json
{
  "presetId": "aca434b1-bae9-4c0f-b1ab-0a4205f0d48e",
  "presetName": "Panth - After",
  "buildCode": ",k'7.a.a.1;,k'7.a.a.1,k.k..k.k.'2.a;k..a,k'7.a.a.1;7Xg",
  "displayName": "Shilo",
  "spent": 98765,
  "publishedAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

Important note:

- `spent` should be derived from `buildCode` on the server or trusted backend, not accepted as an arbitrary client field.

This keeps the public system grounded in the same build data model the app already has, while allowing an optional username for display.

## Recommended In-App Leaderboard Design

### Product Model

The cleanest model is "enable `Sync + Leaderboard`, then publish a preset."

Flow:

1. User enables `Sync + Leaderboard`.
2. The app creates or links the cloud identity used for private sync.
3. User picks one preset from their local `build-presets` data.
4. User optionally enters a public display name.
5. The app publishes only that preset snapshot.
6. The public leaderboard stores the preset data separately from private sync.
7. The user can later update or remove the published entry.

This avoids exposing the full private preset collection.

## Storage Model

Recommended private/public split:

- Private sync document: the user's full `build-presets` blob
- Public leaderboard collection or table: one row or document per published preset

Recommended public fields:

- `presetId`
- `presetName`
- `buildCode`
- `displayName` or `null`
- `spent`
- `publishedAt`
- `updatedAt`
- `ownerRef` tied to the same cloud identity used by sync

Optional but useful fields:

- `buildHash` for deduplication
- `treeSummary` if you later want filtering or tags

## Publish Semantics

Recommended behavior:

- Publishing is explicit
- Republishing the same preset updates the existing public entry
- Deleting a preset does not silently orphan public data without a clear product choice
- Unpublish should be available

Recommended simple rule:

- One public leaderboard entry per preset ID

This keeps the system easy to reason about.

## Ranking

If the "score" is based on tech crystals spent, the cleanest leaderboard sort is:

- Highest `spent` first

Other useful views:

- Most recent published builds
- Most recently updated builds
- Search by username
- Search by preset name

If the feature is mainly about browsing builds, a gallery or table sorted by `spent` may be more useful than a game-style "top 100 only" board.

## Moderation and Abuse

A public leaderboard introduces problems private sync does not have.

Minimum protections:

- Explicit publish action
- Server-side derivation of `spent`
- Rate limits on publish/update
- Maximum display name length
- Basic profanity and abuse filtering for usernames
- Ability to remove abusive entries

If `Sync + Leaderboard` uses guest or anonymous cloud identities under the hood, abuse prevention still matters even though publishing is tied to the same opt-in.

## Why This Design Fits Backpack Planner

- The app already has a compact build representation in `buildCode`
- The leaderboard can reuse existing preset/build logic
- It does not require exposing private sync data
- Optional usernames are easy to support
- It keeps the fun public feature tied to the same cloud opt-in while still separate from the private sync document

## Best Backend Shape If You Build It Yourself

If you implement a leaderboard yourself, the best fit is still to keep it alongside the sync backend but in a separate public collection or table.

### Firestore version

Best when:

- Firestore is already chosen for private sync
- You want the smallest conceptual surface area

Shape:

- Private sync doc per user
- Public `publishedBuilds` collection for leaderboard entries

Why it works:

- Same backend as sync
- Easy document model
- Easy public/private separation

Tradeoff:

- More limited query ergonomics than SQL if the public feature grows a lot

### Supabase version

Best when:

- The public leaderboard becomes a serious feature
- You want richer sorting, filtering, or analytics

Shape:

- Private row for sync blob
- Public `published_builds` table for leaderboard entries

Why it works:

- SQL is a natural fit for leaderboards
- Good for filtering and aggregations

Tradeoff:

- More policy and schema work

## Recommended Product Decision

If you build the leaderboard yourself:

- Use one combined cloud opt-in: `Sync + Leaderboard`
- Keep public leaderboard storage out of the private sync document
- Publish only one chosen preset snapshot at a time
- Use optional display names
- Derive `spent` from `buildCode`
- Treat it more like a public build gallery with score sorting than a pure high-score table

This is a better fit for Backpack Planner than trying to make public leaderboard logic part of the sync document.

## Alternatives to Building an In-App Leaderboard

If you want to avoid building a leaderboard UI or moderation tools into the app, there are two strong alternative categories.

## Alternative 1: Airtable Form + Shared View

### What it is

Use Airtable as a public submission and browsing layer.

Flow:

1. The app exposes a "Submit build" flow or a share/export step.
2. The user submits preset name, build code, optional username, and optionally the already-derived tech crystal spend.
3. Airtable stores entries in a table.
4. A shared Airtable view becomes the public leaderboard or build gallery.

Relevant Airtable docs:

- Forms overview: <https://support.airtable.com/docs/airtable-forms-overview>
- Shared views: <https://support.airtable.com/sharing-views-and-bases>

### Pros

- Very low implementation effort
- Public list can exist without building in-app leaderboard screens
- Non-technical moderation is easier
- Shared views are easy to browse and embed

### Cons

- It feels less integrated with the app
- The public experience looks like Airtable unless you build a custom wrapper
- Ranking and display are more generic
- You likely need to send or precompute `spent` rather than decoding it inside Airtable

### Overall assessment

This is the best low-effort no-code alternative if the leaderboard is mostly a community bonus feature rather than a core product surface.

## Alternative 2: LootLocker Leaderboards

### What it is

Use a dedicated leaderboard backend designed for games.

Relevant LootLocker docs:

- Leaderboards overview: <https://docs.lootlocker.com/game-systems/leaderboards>
- Member ID and name handling: <https://docs.lootlocker.com/game-systems/leaderboards/how-to-set-a-member-id-and-name-in-leaderboards>

### Why it is interesting

LootLocker is purpose-built for scoreboards, rankings, and player-facing leaderboard flows.

### Pros

- Strong leaderboard-specific product fit
- Feels more game-like than a spreadsheet or public table
- Offloads a lot of ranking infrastructure

### Cons

- It is score-first, not build-gallery-first
- Inference: you will likely still need a separate place to store rich build payloads if you want users to open and inspect full builds
- Adds another service to the stack
- More useful for pure ranking than for full build discovery

### Overall assessment

Good if the goal is "show rankings with names and scores." Not as strong if the goal is "browse full published builds with rich metadata."

## Alternative 3: Separate Public Builds Page, Not In-App

### What it is

Build the public leaderboard as a separate page or mini-site instead of embedding it in the planner UI.

Examples:

- A small standalone page backed by Firestore or Supabase
- A public `builds` route separate from the core planner
- An embedded public view backed by Airtable

### Pros

- Keeps the main planner clean
- Easier to treat as optional
- Less pressure on the core app UX

### Cons

- Still requires some work
- Splits the experience across surfaces

### Overall assessment

This is a strong middle ground if you want ownership of the feature but do not want to clutter the main planner with community surfaces.

## Recommendation Matrix

If the goal is "fun extra feature, lowest effort":

- Airtable form + shared view

If the goal is "true leaderboard product, mostly score-driven":

- LootLocker

If the goal is "players should browse full builds and maybe import them later":

- Build it yourself as a separate public collection or page

If the goal is "best fit with the current sync architecture":

- Same backend as sync, but separate public leaderboard storage

## Final Recommendation

Best built-in approach:

- Use one combined opt-in surface: `Sync + Leaderboard`
- Keep private sync storage and public leaderboard storage separate
- Publish one chosen preset snapshot
- Allow optional display name
- Derive `spent` from `buildCode`
- Store public entries separately from private synced `build-presets`

Best alternative if you do not want to build your own in-app leaderboard:

- Airtable form + shared view

Best alternative if you want an external service that feels more like a game leaderboard:

- LootLocker

Important product conclusion:

- Dedicated leaderboard services are great at rankings
- Backpack Planner's public feature is partly about ranking and partly about build browsing
- Because of that, a published build gallery sorted by `spent` is likely a better product shape than a pure score table

## Sources

- Airtable forms overview
- <https://support.airtable.com/docs/airtable-forms-overview>

- Airtable shared views
- <https://support.airtable.com/sharing-views-and-bases>

- LootLocker leaderboards
- <https://docs.lootlocker.com/game-systems/leaderboards>

- LootLocker member ID and name in leaderboards
- <https://docs.lootlocker.com/game-systems/leaderboards/how-to-set-a-member-id-and-name-in-leaderboards>

- Firebase anonymous auth
- <https://firebase.google.com/docs/auth/web/anonymous-auth>

- Firebase account linking
- <https://firebase.google.com/docs/auth/web/account-linking>

- Firestore realtime listeners
- <https://firebase.google.com/docs/firestore/query-data/listen>

- Firestore offline support
- <https://firebase.google.com/docs/firestore/manage-data/enable-offline>

- Firestore vs Realtime Database
- <https://firebase.google.com/docs/database/rtdb-vs-firestore>

- Supabase anonymous auth
- <https://supabase.com/docs/guides/auth/auth-anonymous>

- Supabase realtime Postgres changes
- <https://supabase.com/docs/guides/realtime/postgres-changes>

- Supabase row level security
- <https://supabase.com/docs/guides/database/postgres/row-level-security>
