# Capture Screenshot Regression Fix — Design Spec

**Date:** 2026-03-11
**Branch:** cursor/tree-origin-and-capture-3ee8
**Approach:** Option A — Targeted race fix + view-state save/restore (live DOM, no clone)

---

## Problem Summary

Four regression bugs were introduced when the screenshot capture system was simplified
from the main-branch clone-based approach to a live-DOM approach:

1. **Zoom-in → capture cropped** — capture happens at user's zoomed-in transform; some nodes outside the viewport are clipped.
2. **Zoom-out → capture low quality** — capture happens at user's zoomed-out scale; nodes are rendered small.
3. **Pan → tree not centered** — capture happens with the user's panned offset; center is off.
4. **Open compose modal → tree position resets** — `focusActiveTreeForCapture` modifies the live tree's view state with no restoration.

### Root Cause

All four bugs share a single root cause: **a race condition in `captureLiveTreeBlob`**.

```
CURRENT ORDER (buggy):
  setActive(tab) + tick()
  → focusActiveTreeForCapture()   ← called while Tree.onMount.initializeView is still async-pending
  → waitForStableTreeCanvas()     ← by here, initializeView has FINISHED and overridden our focus
  → capture at user's view state  ← wrong
```

`Tree.onMount` schedules `initializeView()` which has its own `await tick()` inside. When
`focusActiveTreeForCapture` is called immediately after `setActive + tick`, `initializeView`
is still in-flight. It finishes after our focus call and overrides the focus-fit transform with
the user's saved view state (`initialViewState = lastViewState`). The canvas then stabilizes
at the wrong state, and capture uses that state.

Additionally, the `finally` block in `captureThreeTreeBlobs` calls `focusActiveTreeForCapture`
again after restoring the original tab, and never restores the user's pre-capture view state.

---

## Fix 1 — Reorder: waitForStableTreeCanvas before focusActiveTreeForCapture

**File:** `src/lib/buildImageExport/captureService.ts`

Change `captureLiveTreeBlob` to:

```
setActive(tab) + tick()
→ waitForStableTreeCanvas()     ← waits up to 24 frames for initializeView to settle
→ focusActiveTreeForCapture()   ← runs AFTER initializeView, guaranteed to win
→ capture
```

`waitForStableTreeCanvas` loops until the tree-canvas DOM signature (transform + node/link
counts) is unchanged for 2 consecutive frames. This guarantees `initializeView` has completed
before we apply the focus-fit transform.

**Fixes bugs:** 1 (zoom-in crop), 2 (zoom-out quality), 3 (pan miscentered).

---

## Fix 2 — View-State Save/Restore

**Files:** `src/lib/Tree.svelte`, `src/lib/buildImageExport/treeBridge.ts`,
`src/lib/TreeTabs.svelte`, `src/lib/buildImageExport/captureService.ts`

### 2a. `Tree.svelte` — add `restoreViewState()`

```ts
export function restoreViewState(view: TreeViewState | null) {
    if (!view) return;
    setViewState(view);
    allowReactiveFocus = false;  // prevent reactive paths from re-triggering focus
}
```

Also expose `restoreViewState` on the treeRef interface in `TreeTabs.svelte`.

**Note on `handleResize`:** The `window.resize` handler in Tree.svelte calls `focusTreeInView()`
unconditionally (does not check `allowReactiveFocus`). As part of this fix, `handleResize`
must be updated to guard on `allowReactiveFocus` — otherwise a window resize after
`restoreViewState` would override the restored user view state. Updated guard:

```ts
const handleResize = () => {
    if (viewportEl) {
        const rect = viewportEl.getBoundingClientRect();
        viewportSize = { width: rect.width, height: rect.height };
    }
    if (allowReactiveFocus) focusTreeInView();  // only refocus when reactive mode is active
};
```

This is consistent with all other reactive-focus call sites in Tree.svelte.

### 2b. `treeBridge.ts` — extend `TreeBridge` type

```ts
export type TreeBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null | undefined;
    focusActiveTreeInView?: () => void;
    getViewState?: () => TreeViewState | null;
    restoreAfterCapture?: (index: number, viewState: TreeViewState) => void;
};
```

Import `TreeViewState` from `Tree.svelte` in treeBridge.ts.

### 2c. `TreeTabs.svelte` — implement `restoreAfterCapture`

```ts
function restoreAfterCapture(index: number, viewState: TreeViewState) {
    if (index === activeIndex) {
        // Tree is already mounted — directly restore view state
        treeRef?.restoreViewState?.(viewState);
        return;
    }
    // Set lastViewState BEFORE switching so Tree remounts with the correct initialViewState.
    // Do NOT call setActive() here — that would overwrite lastViewState first.
    lastViewState = viewState;
    activeIndex = clampIndex(index);
    if (!isInitialRestore) {
        const tab = tabs[activeIndex];
        if (tab) activeTabId.set(tab.id);
    }
}
```

Add to `bridgeAction`:
```ts
const bridge = {
    setActive,
    getActive: () => activeIndex,
    getTreeCanvas: () => treeRef?.getTreeCanvas?.(),
    focusActiveTreeInView: () => treeRef?.focusTreeInView?.(false),
    getViewState: () => treeRef?.getViewState?.() ?? null,
    restoreAfterCapture,
};
```

### 2d. `captureService.ts` — save/restore in `captureThreeTreeBlobs`

