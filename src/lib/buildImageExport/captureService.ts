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
    centerNode: { x: 295, y: 356 },
    width: 701,
    height: 694 + TREE_BADGE_VERTICAL_OVERFLOW_PX,
    // Slightly under actual (703×696); snapdom adds ~1px around the captured area
};

const CAPTURE_READY_MAX_FRAMES = 6;
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

function preserveTreeLinkStrokeStyles(
    original: HTMLElement,
    clone: HTMLElement,
) {
    // Read from original (correct cascade); write to clone. Ensures SVG link stroke
    // styles survive capture (snapdom can miss CSS for SVG).
    const origLines = original.querySelectorAll<SVGLineElement>(".tree-link");
    const cloneLines = clone.querySelectorAll<SVGLineElement>(".tree-link");
    for (let i = 0; i < origLines.length && i < cloneLines.length; i++) {
        const orig = origLines[i];
        const line = cloneLines[i];
        const computed = getComputedStyle(orig);
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
    }
}

/** CSS custom properties that drive node/wrapper/pseudo-element colors (Node.svelte). */
const NODE_WRAPPER_COLOR_VARIABLES = [
    "--hex-fill",
    "--hex-border-color",
    "--hex-border-width",
    "--node-icon-color",
    "--border-color",
    "--border-color-locked",
    "--border-color-active",
    "--border-color-maxed",
    "--bg-locked",
    "--bg-available",
    "--bg-active",
    "--bg-maxed",
    "--badge-bg",
    "--text-color",
    "--text-color-active",
    "--text-color-maxed",
    "--text-color-locked",
];

function preserveNodeVisualStyles(original: HTMLElement, clone: HTMLElement) {
    // Read from original (correct cascade); write to clone so clone has correct
    // colors/effects when snapdom runs. Inline all color-driving variables so
    // the clone does not depend on stylesheet cascade (avoids whiteish capture).
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
        "--bg-locked",
        "--bg-available",
        "--bg-active",
        "--node-icon-color",
        "--border-color",
        "--border-color-locked",
        "--border-color-active",
    ];
    const badgeStyleProperties = [
        "background-color",
        "border-color",
        "border-width",
        "border-style",
        "box-shadow",
        "color",
        "filter",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "letter-spacing",
        "font-variant-numeric",
    ];

    const origWrappers = original.querySelectorAll<HTMLElement>(".node-wrapper");
    const cloneWrappers = clone.querySelectorAll<HTMLElement>(".node-wrapper");
    for (let i = 0; i < origWrappers.length && i < cloneWrappers.length; i++) {
        const computed = getComputedStyle(origWrappers[i]);
        const cloneWrapper = cloneWrappers[i];
        setInlineStyleFromComputed(cloneWrapper, computed, "filter");
        NODE_WRAPPER_COLOR_VARIABLES.forEach((property) =>
            setInlineStyleFromComputed(cloneWrapper, computed, property),
        );
    }

    const origNodes = original.querySelectorAll<HTMLElement>(".button.node");
    const cloneNodes = clone.querySelectorAll<HTMLElement>(".button.node");
    for (let i = 0; i < origNodes.length && i < cloneNodes.length; i++) {
        const computed = getComputedStyle(origNodes[i]);
        const node = cloneNodes[i];
        nodeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
        nodeVariableProperties.forEach((property) =>
            setInlineStyleFromComputed(node, computed, property),
        );
    }

    const origBadges = original.querySelectorAll<HTMLElement>(".node-badge");
    const cloneBadges = clone.querySelectorAll<HTMLElement>(".node-badge");
    for (let i = 0; i < origBadges.length && i < cloneBadges.length; i++) {
        const computed = getComputedStyle(origBadges[i]);
        badgeStyleProperties.forEach((property) =>
            setInlineStyleFromComputed(cloneBadges[i], computed, property),
        );
    }
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

/** Wait for n animation frames so the browser can commit paint (e.g. before reading getComputedStyle). */
async function waitForPaintFrames(n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
        await waitForAnimationFrame();
    }
}

const PRE_CLONE_PAINT_FRAMES = 2;

