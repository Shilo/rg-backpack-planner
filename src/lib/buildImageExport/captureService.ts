import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";
import { treeBridge, type TreeBridge, SNAPDOM_CAPTURE_CLASS } from "./treeBridge";
import { getOSNameKey } from "../systemUtil";
import "./captureStyles.css";

let captureInProgressCount = 0;

function incrementCapture() {
    captureInProgressCount++;
}

function decrementCapture() {
    captureInProgressCount--;
}

const NUM_TREES = 3;
const CAPTURE_READY_MAX_FRAMES = 24;
const CAPTURE_STABLE_FRAME_COUNT = 2;
const COMBINED_TREE_SPACING_PX = 32;
const CROP_PADDING_PX = 1; // 1px preserves anti-aliased edge pixels that pixel-scan misses

// Synthetic background injected before iOS capture so that regions which should be
// transparent get a unique, recognisable color instead of iOS Safari's false white.
// #FF00FE (near-magenta) is not used anywhere in the tree UI.
const IOS_CHROMA_R = 255;
const IOS_CHROMA_G = 0;
const IOS_CHROMA_B = 254;
const IOS_CHROMA_TOLERANCE = 10;
const IOS_CHROMA_CSS = `rgb(${IOS_CHROMA_R},${IOS_CHROMA_G},${IOS_CHROMA_B})`;
// Any semi-transparent pixel adjacent to a cleared region is treated as fringe.
const SAFARI_FRINGE_MAX_ALPHA = 220;

const SNAPDOM_OPTS = {
    type: "png" as const,
    // Per snapdom docs, backgroundColor is a fallback only for JPG/WebP (which lack alpha).
    // For PNG it has no effect. On iOS Safari, a white background appears regardless due to
    // a browser rendering bug during SVG foreignObject rasterization.
    backgroundColor: "#ffffff",
    cache: "disabled" as const,
    outerTransforms: false,
    exclude: [
        ".tree-context-menu",
        ".tooltip",
        ".context-menu",
        "[role='tooltip']",
        ".modal",
        ".overlay",
    ],
};

function waitForAnimationFrame(): Promise<void> {
    if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
    ) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

async function waitForPaintFrames(count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
        await waitForAnimationFrame();
    }
}

function getTreeCanvasSignature(element: HTMLElement): string {
    const rect = element.getBoundingClientRect();
    // Include tree-root opacity to detect in-progress Svelte in:fade transitions, which
    // operate via inline style.opacity and are not suppressed by animation: none !important.
    const treeRoot = element.closest(".tree-root") as HTMLElement | null;
    const opacity = treeRoot ? getComputedStyle(treeRoot).opacity : "1";
    return [
        element.style.transform,
        Math.round(rect.width),
        Math.round(rect.height),
        element.querySelectorAll(".node-wrapper").length,
        element.querySelectorAll(".tree-link").length,
        opacity,
    ].join("|");
}

async function waitForStableTreeCanvas(
    bridge: TreeBridge,
    tabIndex: number,
): Promise<HTMLElement | null> {
    let stableFrames = 0;
    let previousSignature = "";

    for (let frame = 0; frame < CAPTURE_READY_MAX_FRAMES; frame += 1) {
        await tick();
        await waitForAnimationFrame();

        const element = bridge.getTreeCanvas();
        const isReady =
            !!element &&
            element.isConnected &&
            bridge.getActive() === tabIndex &&
            !!element.querySelector(".button.node");
        if (!isReady || !element) {
            stableFrames = 0;
            previousSignature = "";
            continue;
        }

        const signature = getTreeCanvasSignature(element);
        if (signature === previousSignature) {
            stableFrames += 1;
        } else {
            previousSignature = signature;
            stableFrames = 1;
        }

        if (stableFrames >= CAPTURE_STABLE_FRAME_COUNT) {
            return element;
        }
    }

    // Best-effort fallback: frame budget exhausted without achieving stability.
    // Return the canvas anyway so capture can still produce something rather than
    // failing silently. In practice this path is only hit on very slow devices or
    // during rapid tab switches; the resulting image may be slightly misaligned.
    const fallback = bridge.getTreeCanvas();
    return fallback && fallback.isConnected ? fallback : null;
}

async function focusActiveTreeForCapture(bridge: TreeBridge) {
    bridge.focusActiveTreeInView?.();
    await tick();
    await waitForPaintFrames(2);
}

