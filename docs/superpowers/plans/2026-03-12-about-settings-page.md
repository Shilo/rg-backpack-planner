# About Settings Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "About App" settings page with app identity, external links, and game instructions, accessible as the 4th nav button on the settings root page.

**Architecture:** New `AboutSettingsPage.svelte` page component using the existing `SettingsPage` wrapper, a new reusable `SettingsLinkItem.svelte` for tappable link rows, and the existing `NumberedList` for instructions. Registered in the settings shell via lazy loading following the established pattern.

**Tech Stack:** Svelte 5, TypeScript, phosphor-svelte icons, svelte-whisper i18n

**Spec:** `docs/superpowers/specs/2026-03-12-about-settings-page-design.md`

---

## Chunk 1: Foundation — i18n Keys, SettingsLinkItem, and Tests

### Task 1: Add i18n keys to all locale files

**Files:**
- Modify: `src/locales/en.json:174-182`
- Modify: `src/locales/ja.json:174-182`
- Modify: `src/locales/zh.json:174-182`

- [ ] **Step 1: Add English locale keys**

In `src/locales/en.json`, add the about page keys inside the `settings.pages` object and new keys in `settings`:

```json
"pages": {
    "node": "Node",
    "nodeDescription": "Behavior and Display",
    "appearance": "Appearance",
    "appearanceDescription": "Style and Tree",
    "general": "General",
    "generalDescription": "Accessibility, Application, and Storage",
    "about": "About App",
    "aboutDescription": "Info, Links, and Instructions",
    "backToSettings": "Back"
},
```

Also add these keys inside the `settings` object (after `"advanced": "Advanced"`):

```json
"aboutVersion": "Version",
"aboutAuthor": "Author",
"aboutSourceCode": "Source Code",
"aboutGame": "Game"
```

- [ ] **Step 2: Add Japanese locale keys**

In `src/locales/ja.json`, add inside `settings.pages`:

```json
"about": "アプリについて",
"aboutDescription": "情報、リンク、説明"
```

Add inside `settings`:

```json
"aboutVersion": "バージョン",
"aboutAuthor": "作者",
"aboutSourceCode": "ソースコード",
"aboutGame": "ゲーム"
```

- [ ] **Step 3: Add Chinese locale keys**

In `src/locales/zh.json`, add inside `settings.pages`:

```json
"about": "关于应用",
"aboutDescription": "信息、链接和说明"
```

Add inside `settings`:

```json
"aboutVersion": "版本",
"aboutAuthor": "作者",
"aboutSourceCode": "源代码",
"aboutGame": "游戏"
```

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/ja.json src/locales/zh.json
git commit -m "feat: add about settings page i18n keys for all locales"
```

### Task 2: Create SettingsLinkItem component

**Files:**
- Create: `src/lib/sideMenuPages/SettingsLinkItem.svelte`

- [ ] **Step 1: Create the component**

Create `src/lib/sideMenuPages/SettingsLinkItem.svelte`:

```svelte
<script lang="ts">
    import type { Component } from "svelte";
    import { CaretRightIcon } from "phosphor-svelte";
    import { triggerHaptic } from "../hapticsStore";

    export let icon: Component | null = null;
    export let label = "";
    export let value = "";
    export let onClick: (() => void) | null = null;
</script>

<button
    class="settings-link-item"
    type="button"
    on:click={() => {
        triggerHaptic();
        onClick?.();
    }}
>
    {#if icon}
        <span class="settings-link-icon" aria-hidden="true">
            <svelte:component this={icon} size={20} />
        </span>
    {/if}
    <span class="settings-link-label">{label}</span>
    {#if value}
        <span class="settings-link-value">{value}</span>
    {/if}
    <CaretRightIcon class="settings-link-arrow" size={12} aria-hidden="true" />
</button>

<style>
    .settings-link-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
        min-height: 38px;
        padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg);
        background: var(--bg-raised);
        border: none;
        border-bottom: var(--border-width) solid var(--border);
        color: var(--text-muted);
        font-size: var(--font-base);
        text-align: left;
        cursor: pointer;
        line-height: var(--leading-none);
        transition:
            transform var(--ease),
            filter var(--ease);
        -webkit-tap-highlight-color: transparent;
    }

    .settings-link-item:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .settings-link-item:hover {
            filter: var(--brightness-hover);
        }
    }

    .settings-link-item:active {
        filter: var(--brightness-hover);
        transform: scale(0.96);
    }

    .settings-link-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .settings-link-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .settings-link-label {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
    }

    .settings-link-value {
        color: var(--text-disabled);
        flex-shrink: 0;
    }

    :global(.settings-link-arrow) {
        flex: 0 0 auto;
        opacity: 0.5;
    }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sideMenuPages/SettingsLinkItem.svelte
