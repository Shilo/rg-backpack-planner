# Discord Auth Research

Research date: 2026-03-16

## Purpose

Document whether Discord login is a good fit for Backpack Planner as the shared identity for `Sync + Leaderboard`.

This is research-only documentation. It does not implement anything.

## Short Answer

Discord login is a strong fit for Backpack Planner if the app will mainly be shared inside one specific Discord server.

Why:

- The audience likely already has Discord accounts.
- "Sign in with Discord" feels lower-friction than creating a new app-specific account.
- Discord gives the app a stable user identity for private sync across devices.
- Discord can also be used to check whether the user belongs to one specific server before enabling `Sync + Leaderboard`.

Important tradeoff:

- This is still account-based identity.
- It is simply a low-friction account model because your audience already uses Discord.

## Practical Recommendation

If Discord login is only a nice optional extra:

- Keep the main sync recommendation from [cloud-sync-research.md](./cloud-sync-research.md): Firestore plus low-friction identity still stays simplest for sync-only.

If Discord login becomes the primary identity for cloud features:

- `Supabase + Discord login` becomes the strongest overall option.
- `Appwrite + Discord login` is the strongest runner-up.
- `Firestore` becomes less attractive because the official Firebase docs do not provide a first-class Discord provider flow comparable to Supabase or Appwrite.

Inference from official docs:

- Supabase has a dedicated Discord social-login guide.
- Appwrite has a dedicated Discord OAuth integration and generic OAuth2 login docs.
- Firebase documents native social providers plus upgraded OpenID Connect for non-native providers, but not a direct Discord provider path.

## Why Discord Fits This App

Backpack Planner is currently a client-only GitHub Pages PWA. The data being synced is tiny. The hard part is identity.

Discord helps with that identity problem:

- A Discord account gives each user a stable unique user ID.
- That ID can own the private synced `rg-backpack-planner-build-presets` blob.
- The same identity can own public leaderboard publishes.
- Because the app is being shared in a specific server, Discord membership can double as a lightweight access gate.

This makes the product story very intuitive:

- `Enable Sync + Leaderboard with Discord`

That is a much easier explanation than asking users to understand anonymous cloud identities, pairing secrets, or recovery vaults.

## What Discord OAuth Actually Gives You

Discord OAuth2 supports a standard authorization code flow and documents the `state` parameter for CSRF protection.

Key scopes relevant here:

- `identify`
- `guilds.members.read`
- `guilds`
- `email`

What they mean:

- `identify` allows `/users/@me` without requesting email.
- `guilds.members.read` allows `/users/@me/guilds/{guild.id}/member` to return the user's member information in one guild.
- `guilds` allows `/users/@me/guilds` to return basic information about all of a user's guilds.
- `email` adds email to `/users/@me`, but it is not necessary for this app.

Best minimum-scope recommendation for Backpack Planner:

- Request `identify`
- Request `guilds.members.read` if you want to gate cloud features to one specific Discord server
- Do not request `email` unless you later truly need it
- Prefer not to request `guilds` if the only real need is "are you in this one server?"

Privacy implication:

- `identify + guilds.members.read` is narrower than `identify + guilds` because it avoids asking for a list of all servers the user is in.

## Best Product Models

### Model 1: Discord login as identity only

Behavior:

- Any Discord user can enable `Sync + Leaderboard`
- Discord only acts as the sign-in provider
- Server membership is not enforced

Best when:

- The server is just the main distribution channel
- You do not want to block people who discovered the app elsewhere

### Model 2: Discord login plus server-membership gate

Behavior:

- User signs in with Discord
- Backend checks whether the user is a member of your specific guild
- Only members of that guild can enable `Sync + Leaderboard`

Best when:

- Cloud features are intended as a perk for one community
- You want the feature to feel community-bound

This is the strongest Discord-specific fit for your stated audience.

### Model 3: Discord login plus role-gated publish permissions

Behavior:

- Any member of the guild can enable sync
- Publishing to the public leaderboard may require a specific role

Best when:

- You want public build posting to be more curated than private sync

This is possible because a guild member object includes membership details such as roles.

## Recommended Identity/Data Model

For private sync:

- Use Discord user ID as the stable owner key
- Store the synced preset blob in a private document or row owned by that identity

For public leaderboard:

- Use the same Discord-backed owner identity
- Store public published builds separately from the private sync blob

Recommended private identity fields:

- `provider: "discord"`
- `discordUserId`
- `discordUsername`
- `discordGlobalName`
- `discordAvatar`
- `guildId` if cloud access is server-gated
- `guildMembershipLastCheckedAt`

Recommended public leaderboard fields:

- `ownerRef` tied to the Discord-backed app user
- `displayName` chosen by the user at publish time
- optional `discordGlobalNameSnapshot`
- optional `discordUsernameSnapshot`

