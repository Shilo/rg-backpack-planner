# Uppercase Text Setting & Locale Casing Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-controlled "Uppercase text" toggle (default on) and normalize all locale string casing to standard UI conventions.

**Architecture:** A new `uppercaseTextStore` (boolean, localStorage, default `true`) drives an `.uppercase-text` class on `<html>` via `initUppercaseTextReactivity()` added to `themeApply.ts`. The global CSS rule scopes from `* { text-transform: uppercase }` to `.uppercase-text * { text-transform: uppercase }`, and 14 redundant component-level declarations are removed. Locale cleanup is purely JSON edits to `en.json` (casing + new keys); `ja.json` and `zh.json` get only new keys.

**Tech Stack:** Svelte 5, TypeScript, localStorage, CSS class toggle, custom Node/TS test runner (`npx tsx`)

**Spec:** `docs/superpowers/specs/2026-03-11-uppercase-text-setting-locale-casing-design.md`

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/lib/uppercaseTextStore.ts` | Boolean setting store |
| Modify | `src/lib/themeApply.ts` | Add `initUppercaseTextReactivity()` |
| Modify | `src/main.ts` | Call and HMR-dispose `initUppercaseTextReactivity` |
| Modify | `src/app.css` | Scope global uppercase to `.uppercase-text *` |
| Modify | `src/lib/sideMenuPages/SideMenuSettingsPage.svelte` | Add toggle + reset |
| Modify | `src/locales/en.json` | Casing cleanup + new i18n keys |
| Modify | `src/locales/ja.json` | New i18n keys only |
| Modify | `src/locales/zh.json` | New i18n keys only |
| Remove rule | 13 `.svelte` files | Remove redundant `text-transform: uppercase` |
| Create | `test/uppercaseTextSetting.test.ts` | Source-inspection test |
| Modify | `test/index.ts` | Register new test file |

---

## Chunk 1: Uppercase Text Setting

### Task 1: Create feature branch

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/uppercase-text-setting-locale-casing
```

---

### Task 2: Write the failing test

Tests in this repo are source-inspection tests — they read source files and assert that specific patterns exist. Follow the same pattern as `test/showTierSetting.test.ts`.

Throughout Tasks 3–9 we run `npx tsx test/uppercaseTextSetting.test.ts` directly to get fast incremental feedback on just this file. This is intentional — we do **not** use `npm test` until Task 10, where the file is registered in `index.ts` and the full suite is run together.

- [ ] **Step 1: Create `test/uppercaseTextSetting.test.ts`**

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Store ---

const storePath = resolve("src/lib/uppercaseTextStore.ts");
let storeSource = "";

try {
    storeSource = readFileSync(storePath, "utf8");
} catch {
    throw new Error("uppercaseTextStore.ts should exist for the uppercase text setting.");
}

if (!/DEFAULT_UPPERCASE_TEXT\s*=\s*true/.test(storeSource)) {
    throw new Error("uppercaseTextStore default should be true.");
}

if (!/getItem\("uppercase-text"\)/.test(storeSource)) {
    throw new Error("uppercaseTextStore should read from 'uppercase-text' storage key.");
}