// TODO: Remove this when iOS bug is fixed
function isIOSCaptureBugLikely(): boolean {
    return true || getOSNameKey() === "ios";
}

// Temporarily injects a stylesheet that suppresses box-shadow and text-shadow on
// the root and all descendants, then removes it after fn resolves. Used when
// outerShadows is false so shadow pixels don't bleed outside the capture bbox and
// confuse the edge flood-fill in stripSafariWhiteBackgroundFromCanvas.
const NO_SHADOW_CLASS = "snapdom-no-shadow";
async function withShadowsSuppressed<T>(
    root: HTMLElement,
    fn: () => Promise<T>,
): Promise<T> {
    const style = document.createElement("style");
    style.textContent =
        `.${NO_SHADOW_CLASS},.${NO_SHADOW_CLASS} *{box-shadow:none!important;text-shadow:none!important}` +
        `.${NO_SHADOW_CLASS}{background-color:${IOS_CHROMA_CSS}!important}`;
    document.head.appendChild(style);
    root.classList.add(NO_SHADOW_CLASS);
    try {
        return await fn();
    } finally {
        root.classList.remove(NO_SHADOW_CLASS);
        style.remove();
    }
}

async function canvasToBlob(
    canvas: HTMLCanvasElement,
    type = "image/png",
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob ?? null), type);
    });
}

// iOS Safari renders SVG foreignObject content with a white background when drawn
// to a canvas via drawImage(). This is a long-standing WebKit rendering bug where
// the browser fills the foreignObject region with white instead of preserving
// transparency. Setting snapdom's backgroundColor to "transparent" does not help
// because the white is injected by Safari during SVG rasterization, after snapdom
// has already set up the SVG.
//
// withShadowsSuppressed injects IOS_CHROMA_CSS as the captureRoot background before
// the snapdom call, so transparent areas get filled with the chroma key color instead
// of iOS Safari's white. This function then replaces all chroma key pixels with
// transparency and removes semi-transparent fringe pixels at content edges.
// Operates directly on the canvas before PNG encoding to avoid extra round-trips.
function stripSafariWhiteBackgroundFromCanvas(
    canvas: HTMLCanvasElement,
): HTMLCanvasElement {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return canvas;

    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return canvas;

    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const pixelCount = width * height;

    const makeTransparent = (idx: number) => {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
    };

    // Pass 1: Replace all chroma key pixels with transparent.
    // Works for both edge-connected and interior background regions,
    // fixing the limitation of the prior edge flood-fill approach.
    for (let p = 0; p < pixelCount; p++) {
        const idx = p * 4;
        if (data[idx + 3] === 0) continue;
        if (
            data[idx] >= IOS_CHROMA_R - IOS_CHROMA_TOLERANCE &&
            data[idx + 1] <= IOS_CHROMA_G + IOS_CHROMA_TOLERANCE &&
            data[idx + 2] >= IOS_CHROMA_B - IOS_CHROMA_TOLERANCE
        ) {
            makeTransparent(idx);
        }
    }

    // Pass 2+: Remove fringe pixels adjacent to cleared regions.
    // Anti-aliasing blends node edge pixels with the chroma key background, producing
    // two types of fringe:
    //   a) semi-transparent pixels (alpha ≤ SAFARI_FRINGE_MAX_ALPHA)
    //   b) fully-opaque pixels whose color was blended with the chroma key, detectable
    //      via min(R,B) - G > threshold (the "magenta amount" metric). The chroma key
    //      has no green, so any contamination selectively suppresses G relative to R and B.
    //      This metric is reliable across all UI colors because all legitimate content
    //      colors have negative min(R,B)-G scores: red/copper (B≪G → -20), blue (R≪G → -30),
    //      gold (G≫B → -100), teal (R≪G → -35), dark inactive (R≈G → 0). Threshold=5
    //      safely catches ~10% chroma key blend without false-positives on any of these.
    // Run 5 passes to peel multi-pixel fringes on high-dpr captures.
    const CHROMA_CONTAMINATION_THRESHOLD = 5;
    const snapshot = new Uint8ClampedArray(data);

    const alphaAtSnapshot = (p: number) => snapshot[p * 4 + 3];
    // Out-of-bounds neighbors are treated as transparent: canvas edge pixels are
    // always adjacent to "nothing" and must be checked for fringe contamination.
    const touchesTransparent = (x: number, y: number) => {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return true;
        return (
            alphaAtSnapshot(y * width + (x - 1)) === 0 ||
            alphaAtSnapshot(y * width + (x + 1)) === 0 ||
            alphaAtSnapshot((y - 1) * width + x) === 0 ||
            alphaAtSnapshot((y + 1) * width + x) === 0
        );
    };

    for (let pass = 0; pass < 5; pass += 1) {
        if (pass > 0) snapshot.set(data);
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const p = y * width + x;
                const idx = p * 4;

                if (snapshot[idx + 3] === 0) continue;
                if (!touchesTransparent(x, y)) continue;

                const alpha = snapshot[idx + 3];
                const r = snapshot[idx];
                const g = snapshot[idx + 1];
                const b = snapshot[idx + 2];

                const isSemiTransparent = alpha <= SAFARI_FRINGE_MAX_ALPHA;
                const isChromaContaminated =
                    Math.min(r, b) - g > CHROMA_CONTAMINATION_THRESHOLD;

                if (isSemiTransparent || isChromaContaminated) {
                    makeTransparent(idx);
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

async function captureLiveTreeBlob(
    bridge: TreeBridge,
    tabIndex: number,
): Promise<Blob | null> {
    if (bridge.getActive() !== tabIndex) {
        bridge.setActive(tabIndex);
        await tick();
    }

    // Wait for tree to fully settle (including Tree.onMount.initializeView) BEFORE
    // calling focusActiveTreeForCapture. Without this order, initializeView — which has
    // its own async tick — can finish after focusActiveTreeForCapture and override the
    // focus-fit transform with the user's saved view state, causing zoom/pan/quality bugs.
    const treeCanvas = await waitForStableTreeCanvas(bridge, tabIndex);
    if (!treeCanvas) {
        return null;
    }

    await focusActiveTreeForCapture(bridge);

    const captureRoot =
        treeCanvas.parentElement instanceof HTMLElement
            ? treeCanvas.parentElement
            : treeCanvas;

    try {
        // Disable outerShadows on iOS: shadows expand the capture bbox and introduce
        // semi-transparent fringe pixels that the edge flood-fill can't cleanly remove,
        // leaving halos.
        const renderShadows = !isIOSCaptureBugLikely();
        const options = { ...SNAPDOM_OPTS, outerShadows: renderShadows };

        const doCapture = () => snapdom(captureRoot, options);
        const result = await (!renderShadows
            ? withShadowsSuppressed(captureRoot, doCapture)
            : doCapture());
        const canvas = await result.toCanvas();
        if (!canvas) {
            return null;
        }

        if (isIOSCaptureBugLikely()) {
            stripSafariWhiteBackgroundFromCanvas(canvas);
        }

        const blob = await canvasToBlob(canvas, "image/png");
        if (!blob) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                clearCanvasAndImages(ctx, canvas);
            }
            return null;
        }

        const finalBlob = await cropBlobToContent(blob);

        const ctx = canvas.getContext("2d");
        if (ctx) {
            clearCanvasAndImages(ctx, canvas);
        }

        return finalBlob;
    } catch (error) {
        console.error("Failed to capture tree image:", error);
        return null;
    }
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image from blob"));
        };
        image.src = url;
    });
}

