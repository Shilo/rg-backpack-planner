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
        // Clone the element
        const clone = element.cloneNode(true) as HTMLElement;

        // Reset non-default CSS values on clone
        clone.style.transform = "none";
        clone.style.transition = "none";
        clone.style.animation = "none";
        clone.style.filter = "none";
        clone.style.opacity = "1";
        clone.style.boxShadow = "none";

        // Offset clone by center node position
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
        let img1 = await blobToImage(tree1Blob);
        let img2 = await blobToImage(tree2Blob);
        let img3 = await blobToImage(tree3Blob);

        const spacing = 32; //spacing (half node size) between each tree, no outer padding
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + spacing * 2; // two gaps between three images
        const totalHeight = maxHeight;

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return null;
        }

        let xOffset = 0;

        ctx.drawImage(img1, xOffset, (maxHeight - img1.height) / 2);
        xOffset += img1.width + spacing;

        ctx.drawImage(img2, xOffset, (maxHeight - img2.height) / 2);
        xOffset += img2.width + spacing;

        ctx.drawImage(img3, xOffset, (maxHeight - img3.height) / 2);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                // If blob is null (very rare), clean up and return null
                if (!blob) {
                    try {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        canvas.width = 0;
                        canvas.height = 0;
                    } catch (_) {}

                    img1 = img2 = img3 = null as any;
                    resolve(null);
                    return;
                }

                // Clear canvas backing store and drop image refs to make memory reclaiming easier
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (_) {}

                try {
                    img1.src = "";
                    img2.src = "";
                    img3.src = "";
                } catch (_) {}

                img1 = img2 = img3 = null as any;
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
