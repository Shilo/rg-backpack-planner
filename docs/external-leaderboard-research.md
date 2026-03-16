# External Leaderboard Research

Research date: 2026-03-16

## Purpose

Document the best external leaderboard or build-gallery solutions if you do not want to build the leaderboard inside Backpack Planner.

This is research-only documentation. It does not implement anything.

## Hard Requirement: Open Builds Back in Backpack Planner

An external leaderboard is only a strong fit if each published record can link back into Backpack Planner and open the exact build in preview mode.

The current app already supports share and preview URLs built from encoded build data in [src/lib/buildData/url.ts](../src/lib/buildData/url.ts).

Recommended public fields for any external solution:

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

This is the strongest external recommendation for Backpack Planner because it supports the exact product shape you want: public build browsing plus one-click return into your app for preview.

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