if (!/setItem\("uppercase-text",/.test(storeSource)) {
    throw new Error("uppercaseTextStore should persist to 'uppercase-text' storage key.");
}

if (!/resetToDefault:\s*\(\)\s*=>\s*\{/.test(storeSource)) {
    throw new Error("uppercaseTextStore should expose resetToDefault().");
}

// --- CSS ---

const cssPath = resolve("src/app.css");
const cssSource = readFileSync(cssPath, "utf8");

if (!/\.uppercase-text\s*\*\s*\{[^}]*text-transform:\s*uppercase/.test(cssSource)) {
    throw new Error("app.css should scope text-transform: uppercase to .uppercase-text * selector.");
}

// Bare * { text-transform: uppercase } should not exist
if (/(?<!\S)\*\s*\{[^}]*text-transform:\s*uppercase/.test(cssSource)) {
    throw new Error("app.css should not have a bare * { text-transform: uppercase } rule.");
}

// --- Reactivity function ---

const themeApplyPath = resolve("src/lib/themeApply.ts");
const themeApplySource = readFileSync(themeApplyPath, "utf8");

if (!/export function initUppercaseTextReactivity/.test(themeApplySource)) {
    throw new Error("themeApply.ts should export initUppercaseTextReactivity().");
}

// --- main.ts wiring ---

const mainPath = resolve("src/main.ts");
const mainSource = readFileSync(mainPath, "utf8");

if (!/initUppercaseTextReactivity/.test(mainSource)) {
    throw new Error("main.ts should call initUppercaseTextReactivity().");
}

if (!/cleanupUppercaseText/.test(mainSource)) {
    throw new Error("main.ts should store the cleanup return value of initUppercaseTextReactivity().");
}

// --- Settings page ---

const settingsPagePath = resolve("src/lib/sideMenuPages/SideMenuSettingsPage.svelte");
const settingsPageSource = readFileSync(settingsPagePath, "utf8");

if (!/import\s+\{\s*uppercaseText\s*\}\s+from\s+"\.\.\/uppercaseTextStore"/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should import uppercaseText store.");
}

if (!/settings\.uppercaseText/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should use settings.uppercaseText i18n key.");
}

if (!/checked=\{\$uppercaseText\}/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage should bind toggle checked state to $uppercaseText.");
}

if (!/uppercaseText\.set\(!\$uppercaseText\)/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage toggle should invert uppercaseText store value.");
}

if (!/uppercaseText\.resetToDefault\(\)/.test(settingsPageSource)) {
    throw new Error("SideMenuSettingsPage reset should include uppercaseText.resetToDefault().");
}

// --- No bare component-level text-transform: uppercase ---

const componentFiles = [
    "src/lib/AppTitleDisplay.svelte",
    "src/lib/ColorPickerDialog.svelte",
    "src/lib/ContextMenu.svelte",
    "src/lib/PreviewBuildIndicator.svelte",
    "src/lib/SliderSetting.svelte",
    "src/lib/SideMenuSection.svelte",
    "src/lib/TabBar.svelte",
    "src/lib/TreeContextMenuList.svelte",
    "src/lib/TreeTabs.svelte",
    "src/lib/buttons/PreviewBuildsDropdown.svelte",
    "src/lib/modals/InputModal.svelte",
    "src/lib/modals/LoadBuildModal.svelte",
];

for (const file of componentFiles) {
    const source = readFileSync(resolve(file), "utf8");
    if (/text-transform:\s*uppercase/.test(source)) {
        throw new Error(`${file} should not have a text-transform: uppercase declaration (remove it; the global .uppercase-text rule covers it).`);
    }
}

// --- Locale keys ---

const localePaths = [
    resolve("src/locales/en.json"),
    resolve("src/locales/ja.json"),
    resolve("src/locales/zh.json"),
];

for (const localePath of localePaths) {
    const source = readFileSync(localePath, "utf8");
    if (!/"uppercaseText"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.uppercaseText translation is required.`);
    }
    if (!/"uppercaseTextTooltip"\s*:/.test(source)) {
        throw new Error(`${localePath}: settings.uppercaseTextTooltip translation is required.`);
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `uppercaseTextStore.ts should exist for the uppercase text setting.`

---

### Task 3: Create `uppercaseTextStore.ts`

- [ ] **Step 1: Create `src/lib/uppercaseTextStore.ts`**

```typescript
import { writable } from "svelte/store";
import { getItem, setItem, removeItem } from "./storage";

const DEFAULT_UPPERCASE_TEXT = true;

function getUppercaseText(): boolean {
    const stored = getItem("uppercase-text");
    if (stored === null) return DEFAULT_UPPERCASE_TEXT;
    return stored === "true";
}

function setUppercaseText(value: boolean) {
    setItem("uppercase-text", value.toString());
}

function createUppercaseTextStore() {
    const { subscribe, set } = writable(getUppercaseText());

    return {
        subscribe,
        set: (value: boolean) => {
            setUppercaseText(value);
            set(value);
        },
        resetToDefault: () => {
            removeItem("uppercase-text");
            set(DEFAULT_UPPERCASE_TEXT);
        },
    };
}

export const uppercaseText = createUppercaseTextStore();
```

- [ ] **Step 2: Run test — confirm store section passes, now fails on CSS**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `app.css should scope text-transform: uppercase to .uppercase-text * selector.`

---

### Task 4: Update `app.css`

- [ ] **Step 1: In `src/app.css` (line 42-44), change the bare global rule**

Find:
```css
* {
    text-transform: uppercase;
}
```

Replace with:
```css
.uppercase-text * {
    text-transform: uppercase;
}
```

- [ ] **Step 2: Run test — confirm CSS passes, now fails on themeApply**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `themeApply.ts should export initUppercaseTextReactivity().`

---

### Task 5: Remove redundant `text-transform: uppercase` from 13 component files

Remove **only** the `text-transform: uppercase;` declaration (one line) from each location. Do not touch `text-transform: none` declarations.

- [ ] **Step 1: `src/lib/AppTitleDisplay.svelte` — line ~65**
- [ ] **Step 2: `src/lib/ColorPickerDialog.svelte` — lines ~559 and ~575** (two separate declarations)
- [ ] **Step 3: `src/lib/ContextMenu.svelte` — line ~392**
- [ ] **Step 4: `src/lib/PreviewBuildIndicator.svelte` — line ~120**
- [ ] **Step 5: `src/lib/SliderSetting.svelte` — line ~221**
- [ ] **Step 6: `src/lib/SideMenuSection.svelte` — line ~34**
- [ ] **Step 7: `src/lib/TabBar.svelte` — line ~121**
- [ ] **Step 8: `src/lib/TreeContextMenuList.svelte` — lines ~256 and ~369** (two separate declarations)
- [ ] **Step 9: `src/lib/TreeTabs.svelte` — line ~678**
- [ ] **Step 10: `src/lib/buttons/PreviewBuildsDropdown.svelte` — line ~142**
- [ ] **Step 11: `src/lib/modals/InputModal.svelte` — line ~252**
- [ ] **Step 12: `src/lib/modals/LoadBuildModal.svelte` — line ~230**

- [ ] **Step 13: Run svelte-check to catch any issues**

```bash
npx svelte-check --tsconfig ./tsconfig.json
```

Expected: 0 errors.

---

### Task 6: Add `initUppercaseTextReactivity()` to `themeApply.ts`

- [ ] **Step 1: Add import to `src/lib/themeApply.ts`**

At the top of `themeApply.ts`, alongside the existing imports, add:

```typescript
import { get } from "svelte/store";
import { uppercaseText } from "./uppercaseTextStore";
```

Note: `get` from `svelte/store` is already imported in this file — only add the `uppercaseText` import line.

- [ ] **Step 2: Append the function at the bottom of `src/lib/themeApply.ts`**

```typescript
/** Subscribe to the uppercaseText store and toggle the .uppercase-text class on <html>. */
export function initUppercaseTextReactivity(): () => void {
    function apply() {
        const isUppercase = get(uppercaseText);
        if (isUppercase) {
            document.documentElement.classList.add("uppercase-text");
        } else {
            document.documentElement.classList.remove("uppercase-text");
        }
    }

    // Apply synchronously to avoid a first-frame flash (same pattern as initThemeReactivity)
    apply();

    const unsubscribe = uppercaseText.subscribe(apply);

    return unsubscribe;
}
```

- [ ] **Step 3: Run test — confirm themeApply passes, now fails on main.ts**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `main.ts should call initUppercaseTextReactivity().`

---

### Task 7: Wire up in `main.ts`

- [ ] **Step 1: Add import to `src/main.ts`**

The file already imports `initThemeReactivity` from `"./lib/themeApply"`. Change that import to also include `initUppercaseTextReactivity`:

```typescript
import { initThemeReactivity, initUppercaseTextReactivity } from "./lib/themeApply";
```

- [ ] **Step 2: Call before `mount`, on the line immediately after the `const cleanupThemeReactivity = initThemeReactivity();` declaration**

```typescript
const cleanupThemeReactivity = initThemeReactivity();
const cleanupUppercaseText = initUppercaseTextReactivity();
```

- [ ] **Step 3: Add to the HMR dispose block**

The existing block:
```typescript
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unsubLocale();
        cleanupThemeReactivity();
        removeGlobalContextMenuListener();
        cleanupServiceWorkerAutoUpdate();
    });
}
```

Becomes:
```typescript
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unsubLocale();
        cleanupThemeReactivity();
        cleanupUppercaseText();
        removeGlobalContextMenuListener();
        cleanupServiceWorkerAutoUpdate();
    });
}
```

- [ ] **Step 4: Run test — confirm main.ts passes, now fails on settings page**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `SideMenuSettingsPage should import uppercaseText store.`

---

### Task 8: Add toggle to settings page

File: `src/lib/sideMenuPages/SideMenuSettingsPage.svelte`

- [ ] **Step 1: Add import in the `<script>` block**

After the `colorblindTreeColors` import line, add:

```typescript
import { uppercaseText } from "../uppercaseTextStore";
```

- [ ] **Step 2: Add `uppercaseText.resetToDefault()` in `handleResetSettings`**

In the `onConfirm` callback of `handleResetSettings`, alongside `colorblindTreeColors.resetToDefault()`, add:

```typescript
uppercaseText.resetToDefault();
```

- [ ] **Step 3: Add the `ToggleSwitch` in the "Look and Feel" section**

Place it immediately before the `colorblindTreeColors` `ToggleSwitch`:

```svelte
<ToggleSwitch
    checked={$uppercaseText}
    label={$t("settings.uppercaseText")}
    ariaLabel={$t("settings.uppercaseText")}
    tooltipText={$t("settings.uppercaseTextTooltip")}
    onToggle={() => uppercaseText.set(!$uppercaseText)}
