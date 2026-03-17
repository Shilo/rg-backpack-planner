# How the Locale Persistence System Works

## The Two Jobs

svelte-whisper's locale system does two things on app startup:

1. **Pick a locale** — decide what language to show
2. **Remember it** — save the choice so it persists across visits

These two jobs interact through localStorage via the `persistKey` option.

## The Players

```
┌─────────────────────────────────────────────────┐
│  localStorage                                   │
│  key: "rg-backpack-planner-locale"              │
│  value: "en" | "ja" | "fr" | "zh" | (empty)    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  navigator.languages                            │
│  The browser's language preference list          │
│  e.g. ["ja-JP", "ja", "en-US", "en"]           │
│  Set by the user in their OS/browser settings   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Registered locales                             │
│  en, fr, ja, zh (from registerLoader calls)     │
│  These are the languages the app supports       │
└─────────────────────────────────────────────────┘
```

## How `init()` Picks a Locale

`init()` walks a priority chain. It stops at the first match:

```
1. localStorage has a value?  ──YES──►  Use it. Stop.
        │
       NO
        ▼
2. Browser language matches   ──YES──►  Use it. Stop.
   a registered locale?
        │
       NO
        ▼
3. `initial` option set?      ──YES──►  Use it. Stop.
        │
       NO
        ▼
4. Use `fallback` ("en")
```

Step 2 ("browser language matches") works by iterating `navigator.languages` in order. For each language, it tries an exact match first, then a prefix match. So `ja-JP` matches registered locale `ja` because `"ja-jp".startsWith("ja")` is true.

## The Persistence Subscription

After picking a locale, `init()` sets up a **persistence subscription** — a listener on the locale store that saves changes to localStorage. This is how explicit user choices (clicking Japanese in the language dropdown) get remembered.

---

## Before the Fix: Every Locale Gets Persisted

### Old Code

```js
// 1. Set up persistence subscription FIRST
if (persistKey) {
    persistUnsub = currentLocale.subscribe(val => {
        if (val) localStorage.setItem(persistKey, val);  // saves EVERY change
    });
}

// 2. THEN set the locale (triggers the subscription above)
if (initial) await setLocale(initial);
```

### Old Behavior: Step by Step

