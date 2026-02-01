import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";

type TabsCaptureBridge = {
    setActiveIndex: (index: number) => void;
    getActiveIndex: () => number;
    getTreeCanvasElement: () => HTMLDivElement | null;
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
        const dpr =
            typeof window !== "undefined" && window.devicePixelRatio
                ? window.devicePixelRatio
                : 1;

        const blob = await snapdom.toBlob(element, {
            type: "png",
            backgroundColor: "transparent",
            scale: Math.max(2, dpr),
            exclude: [
                ".tree-context-menu",
                ".tooltip",
                ".context-menu",
                "[role='tooltip']",
                ".modal",
                ".overlay",
            ],
            outerShadows: false,
            outerTransforms: true,
        });

        return blob;
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

async function combineTreeImagesHorizontally(
    tree1Blob: Blob,
    tree2Blob: Blob,
    tree3Blob: Blob,
): Promise<Blob | null> {
    try {
        const img1 = await blobToImage(tree1Blob);
        const img2 = await blobToImage(tree2Blob);
        const img3 = await blobToImage(tree3Blob);

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
        const currentIndex = bridge.getActiveIndex();

        if (tabIndex !== currentIndex) {
            bridge.setActiveIndex(tabIndex);
            await tick();
            await waitForNextFrame();
        }

        const element = bridge.getTreeCanvasElement();
        const blob = await captureElementAsPng(element);

        if (tabIndex !== currentIndex) {
            bridge.setActiveIndex(currentIndex);
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

/**
 * Svelte action for automatic capture bridge registration
 * Usage: use:captureAction={{ setActiveIndex, getActiveIndex, getTreeCanvasElement }}
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
