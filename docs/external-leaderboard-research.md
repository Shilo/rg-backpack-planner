# External Leaderboard Research

Research date: 2026-03-16

## Purpose

Document the best external leaderboard or build-gallery solutions if you do not want to build the leaderboard inside Backpack Planner.

This is research-only documentation. It does not implement anything.

Pricing note:

- Cost snapshots below were checked against official pricing pages on 2026-03-16 and may change.

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

- Softr homepage: <https://www.softr.io/>
- Cost snapshot: Free is $0/month; Basic is $59/month; Professional is $167/month; Business is $323/month on the official docs page. Professional also supports $10/month packs of 10 extra users. Pricing: <https://www.softr.io/pricing> and <https://docs.softr.io/workspace-and-billing/pricing-and-plans>

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

- Glide homepage: <https://www.glideapps.com/>
- Cost snapshot: Free is $0/month; Explorer is $19/month billed annually or $25/month monthly; Maker is $49/month billed annually or $60/month monthly; Business is $199/month billed annually or $249/month monthly; Enterprise is custom. Business includes 30 users and 5,000 updates, with extra users at $5 annual or $6 monthly and extra updates at $0.02 each. Pricing: <https://www.glideapps.com/pricing> and <https://help.glideapps.com/en/articles/11780756-pricing-plans-as-of-july-1-2025>

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

- LootLocker homepage: <https://lootlocker.com/>
- Cost snapshot: Trial is free for 30 days with a 1,000 MAU/month limit; non-commercial projects can apply for a free license; paid Developer and Publisher tiers are contact-sales rather than self-serve public prices. The pricing page does explicitly list $0.015 for each additional MAU above the included amount on the Publisher tier. Pricing: <https://lootlocker.com/pricing>

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

## Alternative 4: PlayFab Leaderboards

- PlayFab homepage: <https://playfab.com/>
- Cost snapshot: Free to Start is $0/month before a title passes 100K players; then there is pay-as-you-go, Standard at $99/month plus usage, Premium at $1,999/month plus usage, and Enterprise starting at $10K/month. Pricing: <https://playfab.com/pricing/>

### What it is

Use Microsoft PlayFab's dedicated leaderboard service.

Relevant PlayFab docs:

- Leaderboards overview: <https://learn.microsoft.com/en-us/gaming/playfab/features/social/leaderboardsv2/quickstart>
- Create basic leaderboard: <https://learn.microsoft.com/en-us/gaming/playfab/community/leaderboards/create-basic-leaderboard>
- Tournaments and leaderboards: <https://learn.microsoft.com/en-us/gaming/playfab/community/leaderboards/tournaments-leaderboards/>

### Why it is interesting

PlayFab is explicitly built for game backend leaderboards and supports ranking-oriented features like multicolumn tie-breaking, versioning, and metadata.

### Pros

- Very leaderboard-native platform
- Strong score, ranking, season, and reset capabilities
- Official support for row metadata
- Supports external identities and broader game-backend workflows

### Cons

- Much more backend- and game-stack-oriented than public-gallery-oriented
- You would still need a separate browsing surface if you want players to comfortably explore published builds
- Inference: even with metadata carrying `previewUrl`, it is not as naturally suited as Softr or Glide for public build discovery

### Overall assessment

A strong leaderboard-focused option that was missing from the earlier docs. It is a better fit than Softr only when the real goal is a traditional competitive ranking service rather than a public build gallery.

## Alternative 5: Heroic Labs / Nakama

- Heroic Labs homepage: <https://heroiclabs.com/>
- Cost snapshot: Heroic Cloud's hosted Nakama pricing is calculator-based rather than a simple flat public tier; Satori starts at $600/month, Studio Basic support is $2,000/month, Studio Standard is $6,000/month, and Studio Premium is custom. Pricing: <https://heroiclabs.com/pricing>

### What it is

Use Nakama, Heroic Labs' game server and backend platform, which includes leaderboard and tournament systems.

Relevant Heroic Labs docs:

- Leaderboards concepts: <https://heroiclabs.com/docs/nakama/concepts/leaderboards/>
- Leaderboards console: <https://heroiclabs.com/docs/nakama/getting-started/console/leaderboards/>
- Tournaments concepts: <https://heroiclabs.com/docs/nakama/concepts/tournaments/>

### Why it is interesting

Nakama supports authoritative leaderboards, metadata, reset schedules, multiple operators, and unlimited leaderboards. It is one of the strongest leaderboard-native backends for teams that want technical control.

### Pros

- Very flexible leaderboard model
- Metadata support is built in
- Strong for authoritative or server-controlled ranking
- Good option if self-hosting or deeper backend ownership matters

### Cons

- This is still a backend, not a ready-made public leaderboard site
- You would need to build or host a public browsing frontend yourself
- Less attractive when the requirement is "I do not want to create one in-app" and also do not want to create a separate custom site

### Overall assessment

A real leaderboard-focused platform, but not a low-effort external gallery solution. It is best if you want deep backend control more than you want a hosted public-facing leaderboard surface.

## Alternative 6: Beamable

- Beamable homepage: <https://beamable.com/>
- Cost snapshot: Free tier is $0/month up to 100K API calls; usage above that is $10 per 1M API calls. Public subscription tiers shown on the pricing page include Indie at $30/month, Dev at $100/month, Studio at $200/month, Reporting at $300/month, Pro at $600/month, and Metered above $600/month. Pricing: <https://beamable.com/pricing>