**First visit** (user's browser language is `ja-JP`, no localStorage yet):

```
1. localStorage: empty           → skip
2. Browser detection: ja-JP → ja → USE "ja"
3. setLocale("ja") fires
4. Subscription fires → saves "ja" to localStorage
```

Result: User sees Japanese. `"ja"` is now in localStorage.

**Second visit** (nothing changed):

```
1. localStorage: "ja"            → USE "ja". Stop.
2. (browser detection never runs)
```

Result: Still Japanese. Works fine.

**The problem scenario** — first visit happened before Japanese was added:

```
FIRST VISIT (only "en" locale existed):
1. localStorage: empty           → skip
2. Browser detection: ja-JP → ?  → no match (ja not registered yet)
3. Fallback                      → USE "en"
4. setLocale("en") fires
5. Subscription fires → saves "en" to localStorage
```

Result: User sees English. `"en"` is now in localStorage.

```
SECOND VISIT (Japanese locale was added in v1.0.1):
1. localStorage: "en"            → USE "en". Stop.
2. (browser detection never runs — it would find "ja" now, but too late)
```

Result: User STILL sees English, even though Japanese now exists and their browser prefers it. The stale `"en"` in localStorage permanently blocks detection.

**This is what happened to the reporter.** They saw English, assumed the app didn't support Japanese, and turned on Chrome's auto-translate — which broke Svelte's DOM.

### Why It's Wrong

The old code didn't distinguish between:
- **"The system auto-detected English"** → should NOT be permanent
- **"The user explicitly chose English"** → SHOULD be permanent

Both got saved to localStorage identically. So an auto-detected default became an immovable preference.

---

## After the Fix: Only Explicit Choices Get Persisted

### New Code

```js
// 1. Set the locale FIRST
if (initial) await setLocale(initial);

// 2. THEN set up persistence, skipping the current value
setupPersistence();  // ← ignores whatever locale was just set
```

```js
function setupPersistence() {
    if (!persistKey) return;
    let skip = true;  // ← skip the first emission (the current value)
    persistUnsub = currentLocale.subscribe(val => {
        if (skip) { skip = false; return; }  // ← ignore initial value
        if (val) localStorage.setItem(persistKey, val);
    });
}
```

### How the Skip Works

Svelte's `subscribe()` immediately fires with the current store value. That's how Svelte stores work — you always get the current value first, then future changes.

By setting `skip = true` and flipping it to `false` on the first call, the subscription ignores the current locale (whatever init auto-detected) and only reacts to FUTURE changes (user clicking a language).

### New Behavior: Step by Step

**First visit** (user's browser language is `ja-JP`, no localStorage):

```
1. localStorage: empty           → skip
2. Browser detection: ja-JP → ja → USE "ja"
3. setLocale("ja") fires         → locale is now "ja"
4. setupPersistence() runs
   └─ subscribe fires immediately with "ja"
   └─ skip=true → ignore. Set skip=false.
5. localStorage: still empty     ← auto-detected value NOT saved
```

Result: User sees Japanese. localStorage is empty.

**Second visit** (nothing changed):

```
1. localStorage: empty           → skip
2. Browser detection: ja-JP → ja → USE "ja"
```

Result: Still Japanese. Detection runs fresh every time.

**User explicitly picks French from dropdown:**

```
1. locale.set("fr") fires
2. Subscription fires with "fr"
3. skip is already false (was consumed on init)
4. Saves "fr" to localStorage
```

Result: `"fr"` is now in localStorage.

**Third visit** (user's browser still prefers Japanese):

```
1. localStorage: "fr"            → USE "fr". Stop.
2. (browser detection skipped — user made an explicit choice)
```

Result: French, as the user chose. This is correct — the user deliberately overrode their browser preference.

**User clicks "Reset Settings"** (calls `resetLocale()`):

```
1. Clears "fr" from localStorage
2. Tears down persistence subscription
3. Browser detection: ja-JP → ja → USE "ja"
4. setupPersistence() runs again (skips current value)
5. localStorage: empty again
```

Result: Back to Japanese (browser preference). Future explicit changes will be persisted.

---

## The Migration (One-Time Cleanup)

The fix only prevents NEW auto-detected values from being persisted. Users who already have a stale value in localStorage (like the reporter with `"en"`) would remain stuck.

The `1.0.3` migration in `runMigrations.ts` handles this:

```ts
{
    toVersion: "1.0.3",
    run: () => {
        removeItem("locale");  // clears the stale persisted locale
    },
}
```

When a user on v1.0.1 or v1.0.2 updates to the next version:
1. Migration runs → clears localStorage locale
2. `init()` runs → no persisted value → detection runs fresh
3. `ja-JP` → matches `ja` → user finally sees Japanese

---

## Detection Improvement: `navigator.languages` (Plural)

The old code only checked `navigator.language` (singular — just the top preference).

The new code iterates `navigator.languages` (the full ordered list):

```
Old: navigator.language = "ja-JP"
     → try to match "ja-JP" against registered locales
     → if no match, give up

New: navigator.languages = ["ja-JP", "ja", "en-US", "en", "zh-TW", "zh"]
     → try "ja-JP" → no exact match, prefix match "ja" ✓ → done
```

This matters for the explicit mapping mode too. If someone has `{ en: 'english' }` as their mapping and the user's top language is `fr-CA` (no match), the old code would give up. The new code continues to `en-US` (their second preference) and matches.

---

## Summary

| | Before Fix | After Fix |
|---|---|---|
| Auto-detected locale | Saved to localStorage | NOT saved |
| Explicit user choice | Saved to localStorage | Saved to localStorage |
| Detection on return visit | Skipped if ANY value persisted | Runs unless user made explicit choice |
| Browser language changes | Ignored (stale value wins) | Respected (detection runs fresh) |
| `navigator.language` | Singular (top preference only) | `navigator.languages` (full list) |