git commit -m "feat: add SettingsLinkItem reusable component"
```

### Task 3: Create AboutSettingsPage component

**Files:**
- Create: `src/lib/sideMenuPages/AboutSettingsPage.svelte`

- [ ] **Step 1: Create the page component**

Create `src/lib/sideMenuPages/AboutSettingsPage.svelte`:

```svelte
<script lang="ts">
    import {
        UserIcon,
        GithubLogoIcon,
        GameControllerIcon,
    } from "phosphor-svelte";
    import packageInfo from "../../../package.json";
    import SettingsPage from "./SettingsPage.svelte";
    import SettingsLinkItem from "./SettingsLinkItem.svelte";
    import SideMenuSection from "../SideMenuSection.svelte";
    import NumberedList from "../NumberedList.svelte";
    import AppIcon from "../icons/AppIcon.svelte";
    import { getCurrentVersion } from "../latestUsedVersionStore";
    import { t } from "svelte-whisper";

    export let onBack: (() => void) | null = null;

    const version = getCurrentVersion();

    const authorName = packageInfo.author?.name ?? "";
    const authorUrl = packageInfo.author?.url ?? "";
    const sourceUrl = (packageInfo?.app?.sourceUrl ?? undefined) as
        | string
        | undefined;
    const gameName = packageInfo.game?.name ?? "";
    const gameUrl = packageInfo.game?.url ?? "";

    function openUrl(url: string | undefined) {
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    }

    $: appName = $t("app.name");
    $: appDescription = $t("app.description");
    $: versionLabel = version === "unknown" ? "" : version;
</script>