### What it is

Use Beamable's game backend tooling and leaderboard features.

Relevant Beamable docs:

- Leaderboards overview: <https://docs.beamable.com/docs/leaderboards-feature-overview>
- Leaderboards code docs: <https://docs.beamable.com/docs/leaderboards-code>

### Why it is interesting

Beamable is game-backend-oriented and its docs explicitly frame leaderboards as a feature for global or segmented rankings, with WebGL support noted in the overview.

### Pros

- Game-focused platform with leaderboard support
- Can fit better than generic app builders if you stay in a game-oriented stack
- WebGL support is directly relevant to browser-based game-adjacent tools

### Cons

- More backend and SDK oriented than public-site oriented
- Not as strong as Softr or Glide for fast public build browsing
- You would still need presentation work to make the leaderboard feel like a polished public gallery

### Overall assessment

Worth including as a leaderboard-native option, but it sits in the same bucket as Nakama and PlayFab: stronger as a game backend component than as a turnkey external public build gallery.

## Alternative 7: AccelByte

- AccelByte homepage: <https://accelbyte.io/>
- Cost snapshot: Shared Cloud is free to start with a 90-day trial and then usage fees; after the included free PCCU band, shared-cloud daily PCCU pricing starts at $0.0248 for Online, $0.0770 for Multiplayer, and $0.1100 for Complete in the 31 to 5K PCCU band. Private Cloud starts at $2,500/month per environment for Online or Multiplayer and $3,500/month per environment for Complete, and support starts at $1,000 per title per month. Pricing: <https://accelbyte.io/pricing>

### What it is

Use AccelByte Gaming Services, which includes an engagement service with leaderboard support.

Relevant AccelByte docs:

- Engagement services overview: <https://docs.accelbyte.io/gaming-services/services/engagement/>
- Manage leaderboards from the Admin Portal: <https://docs.accelbyte.io/gaming-services/services/engagement/leaderboard/manage-leaderboard-from-admin-portal/>
- All-time leaderboard tutorial overview: <https://docs.accelbyte.io/gaming-services/tutorials/byte-wars/unity/learning-modules/engagement/module-all-time-leaderboard/>

### Why it is interesting

AccelByte explicitly positions leaderboards as part of its engagement suite, with support for web-accessible leaderboards and multiple leaderboard cycles like daily, weekly, monthly, seasonal, and all-time.

### Pros

- Clear leaderboard-native product area
- Strong fit for live game backend stacks
- Supports operational control through an admin portal
- Useful if you want leaderboards as part of a larger engagement platform

### Cons

- More enterprise/backend-oriented than public-gallery-oriented
- Not the simplest path for an external public build browser
- Like PlayFab and Nakama, it still leaves presentation and browsing UX as your problem

### Overall assessment

Another legitimate leaderboard-focused platform that was missing from the docs. It is stronger for game operations than for low-effort public build discovery.

## Alternative 8: Airtable Only

- Airtable homepage: <https://www.airtable.com/>
- Cost snapshot: Free plan available; Team is $20/user/month billed annually; Business is $45/user/month billed annually, or $54/user/month billed monthly in Airtable's support docs; Enterprise Scale is custom. Pricing: <https://airtable.com/pricing> and <https://support.airtable.com/docs/airtable-plans>

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

If the goal is "leaderboard-native game backend in Microsoft's ecosystem":

- PlayFab

If the goal is "leaderboard-native backend with deeper technical control":

- Heroic Labs / Nakama

If the goal is "leaderboard-native game backend with broader live-ops platform features":

- AccelByte

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

Best alternatives if you specifically want leaderboard-native backend platforms:

- PlayFab
- Heroic Labs / Nakama
- Beamable
- AccelByte

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

- PlayFab leaderboards overview
- <https://learn.microsoft.com/en-us/gaming/playfab/features/social/leaderboardsv2/quickstart>

- PlayFab create basic leaderboard
- <https://learn.microsoft.com/en-us/gaming/playfab/community/leaderboards/create-basic-leaderboard>

- PlayFab tournaments and leaderboards
- <https://learn.microsoft.com/en-us/gaming/playfab/community/leaderboards/tournaments-leaderboards/>

- Heroic Labs / Nakama leaderboards concepts
- <https://heroiclabs.com/docs/nakama/concepts/leaderboards/>

- Heroic Labs / Nakama leaderboards console
- <https://heroiclabs.com/docs/nakama/getting-started/console/leaderboards/>

- Heroic Labs / Nakama tournaments concepts
- <https://heroiclabs.com/docs/nakama/concepts/tournaments/>

- Beamable leaderboards overview
- <https://docs.beamable.com/docs/leaderboards-feature-overview>

- Beamable leaderboards code docs
- <https://docs.beamable.com/docs/leaderboards-code>

- AccelByte engagement services overview
- <https://docs.accelbyte.io/gaming-services/services/engagement/>

- AccelByte manage leaderboards from admin portal
- <https://docs.accelbyte.io/gaming-services/services/engagement/leaderboard/manage-leaderboard-from-admin-portal/>

- AccelByte all-time leaderboard tutorial overview
- <https://docs.accelbyte.io/gaming-services/tutorials/byte-wars/unity/learning-modules/engagement/module-all-time-leaderboard/>

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