/>
```

- [ ] **Step 4: Run test — confirm settings page passes, now fails on locale keys**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: Error — `src/locales/en.json: settings.uppercaseText translation is required.`

---

### Task 9: Add i18n keys to all locale files

- [ ] **Step 1: Add to `src/locales/en.json`** in the `settings` object, after `"shareButton"`, before `"colorblindTreeColors"`:

```json
"uppercaseText": "Uppercase text",
"uppercaseTextTooltip": "Display all text in uppercase",
```

- [ ] **Step 2: Add to `src/locales/ja.json`** in the same position:

```json
"uppercaseText": "大文字テキスト",
"uppercaseTextTooltip": "すべてのテキストを大文字で表示",
```

- [ ] **Step 3: Add to `src/locales/zh.json`** in the same position:

```json
"uppercaseText": "大写文本",
"uppercaseTextTooltip": "以大写方式显示所有文本",
```

- [ ] **Step 4: Run test — confirm all sections pass**

```bash
npx tsx test/uppercaseTextSetting.test.ts
```

Expected: No errors (process exits 0).

---

### Task 10: Register test, run full suite, commit

- [ ] **Step 1: Add test to `test/index.ts` `TEST_FILES` array**

In the `// 5. UI & Interaction` section, after any existing setting test (e.g., `"showTierSetting.test.ts"`), add:

