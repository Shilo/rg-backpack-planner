import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";
import {
    tabsBridge,
    captureInProgressCount,
    incrementCapture,
    decrementCapture,
    type TabsCaptureBridge,
} from "./captureBridge";

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

        const element = bridge.getTreeCanvas();
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
            const tree2Blob = await captureTreeImageByIndex(1, bridge, parent);
            const tree3Blob = await captureTreeImageByIndex(2, bridge, parent);

            if (!tree1Blob || !tree2Blob || !tree3Blob) {
                return null;
            }

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
            const blob1 = await captureTreeImageByIndex(1, bridge, parent);
            const blob2 = await captureTreeImageByIndex(2, bridge, parent);

            let combined: Blob | null = null;
            if (blob0 && blob1 && blob2) {
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

