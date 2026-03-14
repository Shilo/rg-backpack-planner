# Consistent Capture Resolution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize compose screenshot output resolution across all devices and orientations using dynamic snapdom scale/dpr computation.

**Architecture:** Add configurable `EXPORT_DPR`, `EXPORT_TARGET_LONG_EDGE_PX`, and `EXPORT_MAX_SCALE` to `imageFormat.ts`. Expose tree world bounds via the bridge. Compute a per-capture snapdom `scale` that compensates for viewport size differences, so cropped output consistently hits ~1200px on the long edge.

**Tech Stack:** Svelte 5, TypeScript, @zumer/snapdom v2.1.0

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/buildImageExport/imageFormat.ts` | Modify | Add `EXPORT_DPR`, `EXPORT_TARGET_LONG_EDGE_PX`, `EXPORT_MAX_SCALE` |
| `src/lib/buildImageExport/treeBridge.ts` | Modify | Add `getWorldBoundsForCapture` to `TreeBridge` type |
| `src/lib/Tree.svelte` | Modify | Export `getWorldBoundsForCapture()` function |
| `src/lib/TreeTabs.svelte` | Modify | Wire `getWorldBoundsForCapture` in bridge |
| `src/lib/buildImageExport/captureService.ts` | Modify | Add `computeCaptureScale()`, pass dynamic opts to snapdom |
| `test/captureServiceRenderStability.test.ts` | Modify | Update regex to match new snapdom call pattern |
| `test/captureServiceBridgeInterface.test.ts` | Modify | Assert `getWorldBoundsForCapture` on bridge type |
| `test/imageFormatExports.test.ts` | Create | Assert new constants are exported |

---

## Chunk 1: Configuration and Bridge

### Task 1: Add export constants to imageFormat.ts

**Files:**
- Modify: `src/lib/buildImageExport/imageFormat.ts`
- Create: `test/imageFormatExports.test.ts`

- [ ] **Step 1: Write test for new exports**

Create `test/imageFormatExports.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve("src/lib/buildImageExport/imageFormat.ts"),
    "utf8",
);

if (!/export const EXPORT_DPR\s*[=:]/.test(source)) {
    throw new Error("imageFormat.ts should export EXPORT_DPR.");
}

if (!/export const EXPORT_TARGET_LONG_EDGE_PX\s*[=:]/.test(source)) {
    throw new Error(
        "imageFormat.ts should export EXPORT_TARGET_LONG_EDGE_PX.",
    );
}

