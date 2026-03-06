import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";
import {
    tabsBridge,
    captureInProgressCount,
    incrementCapture,
    decrementCapture,
    type TabsCaptureBridge,
} from "./captureBridge";
import { TREE_BADGE_VERTICAL_OVERFLOW_PX } from "../treeLayout";

const TREE_VISIBLE_BOUNDS = {
    centerNode: {
        x: 295,
        y: 356,
    },
    width: 701,
    height: 694 + TREE_BADGE_VERTICAL_OVERFLOW_PX,
    // Actual size is:
    // width: 703
    // height: 696
    // snapdom seems to add a 1px extra margin around the captured area
};

const CAPTURE_READY_MAX_FRAMES = 12;
const CAPTURE_STABLE_FRAME_COUNT = 2;

function setInlineStyleFromComputed(
    element: HTMLElement,
    computed: CSSStyleDeclaration,
    property: string,
) {
    const value = computed.getPropertyValue(property);
    if (!value) return;
    element.style.setProperty(property, value);
}

function preserveTreeLinkStrokeStyles(root: HTMLElement) {
    // Ensure SVG link stroke styles survive capture (snapdom can miss CSS for SVG)
    root.querySelectorAll<SVGLineElement>(".tree-link").forEach((line) => {
        const computed = getComputedStyle(line);
        const stroke = computed.stroke;
        const strokeOpacity = computed.strokeOpacity;
        const widthValue = Number.parseFloat(computed.strokeWidth);
        const strokeWidth =
            Number.isFinite(widthValue) && widthValue > 0
                ? `${widthValue}px`
                : "4px";
        const filter = computed.filter;

        if (stroke && stroke !== "none") {
            line.style.stroke = stroke;
        }
        line.style.strokeWidth = strokeWidth;
        if (strokeOpacity && strokeOpacity !== "1") {
            line.style.strokeOpacity = strokeOpacity;
        }
        if (filter && filter !== "none") {
            line.style.filter = filter;
        }
    });
}

function preserveNodeVisualStyles(root: HTMLElement) {
    const nodeStyleProperties = [
        "background-color",
        "border-color",
        "border-width",
        "border-style",
        "box-shadow",
        "clip-path",
        "color",
        "filter",
        "opacity",
    ];
    const nodeVariableProperties = [
        "--hex-border-color",
        "--hex-border-width",
        "--hex-fill",
        "--icon-scale",
    ];
    const badgeStyleProperties = [
        "background-color",
        "border-color",
        "border-width",
        "border-style",
        "box-shadow",
        "color",
        "filter",
    ];

    root.querySelectorAll<HTMLElement>(".node-wrapper").forEach((wrapper) => {
        const computed = getComputedStyle(wrapper);
        setInlineStyleFromComputed(wrapper, computed, "filter");
    });

    root.querySelectorAll<HTMLElement>(".button.node").forEach((node) => {
        const computed = getComputedStyle(node);
        nodeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
        nodeVariableProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
    });

    root.querySelectorAll<HTMLElement>(".node-badge").forEach((badge) => {
        const computed = getComputedStyle(badge);
        badgeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(badge, computed, property),
        );
    });
}

function normalizeBadgeAnchorScale(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>(
        ".node-badge-anchor, .node-tier-badge-anchor",
    ).forEach((anchor) => {
        anchor.style.transform = "scale(1)";
    });
}

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

async function yieldForUiFrame(): Promise<void> {
    await waitForAnimationFrame();

    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

function getTreeCanvasSignature(element: HTMLElement): string {
    return [
        element.style.transform,
        element.childElementCount,
        element.querySelectorAll(".node-wrapper").length,
        element.querySelectorAll(".tree-link").length,
    ].join("|");
}

async function waitForStableTreeCanvas(
    bridge: TabsCaptureBridge,
    tabIndex: number,
): Promise<HTMLElement | null> {
    let stableFrames = 0;
    let previousSignature = "";

    for (let frame = 0; frame < CAPTURE_READY_MAX_FRAMES; frame++) {
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
            stableFrames = 1;
            previousSignature = signature;
        }

        if (stableFrames >= CAPTURE_STABLE_FRAME_COUNT) {
            return element;
        }
    }

    const fallback = bridge.getTreeCanvas();
    return fallback && fallback.isConnected ? fallback : null;
}

