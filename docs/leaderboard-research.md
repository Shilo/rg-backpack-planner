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
- Every public entry should be able to deep-link back into Backpack Planner so users can open that exact build in preview mode.

## Hard Requirement: Open Builds Back in Backpack Planner

An external leaderboard is only a strong fit if each published record can link back into Backpack Planner and open the exact build in app preview mode.

The current app already supports share and preview URLs built from encoded build data in [src/lib/buildData/url.ts](../src/lib/buildData/url.ts).

Recommended public fields now become:

- `buildCode`
- `previewUrl`
- `displayName`
- `spent`
- `presetName`

Important recommendation:

- Store the full `previewUrl` at publish time, not just `buildCode`.

Reason:

- The app already knows the canonical share-link format.
- External tools can render a clickable button or link without needing to reconstruct your URL format.
- If the app’s share-token rules evolve later, storing the full URL reduces coupling to the external tool.

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
  "previewUrl": "https://rgbp.app/#/,k'7.a.a.1;,k'7.a.a.1,k.k..k.k.'2.a;k..a,k'7.a.a.1;7Xg",
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
- `previewUrl`
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

If you want to avoid building a leaderboard UI or moderation tools into the app, the best external options are the ones that can both:

- show searchable public build entries
- expose a per-record link back to Backpack Planner preview mode

That requirement changes the ranking of the external options.

## Best External Recommendation: Softr

### What it is

Use Softr as the public-facing leaderboard or build-gallery site, backed by either a Softr Database or Airtable.

Flow:

1. The app publishes a build to an external data source.
2. The record stores `presetName`, `displayName`, `buildCode`, `spent`, and `previewUrl`.
3. Softr renders a public searchable list or gallery from that data.
4. Each list item can open a details page or directly open the `previewUrl` back in Backpack Planner.

Relevant Softr docs:

- Public page visibility: <https://docs.softr.io/user-groups-and-permissions/page-visibility>
- List block with search and filters: <https://docs.softr.io/building-blocks/list-block>
- Item details pages from list items: <https://docs.softr.io/building-blocks/vikC2AWEpQGkZd4jGyoVxo/item-details-block-/4bE8XaFbJp45wkAwuWiz8f>
- Standalone forms and webhooks: <https://docs.softr.io/softr-forms>
- List block item action `Open URL`: <https://docs.softr.io/dynamic-blocks/vikC2AWEpQGkZd4jGyoVxo/list-block-overview/pQhPYuA28VXr5tLLFBcbCU>
- External URL buttons: <https://docs.softr.io/building-blocks/cta>

### Pros

- Best fit for a public build gallery sorted by score
- Public pages are supported directly
- Searchable list and details-page patterns are built in
- Clean way to add an `Open in Backpack Planner` button per record
- Much more polished public browsing than raw Airtable views
- Can stay fully external to the app UI

### Cons

- Still a separate product surface from the main app
- You still need some trusted way to derive or validate `spent` if cheating matters
- If you use Airtable as the backend, you inherit Airtable plan and sharing trade-offs too

### Overall assessment

This is now the strongest external recommendation for Backpack Planner because it supports the exact product shape you want: public build browsing plus one-click return into your app for preview.

## Alternative 2: Glide

### What it is

Use Glide to build a separate public app-like leaderboard experience.

Relevant Glide docs:

- Public vs private apps: <https://www.glideapps.com/docs/users>
- Collections for lists: <https://www.glideapps.com/docs/collection-components>
- Construct URL column: <https://www.glideapps.com/docs/construct-url>
- Open Link actions: <https://www.glideapps.com/docs/action-row>
- Glide deep links: <https://www.glideapps.com/docs/deep-links>

### Why it is interesting

Glide can hold the leaderboard rows, generate a `previewUrl` field, and present rows in public collections with actions that open links.

### Pros

- Supports public apps
- Good at turning table data into a mobile-friendly app
- Can generate and open links from record data
- Good if you want the external leaderboard to feel more like a mini-app than a website

### Cons

- More app-like than website-like
- User and usage pricing can matter more depending on traffic
- Less naturally suited than Softr for a simple public browseable directory or gallery

### Overall assessment

A good runner-up. Choose Glide if you want the external experience to feel like a lightweight companion app rather than a public build gallery site.

## Alternative 3: LootLocker Leaderboards

### What it is

Use a dedicated leaderboard backend designed for games.

Relevant LootLocker docs:

- Leaderboards overview: <https://docs.lootlocker.com/game-systems/leaderboards>
- Member ID and name handling: <https://docs.lootlocker.com/game-systems/leaderboards/how-to-set-a-member-id-and-name-in-leaderboards>
- Generic leaderboards: <https://docs.lootlocker.com/game-systems/leaderboards/how-to/use-generic-leaderboards>
- Metadata support: <https://docs.lootlocker.com/shared-systems/metadata>

