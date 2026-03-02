# Lazy Load Screenshot Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move screenshot export off the initial bundle by splitting the capture bridge from the heavy renderer and lazy-loading the renderer on demand.

**Architecture:** Keep the shared capture bridge in a lightweight module that stays in the startup graph, move the `snapdom`-based renderer into a separate module, and load that renderer from `shareBuildAsImage()` with `import()`. This preserves current UI behavior while shifting screenshot work into a lazy chunk.

**Tech Stack:** Svelte 5, TypeScript, Vite, Vitest-style custom test runner via `tsx`

---

### Task 1: Add a lazy-load regression test

**Files:**
- Modify: `test/index.ts`
- Create: `test/shareBuild.lazy.test.ts`

**Step 1: Write the failing test**

Write a focused Node-side test that asserts the screenshot share path uses a dynamic import boundary instead of an eager top-level import.

**Step 2: Run test to verify it fails**

Run: `npx tsx test/shareBuild.lazy.test.ts`
Expected: FAIL because `shareBuildAsImage()` still statically imports the capture module.

**Step 3: Register the test in the main test runner**

Add the new test import to `test/index.ts`.

**Step 4: Re-run the focused test**

Run: `npx tsx test/shareBuild.lazy.test.ts`
Expected: still FAIL until implementation changes land.

### Task 2: Split the capture module

**Files:**
- Create: `src/lib/buildImageExport/captureBridge.ts`
- Modify: `src/lib/buildImageExport/captureService.ts`
- Modify: `src/lib/TreeTabs.svelte`

**Step 1: Move lightweight bridge state**

Move `TabsCaptureBridge`, `tabsBridge`, `captureInProgressCount`, `isCaptureInProgress()`, and `captureAction()` into `captureBridge.ts`.

**Step 2: Update the heavy capture module**

Make `captureService.ts` import bridge accessors from `captureBridge.ts` and keep only the DOM/image export implementation there.

**Step 3: Update tree UI imports**

Point `TreeTabs.svelte` at `captureBridge.ts` for `captureAction` and `isCaptureInProgress`.

### Task 3: Lazy-load screenshot export

**Files:**
- Modify: `src/lib/buildData/share.ts`

**Step 1: Remove eager heavy import**

Delete the top-level import of `captureCombinedTreesImage`.

**Step 2: Add dynamic import**

Inside `shareBuildAsImage()`, dynamically import `../buildImageExport/captureService` immediately before calling `captureCombinedTreesImage()`.

**Step 3: Keep behavior stable**

Preserve the existing in-flight guard, toasts, and clipboard behavior.

### Task 4: Verify

**Files:**
- None

**Step 1: Run focused test**

Run: `npx tsx test/shareBuild.lazy.test.ts`
Expected: PASS

**Step 2: Run full verification**

Run: `npm test`
Expected: PASS

**Step 3: Measure bundle output**

Run: `npm run build`
Expected: the main `assets/index-*.js` chunk is smaller and a new lazy-loaded chunk is emitted for screenshot export.
