# Consistent Capture Resolution via Dynamic snapdom Scale

## Problem

The compose screenshot pipeline produces different resolution images depending on device orientation and viewport size. On mobile, portrait mode yields higher resolution than landscape because the tree viewport is larger in the dimension that limits the fit scale. Desktop and mobile outputs also differ significantly.

## Solution

Use snapdom's `scale` and `dpr` options dynamically per capture to normalize output resolution, without any DOM manipulation or viewport resizing.

## Design

### Core Math

After `focusTreeInViewForCapture()` runs, the tree content fills the viewport at a computed fit scale. The cropped output dimensions are:

```
croppedLongEdge = max(boundsW, boundsH) * fitScale * snapdomScale * dpr
```

To hit a consistent target:

```
snapdomScale = TARGET / (max(boundsW, boundsH) * fitScale * dpr)
```

Where `fitScale = min(availableW / boundsW, availableH / boundsH)`, and `availableW`/`availableH` are the viewport dimensions minus padding (matching the subtraction in `computeFocusViewState`).

### File Changes

#### 1. `src/lib/buildImageExport/imageFormat.ts`

Add three configurable constants alongside existing `EXPORT_FORMAT`:

- `EXPORT_DPR: number` (default: `2`) — Fixed device pixel ratio for capture. Overrides `window.devicePixelRatio` so output is consistent across devices.
- `EXPORT_TARGET_LONG_EDGE_PX: number` (default: `1200`) — Target resolution for the longest edge of a single cropped tree image, in physical pixels.
- `EXPORT_MAX_SCALE: number` (default: `4`) — Upper cap on computed snapdom scale to prevent canvas size limit failures on very small viewports.

#### 2. `src/lib/buildImageExport/treeBridge.ts`

Add optional method to `TreeBridge`:

```ts
getWorldBoundsForCapture?: () => { width: number; height: number } | null;
```

Returns tree world bounds at badge scale 1 (capture always forces `--node-badge-scale: 1` via captureStyles.css).

#### 3. `src/lib/Tree.svelte`

Export a capture-specific bounds getter:

```ts
export function getWorldBoundsForCapture() {
    return getWorldBounds(1);
}
```

Uses badge scale 1 to match capture-time rendering.

#### 4. `src/lib/TreeTabs.svelte`

Wire the new bridge method in `bridgeAction`:

```ts
getWorldBoundsForCapture: () => treeRef?.getWorldBoundsForCapture?.() ?? null,
```

#### 5. `src/lib/buildImageExport/captureService.ts`

**New function** — `computeCaptureScale`:

```ts
function computeCaptureScale(
    captureRoot: HTMLElement,
    contentBounds: { width: number; height: number },
): number {
    const rect = captureRoot.getBoundingClientRect();
    // Subtract viewport padding to match computeFocusViewState's available space calculation.
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
    return Math.min(Math.max(scale, 1), EXPORT_MAX_SCALE); // clamp: never downscale, cap to prevent OOM
}
```

Note: `getTreeViewportPadding` is already exported from `treeLayout.ts`. This import adds no new coupling — `captureService.ts` already imports from the same module's sibling files.

**Modified** — `captureLiveTreeBlob`:

After `focusActiveTreeForCapture()`, before snapdom capture:
1. Get bounds via `bridge.getWorldBoundsForCapture()`
2. Compute dynamic scale via `computeCaptureScale(captureRoot, bounds)`
3. Build per-capture options: `{ ...SNAPDOM_OPTS, scale, dpr: EXPORT_DPR }`
4. Pass to both `snapdom.toBlob()` and the iOS capture path

**Modified** — `SNAPDOM_OPTS` becomes a base config without `scale`/`dpr`. These are merged per-capture.

**Fallback**: If `getWorldBoundsForCapture()` returns null (tree unmounted, stale bridge), fall back to `{ scale: 1, dpr: EXPORT_DPR }` — still normalizes DPR even without scale normalization.

### Expected Output

| Scenario | Before | After |
|----------|--------|-------|
| Portrait phone (375x600, DPR 3) | ~1125x1323 | ~1020x1200 |
| Landscape phone (812x375, DPR 3) | ~954x1125 | ~1020x1200 |
| Desktop (1200x800, DPR 1) | ~530x625 | ~1020x1200 |
| Combined (3 trees) | varies | ~3060x1200 |

### What Does NOT Change

- No DOM manipulation or viewport resizing
- `focusTreeInViewForCapture()` works exactly as before
- `cropBlobToContent()` pipeline unchanged
- View state save/restore unchanged
- Label overlay pipeline unchanged (operates on post-capture blobs)
- Stats image unaffected (uses its own canvas renderer)

### iOS Capture Path

Verified: `snapdom(el, opts).toCanvas()` inherits `scale`/`dpr` from the initial `snapdom()` call. The lambda passed to `captureWithIOSBackground` already calls `snapdom(captureRoot, opts)` — so passing the merged options to the lambda is sufficient. No changes needed to `captureFixIOS.ts` itself.

### Notes

- `captureStyles.css` requires no changes. Its `--node-badge-scale: 1` override is what makes `getWorldBoundsForCapture()`'s badge-scale-1 assumption correct.
- `cropBlobToContent()` requires no code changes. It will process a larger pixel buffer (e.g., 4x on desktop where DPR was 1), but the pixel-scan is well within performance budget.
- On desktop with large viewports, the computed scale may clamp at 1 (the floor), producing output slightly above the target. This is fine — the goal is normalization, not pixel-exact matching.

### Risks

- **Approximate fitScale**: The `computeCaptureScale` fitScale subtracts viewport padding but skips the iterative badge-bounds refinement in `computeFocusViewState()`. Output may be ~1-2% off from the exact target. Acceptable for this use case.
- **Scale cap on very small viewports**: `EXPORT_MAX_SCALE` (default 4) caps upscaling to prevent browser canvas size limits (~16384px) or OOM on low-end devices. Very small viewports will produce slightly below the target resolution.