async function captureElementAsPng(
    element: HTMLElement | null | undefined,
    parent: HTMLElement,
): Promise<Blob | null> {
    if (!element || !parent) {
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
        clone.style.inset = "auto";
        clone.style.right = "auto";
        clone.style.bottom = "auto";
        clone.style.width = `${TREE_VISIBLE_BOUNDS.width}px`;
        clone.style.height = `${TREE_VISIBLE_BOUNDS.height}px`;
        clone.style.pointerEvents = "none";
        clone.style.overflow = "visible";

        // Offset clone by center node position
        clone.style.position = "absolute";
        clone.style.left = `${TREE_VISIBLE_BOUNDS.centerNode.x}px`;
        clone.style.top = `${TREE_VISIBLE_BOUNDS.centerNode.y}px`;

        // Clear any previous contents and append the clone
        try {
            parent.replaceChildren(clone);
        } catch (_) {
            try {
                while (parent.firstChild) parent.removeChild(parent.firstChild);
            } catch (_) { }
            parent.appendChild(clone);
        }

        preserveTreeLinkStrokeStyles(clone);
        preserveNodeVisualStyles(clone);
        normalizeBadgeAnchorScale(clone);

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
            // remove the clone to avoid memory leaks
            try {
                parent.replaceChildren();
            } catch (_) {
                try {
                    if (clone.parentNode === parent) parent.removeChild(clone);
                } catch (_) { }
            }
        }
    } catch (error) {
        console.error("Failed to capture tree as PNG:", error);
        return null;
    }
}

function createAndAttachOffscreenParent() {
    const parent = document.createElement("div");
    parent.style.position = "absolute";
    parent.style.left = "-9999px";
    parent.style.top = "-9999px";
    parent.style.width = `${TREE_VISIBLE_BOUNDS.width}px`;
    parent.style.height = `${TREE_VISIBLE_BOUNDS.height}px`;
    parent.style.overflow = "visible";
    parent.style.background = "transparent";
    parent.style.backgroundColor = "transparent";
    parent.style.pointerEvents = "none";
    parent.style.isolation = "isolate";

    document.body.appendChild(parent);
    return parent;
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

        const spacing = 32; // spacing (half node size) between each tree, no outer padding
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + spacing * 2; // two gaps between three images
        const totalHeight = maxHeight;

        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext("2d", { alpha: true });
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
                    } catch (_) { }

                    img1 = img2 = img3 = null as any;
                    resolve(null);
                    return;
                }

                // Clear canvas backing store and drop image refs to make memory reclaiming easier
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (_) { }

                try {
                    img1.src = "";
                    img2.src = "";
                    img3.src = "";
                } catch (_) { }

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

export async function captureTreeImageByIndex(
    tabIndex: number,
    bridge: TabsCaptureBridge,
    parent: HTMLElement,
): Promise<Blob | null> {
    return withCaptureState(async () => {
        if (tabIndex !== bridge.getActive()) {
            bridge.setActive(tabIndex);
            await tick();
        }

        const element = await waitForStableTreeCanvas(bridge, tabIndex);
        await yieldForUiFrame();
        return await captureElementAsPng(element, parent);
    });
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const bridge = tabsBridge;
    if (!bridge) {
        return null;
    }

    return withCaptureState(async () => {
        const parent = createAndAttachOffscreenParent();
        const currentIndex = bridge.getActive();

        try {
            const tree1Blob = await captureTreeImageByIndex(0, bridge, parent);
            await yieldForUiFrame();
            const tree2Blob = await captureTreeImageByIndex(1, bridge, parent);
            await yieldForUiFrame();
            const tree3Blob = await captureTreeImageByIndex(2, bridge, parent);

            if (!tree1Blob || !tree2Blob || !tree3Blob) {
                return null;
            }

            await yieldForUiFrame();
            return combineTreeImagesHorizontally(
                tree1Blob,
                tree2Blob,
                tree3Blob,
            );
        } finally {
            // Restore active tab
            bridge.setActive(currentIndex);

            try {
                document.body.removeChild(parent);
            } catch (_) { }
        }
    });
}

export type CaptureAllResult = {
    combined: Blob | null;
    trees: [Blob | null, Blob | null, Blob | null];
};

export async function captureAllTreeImages(): Promise<CaptureAllResult | null> {
    const bridge = tabsBridge;
    if (!bridge) {
        return null;
    }

    return withCaptureState(async () => {
        const parent = createAndAttachOffscreenParent();
        const currentIndex = bridge.getActive();

        try {
            const blob0 = await captureTreeImageByIndex(0, bridge, parent);
            await yieldForUiFrame();
            const blob1 = await captureTreeImageByIndex(1, bridge, parent);
            await yieldForUiFrame();
            const blob2 = await captureTreeImageByIndex(2, bridge, parent);

            let combined: Blob | null = null;
            if (blob0 && blob1 && blob2) {
                await yieldForUiFrame();
                combined = await combineTreeImagesHorizontally(
                    blob0,
                    blob1,
                    blob2,
                );
            }

            return {
                combined,
                trees: [blob0, blob1, blob2] as [Blob | null, Blob | null, Blob | null],
            };
        } finally {
            bridge.setActive(currentIndex);

            try {
                document.body.removeChild(parent);
            } catch (_) { }
        }
    });
}