### Why it is interesting

LootLocker is purpose-built for scoreboards, rankings, player names, and metadata.

### Pros

- Strong leaderboard-specific product fit
- Feels more game-like than a spreadsheet or public table
- Offloads a lot of ranking infrastructure
- Metadata can hold extra context such as a build identifier or preview URL

### Cons

- It is score-first, not build-gallery-first
- Inference: even with metadata, it is weaker than Softr or Glide for rich public browsing of full build entries
- Adds another service to the stack
- More useful for pure ranking than for full build discovery

### Overall assessment

Good if the goal is "show rankings with names and scores." It drops behind Softr and Glide once "open the exact build in Backpack Planner" becomes a core requirement.

## Alternative 4: Airtable Only

### What it is

Use Airtable alone with forms, views, buttons, and possibly interfaces.

Relevant Airtable docs:

- Forms overview: <https://support.airtable.com/docs/airtable-forms-overview>
- Managing and sharing interfaces: <https://support.airtable.com/docs/managing-and-sharing-interfaces>
- Button field with `Open URL`: <https://support.airtable.com/docs/button-field>
- Record-specific interface links: <https://support.airtable.com/docs/finding-airtable-ids>

### Pros

- Very simple admin workflow
- Easy to add a clickable `previewUrl`
- Shared views and forms are fast to set up

### Cons

- Public interfaces are only available on Business or Enterprise Scale plans
- Airtable says public interface pages do not auto-refresh and viewers need to refresh for updates
- Public browsing experience is much more generic than Softr
- This is better as a data backend or admin tool than as the best public-facing leaderboard surface

### Overall assessment

Useful as a raw fallback, but no longer the best external recommendation.

## Recommendation Matrix

If the goal is "fun extra feature, lowest effort":

- Airtable only

If the goal is "true leaderboard product, mostly score-driven":

- LootLocker

If the goal is "players should browse full builds and open them in Backpack Planner":

- Softr

If the goal is "best external app-like experience":

- Glide

If the goal is "best fit with deep-linking back into Backpack Planner without building in-app UI":

- Softr with `previewUrl` stored per record

## Final Recommendation

Best alternative if you do not want to build your own in-app leaderboard:

- Softr

Best alternative if you want an external service that feels more like a companion app:

- Glide

Best alternative if you want an external service that feels more like a game leaderboard:

- LootLocker

Important product conclusion:

- Once each row needs a hyperlink that opens the exact build inside Backpack Planner, pure scoreboards become less attractive
- Backpack Planner's public feature is partly about ranking and partly about build browsing
- Because of that, a public build gallery with an `Open in Backpack Planner` link is a better external shape than a pure score table

## Sources

- Airtable forms overview
- <https://support.airtable.com/docs/airtable-forms-overview>

- Airtable managing and sharing interfaces
- <https://support.airtable.com/docs/managing-and-sharing-interfaces>

- Airtable button field
- <https://support.airtable.com/docs/button-field>

- Airtable record-specific interface links
- <https://support.airtable.com/docs/finding-airtable-ids>

- LootLocker leaderboards
- <https://docs.lootlocker.com/game-systems/leaderboards>

- LootLocker member ID and name in leaderboards
- <https://docs.lootlocker.com/game-systems/leaderboards/how-to-set-a-member-id-and-name-in-leaderboards>

- LootLocker generic leaderboards
- <https://docs.lootlocker.com/game-systems/leaderboards/how-to/use-generic-leaderboards>

- LootLocker metadata
- <https://docs.lootlocker.com/shared-systems/metadata>

- Softr page visibility
- <https://docs.softr.io/user-groups-and-permissions/page-visibility>

- Softr list block
- <https://docs.softr.io/building-blocks/list-block>

- Softr item details block
- <https://docs.softr.io/building-blocks/vikC2AWEpQGkZd4jGyoVxo/item-details-block-/4bE8XaFbJp45wkAwuWiz8f>

- Softr forms
- <https://docs.softr.io/softr-forms>

- Softr list block actions
- <https://docs.softr.io/dynamic-blocks/vikC2AWEpQGkZd4jGyoVxo/list-block-overview/pQhPYuA28VXr5tLLFBcbCU>

- Softr CTA external URL actions
- <https://docs.softr.io/building-blocks/cta>

- Glide users and public apps
- <https://www.glideapps.com/docs/users>

- Glide collections
- <https://www.glideapps.com/docs/collection-components>

- Glide construct URL
- <https://www.glideapps.com/docs/construct-url>

- Glide action row and open link
- <https://www.glideapps.com/docs/action-row>

- Glide deep links
- <https://www.glideapps.com/docs/deep-links>

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