function getImageIntrinsicSize(image: HTMLImageElement) {
    return {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
    };
}

function getImageContentBounds(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            if (data[i + 3] > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}

async function cropBlobToContent(blob: Blob): Promise<Blob | null> {
    const image = await blobToImage(blob);
    const { width: imageWidth, height: imageHeight } = getImageIntrinsicSize(
        image,
    );
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
        return blob;
    }

    ctx.drawImage(image, 0, 0);
    const contentBounds = getImageContentBounds(ctx, imageWidth, imageHeight);
    image.src = "";

    if (!contentBounds) {
        return blob;
    }

    const paddedX = Math.max(0, contentBounds.x - CROP_PADDING_PX);
    const paddedY = Math.max(0, contentBounds.y - CROP_PADDING_PX);
    const paddedRight = Math.min(
        imageWidth,
        contentBounds.x + contentBounds.width + CROP_PADDING_PX,
    );
    const paddedBottom = Math.min(
        imageHeight,
        contentBounds.y + contentBounds.height + CROP_PADDING_PX,
    );
    const paddedWidth = Math.max(1, paddedRight - paddedX);
    const paddedHeight = Math.max(1, paddedBottom - paddedY);

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = paddedWidth;
    croppedCanvas.height = paddedHeight;
    const croppedCtx = croppedCanvas.getContext("2d", { alpha: true });
    if (!croppedCtx) {
        return blob;
    }

    croppedCtx.drawImage(
        canvas,
        paddedX,
        paddedY,
        paddedWidth,
        paddedHeight,
        0,
        0,
        paddedWidth,
        paddedHeight,
    );

    return new Promise((resolve) => {
        croppedCanvas.toBlob((result) => resolve(result ?? blob), "image/png");
    });
}

