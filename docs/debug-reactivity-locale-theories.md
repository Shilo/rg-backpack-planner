# Reactivity & Locale Bug Investigation

**Date:** 2026-03-17
**Reporter:** User on Android Pixel 8, Japanese language
**Status:** Investigating — awaiting debug panel data from user

## Reported Symptoms

1. **English flash on interaction** — Opening NodeContentMenu or switching TreeTabs briefly shows English locale strings on Node badges before reverting to Japanese.
2. **Node badge not reactively updating** — Leveling a node via NodeContextButton does not update the Node badge level display until a tab switch forces a remount.
3. **Tech crystal count always 0** — TechCrystalDisplay shows 0 regardless of leveled nodes.
4. **Tab switch forces correct state** — Switching away from a tab and back causes badge levels to display correctly, confirming the underlying store data is correct.

## Key Architectural Findings

The reactivity chain was audited and found to be architecturally sound:
- `treeLevels` store uses immutable updates (`.slice()`, spread operators)
- `techCrystalsSpent` is fully derived from `treeLevels` — never manually set
- Tree context (`treeData`) is always replaced via `.set()`, never mutated
- `updateLevels()` is synchronous — no debouncing or async in the update path
- Node.svelte and NodeContentMenu.svelte both read from the same context store

This means the bugs are not caused by a logic error in the current codebase. Something in the user's environment is different.

## Theories

### Theory 1: Stale Service Worker / Old App Version

**Likelihood:** HIGH

The PWA uses `vite-plugin-pwa` with `registerType: "autoUpdate"` and Workbox precaching. The service worker update lifecycle is:

1. Old SW serves cached `index.html` + old JS bundles from precache
2. SW detects update by fetching `sw.js` in background
3. Downloads new assets, installs new SW
4. New SW activates on next navigation or when all tabs close
5. `controllerchange` event fires → `serviceWorkerAutoUpdate.ts` triggers `window.location.reload()`

**How the user gets stuck on an old version:**
- If the CDN edge near the user (Asia-Pacific for Japan) served stale `sw.js` during the propagation window after a deploy, the SW update check returns "no update available"
- If the user swipes the browser away on Android instead of fully closing the tab, the old SW stays active
- If `registration.update()` fails silently (network issue, throttled by OS), no update occurs
- The `serviceWorkerAutoUpdate.ts` only checks on focus/visibility changes, throttled to every 10 seconds

**Why this explains all symptoms:** If the reactivity/locale bugs existed in a previous version and were fixed in v1.0.1, the user is simply running old code. Tab switch forces remount which picks up correct values from stores (stores may work fine, but component subscriptions in old code may be broken).

**Diagnostic:** Debug panel App Version field. If it doesn't show the latest version, this is confirmed.

**Fix:** User clears site data or unregisters service worker.

### Theory 2: Svelte 5 Compatibility Mode Reactivity Bug

**Likelihood:** MEDIUM-HIGH

The codebase uses Svelte 4 syntax (`export let`, `$:` reactive statements, `on:click`) running in Svelte 5's compatibility mode. Potential issues:

- **Derived store batching:** Svelte 5 changed how reactivity is batched. `$:` blocks depending on store subscriptions (`$treeData`, `$treeLevels`) might not fire in the same microtask under certain conditions.
- **`{#key}` block interaction:** Tree remounts via `{#key tabs[activeIndex].id}` in TreeTabs.svelte. If Svelte 5's compatibility layer has a bug where store subscriptions inside `{#key}` blocks lose their dependency tracking after initial mount, that would match all symptoms.
- **Context store subscriptions:** Node.svelte and NodeContentMenu.svelte use `getContext("tree")` to get a writable store, then subscribe via `$treeData`. A race condition in how context subscriptions are established during component initialization could cause missed updates.

**Chrome version matters here** — different V8 versions have different microtask scheduling behavior, and Svelte 5's signals-based reactivity interacts with this. A subtle timing difference in Promise/microtask resolution order could cause derived stores to miss an update on one Chrome version but not another.

