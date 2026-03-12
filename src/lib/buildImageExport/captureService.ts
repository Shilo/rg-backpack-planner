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

const SAFARI_WHITE_THRESHOLD = 245;
const SAFARI_MIN_ALPHA = 8;
const SAFARI_FRINGE_THRESHOLD = 235;
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
    style.textContent = `.${NO_SHADOW_CLASS},.${NO_SHADOW_CLASS} *{box-shadow:none!important;text-shadow:none!important}`;
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
// This function fixes that by operating on the canvas BEFORE PNG encoding:
// 1) flood-fill edge-connected white/near-white pixels to transparent
// 2) remove a thin near-white fringe touching transparency, which Safari often leaves
//
// This keeps cropBlobToContent() working correctly and avoids blob->image->canvas
// round-trips that can introduce extra halo pixels.
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

    const isNearWhite = (idx: number, threshold: number) =>
        data[idx] >= threshold &&
        data[idx + 1] >= threshold &&
        data[idx + 2] >= threshold;

    const makeTransparent = (idx: number) => {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
    };

    const stack = new Int32Array(pixelCount);
    let stackPtr = 0;

    const tryPush = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;

        const p = y * width + x;
        const idx = p * 4;
        const alpha = data[idx + 3];

        // alpha 0 means either originally transparent or already cleared/visited
        if (alpha === 0 || alpha < SAFARI_MIN_ALPHA) return;
        if (!isNearWhite(idx, SAFARI_WHITE_THRESHOLD)) return;

        makeTransparent(idx);
        stack[stackPtr++] = p;
    };

    for (let x = 0; x < width; x += 1) {
        tryPush(x, 0);
        tryPush(x, height - 1);
    }
    for (let y = 1; y < height - 1; y += 1) {
        tryPush(0, y);
        tryPush(width - 1, y);
    }

    while (stackPtr > 0) {
        const p = stack[--stackPtr];
        const x = p % width;
        const y = (p / width) | 0;

        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
    }

    const snapshot = new Uint8ClampedArray(data);

    const alphaAtSnapshot = (p: number) => snapshot[p * 4 + 3];
    const touchesTransparent = (x: number, y: number) => {
        const left = y * width + (x - 1);
        const right = y * width + (x + 1);
        const up = (y - 1) * width + x;
        const down = (y + 1) * width + x;
        return (
            alphaAtSnapshot(left) === 0 ||
            alphaAtSnapshot(right) === 0 ||
            alphaAtSnapshot(up) === 0 ||
            alphaAtSnapshot(down) === 0
        );
    };

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const p = y * width + x;
            const idx = p * 4;

            const alpha = snapshot[idx + 3];
            if (alpha === 0 || alpha > SAFARI_FRINGE_MAX_ALPHA) continue;

            if (
                snapshot[idx] < SAFARI_FRINGE_THRESHOLD ||
                snapshot[idx + 1] < SAFARI_FRINGE_THRESHOLD ||
                snapshot[idx + 2] < SAFARI_FRINGE_THRESHOLD
            ) {
                continue;
            }

            if (touchesTransparent(x, y)) {
                data[idx + 3] = 0;
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
