import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";

type TabsCaptureBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null;
};

let tabsBridge: TabsCaptureBridge | null = null;
let captureInProgress = false;

export function isCaptureInProgress() {
    return captureInProgress;
}

async function waitForNextFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

async function captureElementAsPng(
    element: HTMLElement | null,
): Promise<Blob | null> {
    if (!element) {
        console.error("Tree element is null");
        return null;
    }

    try {
        // Get dimensions without transforms by temporarily resetting transform
        const originalTransform = element.style.transform;
        element.style.transform = "none";

        // Force layout recalculation
        const rect = element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Restore original transform immediately
        element.style.transform = originalTransform;

        // Clone the element
        const clone = element.cloneNode(true) as HTMLElement;

        // Reset transform and other non-default CSS values on clone
        clone.style.transform = "none";
        clone.style.transition = "none";
        clone.style.animation = "none";
        clone.style.filter = "none";
        clone.style.opacity = "1";
        clone.style.boxShadow = "none";

        // Offset clone by 50% of its size (center it)
        clone.style.position = "absolute";
        clone.style.left = `${width}px`;
        clone.style.top = `${height}px`;

        // Create parent div (off-screen)
        const parent = document.createElement("div");
        parent.style.position = "absolute";
        parent.style.left = "-9999px";
        parent.style.top = "-9999px";
        parent.style.width = `${width * 4}px`;
        parent.style.height = `${height * 4}px`;
        parent.style.overflow = "visible";
        parent.appendChild(clone);

        // Add to DOM temporarily for SnapDOM
        document.body.appendChild(parent);

        try {
            const img = await snapdom.toImg(parent, {
                backgroundColor: "transparent",
                outerTransforms: false,
                outerShadows: false,
                exclude: [
                    ".tree-context-menu",
                    ".tooltip",
                    ".context-menu",
                    "[role='tooltip']",
                    ".modal",
                    ".overlay",
                ],
            });

            // Convert img to blob
            const blob = await new Promise<Blob | null>((resolve) => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob), "image/png");
            });

            return blob;
        } finally {
            // Cleanup
            document.body.removeChild(parent);
        }
    } catch (error) {
        console.error("Failed to capture tree as PNG:", error);
        return null;
    }
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image from blob"));
        };

        img.src = url;
    });
}

async function cropAndCenterBlobContent(blob: Blob): Promise<Blob> {
    const img = await blobToImage(blob);

    // Draw image to canvas to analyze pixel data
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return blob;

    tempCtx.drawImage(img, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    // Find bounds of non-transparent pixels
    let minX = img.width,
        maxX = 0,
        minY = img.height,
        maxY = 0;
    let hasContent = false;

    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
            hasContent = true;
            const pixelIndex = (i - 3) / 4;
            const x = pixelIndex % img.width;
            const y = Math.floor(pixelIndex / img.width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
    }

    // If no content, return original
    if (!hasContent) return blob;

    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    const padding = 10;

    // Create canvas with padding, centering the cropped content
    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = contentWidth + padding * 2;
    croppedCanvas.height = contentHeight + padding * 2;
    const croppedCtx = croppedCanvas.getContext("2d");
    if (!croppedCtx) return blob;

    // Draw the cropped region (translating to padding offset)
    croppedCtx.drawImage(
        img,
        minX,
        minY,
        contentWidth,
        contentHeight,
        padding,
        padding,
        contentWidth,
        contentHeight,
    );

    return new Promise((resolve) => {
        croppedCanvas.toBlob((newBlob) => {
            resolve(newBlob || blob);
        }, "image/png");
    });
}

async function combineTreeImagesHorizontally(
    tree1Blob: Blob,
    tree2Blob: Blob,
    tree3Blob: Blob,
): Promise<Blob | null> {
    try {
        // Crop and center each tree's content
        const croppedBlob1 = await cropAndCenterBlobContent(tree1Blob);
        const croppedBlob2 = await cropAndCenterBlobContent(tree2Blob);
        const croppedBlob3 = await cropAndCenterBlobContent(tree3Blob);

        const img1 = await blobToImage(croppedBlob1);
        const img2 = await blobToImage(croppedBlob2);
        const img3 = await blobToImage(croppedBlob3);

        const padding = 10;
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + padding * 2;
        const totalHeight = maxHeight + padding * 2;

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return null;
        }

        const yOffset = padding + (maxHeight - img1.height) / 2;
        let xOffset = padding;

        ctx.drawImage(img1, xOffset, yOffset);
        xOffset += img1.width;

        ctx.drawImage(img2, xOffset, padding + (maxHeight - img2.height) / 2);
        xOffset += img2.width;

        ctx.drawImage(img3, xOffset, padding + (maxHeight - img3.height) / 2);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
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
    captureInProgress = true;
    rootEl?.classList.add("snapdom-capture");
    try {
        return await callback();
    } finally {
        rootEl?.classList.remove("snapdom-capture");
        captureInProgress = false;
    }
}

export async function captureTreeImageByIndex(
    tabIndex: number,
): Promise<Blob | null> {
    const bridge = tabsBridge;
    if (!bridge) {
        return null;
    }

    return withCaptureState(async () => {
        const currentIndex = bridge.getActive();

        if (tabIndex !== currentIndex) {
            bridge.setActive(tabIndex);
            await tick();
            await waitForNextFrame();
        }

        const element = bridge.getTreeCanvas();
        const blob = await captureElementAsPng(element);

        if (tabIndex !== currentIndex) {
            bridge.setActive(currentIndex);
            await tick();
            await waitForNextFrame();
        }

        return blob;
    });
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const tree1Blob = await captureTreeImageByIndex(0);
    const tree2Blob = await captureTreeImageByIndex(1);
    const tree3Blob = await captureTreeImageByIndex(2);

    if (!tree1Blob || !tree2Blob || !tree3Blob) {
        return null;
    }

    return combineTreeImagesHorizontally(tree1Blob, tree2Blob, tree3Blob);
}

export async function testCaptureFirstTree(): Promise<void> {
    const bridge = tabsBridge;
    if (!bridge) {
        console.error("No bridge available");
        return;
    }

    try {
        const currentIndex = bridge.getActive();
        if (currentIndex !== 0) {
            bridge.setActive(0);
            await tick();
            await waitForNextFrame();
        }

        const element = bridge.getTreeCanvas();
        if (!element) {
            console.error("Tree element is null");
            return;
        }

        const img = await snapdom.toPng(element, {
            backgroundColor: "transparent",
            outerTransforms: false,
            outerShadows: false,
            exclude: [
                ".tree-context-menu",
                ".tooltip",
                ".context-menu",
                "[role='tooltip']",
                ".modal",
                ".overlay",
            ],
        });

        img.style.position = "fixed";
        img.style.top = "10px";
        img.style.left = "10px";
        img.style.zIndex = "10000";
        img.style.border = "2px solid red";
        img.style.maxWidth = "500px";
        img.style.maxHeight = "500px";
        document.body.appendChild(img);
        console.log("First tree image displayed on page (red border)");

        if (currentIndex !== 0) {
            bridge.setActive(currentIndex);
            await tick();
            await waitForNextFrame();
        }
    } catch (error) {
        console.error("Failed to display image:", error);
    }
}

/**
 * Svelte action for automatic capture bridge registration
 * Usage: use:captureAction={{ setActive, getActive, getTreeCanvas }}
 */
export function captureAction(_node: HTMLElement, bridge: TabsCaptureBridge) {
    tabsBridge = bridge;
    return {
        destroy: () => {
            if (tabsBridge === bridge) {
                tabsBridge = null;
            }
        },
    };
}