**Diagnostic:** Debug panel reactivity probe (if added). If a simple counter button doesn't update its displayed value, Svelte's reactivity itself is broken on their device.

### Theory 3: Chrome Version / V8 Engine Difference

**Likelihood:** MEDIUM

Pixel 8 and Pixel 8 Pro receive the same Chrome updates, but:
- They could be on different Chrome channels (stable vs beta)
- Chrome updates roll out gradually — devices can be on different versions simultaneously
- The developer tests with **Brave** (Chromium fork), not Chrome. Brave and Chrome can have different JS engine behaviors around microtask scheduling, memory management, and GC timing.

**Relevant differences:**
- Microtask queue ordering (affects when derived store callbacks fire)
- `requestAnimationFrame` scheduling (Tree.svelte uses rAF for locale-dependent bound recalculation)
- Memory pressure handling (Pixel 8 has 8GB RAM vs 12GB on Pro — more aggressive GC could theoretically interfere with closure-based store subscriptions, though this is unlikely in practice)

**Diagnostic:** Debug panel User Agent field reveals exact Chrome/WebView version.

### Theory 4: In-App WebView

**Likelihood:** MEDIUM

If the user opened the app link from a messaging app common in Japan (LINE, Discord, Twitter/X), they may be running in an **in-app WebView** rather than a full browser. WebViews:

- Use an older/stripped-down Chromium engine
- Have different JS execution characteristics and throttling
- May not support service workers at all (so no caching, but also no update mechanism)
- Can have aggressive memory/CPU throttling imposed by the host app
- May have limited `import()` support, potentially breaking lazy-loaded locale chunks

**Diagnostic:** Debug panel User Agent field. WebViews typically include identifiers like `wv`, `Line/`, `Discord/`, or lack `Chrome/` entirely.

### Theory 5: Network / Failed Lazy-Loaded Locale Chunks

**Likelihood:** MEDIUM

Locales are lazy-loaded via Vite's `import.meta.glob()` — each becomes a separate chunk. The initialization flow:

1. `initializeI18n()` in `main.ts` **awaits** loading the initial locale before mounting the app
2. If the Japanese locale chunk fails to load (network error, CDN issue), `setLocale()` catches the error silently
3. `currentLocale.set("ja")` fires, but the dictionary is empty
4. The `t` derived store falls back to English (`fallbackLocale`)
5. When the chunk eventually loads (retry, cache hit), Japanese appears — causing a flash

**Why the flash happens on interaction:** Every component remount (tab switch, menu open) re-subscribes to `$t`. If there's a brief moment where the derived store re-evaluates during the subscription setup, English can flash before Japanese resolves.

**The always-0 crystals wouldn't be explained by this alone** — this theory only covers the locale flash. It may be a contributing factor alongside another theory.

**Diagnostic:** Debug panel Locale field (should show "ja") and Network field (slow network could cause chunk load failures).

### Theory 6: GitHub Pages CDN Regional Cache Staleness

**Likelihood:** MEDIUM (as a contributing factor to Theory 1)

GitHub Pages uses Fastly CDN with `Cache-Control: max-age=600` (10 minutes). After a deploy:

1. GitHub Pages purges the CDN cache
2. Purge propagation to Asia-Pacific edge nodes isn't instant
3. If the user loaded the app during the propagation window, their service worker cached old assets from the stale edge
4. Even after the CDN refreshes, the old SW continues serving precached old bundles
5. SW update checks fetch `sw.js` — if the edge was stale when the check ran, "no update" was returned

This isn't Japan-specific per se, but users far from GitHub's primary infrastructure (US) have a larger window of exposure to stale cache. Combined with Theory 1, it explains how the user got stuck on an old version.

**Diagnostic:** Same as Theory 1 — App Version in debug panel.

### Theory 7: Android Battery/Performance Optimization

**Likelihood:** LOW-MEDIUM

Android's battery optimization can:
- Restrict background activity for the browser process
- Throttle JavaScript execution when battery saver is on
- Defer `requestAnimationFrame` callbacks
- Freeze/discard pages more aggressively with lower RAM (8GB on Pixel 8)

