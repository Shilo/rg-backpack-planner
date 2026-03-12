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


const SNAPDOM_OPTS = {
    type: "png" as const,
    backgroundColor: "transparent",
    cache: "disabled" as const,
    outerTransforms: false,
    outerShadows: true,
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

// iOS Safari renders SVG foreignObject content with a white background due to a
// long-standing WebKit rendering bug — the browser fills transparent areas with white
// during SVG rasterization regardless of snapdom's backgroundColor option.
// Workaround: inject a fallback CSS background on captureRoot so transparent areas render
// as IOS_FALLBACK_BG rather than iOS white. The exported PNG will have this background on iOS.
// See: https://github.com/bubkoo/html-to-image/issues/361 (same bug in a similar library)
//      https://bugs.webkit.org/show_bug.cgi?id=156176 (WebKit: foreignObject taints canvas)
// Fix: https://github.com/zumerlab/snapdom/issues/172 (potential native snapdom fix)
const IOS_FALLBACK_BG = "#313338"; // Discord dark mode background
const IOS_FALLBACK_BG_RGB = { r: 0x31, g: 0x33, b: 0x38 }; // parsed from IOS_FALLBACK_BG

async function canvasToBlob(
    canvas: HTMLCanvasElement,
    type = "image/png",
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob ?? null), type);
    });
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
        if (!isIOSCaptureBugLikely()) {
            const blob = await snapdom.toBlob(captureRoot, SNAPDOM_OPTS);
            return await cropBlobToContent(blob);
        }

        captureRoot.style.setProperty("background-color", IOS_FALLBACK_BG, "important");
        let canvas: HTMLCanvasElement | null = null;
        try {
            const result = await snapdom(captureRoot, SNAPDOM_OPTS);
            canvas = await result.toCanvas();
        } finally {
            captureRoot.style.removeProperty("background-color");
        }
        if (!canvas) {
            return null;
        }

        const blob = await canvasToBlob(canvas, "image/png");
        if (!blob) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                clearCanvasAndImages(ctx, canvas);
            }
            return null;
        }

        const finalBlob = await cropBlobToContent(blob, IOS_FALLBACK_BG_RGB);

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
    solidBg?: { r: number; g: number; b: number },
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
            const isContent = solidBg
                ? data[i + 3] > 0 && (
                    Math.abs(data[i] - solidBg.r) > 8 ||
                    Math.abs(data[i + 1] - solidBg.g) > 8 ||
                    Math.abs(data[i + 2] - solidBg.b) > 8
                  )
                : data[i + 3] > 0;
            if (isContent) {
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

async function cropBlobToContent(
    blob: Blob,
    solidBg?: { r: number; g: number; b: number },
): Promise<Blob | null> {
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
    const contentBounds = getImageContentBounds(ctx, imageWidth, imageHeight, solidBg);
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
    bgColor?: string,
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

        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, totalWidth, maxHeight);
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
        return combineTreeImagesHorizontally(b0, b1, b2, isIOSCaptureBugLikely() ? IOS_FALLBACK_BG : undefined);
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
                ? await combineTreeImagesHorizontally(b0, b1, b2, isIOSCaptureBugLikely() ? IOS_FALLBACK_BG : undefined)
                : null;
        return { combined, trees };
    });
}