<SettingsPage title={$t("settings.pages.about")} {onBack}>
    <div class="about-card">
        <div class="about-app-row">
            <span class="about-app-icon" aria-hidden="true">
                <AppIcon />
            </span>
            <div class="about-app-text">
                <span class="about-app-name">{appName}</span>
                {#if appDescription}
                    <span class="about-app-description">{appDescription}</span>
                {/if}
            </div>
        </div>
        {#if versionLabel}
            <div class="about-info-row">
                <span class="about-info-label"
                    >{$t("settings.aboutVersion")}</span
                >
                <span class="about-info-value">{versionLabel}</span>
            </div>
        {/if}
    </div>

    <div class="about-links-card">
        {#if authorUrl && authorName}
            <SettingsLinkItem
                icon={UserIcon}
                label={$t("settings.aboutAuthor")}
                value={authorName}
                onClick={() => openUrl(authorUrl)}
            />
        {/if}
        {#if sourceUrl}
            <SettingsLinkItem
                icon={GithubLogoIcon}
                label={$t("settings.aboutSourceCode")}
                value="GitHub"
                onClick={() => openUrl(sourceUrl)}
            />
        {/if}
        {#if gameUrl && gameName}
            <SettingsLinkItem
                icon={GameControllerIcon}
                label={$t("settings.aboutGame")}
                value={gameName}
                onClick={() => openUrl(gameUrl)}
            />
        {/if}
    </div>

    <SideMenuSection title={$t("sideMenu.sections.instructions")}>
        <NumberedList
            items={[0, 1, 2, 3, 4].map((i) => $t(`trees.rules.${i}`))}
        />
    </SideMenuSection>
</SettingsPage>

<style>
    .about-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .about-app-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
    }

    .about-app-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        color: var(--text-muted);
    }

    .about-app-icon :global(svg) {
        width: 100%;
        height: 100%;
        display: block;
    }

    .about-app-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .about-app-name {
        font-size: var(--font-base);
        font-weight: var(--weight-bold);
        color: var(--text);
        line-height: var(--leading);
    }

    .about-app-description {
        font-size: var(--font-sm);
        color: var(--text-disabled);
        line-height: var(--leading);
        overflow-wrap: anywhere;
    }

    .about-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) var(--spacing-lg);
        border-top: var(--border-width) solid var(--border);
    }

    .about-info-label {
        font-size: var(--font-base);
        color: var(--text-muted);
    }

    .about-info-value {
        font-size: var(--font-base);
        color: var(--text-disabled);
    }

    .about-links-card {
        background: var(--bg-raised);
        border: var(--border-width) solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .about-links-card :global(.settings-link-item:last-child) {
        border-bottom: none;
    }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sideMenuPages/AboutSettingsPage.svelte
git commit -m "feat: add AboutSettingsPage component"
```

## Chunk 2: Registration, Navigation, and Tests

### Task 4: Register About page in settings shell

**Files:**
- Modify: `src/lib/sideMenuPages/SideMenuSettingsPage.svelte:2,21-57`

- [ ] **Step 1: Add "about" to SettingsPageId type**

In `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`, update line 2:

```typescript
export type SettingsPageId = "root" | "node" | "appearance" | "general" | "about";
```

- [ ] **Step 2: Add lazy-load cache variable and branch**

Add after `let GeneralPage: any = null;` (line 24):

```typescript
let AboutPage: any = null;
```

Add a new branch at the end of `loadPage()`, after the GeneralPage branch (after line 37):

```typescript
} else if (page === "about" && !AboutPage) {
    AboutPage = (await import("./AboutSettingsPage.svelte")).default;
}
```

- [ ] **Step 3: Update currentComponent reactive ternary**

Replace the `currentComponent` reactive statement (lines 50-57) with:

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

- [ ] **Step 4: Commit**

```bash
git add src/lib/sideMenuPages/SideMenuSettingsPage.svelte
git commit -m "feat: register about page in settings shell"
```

### Task 5: Add About nav button to root settings page

**Files:**
- Modify: `src/lib/sideMenuPages/RootSettingsPage.svelte:1-8,107-129`

- [ ] **Step 1: Add InfoIcon import**

In `src/lib/sideMenuPages/RootSettingsPage.svelte`, add `InfoIcon` to the phosphor-svelte import (line 3):

```typescript
import {
    CircleIcon,
    EyeIcon,
    GearSixIcon,
    InfoIcon,
    PaletteIcon,
} from "phosphor-svelte";
```

- [ ] **Step 2: Add 4th SettingsNavButton**

After the Node `SettingsNavButton` (after line 128), add:

```svelte
<SettingsNavButton
    icon={InfoIcon}
    title={$t("settings.pages.about")}
    description={$t("settings.pages.aboutDescription")}
    onClick={() => onNavigate?.("about")}
    data-page="about"
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sideMenuPages/RootSettingsPage.svelte
git commit -m "feat: add about nav button to root settings page"
```

### Task 6: Update settings paging test

**Files:**
- Modify: `test/settingsPaging.test.ts:6-13,32-46,59-69,113-121`

- [ ] **Step 1: Add AboutSettingsPage to page files check**

In `test/settingsPaging.test.ts`, add to the `pageFiles` array (after line 12):

```typescript
"src/lib/sideMenuPages/AboutSettingsPage.svelte",
"src/lib/sideMenuPages/SettingsLinkItem.svelte",
```

- [ ] **Step 2: Add lazy-import check for AboutSettingsPage**

After the GeneralSettingsPage lazy-import check (after line 46), add:

```typescript
if (!/await import\("\.\/AboutSettingsPage\.svelte"\)/.test(shellSource)) {
    throw new Error("Shell should lazy-import AboutSettingsPage.svelte.");
}
```

- [ ] **Step 3: Add data-page="about" check**

After the `data-page="general"` check (after line 69), add:

```typescript
if (!/data-page="about"/.test(rootSource)) {
    throw new Error('RootSettingsPage should have data-page="about" for focus restoration.');
}
```

- [ ] **Step 4: Add about locale key checks**

Add `"about"` and `"aboutDescription"` to the `requiredKeys` array (after line 120, before `"backToSettings"`):

```typescript
const requiredKeys = [
    "node",
    "nodeDescription",
    "appearance",
    "appearanceDescription",
    "general",
    "generalDescription",
    "about",
    "aboutDescription",
    "backToSettings",
];
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All tests pass, including the extended `settingsPaging.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add test/settingsPaging.test.ts
git commit -m "test: extend settings paging test for about page"
```

### Task 7: Run type check and final verification

- [ ] **Step 1: Run type check**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Run dev server and manually verify**

Run: `npm run dev`
Verify:
- Settings root page shows 4 nav buttons (General, Appearance, Node, About App)
- Clicking "About App" navigates to the about page with slide transition
- About page shows: app icon + name + description, version row, 3 link rows (Author, Source Code, Game), and Instructions section
- Each link row opens the correct URL in a new tab
- Back button returns to root with reverse slide transition
- Back button refocuses the "About App" nav button