function clearCanvasAndImages(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ...images: (HTMLImageElement | null)[]
) {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    } catch (_) {
        // no-op
    }
    for (const image of images) {
        try {
            if (image) {
                image.src = "";
            }
        } catch (_) {
            // no-op
        }
    }
}

async function combineTreeImagesHorizontally(
    tree1Blob: Blob,
    tree2Blob: Blob,
    tree3Blob: Blob,
): Promise<Blob | null> {
    try {
        const [img1, img2, img3] = await Promise.all([
            blobToImage(tree1Blob),
            blobToImage(tree2Blob),
            blobToImage(tree3Blob),
        ]);
        const size1 = getImageIntrinsicSize(img1);
        const size2 = getImageIntrinsicSize(img2);
        const size3 = getImageIntrinsicSize(img3);
        const maxHeight = Math.max(size1.height, size2.height, size3.height);
        const totalWidth =
            size1.width +
            size2.width +
            size3.width +
            COMBINED_TREE_SPACING_PX * 2;
        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
            return null;
        }

        let x = 0;
        ctx.drawImage(
            img1,
            x,
            (maxHeight - size1.height) / 2,
            size1.width,
            size1.height,
        );
        x += size1.width + COMBINED_TREE_SPACING_PX;
        ctx.drawImage(
            img2,
            x,
            (maxHeight - size2.height) / 2,
            size2.width,
            size2.height,
        );
        x += size2.width + COMBINED_TREE_SPACING_PX;
        ctx.drawImage(
            img3,
            x,
            (maxHeight - size3.height) / 2,
            size3.width,
            size3.height,
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                clearCanvasAndImages(ctx, canvas, img1, img2, img3);
                resolve(blob ?? null);
            }, "image/png");
        });
    } catch (error) {
        console.error("Failed to combine tree images:", error);
        return null;
    }
}

async function withCaptureState<T>(callback: () => Promise<T>): Promise<T> {
    const rootEl =
        typeof document !== "undefined" ? document.documentElement : null;
    const isFirstCall = captureInProgressCount === 0;
    incrementCapture();
    if (isFirstCall) {
        rootEl?.classList.add(SNAPDOM_CAPTURE_CLASS);
    }
    try {
        return await callback();
    } finally {
        decrementCapture();
        if (captureInProgressCount === 0) {
            rootEl?.classList.remove(SNAPDOM_CAPTURE_CLASS);
        }
    }
}

type ThreeTreeBlobs = [Blob | null, Blob | null, Blob | null];

async function captureThreeTreeBlobs(
    bridge: TreeBridge,
): Promise<ThreeTreeBlobs> {
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
            // Full restore: original tab + user's view state both recovered.
            bridge.restoreAfterCapture(currentIndex, savedViewState);
        } else {
            // Degraded fallback: restore tab only. Taken when bridge.getViewState was
            // not yet registered at capture start (tree unmounted) or bridge is stale.
            bridge.setActive(currentIndex);
        }
        await tick();
        // focusActiveTreeForCapture is intentionally NOT called here — calling it would
        // override the just-restored user view state (secondary modal-reset bug).
    }
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const bridge = treeBridge;
    if (!bridge) return null;

    return withCaptureState(async () => {
        const [b0, b1, b2] = await captureThreeTreeBlobs(bridge);
        if (!b0 || !b1 || !b2) return null;
        return combineTreeImagesHorizontally(b0, b1, b2);
    });
}

export type CaptureAllResult = {
    combined: Blob | null;
    trees: ThreeTreeBlobs;
};

export async function captureAllTreeImages(): Promise<CaptureAllResult | null> {
    const bridge = treeBridge;
    if (!bridge) return null;

    return withCaptureState(async () => {
        const trees = await captureThreeTreeBlobs(bridge);
        const [b0, b1, b2] = trees;
        const combined =
            b0 && b1 && b2
                ? await combineTreeImagesHorizontally(b0, b1, b2)
                : null;
        return { combined, trees };
    });
}
