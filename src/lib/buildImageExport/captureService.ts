import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";
import { treeBridge, type TreeBridge } from "./treeBridge";
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
const CROP_PADDING_PX = 1;

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
    return [
        element.style.transform,
        Math.round(rect.width),
        Math.round(rect.height),
        element.querySelectorAll(".node-wrapper").length,
        element.querySelectorAll(".tree-link").length,
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

    const fallback = bridge.getTreeCanvas();
    return fallback && fallback.isConnected ? fallback : null;
}

async function focusActiveTreeForCapture(bridge: TreeBridge) {
    bridge.focusActiveTreeInView?.();
    await tick();
    await waitForPaintFrames(2);
}

async function captureLiveTreeBlob(
    bridge: TreeBridge,
    tabIndex: number,
): Promise<Blob | null> {
    if (bridge.getActive() !== tabIndex) {
        bridge.setActive(tabIndex);
        await tick();
    }

    await focusActiveTreeForCapture(bridge);
    const treeCanvas = await waitForStableTreeCanvas(bridge, tabIndex);
    if (!treeCanvas) {
        return null;
    }

    const captureRoot =
        treeCanvas.parentElement instanceof HTMLElement
            ? treeCanvas.parentElement
            : treeCanvas;

    try {
        const blob = await snapdom.toBlob(captureRoot, SNAPDOM_OPTS);
        return await cropBlobToContent(blob);
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
        rootEl?.classList.add("snapdom-capture");
    }
    try {
        return await callback();
    } finally {
        decrementCapture();
        if (captureInProgressCount === 0) {
            rootEl?.classList.remove("snapdom-capture");
        }
    }
}

type ThreeTreeBlobs = [Blob | null, Blob | null, Blob | null];

async function captureThreeTreeBlobs(
    bridge: TreeBridge,
): Promise<ThreeTreeBlobs> {
    const currentIndex = bridge.getActive();
    try {
        const results: (Blob | null)[] = [];
        for (let i = 0; i < NUM_TREES; i += 1) {
            results.push(await captureLiveTreeBlob(bridge, i));
        }
        return [results[0] ?? null, results[1] ?? null, results[2] ?? null];
    } finally {
        bridge.setActive(currentIndex);
        await tick();
        await focusActiveTreeForCapture(bridge);
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