If Chrome throttles JS execution mid-update, Svelte's synchronous store update chain could theoretically get interrupted — `treeData.set()` fires but subscriber callbacks are deferred. On tab switch (full remount), fresh subscriptions pick up the current value.

However, modern JS engines don't interrupt synchronous execution mid-function, so this would only affect async-dependent behavior (like locale chunk loading or SW update checks).

**Diagnostic:** Ask the user if battery saver is enabled.

### Theory 8: Browser Extension Interference

**Likelihood:** LOW

Ad blockers, translation extensions (Google Translate overlay), or accessibility tools can modify the DOM or intercept script execution. Japanese users commonly use:
- Google Translate browser overlay
- DeepL browser extension
- Content-blocking extensions

These can break Svelte's DOM reconciliation by inserting elements or modifying text nodes that Svelte expects to control.

**Diagnostic:** Ask the user to try in incognito/private mode (extensions disabled by default).

## Debug Panel

A dedicated `DebugInfoSection.svelte` component was added, rendered inside the About page (`AboutSettingsPage.svelte`) as a collapsed Accordion. It includes a **Copy** button that formats all entries as aligned plaintext for easy sharing.

### Fields

| Field | Purpose |
|---|---|
| App Version | Version baked into JS bundle — mismatch with latest = stale build |
| Stored Version | Version in localStorage — mismatch with App Version = migration state |
| Locale | Current svelte-whisper locale — "en" when expecting "ja" = locale load failure |
| Browser Lang | `navigator.languages` — confirms device language preferences |
| Display Mode | "Standalone (PWA)" vs "Browser Tab" |
| Service Worker | active / waiting / installing / not registered / error |
| Network | `navigator.connection.effectiveType` (4g/3g/2g/slow-2g) |
| Levels Total | Live sum of all `treeLevels` — if 0 while nodes are visually leveled, base store isn't populated |
| Crystals Spent | Live `techCrystalsSpent` — if 0 while nodes are leveled, derived store chain is broken |
| User Agent | Full UA string — reveals Chrome version, device, WebView status |
| Taps (DOM) | Plain JS counter incremented via DOM event — always increments on tap regardless of Svelte |
| Taps (Svelte) | Svelte reactive counter — only increments if Svelte's reactivity system is working |

### Reactivity Probe

The "Tap to test" button increments two independent counters:
- **DOM counter** — plain JavaScript variable, written to a `data-` attribute directly
- **Svelte counter** — standard Svelte reactive variable

Both are displayed on the button (`Tap to test: {svelte} / {dom}`) and included in the copied output. A mismatch (e.g., `Taps (DOM): 5`, `Taps (Svelte): 0`) proves Svelte's reactivity is broken on the device.

### Files

- `src/lib/sideMenuPages/DebugInfoSection.svelte` — self-contained debug component
- `src/lib/sideMenuPages/AboutSettingsPage.svelte` — renders `<DebugInfoSection />` at bottom

## Diagnostic Decision Tree

Ask the user to: open About page → expand Debug accordion → tap the test button a few times → tap Copy → paste and send.

```
1. Is App Version the latest?
   ├─ NO → Theory 1 confirmed (stale SW/build). Fix: clear site data.
   └─ YES → continue
2. Does User Agent show a WebView?
   ├─ YES → Theory 4 confirmed. Fix: open in full browser.
   └─ NO → continue
3. Does Locale show "ja"?
   ├─ NO (shows "en") → Theory 5 confirmed (locale chunk failed).
   └─ YES → continue
4. Do Taps (DOM) and Taps (Svelte) match after tapping?
   ├─ NO (DOM > Svelte) → Svelte runtime broken (Theory 2 or 3). Collect Chrome version from User Agent.
   └─ YES → continue
5. Do Levels Total / Crystals Spent show correct values after leveling nodes?
   ├─ NO (0 despite leveled nodes) → Store hydration issue
   └─ YES → Component subscription issue specific to Tree/Node rendering
```