/** Force reflow then wait for two animation frames (layout then paint) before capture. */
async function forceReflowAndWaitForPaint(element: HTMLElement): Promise<void> {
    void element.offsetHeight;
    await waitForAnimationFrame();
    await waitForAnimationFrame();
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

const SNAPDOM_OPTS = {
    type: "png" as const,
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
};

/** Prepares a clone of the live tree in parent (paint wait, clone, styles, reflow). Call captureParentAsBlob(parent) after. */
async function prepareTreeCloneInParent(
    element: HTMLElement,
    parent: HTMLElement,
): Promise<void> {
    await waitForPaintFrames(PRE_CLONE_PAINT_FRAMES);

    const clone = element.cloneNode(true) as HTMLElement;

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
    clone.style.position = "absolute";
    clone.style.left = `${TREE_VISIBLE_BOUNDS.centerNode.x}px`;
    clone.style.top = `${TREE_VISIBLE_BOUNDS.centerNode.y}px`;

    try {
        parent.replaceChildren(clone);
    } catch (_) {
        try {
            while (parent.firstChild) parent.removeChild(parent.firstChild);
        } catch (_) {}
        parent.appendChild(clone);
    }

    preserveTreeLinkStrokeStyles(element, clone);
    preserveNodeVisualStyles(element, clone);
    normalizeBadgeAnchorScale(clone);

    await forceReflowAndWaitForPaint(clone);
}

/** Captures parent's contents to PNG blob. Clears parent in finally. */
async function captureParentAsBlob(parent: HTMLElement): Promise<Blob | null> {
    try {
        return await snapdom.toBlob(parent, SNAPDOM_OPTS);
    } finally {
        try {
            parent.replaceChildren();
        } catch (_) {
            try {
                while (parent.firstChild) parent.removeChild(parent.firstChild);
            } catch (_) {}
        }
    }
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
        await prepareTreeCloneInParent(element, parent);
        return await captureParentAsBlob(parent);
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
        let img1: HTMLImageElement | null = await blobToImage(tree1Blob);
        let img2: HTMLImageElement | null = await blobToImage(tree2Blob);
        let img3: HTMLImageElement | null = await blobToImage(tree3Blob);

        const spacing = 32; // half node size between trees, no outer padding
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + spacing * 2;
        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = maxHeight;

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
                if (!blob) {
                    clearCanvasAndImages(ctx, canvas, img1, img2, img3);
                    resolve(null);
                    return;
                }
                clearCanvasAndImages(ctx, canvas, img1, img2, img3);
                resolve(blob);
            }, "image/png");
        });
    } catch (error) {
        console.error("Failed to combine tree images:", error);
        return null;
    }
}

function clearCanvasAndImages(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ...imgs: (HTMLImageElement | null)[]
): void {
    try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
    } catch (_) {}
    for (const img of imgs) {
        try {
            if (img) img.src = "";
        } catch (_) {}
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
        return await captureElementAsPng(element, parent);
    });
}

type ThreeTreeBlobs = [Blob | null, Blob | null, Blob | null];

/** Prepare all three tree clones (sequential tab switch + wait), then run the three toBlob calls in parallel. */
async function captureThreeTreeBlobs(
    bridge: TabsCaptureBridge,
): Promise<ThreeTreeBlobs> {
    const parents = [
        createAndAttachOffscreenParent(),
        createAndAttachOffscreenParent(),
        createAndAttachOffscreenParent(),
    ];
    const currentIndex = bridge.getActive();

    try {
        for (let i = 0; i < 3; i++) {
            if (i !== bridge.getActive()) {
                bridge.setActive(i);
                await tick();
            }
            const element = await waitForStableTreeCanvas(bridge, i);
            if (!element) continue;
            await prepareTreeCloneInParent(element, parents[i]);
        }

        const [blob0, blob1, blob2] = await Promise.all([
            captureParentAsBlob(parents[0]),
            captureParentAsBlob(parents[1]),
            captureParentAsBlob(parents[2]),
        ]);
        return [blob0, blob1, blob2];
    } finally {
        bridge.setActive(currentIndex);
        for (const parent of parents) {
            try {
                document.body.removeChild(parent);
            } catch (_) {}
        }
    }
}

export async function captureCombinedTreesImage(): Promise<Blob | null> {
    const bridge = tabsBridge;
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
    const bridge = tabsBridge;
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

