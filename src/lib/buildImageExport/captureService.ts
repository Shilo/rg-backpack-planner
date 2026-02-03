import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";

const TREE_VISIBLE_BOUNDS = {
    centerNode: {
        x: 295,
        y: 356,
    },
    width: 701,
    height: 694,
    // Actual size is:
    // width: 703
    // height: 696
    // snapdom seems to add a 1px extra margin around the captured area
};

type TabsCaptureBridge = {
    setActive: (index: number) => void;
    getActive: () => number;
    getTreeCanvas: () => HTMLDivElement | null | undefined;
};

let tabsBridge: TabsCaptureBridge | null = null;
let captureInProgress = false;

export function isCaptureInProgress() {
    return captureInProgress;
}

async function captureElementAsPng(
    element: HTMLElement | null | undefined,
): Promise<Blob | null> {
    if (!element) {
        console.error("Capture element is null");
        return null;
    }

    try {
        // Get dimensions without transforms by temporarily resetting transform
        const originalTransform = element.style.transform;
        element.style.transform = "none";

        // Force layout recalculation
        const rect = TREE_VISIBLE_BOUNDS; //element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clone the element
        const clone = element.cloneNode(true) as HTMLElement;

        // Restore original transform immediately
        element.style.transform = originalTransform;

        // Reset other non-default CSS values on clone
        clone.style.transition = "none";
        clone.style.animation = "none";
        clone.style.filter = "none";
        clone.style.opacity = "1";
        clone.style.boxShadow = "none";

        // Offset clone by 50% of its size (center it)
        clone.style.position = "absolute";
        clone.style.left = `${TREE_VISIBLE_BOUNDS.centerNode.x}px`;
        clone.style.top = `${TREE_VISIBLE_BOUNDS.centerNode.y}px`;

        // Create parent div (off-screen)
        const parent = document.createElement("div");
        parent.style.position = "absolute";
        parent.style.left = "-9999px";
        parent.style.top = "-9999px";
        parent.style.width = `${TREE_VISIBLE_BOUNDS.width}px`;
        parent.style.height = `${TREE_VISIBLE_BOUNDS.height}px`;
        parent.style.overflow = "visible";
        parent.appendChild(clone);

        // Add to DOM temporarily for SnapDOM
        document.body.appendChild(parent);

        try {
            return await snapdom.toBlob(parent, {
                type: "png",
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
    bridge: TabsCaptureBridge,
): Promise<Blob | null> {
    return withCaptureState(async () => {
        if (tabIndex !== bridge.getActive()) {
            bridge.setActive(tabIndex);
            await tick();
        }

        const element = bridge.getTreeCanvas();
        return await captureElementAsPng(element);
    });
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const bridge = tabsBridge;
    if (!bridge) {
        return null;
    }
    const currentIndex = bridge.getActive();

    const tree1Blob = await captureTreeImageByIndex(0, bridge);
    const tree2Blob = await captureTreeImageByIndex(1, bridge);
    const tree3Blob = await captureTreeImageByIndex(2, bridge);

    bridge.setActive(currentIndex);

    if (!tree1Blob || !tree2Blob || !tree3Blob) {
        return null;
    }

    return combineTreeImagesHorizontally(tree1Blob, tree2Blob, tree3Blob);
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
