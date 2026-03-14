# Image Export Pipeline — Format, Quality, and Discord Behavior

## Export Format: PNG

The compose pipeline uses PNG (`image/png`) for all image encoding. This is configured in a single file:

```
src/lib/buildImageExport/imageFormat.ts
  EXPORT_FORMAT = "png"
  EXPORT_MIME   = "image/png"
  EXPORT_EXT    = ".png"
```

### Why PNG, Not WebP

The browser's `canvas.toBlob()` API treats PNG and WebP fundamentally differently:

- **PNG**: The quality parameter is **ignored**. Output is **always lossless**. There is no way to produce a lossy PNG through the Canvas API.
- **WebP**: The quality parameter **controls lossy vs lossless**. The browser default (no quality arg) is **0.80 — lossy**. snapdom's internal default is **0.92 — also lossy**. Only `quality: 1.0` produces lossless WebP.

The compose pipeline has 8 separate `canvas.toBlob()` calls across capture, crop, label overlay, and combination stages. None pass a quality parameter. With PNG this is safe — every call is lossless. Switching to WebP without adding `quality: 1.0` to every call (including snapdom's options) would silently introduce lossy compression at each encoding stage.

### Lossless Verification

Every encoding point in the pipeline:

| Location | Purpose | Format | Quality arg | Lossless? |
|---|---|---|---|---|
| `captureService.ts:168` | snapdom tree capture | EXPORT_FORMAT | none (snapdom default 0.92 ignored for PNG) | Yes |
| `captureService.ts:136` | `canvasToBlob()` helper | EXPORT_MIME | none | Yes |
| `captureService.ts:180` | iOS fallback capture | EXPORT_MIME | none | Yes |
| `captureService.ts:328` | Crop to content bounds | EXPORT_MIME | none | Yes |
| `captureService.ts:496` | Tree label overlay | via `canvasToBlob()` | none | Yes |
| `captureService.ts:532` | Build title label | via `canvasToBlob()` | none | Yes |
| `captureService.ts:598` | Combine 3 trees horizontally | EXPORT_MIME | none | Yes |
| `statsImageRenderer.ts:252` | Stats card render | EXPORT_MIME | none | Yes |

### If WebP Is Ever Reconsidered

To switch to lossless WebP, **all** of the following would need to change:

1. Set `EXPORT_FORMAT = "webp"` in `imageFormat.ts`
2. Add `quality: 1` to `SNAPDOM_OPTS` in `captureService.ts`
3. Add `quality: 1` as the third argument to every `canvas.toBlob()` call — the `canvasToBlob()` helper, `cropBlobToContent()`, `combineTreeImagesHorizontally()`, and `statsImageRenderer.ts`
4. Verify `share.ts:121` which hardcodes `"image/png"` in `ClipboardItem` for clipboard copy (should use `EXPORT_MIME`)

Lossless WebP produces files ~26-30% smaller than PNG with identical pixel output. The tradeoff is complexity: every encoding call must explicitly opt into lossless mode, and a single missed `quality: 1` silently degrades output.

---

## Discord Image Handling

### Two-Domain Architecture

Discord serves images from two separate systems:

- **`cdn.discordapp.com`** — Stores the **original uploaded file** as-is. No re-encoding. A lossless PNG uploaded as a file attachment stays lossless on the CDN.
- **`media.discordapp.net`** — The **media proxy**. Generates compressed, resized thumbnails for inline chat previews. This is where quality loss occurs.

The inline preview visible in chat always comes from the media proxy. Users who click "Open Original" or copy the CDN link get the pristine original.

### Media Proxy Resizing

Discord uses [Lilliput](https://github.com/discord/lilliput), their open-source Go image library, with OpenCV's `CV_INTER_AREA` (area-based interpolation) for downscaling. The proxy generates a compressed preview thumbnail regardless of the original format.

Key behaviors:
- No publicly documented size-based quality tiers
- The preview container on desktop is roughly 400-550px wide
- The preview container on mobile scales to the chat column width (~350-400px on most phones)

### Android Discord Rendering

Discord Android uses **React Native + Facebook's Fresco** image library, which introduces additional quality degradation:

1. **Power-of-2 sub-sampling**: Fresco decodes large images by sub-sampling to the nearest power of 2. A 2838px image displayed in a 350px container might decode at 1024px first, then CSS-scale to 350px — two lossy scaling steps.
2. **Client-side compression**: After Discord's React Native update, Android applies additional client-side compression to displayed images.
3. **Different pipeline from desktop**: Desktop Discord uses Chromium/Electron's image renderer, which handles downscaling more gracefully than Fresco's power-of-2 approach.

### Why Larger Images Look Worse in Android Previews

A higher-resolution original undergoes a more aggressive downscale ratio to fit the same preview container. This compounds across Discord's multi-stage pipeline:

| Stage | 2838px wide image | 1908px wide image |
|---|---|---|
| Media proxy downscale to ~380px | **7.5x** reduction | **5.0x** reduction |
| Fresco power-of-2 decode | Decodes at ~1024px (÷2.8) | Decodes at ~1024px (÷1.9) |
| CSS display scaling | 1024px → ~380px (÷2.7) | 1024px → ~380px (÷2.7) |

The 2838px image passes through more aggressive non-integer scaling at every stage. `CV_INTER_AREA` uses fractional pixel weights for non-integer ratios, producing softer edges. For tree screenshots with sharp node borders and fine text, this is particularly destructive.

---

## Resolution Normalization (Implemented)

### The Problem

Before normalization, capture resolution depended entirely on the device's viewport size and DPR. The same build produced wildly different output:

| Device | Single tree output | Combined output |
|---|---|---|
| Portrait phone (375x600, DPR 3) | ~1125x1323 | ~3375x1323 |
| Landscape phone (812x375, DPR 3) | ~954x1125 | ~2862x1125 |
| Desktop (1200x800, DPR 1) | ~530x625 | ~1590x625 |

### The Fix: Dynamic snapdom Scale

Implemented in `captureService.ts` via `computeCaptureScale()` and `buildCaptureOpts()`.

After `focusActiveTreeForCapture()` runs, the actual tree scale from `getViewState()` is used (not an approximated fitScale) to compute a dynamic snapdom `scale` that normalizes output:

```
renderedLongEdge = max(boundsW, boundsH) * treeScale
snapdomScale     = EXPORT_TARGET_LONG_EDGE_PX / (renderedLongEdge * EXPORT_DPR)
```

The scale is clamped: `min(max(scale, 1), EXPORT_MAX_SCALE)` — never downscales, caps at 4x to prevent canvas OOM.

**Three constants** in `imageFormat.ts` control the output:

| Constant | Value | Purpose |
|---|---|---|
| `EXPORT_DPR` | `2` | Fixed device pixel ratio. Overrides `window.devicePixelRatio`. |
| `EXPORT_TARGET_LONG_EDGE_PX` | `1200` | Target longest edge of a single cropped tree, in physical pixels. |
| `EXPORT_MAX_SCALE` | `4` | Upper cap to prevent canvas size limit failures. |

**Normalized output** (all devices now produce the same resolution):

| Device | Before | After |
|---|---|---|
| Portrait phone (375x600, DPR 3) | ~1125x1323 | ~1020x1200 |
| Landscape phone (812x375, DPR 3) | ~954x1125 | ~1020x1200 |
| Desktop (1200x800, DPR 1) | ~530x625 | ~1020x1200 |
| Combined (3 trees) | varies | ~3060x1200 |

### Discord Preview Quality vs Target Resolution

The current `EXPORT_TARGET_LONG_EDGE_PX = 1200` produces ~3060px combined width. On Android Discord, this requires an ~8x downscale to fit the ~380px preview container — the same range that produced visibly soft results in testing (2838px looked worse than 1908px).

| `EXPORT_TARGET_LONG_EDGE_PX` | Combined width | Android preview downscale | Discord quality |
|---|---|---|---|
| `1200` (current) | ~3060px | ~8.1x | Soft — similar to 2838px test |
| `800` | ~2040px | ~5.4x | Good balance |
| `700` | ~1785px | ~4.7x | Near the 1908px test that looked sharp |
| `500` | ~1275px | ~3.4x | Sharp preview, limited full-size detail |

Lowering to **700-800** would standardize output near the resolution that tested well on Discord, while still providing enough detail when users tap "Open Original" to view the lossless PNG from the CDN.

This is a single constant change in `imageFormat.ts`. The rest of the pipeline (crop, label, combine, share) is unaffected.

### Clipboard Copy Note

`share.ts:121` hardcodes `"image/png"` in the `ClipboardItem` for clipboard copy. This works because the export format is PNG. If the format ever changes, this needs to use `EXPORT_MIME` instead.

When pasting from clipboard into Discord (as opposed to file upload), Discord may re-encode the image. Direct file upload is the safest path for preserving the original format.
