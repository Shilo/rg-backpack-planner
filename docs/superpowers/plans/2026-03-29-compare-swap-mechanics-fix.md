# Compare Swap Mechanics Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `swapBuilds()` so that swapping builds never corrupts preset data and page refresh restores the correct state, by adding source tracking to `CompareBuild` and using the same switching mechanisms as `BuildPresetsButton` and `PreviewBuildsDropdown`.

**Architecture:** Add `CompareBuildSource` (`preset` | `preview`) to `CompareBuild`. Extract `switchActivePreset` into `applier.ts` (not `buildPresetsStore.ts` — circular dep via `techCrystalStore`). Add `navigateToPersonalMode()` to `url.ts` (mirrors `navigateToEncodedBuild` pattern). `swapBuilds` dispatches to `switchActivePreset`, `navigateToEncodedBuild`, or `setActivePresetId + navigateToPersonalMode` per source type. All existing callers of `setActivePresetId + applyBuildData` in `BuildPresetsButton` are unified to `switchActivePreset`.

**Tech Stack:** Svelte 5, TypeScript, Svelte writable stores, browser History API, Node.js + tsx test runner (`npx tsx`)

---

## File Map

| File | Change |
|---|---|
| `src/lib/buildData/applier.ts` | Add `switchActivePreset` export |
| `src/lib/buildData/url.ts` | Add `navigateToPersonalMode` export |
| `src/lib/compare/compareStore.ts` | Add `CompareBuildSource` type + `source` on `CompareBuild`; update `startCompare`, `decodeAndStartCompare`; rewrite `swapBuilds` |
| `src/lib/buttons/BuildPresetsButton.svelte` | Replace 4× `setActivePresetId + applyBuildData` with `switchActivePreset`; pass source to `decodeAndStartCompare` |
| `src/lib/compare/CompareBuildsMenu.svelte` | Pass source to `decodeAndStartCompare` |
| `src/lib/buttons/PreviewBuildsDropdown.svelte` | Pass source to `decodeAndStartCompare` |
| `test/buildDataApplier.test.ts` | Add `switchActivePreset` behavior tests |

---

### Task 1: Add `switchActivePreset` to `applier.ts`

**Why `applier.ts` not `buildPresetsStore.ts`:** `buildPresetsStore` → `applier` → `techCrystalStore` → `buildPresetsStore` is a circular dep. `applier` can safely import from `buildPresetsStore` (no cycle).

**Files:**
- Modify: `src/lib/buildData/applier.ts`
- Test: `test/buildDataApplier.test.ts`

- [ ] **Step 1: Write failing tests in `test/buildDataApplier.test.ts`**

Append at the bottom of `test/buildDataApplier.test.ts`:

```ts
// --- switchActivePreset tests ---
import { addPreset, getActivePresetId } from "../src/lib/buildPresetsStore.ts";
import { switchActivePreset } from "../src/lib/buildData/applier.ts";
import { encodeBuildData } from "../src/lib/buildData/encoder.ts";
import { ensureTreeLevels } from "../src/lib/treeLevelsStore.ts";

{
    ensureTreeLevels(trees); // initialize treeLevels shape for applyBuildData

    const code = encodeBuildData({ trees: [[], []], owned: 42 });
    const preset = addPreset("Swap Test", code);

    assertEqual(
        switchActivePreset(preset.id, trees),
        true,
        "switchActivePreset: returns true for valid preset",
    );
    assertEqual(
        getActivePresetId(),
        preset.id,
        "switchActivePreset: updates active preset ID",
    );
    assertEqual(
        switchActivePreset("no-such-id", trees),
        false,
        "switchActivePreset: returns false for unknown preset",
    );
    console.log("✅ switchActivePreset tests passed");
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx tsx test/buildDataApplier.test.ts
```

Expected: Error — `switchActivePreset` is not exported from `applier.ts`.

- [ ] **Step 3: Add imports to `src/lib/buildData/applier.ts`**

