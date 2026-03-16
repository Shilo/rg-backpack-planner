# Internal Leaderboard Research

Research date: 2026-03-16

## Purpose

Document how an optional public leaderboard or build gallery could work if it is built as part of Backpack Planner.

This is research-only documentation. It does not implement anything.

## Relationship to Private Sync

Private sync and public leaderboard features should stay separate even if they share one cloud opt-in.

Private sync problem:

- Keep a user's saved builds synced between their own devices.

Public leaderboard problem:

- Let a user explicitly publish one build so other players can browse it or see it ranked.

These are different concerns and should not share the same storage rules.

References:

- [cloud-sync-research.md](./cloud-sync-research.md)
- [external-leaderboard-research.md](./external-leaderboard-research.md)

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

## Product Model

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

## Open Build Flow

If the leaderboard is built inside Backpack Planner, the app does not need a separate external preview URL to open a published build.

The app can open leaderboard entries directly from `buildCode` using the existing preview/share URL logic in [src/lib/buildData/url.ts](../src/lib/buildData/url.ts).

Practical implication:

- internal leaderboard entries can store `buildCode` as the canonical build payload
- the UI can navigate directly to preview mode from that value
- `previewUrl` is optional for internal use, though you may still store it for consistency

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

## Final Recommendation

Best internal approach:

- same backend as sync
- separate public leaderboard storage
- explicit publish flow
- optional username
- `buildCode` as canonical public build payload

If you want the cleanest user experience and the deepest app integration, internal remains the strongest overall option.
