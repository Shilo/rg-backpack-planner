# About Settings Page Design

## Summary

Add an "About" settings page accessible as the 4th navigation button on the root settings page. The page uses an Android-style card-section layout with three distinct sections: app identity with version, external links, and game instructions.

## Navigation Entry

Add a 4th `SettingsNavButton` to `RootSettingsPage.svelte` within the existing Settings `SideMenuSection`:

- Icon: `InfoIcon` from phosphor-svelte
- Title: `$t("settings.pages.about")` — "About"
- Description: `$t("settings.pages.aboutDescription")` — "App Info, Links, and Instructions"
- `data-page="about"`
- Navigates to the new `"about"` page via `onNavigate?.("about")`

## Page Registration

### Type update (`SideMenuSettingsPage.svelte`)

Update `SettingsPageId` from:
```typescript
export type SettingsPageId = "root" | "node" | "appearance" | "general";
```
to:
```typescript
export type SettingsPageId = "root" | "node" | "appearance" | "general" | "about";
```

### Lazy loading

Add `AboutPage` cache variable and lazy-load branch in `loadPage()`:
```typescript
let AboutPage: any = null;
// in loadPage():
} else if (page === "about" && !AboutPage) {
    AboutPage = (await import("./AboutSettingsPage.svelte")).default;
}
```

Update the `currentComponent` reactive ternary to include the `"about"` branch at the end:
```typescript
$: currentComponent =
    currentPage === "root"
        ? RootPage
        : currentPage === "node"
          ? NodePage
          : currentPage === "appearance"
            ? AppearancePage
            : currentPage === "general"
              ? GeneralPage
              : AboutPage;
```

## Page Layout (`AboutSettingsPage.svelte`)

Uses the existing `SettingsPage` wrapper with `title` and `onBack` props.

### Section 1 — App Identity (no SideMenuSection title)

A card-like block containing:
- **Row 1:** `AppIcon` (40px, themed border-radius) + app name (`$t("app.name")`) + description (`$t("app.description")`), left-aligned horizontally
- **Row 2:** Version label/value row — label `$t("settings.aboutVersion")` left, value from `getCurrentVersion()` right, separated by a subtle top border

This section does not use `SideMenuSection` — it's a custom styled div to achieve the Android card look, using existing CSS variables (`--bg-raised`, `--border`, `--radius`, `--spacing-*`).

### Section 2 — Links (no SideMenuSection title)

Three `SettingsLinkItem` rows grouped in a single card container (shared background, border-radius, internal dividers):

1. **Author:** `UserIcon`, label `$t("settings.aboutAuthor")`, value text showing author name from `package.json`, opens `package.json` author URL
2. **Source Code:** `GithubLogoIcon`, label `$t("settings.aboutSourceCode")`, value text "GitHub", opens `package.json` app source URL
3. **Game:** `GameControllerIcon`, label `$t("settings.aboutGame")`, value text showing game name from `package.json`, opens `package.json` game URL

Each row has a caret-right indicator and opens the URL in a new tab via `window.open(url, "_blank", "noopener,noreferrer")`.

### Section 3 — Instructions (`SideMenuSection` with title)

- Title: `$t("sideMenu.sections.instructions")`
- Content: `NumberedList` with `items={[0, 1, 2, 3, 4].map((i) => $t(\`trees.rules.${i}\`))}` (same pattern used in `SideMenuControlsPage.svelte`)

## New Component: `SettingsLinkItem.svelte`

A reusable settings row component for tappable external links.

### Imports
- `import type { Component } from "svelte"` — for icon prop typing
- `import { CaretRightIcon } from "phosphor-svelte"` — trailing indicator
- `import { triggerHaptic } from "../hapticsStore"` — haptic feedback on click

### Props
- `icon: Component` — leading phosphor icon
- `label: string` — primary text
- `value: string` — secondary text (right-aligned), optional
- `onClick: () => void` — click handler

### Behavior
- Calls `triggerHaptic()` before `onClick()` on click (matches `SettingsNavButton` pattern)

### Markup
```
button.settings-link-item
  svelte:component(icon) — 20px, --text-muted
  span.settings-link-label — label text
  span.settings-link-value — value text, --text-muted
  CaretRightIcon — 12px, 0.5 opacity (matches SettingsNavButton)
```

### Styling
- Matches existing settings component patterns: `--bg-raised` background, `--border` border, haptic on click
- Full-width button, `min-height: 38px`
- Hover: `filter: var(--brightness-hover)`
- Active: `transform: scale(0.96)`
- Focus-visible: `2px solid var(--border-focus)`, 2px offset
- `-webkit-tap-highlight-color: transparent`

When used in a grouped card, the parent `AboutSettingsPage` applies grouped styling (shared border-radius on first/last child, internal dividers via border-bottom).

## Internationalization

### New keys added to all three locale files (en.json, ja.json, zh.json):

```json
"settings": {
    "pages": {
        "about": "About",
        "aboutDescription": "App Info, Links, and Instructions"
    },
    "aboutVersion": "Version",
    "aboutAuthor": "Author",
    "aboutSourceCode": "Source Code",
    "aboutGame": "Game"
}
```

Japanese and Chinese translations will be provided for all keys.

## Data Sources

All dynamic data comes from `package.json`. `AboutSettingsPage.svelte` needs its own import: `import packageInfo from "../../../package.json"`.
- `packageInfo.version` — not used; version comes from `getCurrentVersion()` in `latestUsedVersionStore`
- `packageInfo.author.name` / `packageInfo.author.url` — author display name and link
- `packageInfo.app.sourceUrl` — GitHub repository URL
- `packageInfo.game.name` / `packageInfo.game.url` — game display name and link

## Files Changed

1. **`src/lib/sideMenuPages/SideMenuSettingsPage.svelte`** — add `"about"` to `SettingsPageId`, lazy-load branch, `currentComponent` branch
2. **`src/lib/sideMenuPages/RootSettingsPage.svelte`** — add 4th `SettingsNavButton` for About
3. **`src/lib/sideMenuPages/AboutSettingsPage.svelte`** — new page component
4. **`src/lib/sideMenuPages/SettingsLinkItem.svelte`** — new reusable link row component
5. **`src/locales/en.json`** — add About page i18n keys
6. **`src/locales/ja.json`** — add About page i18n keys (Japanese)
7. **`src/locales/zh.json`** — add About page i18n keys (Chinese)
8. **`test/settingsPaging.test.ts`** — extend to validate `AboutSettingsPage.svelte` existence, `data-page="about"` in RootSettingsPage, and lazy-import of `AboutSettingsPage.svelte`