At the top of `applier.ts`, add two new imports alongside existing ones:

```ts
import { getPresets, setActivePresetId } from "../buildPresetsStore";
import { decodeBuildData } from "./encoder";
```

(`BuildData` type and `Node` type are already imported; `applyBuildData` is already defined in this file.)

- [ ] **Step 4: Add `switchActivePreset` to `src/lib/buildData/applier.ts`**

Add after the `applyBuildData` function:

```ts
/**
 * Switches the active preset and applies its stored build data to the tree stores.
 * Use this instead of calling setActivePresetId + applyBuildData separately —
 * it guarantees the active ID is set before stores are mutated, preventing the
 * persistence subscription from saving data to the wrong preset.
 * Returns false if the preset ID is not found or its build data cannot be decoded.
 */
export function switchActivePreset(
    id: string,
    trees: { nodes: Node[] }[],
): boolean {
    const preset = getPresets().find((p) => p.id === id);
    if (!preset) return false;
    const buildData = decodeBuildData(preset.buildCode);
    if (!buildData) return false;
    setActivePresetId(id);
    return applyBuildData(trees, buildData);
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx tsx test/buildDataApplier.test.ts
```

Expected: all tests pass including the new `switchActivePreset` block.

- [ ] **Step 6: Run full type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/buildData/applier.ts test/buildDataApplier.test.ts
git commit -m "feat(applier): extract switchActivePreset shared helper"
```

---

### Task 2: Add `navigateToPersonalMode` to `url.ts`

**Files:**
- Modify: `src/lib/buildData/url.ts`

- [ ] **Step 1: Add `navigateToPersonalMode` to `src/lib/buildData/url.ts`**

Add immediately after `navigateToEncodedBuild` (no new imports needed — `getBasePath` is already in scope):

```ts
/**
 * Navigates to the personal (no-hash) URL and dispatches a synthetic hashchange event.
 * App.svelte's initializeFromUrl fires, detects no hash, exits preview mode, and loads
 * the currently active preset from localStorage.
 * Call setActivePresetId() before this if you want a specific preset to be loaded.
 */
export function navigateToPersonalMode(): void {
    if (typeof window === "undefined") return;
    const oldURL = window.location.href;
    const basePath = getBasePath();
    window.history.pushState({}, "", basePath);
    window.dispatchEvent(
        new HashChangeEvent("hashchange", {
            oldURL,
            newURL: window.location.origin + basePath,
        }),
    );
}
```

- [ ] **Step 2: Run full type check**

```bash
npm run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/buildData/url.ts
git commit -m "feat(url): add navigateToPersonalMode helper"
```

---

### Task 3: Rewrite `compareStore.ts` — source tracking + `swapBuilds`

**Files:**
- Modify: `src/lib/compare/compareStore.ts`

- [ ] **Step 1: Replace `src/lib/compare/compareStore.ts` entirely**

```ts
import { writable, get } from "svelte/store";
import {
    encodeBuildData,
    decodeBuildData,
    type BuildData,
} from "../buildData/encoder";
import type { Node } from "../../types/tree";
import { treeLevels } from "../treeLevelsStore";
import { techCrystalsOwned } from "../techCrystalStore";
import { switchActivePreset } from "../buildData/applier";
import {
    activeBuildName,
    getActivePresetId,
    setActivePresetId,
} from "../buildPresetsStore";
import { isPreviewMode } from "../previewModeStore";
import {
    getEncodedFromUrl,
    navigateToEncodedBuild,
    navigateToPersonalMode,
} from "../buildData/url";
import { setActiveTab } from "../sideMenuActiveTabStore";
import { requestOpenSideMenu } from "../sideMenuOpenStore";

export type CompareBuildSource =
    | { type: "preset"; id: string }
    | { type: "preview"; encoded: string };

export interface CompareBuild {
    data: BuildData;
    label: string;
    source: CompareBuildSource;
}