Important recommendation:

- Never use Discord `username` or `global_name` as the durable owner key.
- Use Discord's stable user `id`.
- Treat displayed names as presentation data only.

Reason:

- Discord's developer changelog documents that `global_name` is a non-unique display name.
- Usernames and display names can change over time.

## Recommended UX

Best cloud opt-in copy:

- `Enable Sync + Leaderboard with Discord`

Suggested flow:

1. User taps `Enable Sync + Leaderboard with Discord`.
2. App starts Discord OAuth login.
3. App receives a Discord-backed session in the backend.
4. Backend checks guild membership if server gating is enabled.
5. If the user qualifies, the app creates or loads the private sync record.
6. Public publishing stays a separate explicit action.

If the user is not in the server:

- Explain that cloud sync and leaderboard require membership in the community Discord
- Offer a `Join Discord` link
- Keep the app usable locally

This preserves the low-pressure feel of the app.

## Security and Privacy Guidance

Recommended:

- Use the authorization code flow, not the implicit flow
- Validate the OAuth `state` value
- Request the minimum scopes needed
- Avoid `email` unless there is a clear product need
- Check server membership on the backend, not only in client code
- Store only the Discord fields you actually need

Why not implicit flow:

- Discord documents that the implicit flow returns the access token in the URI fragment
- Discord also documents that the implicit flow does not return a refresh token
- That makes it a weaker fit than the authorization code flow for a durable product feature

## Backend Comparison When Discord Login Matters

### Supabase

- Supabase homepage: <https://supabase.com/>

Why it fits:

- Supabase has a dedicated official `Login with Discord` guide
- Supabase Auth already handles social login sessions
- Supabase documents `provider_token` access from the session on initial social login
- SQL plus RLS is a natural fit if sync and public leaderboard live in the same backend

Why it is the best Discord-first fit:

- Native Discord provider support
- Strong fit for future public leaderboard queries
- Cleaner path than custom auth glue

Tradeoff:

- More schema and policy work than Firestore

### Appwrite

- Appwrite homepage: <https://appwrite.io/>

Why it fits:

- Appwrite has a dedicated Discord OAuth integration page
- Appwrite OAuth sessions include provider metadata such as `providerUid` and `providerAccessToken`
- Appwrite supports linking OAuth providers into one account model

Why it ranks second:

- Discord support is strong
- Product ergonomics are good
- It is still slightly less compelling than Supabase for a future public leaderboard with richer querying

### Firebase / Firestore

- Firebase homepage: <https://firebase.google.com/>

Why it becomes weaker here:

- The official Firebase docs do not provide a first-class Discord social-login flow comparable to Supabase or Appwrite
- Firebase documents native providers and upgraded OIDC support for non-native providers
- That means Discord-first auth would likely involve more custom auth design than the alternatives

Important nuance:

- Firestore is still a great sync database
- It is just no longer the most intuitive overall choice if Discord login is a hard requirement

## Recommendation By Scenario

If the question is "what is best for sync-only, regardless of Discord?":

- `Firestore + low-friction identity`

If the question is "what is best if the app is mainly for one Discord community and Discord login should power cloud features?":

- `Supabase + Discord login + optional guild-membership gate`

If the question is "what is best if you want Discord login but still prefer a more all-in-one backend platform?":

- `Appwrite + Discord login`

## Final Recommendation

For your specific situation, Discord login is a very good product fit.

Best practical approach if you decide to go this direction:

1. Use one opt-in surface: `Enable Sync + Leaderboard with Discord`
2. Use Discord as the durable identity for both sync and leaderboard ownership
3. Request `identify` and, if you want to restrict cloud features to the server, `guilds.members.read`
4. Keep private sync storage separate from public published builds
5. Use Discord user ID as the real owner key
6. Let public display name stay optional instead of forcing Discord naming publicly

Best backend if Discord login is a hard requirement:

- `Supabase`

Best runner-up:

- `Appwrite`

## Sources

- Discord OAuth2
- <https://docs.discord.com/developers/topics/oauth2>

- Discord Guild resource
- <https://docs.discord.com/developers/resources/guild>

- Discord developer changelog on unique usernames and display names
- <https://docs.discord.com/developers/change-log>

- Supabase login with Discord
- <https://supabase.com/docs/guides/auth/social-login/auth-discord>

- Supabase OAuth flows
- <https://supabase.com/docs/guides/auth/oauth-server/oauth-flows>

- Supabase provider token example
- <https://supabase.com/docs/guides/auth/social-login/auth-google>

- Appwrite Discord OAuth integration
- <https://appwrite.io/integrations/oauth-discord>

- Appwrite OAuth2 login
- <https://appwrite.io/docs/products/auth/oauth2>

- Firebase OIDC in web apps
- <https://firebase.google.com/docs/auth/web/openid-connect>