```typescript
"uppercaseTextSetting.test.ts",
```

- [ ] **Step 2: Run full suite**

```bash
npm test
```

Expected: All tests pass, no errors.

- [ ] **Step 3: Commit**

```bash
git add \
  src/lib/uppercaseTextStore.ts \
  src/lib/themeApply.ts \
  src/main.ts \
  src/app.css \
  src/lib/AppTitleDisplay.svelte \
  src/lib/ColorPickerDialog.svelte \
  src/lib/ContextMenu.svelte \
  src/lib/PreviewBuildIndicator.svelte \
  src/lib/SliderSetting.svelte \
  src/lib/SideMenuSection.svelte \
  src/lib/TabBar.svelte \
  src/lib/TreeContextMenuList.svelte \
  src/lib/TreeTabs.svelte \
  src/lib/buttons/PreviewBuildsDropdown.svelte \
  src/lib/modals/InputModal.svelte \
  src/lib/modals/LoadBuildModal.svelte \
  src/lib/sideMenuPages/SideMenuSettingsPage.svelte \
  src/locales/en.json \
  src/locales/ja.json \
  src/locales/zh.json \
  test/uppercaseTextSetting.test.ts \
  test/index.ts

git commit -m "feat(settings): add uppercase text toggle, default on"
```

---