export interface CompareState {
    isComparing: boolean;
    /** Left segment — the build that was active when comparison started */
    buildA: CompareBuild | null;
    /** Right segment — the build chosen to compare against */
    buildB: CompareBuild | null;
    /** Which segment is currently the live/editable build */
    activeSide: "a" | "b";
}

const initialState: CompareState = {
    isComparing: false,
    buildA: null,
    buildB: null,
    activeSide: "a",
};

export const compareState = writable<CompareState>(initialState);

function startCompare(
    buildData: BuildData,
    name: string,
    source: CompareBuildSource,
): void {
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const currentLabel = get(activeBuildName);

    const currentSource: CompareBuildSource = get(isPreviewMode)
        ? {
              type: "preview",
              encoded:
                  getEncodedFromUrl() ??
                  encodeBuildData({ trees: currentLevels, owned: currentOwned }),
          }
        : { type: "preset", id: getActivePresetId() };

    compareState.set({
        isComparing: true,
        buildA: {
            data: {
                trees: currentLevels.map((t) => [...t]),
                owned: currentOwned,
            },
            label: currentLabel,
            source: currentSource,
        },
        buildB: {
            data: {
                trees: buildData.trees.map((t) => [...t]),
                owned: buildData.owned,
            },
            label: name,
            source,
        },
        activeSide: "a",
    });

    setActiveTab("statistics");
    requestOpenSideMenu();
}

export function stopCompare(): void {
    compareState.set(initialState);
}

export function swapBuilds(trees: { nodes: Node[] }[]): void {
    const state = get(compareState);
    if (!state.isComparing || !state.buildA || !state.buildB) return;

    // Snapshot current live build into the departing side before switching
    const currentLevels = get(treeLevels);
    const currentOwned = get(techCrystalsOwned);
    const snapshot: BuildData = {
        trees: currentLevels.map((t) => [...t]),
        owned: currentOwned,
    };

    const newActiveSide = state.activeSide === "a" ? "b" : "a";

    const updatedBuildA =
        state.activeSide === "a"
            ? { ...state.buildA, data: snapshot }
            : state.buildA;
    const updatedBuildB =
        state.activeSide === "b"
            ? { ...state.buildB, data: snapshot }
            : state.buildB;

    compareState.set({
        isComparing: true,
        buildA: updatedBuildA,
        buildB: updatedBuildB,
        activeSide: newActiveSide,
    });

    const targetSource =
        newActiveSide === "a" ? state.buildA.source : state.buildB.source;

    if (targetSource.type === "preview") {
        // Any → Preview: triggers hashchange → initializeFromUrl enters preview mode
        navigateToEncodedBuild(targetSource.encoded);
    } else if (get(isPreviewMode)) {
        // Preview → Preset: set active preset ID first so initializeFromUrl loads it,
        // then clear the URL hash and dispatch hashchange to exit preview mode
        setActivePresetId(targetSource.id);
        navigateToPersonalMode();
    } else {
        // Personal → Preset: direct switch, no navigation needed
        switchActivePreset(targetSource.id, trees);
    }
}

/**
 * Decodes a build code and starts comparison. Returns true on success.
 */
export function decodeAndStartCompare(
    buildCode: string,
    name: string,
    source: CompareBuildSource,
): boolean {
    const buildData = decodeBuildData(buildCode);
    if (!buildData) return false;
    startCompare(buildData, name, source);
    return true;
}
```

- [ ] **Step 2: Run full type check**

```bash
npm run check
```

Expected: TypeScript errors in `BuildPresetsButton.svelte`, `CompareBuildsMenu.svelte`, and `PreviewBuildsDropdown.svelte` because `decodeAndStartCompare` now requires a third argument. That's expected — fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compare/compareStore.ts
git commit -m "feat(compare): add source tracking and rewrite swapBuilds"
```

---

### Task 4: Update `BuildPresetsButton.svelte`

**Files:**
- Modify: `src/lib/buttons/BuildPresetsButton.svelte`