if (!/export const EXPORT_MAX_SCALE\s*[=:]/.test(source)) {
    throw new Error("imageFormat.ts should export EXPORT_MAX_SCALE.");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/imageFormatExports.test.ts`
Expected: FAIL — "imageFormat.ts should export EXPORT_DPR."

- [ ] **Step 3: Add constants to imageFormat.ts**

Add after the existing `EXPORT_EXT` line in `src/lib/buildImageExport/imageFormat.ts`:

```ts
/**
 * Fixed device pixel ratio for capture output.
 * Overrides window.devicePixelRatio so output is consistent across devices.
 */
export const EXPORT_DPR = 2;

/**
 * Target resolution: longest edge of a single cropped tree image, in physical pixels.
 */
export const EXPORT_TARGET_LONG_EDGE_PX = 1200;

/**
 * Upper cap on computed snapdom scale to prevent canvas size limit failures
 * on very small viewports.
 */
export const EXPORT_MAX_SCALE = 4;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx test/imageFormatExports.test.ts`
Expected: PASS (no output)

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildImageExport/imageFormat.ts test/imageFormatExports.test.ts
git commit -m "feat: add EXPORT_DPR, EXPORT_TARGET_LONG_EDGE_PX, EXPORT_MAX_SCALE to imageFormat"
```

---

### Task 2: Add getWorldBoundsForCapture to TreeBridge type

**Files:**
- Modify: `src/lib/buildImageExport/treeBridge.ts:5-12`
- Modify: `test/captureServiceBridgeInterface.test.ts`

- [ ] **Step 1: Write test for new bridge method**

Add to the end of `test/captureServiceBridgeInterface.test.ts` (before final newline):

```ts
if (!/getWorldBoundsForCapture\?/.test(source)) {
    throw new Error(
        "TreeBridge type should declare optional getWorldBoundsForCapture method for capture-time bounds.",
    );
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx test/captureServiceBridgeInterface.test.ts`
Expected: FAIL — "TreeBridge type should declare optional getWorldBoundsForCapture method"

- [ ] **Step 3: Add method to TreeBridge type**

In `src/lib/buildImageExport/treeBridge.ts`, add after `restoreAfterCapture?` (line 11):

```ts
    getWorldBoundsForCapture?: () => { width: number; height: number } | null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx test/captureServiceBridgeInterface.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildImageExport/treeBridge.ts test/captureServiceBridgeInterface.test.ts
git commit -m "feat: add getWorldBoundsForCapture to TreeBridge type"
```

---

### Task 3: Export getWorldBoundsForCapture from Tree.svelte

**Files:**
- Modify: `src/lib/Tree.svelte:1234-1242`

- [ ] **Step 1: Add export function**

In `src/lib/Tree.svelte`, add after `focusTreeInViewForCapture()` (after line 1242):

```ts
    export function getWorldBoundsForCapture(): { width: number; height: number } | null {
        return getWorldBounds(1);
    }
```

This uses badge scale 1 because `captureStyles.css` forces `--node-badge-scale: 1` during capture.

- [ ] **Step 2: Verify type check passes**

Run: `npm run check`
Expected: PASS — the function signature matches the bridge type.

- [ ] **Step 3: Commit**

```bash
git add src/lib/Tree.svelte
git commit -m "feat: export getWorldBoundsForCapture from Tree"
```

---

### Task 4: Wire getWorldBoundsForCapture in TreeTabs bridge

**Files:**
- Modify: `src/lib/TreeTabs.svelte:71-81` (treeRef type)
- Modify: `src/lib/TreeTabs.svelte:498-512` (bridge wiring)

- [ ] **Step 1: Add method to treeRef type**

In `src/lib/TreeTabs.svelte`, in the `treeRef` type declaration (line 71-81), add after `restoreViewState?` (line 80):

```ts
        getWorldBoundsForCapture?: () => { width: number; height: number } | null;
```

- [ ] **Step 2: Add bridge method**

In `src/lib/TreeTabs.svelte`, in the `bridgeAction` function's bridge object (after `restoreAfterCapture,` on line 508), add:

```ts
            getWorldBoundsForCapture: () =>
                treeRef?.getWorldBoundsForCapture?.() ?? null,
```

- [ ] **Step 3: Verify type check passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/TreeTabs.svelte
git commit -m "feat: wire getWorldBoundsForCapture in tree bridge"
```

---

## Chunk 2: Capture Scale Computation

### Task 5: Add computeCaptureScale and update captureLiveTreeBlob

**Files:**
- Modify: `src/lib/buildImageExport/captureService.ts:1-6` (imports)
- Modify: `src/lib/buildImageExport/captureService.ts:141-201` (captureLiveTreeBlob)
- Modify: `test/captureServiceRenderStability.test.ts:26`

- [ ] **Step 1: Update test to match new snapdom call pattern**

In `test/captureServiceRenderStability.test.ts`, the assertion on line 26 checks for `snapdom.toBlob( captureRoot , SNAPDOM_OPTS )`. After our change, the call will use a merged options object. Replace line 26:

```ts
// Old:
if (!/await snapdom\.toBlob\(\s*captureRoot\s*,\s*SNAPDOM_OPTS\s*\)/.test(normalized)) {
// New:
if (!/await snapdom\.toBlob\(\s*captureRoot\s*,/.test(normalized)) {
```

Update the error message to match:

```ts
    throw new Error(
        "captureService should capture the live tree viewport/canvas directly with snapdom.toBlob.",
    );
```

- [ ] **Step 2: Run test to verify it still passes with current code**

Run: `npx tsx test/captureServiceRenderStability.test.ts`
Expected: PASS (the relaxed regex still matches the current code)

- [ ] **Step 3: Add imports to captureService.ts**

In `src/lib/buildImageExport/captureService.ts`, update the import on line 5:

```ts
import { EXPORT_FORMAT, EXPORT_MIME, EXPORT_DPR, EXPORT_TARGET_LONG_EDGE_PX, EXPORT_MAX_SCALE } from "./imageFormat";
```

Add import for `getTreeViewportPadding` after line 6:

```ts
import { getTreeViewportPadding } from "../treeLayout";
```

- [ ] **Step 4: Add computeCaptureScale function**

Add after the `SNAPDOM_OPTS` const (after line 44):

```ts
function computeCaptureScale(
    captureRoot: HTMLElement,
    contentBounds: { width: number; height: number },
): number {
    const rect = captureRoot.getBoundingClientRect();
    const padding = getTreeViewportPadding();
    const availableW = Math.max(rect.width - padding.horizontal * 2, 1);
    const availableH = Math.max(rect.height - padding.top - padding.bottom, 1);
    const fitScale = Math.min(
        availableW / contentBounds.width,
        availableH / contentBounds.height,
    );
    const renderedLongEdge =
        Math.max(contentBounds.width, contentBounds.height) * fitScale;
    const scale = EXPORT_TARGET_LONG_EDGE_PX / (renderedLongEdge * EXPORT_DPR);
    return Math.min(Math.max(scale, 1), EXPORT_MAX_SCALE);
}

function buildCaptureOpts(
    bridge: TreeBridge,
    captureRoot: HTMLElement,
) {
    const bounds = bridge.getWorldBoundsForCapture?.();
    const scale = bounds
        ? computeCaptureScale(captureRoot, bounds)
        : 1;
    return { ...SNAPDOM_OPTS, scale, dpr: EXPORT_DPR };
}
```

- [ ] **Step 5: Update captureLiveTreeBlob to use dynamic options**

In `src/lib/buildImageExport/captureService.ts`, in `captureLiveTreeBlob`, replace the try block (lines 166-200):

```ts
    const captureOpts = buildCaptureOpts(bridge, captureRoot);

    try {
        if (!isIOSCaptureBug()) {
            const blob = await snapdom.toBlob(captureRoot, captureOpts);
            return await cropBlobToContent(blob);
        }

        const { canvas, bg } = await captureWithIOSBackground(
            captureRoot,
            () => snapdom(captureRoot, captureOpts),
        );
        if (!canvas) {
            return null;
        }

        const blob = await canvasToBlob(canvas, EXPORT_MIME);
        if (!blob) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                clearCanvasAndImages(ctx, canvas);
            }
            return null;
        }

        const finalBlob = await cropBlobToContent(blob, bg.rgb);

        const ctx = canvas.getContext("2d");
        if (ctx) {
            clearCanvasAndImages(ctx, canvas);
        }

        return finalBlob;
    } catch (error) {
        console.error("Failed to capture tree image:", error);
        return null;
    }
```

- [ ] **Step 6: Verify type check passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 7: Run all capture tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/buildImageExport/captureService.ts test/captureServiceRenderStability.test.ts
git commit -m "feat: dynamic snapdom scale/dpr for consistent capture resolution"
```

---

## Chunk 3: Verification

### Task 6: Run full test suite

- [ ] **Step 1: Run npm test**

Run: `npm test`
Expected: All tests pass. If any source-reading tests fail due to changed patterns, update the regex to match the new code structure.

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: No errors.