```ts
async function captureThreeTreeBlobs(bridge: TreeBridge): Promise<ThreeTreeBlobs> {
    const currentIndex = bridge.getActive();
    const savedViewState = bridge.getViewState?.() ?? null;
    try {
        const results: (Blob | null)[] = [];
        for (let i = 0; i < NUM_TREES; i += 1) {
            results.push(await captureLiveTreeBlob(bridge, i));
        }
        return [results[0] ?? null, results[1] ?? null, results[2] ?? null];
    } finally {
        if (savedViewState && bridge.restoreAfterCapture) {
            // Full restore: tab + view state both recovered
            bridge.restoreAfterCapture(currentIndex, savedViewState);
        } else {
            // Degraded fallback: restore tab only, view state may be at capture-focus position.
            // This path is taken when: (a) bridge.getViewState not yet registered at capture
            // start (tree unmounted), or (b) bridge.restoreAfterCapture missing (stale bridge).
            // In practice the bridge is always registered when ComposeScreenshot opens,
            // so this is an accepted silent-fail for edge cases during startup/teardown.
            bridge.setActive(currentIndex);
        }
        await tick();
        // Note: focusActiveTreeForCapture is intentionally NOT called here.
        // Calling it would override the just-restored user view state (secondary reset bug).
    }
}
```

**Fixes bug:** 4 (compose modal resets tree position).

**Degraded fallback note:** If `savedViewState` is null (tree unmounted when capture triggered)
or `bridge.restoreAfterCapture` is absent (stale bridge registration), the finally block
falls back to `bridge.setActive(currentIndex)` which restores the active tab but leaves
view state at whatever focus-fit state capture last applied. This is acceptable because:
- The bridge is always registered when the compose button is visible (bridge is registered
  in `bridgeAction` which is a Svelte `use:` directive on the tabs content div)
- A null `savedViewState` at start of capture means no user-set view to restore anyway

---

## Fix 3 — Remove focusActiveTreeForCapture from finally

The `finally` block previously called `focusActiveTreeForCapture(bridge)` after restoring the
original tab. This caused a secondary reset. With save/restore in place, this call is removed.

---

## Tests

### New unit tests (static source analysis)

| File | Verifies |
|------|----------|
| `test/captureServiceOrderGuard.test.ts` | `waitForStableTreeCanvas` appears before `focusActiveTreeForCapture` in `captureLiveTreeBlob` source order |
| `test/captureServiceViewStateRestore.test.ts` | `bridge.getViewState?.()` saved before loop; `bridge.restoreAfterCapture?.()` in finally; no `focusActiveTreeForCapture` in finally block |
| `test/captureServiceBridgeInterface.test.ts` | `treeBridge.ts` exports `getViewState` and `restoreAfterCapture` on `TreeBridge` type |
| `test/treeBridgeRestoreAfterCapture.test.ts` | `TreeTabs.svelte` `bridgeAction` includes `restoreAfterCapture` and `getViewState` |

### Updated unit tests

| File | Change |
|------|--------|
| `test/captureServiceRenderStability.test.ts` | Remove the existing `focusActiveTreeForCapture` symbol-presence check (now owned by `captureServiceOrderGuard.test.ts`). Keep all other existing checks. No new assertions here — avoids duplication with `captureServiceOrderGuard`. |

### New browser tests (Playwright)

**File:** `test/captureScreenshot.ui.test.ts`
**Runs via:** `npm run test:ui:capture` (new script using `npm run preview`)

| Scenario | Assert |
|----------|--------|
| Default zoom → open compose | Compose opens, image shown (no error) |
| Zoom in → open compose | After close, tree returns to zoomed-in state |
| Zoom out → open compose | After close, tree returns to zoomed-out state |
| Pan tree → open compose | After close, tree returns to panned state |
| Level nodes → open compose | Capture succeeds (non-null blob visible) |
| showSkillName=false → compose | Capture succeeds |
| showTier=true → compose | Capture succeeds |
| textSize change → compose | Capture succeeds |
| Switch tabs then compose | All 3 tree images non-null (no loading error) |

---

## Files Changed

| File | Type |
|------|------|
| `src/lib/buildImageExport/captureService.ts` | Fix (reorder + save/restore) |
| `src/lib/buildImageExport/treeBridge.ts` | Extend `TreeBridge` type |
| `src/lib/Tree.svelte` | Add `restoreViewState` export; guard `handleResize` on `allowReactiveFocus` |
| `src/lib/TreeTabs.svelte` | Extend treeRef type; add `restoreAfterCapture`; update bridge |
| `test/captureServiceOrderGuard.test.ts` | New — owns order + presence checks for wait/focus |
| `test/captureServiceViewStateRestore.test.ts` | New — save/restore pattern in finally |
| `test/captureServiceBridgeInterface.test.ts` | New — TreeBridge type has `getViewState` + `restoreAfterCapture` |
| `test/treeBridgeRestoreAfterCapture.test.ts` | New — bridgeAction in TreeTabs includes both methods |
| `test/captureServiceRenderStability.test.ts` | Update — remove `focusActiveTreeForCapture` presence check (moved to OrderGuard) |
| `test/captureScreenshot.ui.test.ts` | New (Playwright) |
| `package.json` | Add `test:ui:capture` script |
| `test/index.ts` | Register 4 new unit test files |

---

## Non-Goals

- No clone-based capture (tests enforce live-DOM approach, user confirmed)
- No changes to capture quality at viewport-fit scale (inherent to live-DOM approach)
- No changes to `captureStyles.css` (working correctly)
- No changes to SVG inline stroke style approach in `Tree.svelte` (working correctly)
