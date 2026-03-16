# Unified Premade Build Configuration

## Problem

Premade build metadata is scattered across 3 files that must be kept in sync manually:

- **`package.json`** — build names + encoded data (pipe-delimited strings)
- **`src/lib/customIcons.ts`** — icon per display name (`premadeBuildIcons` map)
- **`src/lib/buttons/PreviewBuildsDropdown.svelte`** — i18n key per display name (`premadeBuildLabelKeys` map)

When a build is added, renamed, or removed, all 3 must be updated independently. The dropdown's label keys are already stale (e.g. `"Starter"` instead of `"Early Raid"`), proving this pattern doesn't scale.

## Goal

Make `package.json` the single source of truth for premade builds. Adding or changing a build requires editing one object in `package.json` (plus adding locale translations for new names). Everything else derives automatically.

## Design

### package.json — Structured objects

Replace the pipe-delimited string array with an array of objects:

```json
"premadeBuilds": [
    { "name": "Early_Raid", "build": ",,k.k.'2.k;;;iU", "icon": "SpiralIcon" },
    { "name": "Early_PvE", "build": "v:3;;;uA", "icon": "SunIcon" },
    { "name": "Mid_PvE", "build": ",k..k.'2.k.k..a:3;;;37W", "icon": "KnifeIcon" },
    { "name": "Late_PvE", "build": ",k'7.a.a.1,k.k..k.k.'2.a:3;;;9W7", "icon": "SwordIcon" },
    { "name": "Late_PvP", "build": "k'4..k.k..a,k'7.a.a.1;k..k.'2.k.k..a,k'7.a.a.1;k'4..k.k..a,k'7.a.a.1;aox", "icon": "ShieldIcon" }
]
```

| Field | Purpose |
|-------|---------|
| `name` | Alias, display name source (underscores → spaces), i18n key suffix |
| `build` | Encoded build data (without the `Name\|` prefix) |
| `icon` | Icon component name as string |

### recommended.ts — Central parser and enricher

- Construct encoded string: `entry.name + "|" + entry.build`
- Extend `RecommendedBuild` interface with `iconName: string` and `i18nKey: string`
- `i18nKey` = `"preview.premade." + entry.name` (verbatim, e.g. `preview.premade.Early_Raid`)
- Note: `displayName` continues to come from `decodeBuildData()` which converts underscores to spaces internally (e.g. `"Early_Raid"` → `"Early Raid"`)
- Add `ICON_COMPONENTS` map: known icon name strings → imported Phosphor components
- Export `getRecommendedBuildIcon(iconName: string): Component | null` — high-level abstraction for Svelte consumers

### customIcons.ts — Remove premadeBuildIcons

Delete the `premadeBuildIcons` export entirely. Keep `getTreeIcon`, `GuardianIcon`, `VanguardIcon`, `CannonIcon`, `TechCrystalIcon`, `RootNodeIcon`. Remove any Phosphor icon imports that were only used by `premadeBuildIcons` (they move to `recommended.ts`).

### PreviewBuildsDropdown.svelte — Simplify

- Delete `premadeBuildLabelKeys`
- Use `build.i18nKey` for `$t()` calls, with `build.displayName` as fallback: `$t(build.i18nKey, { default: build.displayName })` or equivalent `svelte-whisper` fallback pattern
- Use `getRecommendedBuildIcon(build.iconName)` for icons
- Remove `rawName` from the mapped data

### Locale files — Rename keys

All 4 files (`en.json`, `ja.json`, `zh.json`, `fr.json`):

| Old key | New key |
|---------|---------|
| `preview.premade.starter` | `preview.premade.Early_Raid` |
| `preview.premade.earlyStun` | `preview.premade.Early_PvE` |
| `preview.premade.midPve` | `preview.premade.Mid_PvE` |
| `preview.premade.latePve` | `preview.premade.Late_PvE` |
| `preview.premade.latePvp` | `preview.premade.Late_PvP` |

Translated values stay the same. The `Early_Raid` casing intentionally matches the `name` field in `package.json` for zero-transformation derivation, even though it breaks the existing camelCase convention in locale files.

### Tests — Update as needed

- `test/shareUrl.test.ts`
- `test/previewBuildsDropdownTcDescription.test.ts`
- `test/shareBuildButtonRecommendedLinkMenuUi.test.ts`

### Unchanged consumers

These import from `recommended.ts` and gain fields without losing any:
- `src/lib/buildData/share.ts`
- `src/lib/buildData/url.ts`
- `src/lib/PreviewBuildIndicator.svelte`
- `src/App.svelte`

## Verification

1. `npm run check` — TypeScript and Svelte checks pass
2. `npm test` — All tests pass
3. `npm run dev` — Manual verification:
   - Preview Builds dropdown shows correct names, icons, TC counts
   - Clicking a premade build loads correctly
   - Share URL aliases still work (e.g. `#Early_Raid`)
   - Locale switching shows translated build names
