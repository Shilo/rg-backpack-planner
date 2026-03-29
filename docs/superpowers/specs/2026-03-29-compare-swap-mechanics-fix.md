# Compare Swap Mechanics Fix

## Problem

`swapBuilds()` in `compareStore.ts` calls `applyBuildData()` without first calling `setActivePresetId()`. In personal mode, the persistence subscription in `App.svelte` fires on every `treeLevels` change and calls `updateActivePresetBuildCode()` — which saves to whichever preset is currently marked active. Since the active preset ID was never updated before applying the other build's data, that other build's data silently overwrites the wrong preset's `buildCode` in localStorage. This is data corruption.

Additionally, swapping to a preview/recommended build calls `applyBuildData()` directly instead of using the navigation path (`navigateToEncodedBuild`), so `isPreviewMode` is never set and the URL hash is never updated — meaning "on page refresh" restores the wrong state.

## Solution

### Core principle

Swap must mirror the same switching mechanism used by normal build switching:
- **Preset switch**: `setActivePresetId(id)` + `applyBuildData(trees, decoded)` — same as `BuildPresetsButton.switchToPreset`
- **Preview switch**: `navigateToEncodedBuild(encoded)` — same as `PreviewBuildsDropdown.handlePremadeClick`
- **Preview → Preset switch**: `setActivePresetId(id)` + `navigateToPersonalMode()` — clears URL, dispatches hashchange, `App.svelte` re-initializes in personal mode

### Source tracking

Each `CompareBuild` must carry its source so `swapBuilds` knows which mechanism to use:

```ts
export type CompareBuildSource =
    | { type: "preset"; id: string }
    | { type: "preview"; encoded: string };

export interface CompareBuild {
    data: BuildData;       // snapshot for frozen-side stats computation
    label: string;
    source: CompareBuildSource;
}
```

`startCompare` auto-detects the current active build's source:
- If `isPreviewMode` → `{ type: "preview", encoded: getEncodedFromUrl() }`
- Else → `{ type: "preset", id: getActivePresetId() }`

`decodeAndStartCompare` gains a `source: CompareBuildSource` parameter for the reference build. All callers must pass this.

### New shared exports (to prevent future regressions)

**`switchActivePreset(id, trees)` — added to `buildPresetsStore.ts`**

Reads the preset's current `buildCode` from the store, calls `setActivePresetId(id)`, then `applyBuildData(trees, decoded)`. Returns `false` if the preset or its decoded data cannot be found. No side effects (no toasts, undo clear, menu close — caller owns those).

All existing `setActivePresetId + applyBuildData` pairs in `BuildPresetsButton.svelte` must be replaced with calls to this function. This ensures the pattern can only diverge in one place.

**`navigateToPersonalMode()` — added to `buildData/url.ts`**

Clears the URL hash via `pushState` and dispatches a synthetic `hashchange` event — the same mechanism `navigateToEncodedBuild` uses. `App.svelte`'s `handleHashchange` fires, calling `initializeFromUrl`, which detects no hash, exits preview mode, and loads the currently active preset from localStorage. Caller must call `setActivePresetId` before this if a specific preset should be loaded.

### Updated `swapBuilds` logic

```
1. Snapshot current live treeLevels/techCrystals → store in departing side's .data
2. Flip activeSide in compareState
3. Switch to target build by source type:
   - preset (current mode is personal)  → switchActivePreset(source.id, trees)
   - preview                             → navigateToEncodedBuild(source.encoded)
   - preset (current mode is preview)   → setActivePresetId(source.id)
                                           + navigateToPersonalMode()
```

The snapshot (step 1) is taken before the switch because it captures any live edits the user made to the active build during comparison. This snapshot is what the frozen side's stats will display after the swap.

For the preview-involved cases (`navigateToEncodedBuild` and `navigateToPersonalMode`), `initializeFromUrl` is async. During the brief gap before it completes, `activeSide` is already updated but `treeLevels`/`techCrystals` still hold the old data. The compare stats will reflect the updated side assignments but old live values until the stores settle. This is acceptable — the same flicker occurs during any normal preview mode transition.

"On page refresh" invariant: preset swaps persist via localStorage (active preset ID); preview swaps persist via URL hash. Both work automatically with no extra persistence logic.

### `BuildPresetsButton.svelte` refactors

Replace the inline `setActivePresetId + applyBuildData` blocks in:
- `switchToPreset` — replace core lines with `switchActivePreset(presetId, tabs)`
- `handleDelete` (wasActive branch) — replace core lines with `switchActivePreset(first.id, tabs)`
- `handleAddBuild` (both skipPrompt and modal onConfirm paths) — replace with `switchActivePreset(preset.id, tabs)`

### Caller updates for `decodeAndStartCompare`

| Caller | Source to pass |
|---|---|
| `CompareBuildsMenu` — personal preset | `{ type: "preset", id: preset.id }` |
| `CompareBuildsMenu` — recommended/custom code | `{ type: "preview", encoded }` |
| `BuildPresetsButton` — preset context menu compare | `{ type: "preset", id: presetId }` |
| `PreviewBuildsDropdown` — recommended compare | `{ type: "preview", encoded }` |

## Files Modified

- `src/lib/buildPresetsStore.ts` — add `switchActivePreset`
- `src/lib/buildData/url.ts` — add `navigateToPersonalMode`
- `src/lib/compare/compareStore.ts` — `CompareBuildSource` type, `source` on `CompareBuild`, update `startCompare`/`decodeAndStartCompare`, rewrite `swapBuilds`
- `src/lib/buttons/BuildPresetsButton.svelte` — use `switchActivePreset` in 4 places, pass source to `decodeAndStartCompare`
- `src/lib/compare/CompareBuildsMenu.svelte` — pass source to `decodeAndStartCompare`
- `src/lib/buttons/PreviewBuildsDropdown.svelte` — pass source to `decodeAndStartCompare`

## Files Not Modified

`App.svelte` (its `setupOnboardingPreview` bypasses the preset system intentionally), `PreviewContextMenuList.svelte` and `CloneBuildButton.svelte` (their page-reload paths are intentional for clean re-initialization).