## Chunk 2: Locale Casing Cleanup

### Task 11: Fix ALL CAPS modal titles in `en.json`

All changes are in `src/locales/en.json`.

- [ ] **Step 1: Apply the following 12 modal title corrections**

| Key path | Old value | New value |
|---|---|---|
| `techCrystals.ownedModalTitle` | `"TECH CRYSTALS OWNED"` | `"Tech Crystals Owned"` |
| `techCrystals.ownedModalTitleWithSubject` | `"TECH CRYSTALS OWNED ({subject})"` | `"Tech Crystals Owned ({subject})"` |
| `preview.cloneModalTitle` | `"CLONE PREVIEW BUILD"` | `"Clone Preview Build"` |
| `preview.loadModalTitle` | `"PREVIEW SHAREABLE BUILD"` | `"Preview Shareable Build"` |
| `modal.loadBuild.title` | `"Preview shareable build"` | `"Preview Shareable Build"` |
| `modal.resetTree.title` | `"RESET {treeName}"` | `"Reset {treeName}"` |
| `modal.resetTree.titleQuestion` | `"RESET {treeName}?"` | `"Reset {treeName}?"` |
| `modal.resetTree.titleAllQuestion` | `"RESET ALL TREES?"` | `"Reset All Trees?"` |
| `modal.resetTree.titleDefault` | `"RESET TREE"` | `"Reset Tree"` |
| `modal.resetTree.titleDefaultQuestion` | `"RESET TREE?"` | `"Reset Tree?"` |
| `modal.resetSettings.title` | `"RESET SETTINGS"` | `"Reset Settings"` |
| `modal.clearAllData.title` | `"CLEAR ALL DATA"` | `"Clear All Data"` |

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: 0 errors.

---

### Task 12: Fix inconsistent setting/button labels in `en.json`

- [ ] **Step 1: Apply the following 5 casing corrections to `src/locales/en.json`**

| Key path | Old value | New value | Rule applied |
|---|---|---|---|
| `settings.textSize` | `"Font Size"` | `"Font size"` | Sentence case (setting label) |
| `settings.treeZoom` | `"Tree Zoom"` | `"Tree zoom"` | Sentence case (setting label) |
| `settings.nodeLevelBehavior` | `"Node Level Behavior"` | `"Node level behavior"` | Sentence case (setting label) |
| `modal.resetTree.buttonLabelAll` | `"Reset all trees"` | `"Reset All Trees"` | Title Case (button) |
| `modal.resetTree.buttonLabelDefault` | `"Reset tree"` | `"Reset Tree"` | Title Case (button) |

- [ ] **Step 2: Run check**

```bash
npm run check
```

Expected: 0 errors.

---

### Task 13: Final verification and commit

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Commit**

```bash
git add src/locales/en.json
git commit -m "i18n: normalize locale casing — Title Case for modal titles, Sentence case for setting labels"
```