- [ ] **Step 1: Update imports — remove `setActivePresetId` and `applyBuildData`, add `switchActivePreset`**

Find the import block for `buildPresetsStore`. Remove `setActivePresetId` from it:

```ts
// BEFORE:
import {
    setActivePresetId,
    updatePreset,
    deletePreset,
    addPreset,
    getUniquePresetName,
    activePresetName,
    movePresetUp,
    movePresetDown,
} from "../buildPresetsStore";

// AFTER:
import {
    updatePreset,
    deletePreset,
    addPreset,
    getUniquePresetName,
    activePresetName,
    movePresetUp,
    movePresetDown,
} from "../buildPresetsStore";
```

Replace the `applyBuildData` import line:

```ts
// BEFORE:
import { applyBuildData } from "../buildData/applier";

// AFTER:
import { switchActivePreset } from "../buildData/applier";
```

(`decodeBuildData` stays — it's still used for `editPresetBuildData`.)

- [ ] **Step 2: Rewrite `switchToPreset`**

```ts
// BEFORE:
function switchToPreset(presetId: string) {
    stopCompare();
    const data = get(buildPresetsStore);
    const preset = data.presets.find((p) => p.id === presetId);
    if (!preset) return;
    const buildData = decodeBuildData(preset.buildCode);
    if (!buildData) return;
    setActivePresetId(presetId);
    applyBuildData(tabs, buildData);
    undoHistory.clearHistory(0);
    showToast(
        $t("buildPresets.viewingPresetToast", {
            name: truncateText(getDisplayPresetName(preset.name)),
        }),
    );
    closePresetsMenu();
}

// AFTER:
function switchToPreset(presetId: string) {
    stopCompare();
    const preset = get(buildPresetsStore).presets.find(
        (p) => p.id === presetId,
    );
    if (!switchActivePreset(presetId, tabs)) return;
    undoHistory.clearHistory(0);
    showToast(
        $t("buildPresets.viewingPresetToast", {
            name: truncateText(getDisplayPresetName(preset?.name ?? presetId)),
        }),
    );
    closePresetsMenu();
}
```

- [ ] **Step 3: Rewrite `handleDelete` wasActive branch**

```ts
// BEFORE (inside onConfirm):
} else if (wasActive) {
    stopCompare();
    const first = remaining[0];
    setActivePresetId(first.id);
    const buildData = decodeBuildData(first.buildCode);
    if (buildData) applyBuildData(tabs, buildData);
    undoHistory.clearHistory(0);
    closeEditMenu();
}

// AFTER:
} else if (wasActive) {
    stopCompare();
    const first = remaining[0];
    switchActivePreset(first.id, tabs);
    undoHistory.clearHistory(0);
    closeEditMenu();
}
```

- [ ] **Step 4: Rewrite `handleAddBuild` skipPrompt path**

```ts
// BEFORE:
if (skipPrompt) {
    const preset = addPreset("Default", buildCode);
    setActivePresetId(preset.id);
    applyBuildData(tabs, { trees: emptyTrees, owned: emptyOwned });
    closePresetsMenu();
}

// AFTER:
if (skipPrompt) {
    const preset = addPreset("Default", buildCode);
    switchActivePreset(preset.id, tabs);
    closePresetsMenu();
}
```

- [ ] **Step 5: Rewrite `handleAddBuild` modal onConfirm path**

```ts
// BEFORE (inside onConfirm):
const preset = addPreset(name, buildCode);
setActivePresetId(preset.id);
applyBuildData(tabs, {
    trees: emptyTrees,
    owned: emptyOwned,
});
closePresetsMenu();

// AFTER:
const preset = addPreset(name, buildCode);
switchActivePreset(preset.id, tabs);
closePresetsMenu();
```

- [ ] **Step 6: Update `handleCompareWithActive` to pass source**

```ts
// BEFORE:
function handleCompareWithActive(presetId: string) {
    const data = get(buildPresetsStore);
    const preset = data.presets.find((p) => p.id === presetId);
    if (!preset) return;
    decodeAndStartCompare(
        preset.buildCode,
        getDisplayPresetName(preset.name),
    );
    closeEditMenu();
    closePresetsMenu();
}

// AFTER:
function handleCompareWithActive(presetId: string) {
    const data = get(buildPresetsStore);
    const preset = data.presets.find((p) => p.id === presetId);
    if (!preset) return;
    decodeAndStartCompare(
        preset.buildCode,
        getDisplayPresetName(preset.name),
        { type: "preset", id: presetId },
    );
    closeEditMenu();
    closePresetsMenu();
}
```

- [ ] **Step 7: Run full type check**

```bash
npm run check
```

Expected: errors only in `CompareBuildsMenu.svelte` and `PreviewBuildsDropdown.svelte` (not yet updated).

- [ ] **Step 8: Commit**

```bash
git add src/lib/buttons/BuildPresetsButton.svelte
git commit -m "refactor(presets): use switchActivePreset in BuildPresetsButton"
```

---

### Task 5: Update `CompareBuildsMenu.svelte`

**Files:**
- Modify: `src/lib/compare/CompareBuildsMenu.svelte`

- [ ] **Step 1: Add `CompareBuildSource` import**

In the `<script>` block, add to the `compareStore` import line:

```ts
// BEFORE:
import { decodeAndStartCompare } from "./compareStore";

// AFTER:
import { decodeAndStartCompare, type CompareBuildSource } from "./compareStore";
```

- [ ] **Step 2: Update `handleBuildClick` to accept a source parameter**

```ts
// BEFORE:
function handleBuildClick(buildCode: string, name: string) {
    if (!decodeAndStartCompare(buildCode, name)) {
        showToast($t("preview.invalidBuildDataToast"), {
            tone: "negative",
        });
        return;
    }
    onClose?.();
}

// AFTER:
function handleBuildClick(
    buildCode: string,
    name: string,
    source: CompareBuildSource,
) {
    if (!decodeAndStartCompare(buildCode, name, source)) {
        showToast($t("preview.invalidBuildDataToast"), {
            tone: "negative",
        });
        return;
    }
    onClose?.();
}
```

- [ ] **Step 3: Update preset button click handlers in the template**

```svelte
<!-- BEFORE: -->
{#each presets as preset}
    <Button
        on:click={() => handleBuildClick(preset.buildCode, preset.name)}
    >
        {truncateText(preset.name)}
    </Button>
{/each}

<!-- AFTER: -->
{#each presets as preset}
    <Button
        on:click={() =>
            handleBuildClick(preset.buildCode, preset.name, {
                type: "preset",
                id: preset.id,
            })}
    >
        {truncateText(preset.name)}
    </Button>
{/each}
```

- [ ] **Step 4: Update premade builds button click handlers in the template**

(`build.code` is the raw encoded string from `recommendedBuilds` — correct format for `navigateToEncodedBuild`.)

```svelte
<!-- BEFORE: -->
{#each premadeBuilds as build}
    <Button
        ...
        on:click={() => handleBuildClick(build.code, build.name)}
    >

<!-- AFTER: -->
{#each premadeBuilds as build}
    <Button
        ...
        on:click={() =>
            handleBuildClick(build.code, build.name, {
                type: "preview",
                encoded: build.code,
            })}
    >
```

- [ ] **Step 5: Update `handleLoadFromCode` onConfirm to pass source**

```ts
// BEFORE (inside onConfirm):
if (!decodeAndStartCompare(encoded, "Build")) {
    showToast(tr("preview.invalidBuildDataToast"), {
        tone: "negative",
    });
}

// AFTER:
if (
    !decodeAndStartCompare(encoded, "Build", {
        type: "preview",
        encoded,
    })
) {
    showToast(tr("preview.invalidBuildDataToast"), {
        tone: "negative",
    });
}
```

- [ ] **Step 6: Run full type check**

```bash
npm run check
```

Expected: error only in `PreviewBuildsDropdown.svelte`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/compare/CompareBuildsMenu.svelte
git commit -m "refactor(compare): pass source to decodeAndStartCompare in CompareBuildsMenu"
```

---

### Task 6: Update `PreviewBuildsDropdown.svelte`

**Files:**
- Modify: `src/lib/buttons/PreviewBuildsDropdown.svelte`

- [ ] **Step 1: Add `CompareBuildSource` import**

```ts
// BEFORE:
import { decodeAndStartCompare } from "../compare/compareStore";

// AFTER:
import {
    decodeAndStartCompare,
    type CompareBuildSource,
} from "../compare/compareStore";
```

- [ ] **Step 2: Update `handleCompareRecommended` to pass source**

```ts
// BEFORE:
function handleCompareRecommended(buildCode: string, name: string) {
    if (!decodeAndStartCompare(buildCode, name)) {
        showToast($t("preview.invalidBuildDataToast"), { tone: "negative" });
        return;
    }
    onClose?.();
}

// AFTER:
function handleCompareRecommended(buildCode: string, name: string) {
    const source: CompareBuildSource = { type: "preview", encoded: buildCode };
    if (!decodeAndStartCompare(buildCode, name, source)) {
        showToast($t("preview.invalidBuildDataToast"), { tone: "negative" });
        return;
    }
    onClose?.();
}
```

- [ ] **Step 3: Run full type check — expect zero errors**

```bash
npm run check
```

Expected: **zero** TypeScript/Svelte errors across the entire project.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buttons/PreviewBuildsDropdown.svelte
git commit -m "refactor(preview): pass source to decodeAndStartCompare in PreviewBuildsDropdown"
```

---

### Task 7: Manual verification

Run `npm run dev` and verify each scenario. These tests cannot be automated because they involve live store subscriptions, URL history, and localStorage state.

- [ ] **Scenario 1 — Preset vs Preset, no swap (regression check)**
  1. Save two presets (A with some nodes leveled, B with different nodes)
  2. With A active, open compare → select B from personal presets
  3. Verify compare table shows two columns with correct data for A and B
  4. Edit A's tree nodes while comparing — verify B column stays unchanged
  5. Open DevTools → Application → localStorage: confirm A's `build-presets` buildCode updates on edits, B's is unchanged

- [ ] **Scenario 2 — Preset vs Preset, swap**
  1. With A active, compare against preset B
  2. Click B's segment in the toggle to swap
  3. Verify: tree UI now shows B's build; compare table shows B as active (pencil icon on B), A frozen
  4. DevTools localStorage: `build-presets.active` is now B's ID; A's buildCode is unchanged
  5. Refresh the page → should load preset B (not A); no compare mode on load

- [ ] **Scenario 3 — Preset vs Preview, swap to preview**
  1. With preset A active, open compare → select a recommended build (preview source)
  2. Compare table shown. Click the recommended build segment to swap
  3. Verify: preview mode entered (PreviewBuildIndicator visible, URL hash updated to recommended build token)
  4. Refresh → URL hash persists → recommended build loads in preview mode (not preset A)
  5. DevTools localStorage: preset A's buildCode is unchanged

- [ ] **Scenario 4 — Preview vs Preset, swap to preset**
  1. Load a recommended build (enter preview mode)
  2. From the preview context menu → Compare With → select a personal preset
  3. Click the preset segment in the compare toggle to swap
  4. Verify: personal mode entered (URL hash cleared, preset loaded, no PreviewBuildIndicator)
  5. Refresh → no URL hash → preset loads in personal mode

- [ ] **Scenario 5 — Stop compare**
  1. In any compare mode, click the X (stop) button
  2. Verify compare UI disappears, single-column stats table returns
  3. Active build/mode remains unchanged (no surprise state changes)

- [ ] **Final check + test after manual verification**

```bash
npm run check && npm test
```

Expected: zero errors, all tests pass.
