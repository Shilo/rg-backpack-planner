import { tick } from "svelte";
import { snapdom } from "@zumer/snapdom";
import { treeBridge, type TreeBridge, SNAPDOM_CAPTURE_CLASS } from "./treeBridge";
import { isIOSCaptureBug, captureWithIOSBackground, getIOSCaptureBg } from "./captureFixIOS";
import { EXPORT_FORMAT, EXPORT_MIME, EXPORT_DPR, EXPORT_TARGET_LONG_EDGE_PX, EXPORT_MAX_SCALE } from "./imageFormat";
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
const COMBINED_TREE_SPACING_PX = 0;
const CROP_PADDING_PX = 1; // 1px preserves anti-aliased edge pixels that pixel-scan misses
const LABEL_FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

export type CaptureTreeCard = {
    title: string;
    techCrystalsSpent: string;
};

export type CaptureBuildCard = {
    buildTitle?: string;
    techCrystalsSpent: string;
};

export type CaptureTextOptions = {
    treeCards: readonly [CaptureTreeCard, CaptureTreeCard, CaptureTreeCard];
    buildCard: CaptureBuildCard;
};

type MetadataCard = {
    title?: string;
    techCrystalsSpent: string;
    anchor: "top-right" | "bottom-right";
};

type MeasuredMetadataCard = {
    titleText?: string;
    valueText: string;
    titleWidth: number;
    valueWidth: number;
    titleFontSize: number;
    valueFontSize: number;
    padH: number;
    padV: number;
    rowGap: number;
    iconSize: number;
    iconGap: number;
    width: number;
    height: number;
    radius: number;
    borderWidth: number;
    shadowOffsetY: number;
    shadowBlur: number;
    shadowPad: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
};

const SNAPDOM_OPTS = {
    type: EXPORT_FORMAT,
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

function computeCaptureScale(
    contentBounds: { width: number; height: number },
    treeScale: number,
): number {
    const renderedLongEdge =
        Math.max(contentBounds.width, contentBounds.height) * treeScale;
    const scale = EXPORT_TARGET_LONG_EDGE_PX / (renderedLongEdge * EXPORT_DPR);
    return Math.min(scale, EXPORT_MAX_SCALE);
}

function buildCaptureOpts(bridge: TreeBridge) {
    const bounds = bridge.getWorldBoundsForCapture?.();
    const viewState = bridge.getViewState?.();
    const scale = bounds && viewState
        ? computeCaptureScale(bounds, viewState.scale)
        : 1;
    return { ...SNAPDOM_OPTS, scale, dpr: EXPORT_DPR };
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


async function canvasToBlob(
    canvas: HTMLCanvasElement,
    type = EXPORT_MIME,
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

    const captureOpts = buildCaptureOpts(bridge);

    try {
        if (!isIOSCaptureBug()) {
            const blob = await snapdom.toBlob(captureRoot, captureOpts);
            return await cropBlobToContent(blob);
        }

        const { canvas, bg } = await captureWithIOSBackground(
            captureRoot,
            () => snapdom(captureRoot, captureOpts),
        );
        if (!canvas) {
            return null;
        }

        const blob = await canvasToBlob(canvas, EXPORT_MIME);
        if (!blob) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                clearCanvasAndImages(ctx, canvas);
            }
            return null;
        }

        const finalBlob = await cropBlobToContent(blob, bg.rgb);

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
            if (data[i + 3] > 0) {
                const isContent = solidBg
                    ? Math.abs(data[i] - solidBg.r) > 8 ||
                      Math.abs(data[i + 1] - solidBg.g) > 8 ||
                      Math.abs(data[i + 2] - solidBg.b) > 8
                    : true;
                if (isContent) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
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
        croppedCanvas.toBlob((result) => resolve(result ?? blob), EXPORT_MIME);
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

function computeLabelFontSize(referenceHeight: number): number {
    return Math.max(12, Math.round(referenceHeight * 0.032));
}

function resolveThemeColor(prop: string, fallback: string): string {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim();
    return value || fallback;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawTechCrystalIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
) {
    const radius = size / 2;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + radius + Math.cos(angle) * radius;
        const py = y + radius + Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawMetadataCardHighlight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string,
    baseColor: string,
) {
    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.42, color);
    gradient.addColorStop(1, baseColor);

    ctx.globalAlpha = 0.24;
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

function measureMetadataCard(
    ctx: CanvasRenderingContext2D,
    card: MetadataCard,
    fontSize: number,
): MeasuredMetadataCard {
    const titleText = card.title?.trim();
    const valueText = card.techCrystalsSpent;
    const titleFontSize = Math.round(fontSize * 1.04);
    const valueFontSize = Math.round(fontSize * 0.86);
    const padH = Math.round(fontSize * 0.6);
    const padV = Math.round(fontSize * 0.32);
    const rowGap = Math.round(fontSize * 0.22);
    const iconSize = valueFontSize;
    const iconGap = Math.round(valueFontSize * 0.32);

    ctx.font = `700 ${titleFontSize}px ${LABEL_FONT}`;
    const titleWidth = titleText ? ctx.measureText(titleText).width : 0;
    ctx.font = `600 ${valueFontSize}px ${LABEL_FONT}`;
    const valueWidth = ctx.measureText(valueText).width;

    const valueRowWidth = iconSize + iconGap + valueWidth;
    const width = Math.max(titleWidth, valueRowWidth) + padH * 2;
    const height =
        padV * 2 +
        (titleText ? titleFontSize + rowGap : 0) +
        Math.max(valueFontSize, iconSize);
    const radius = Math.round(fontSize * 0.4);
    const borderWidth = Math.max(1, Math.round(fontSize * 0.06));
    const shadowOffsetY = Math.max(1, Math.round(fontSize * 0.16));
    const shadowBlur = Math.max(6, Math.round(fontSize * 0.92));
    const edgePad = shadowBlur + borderWidth + 1;

    return {
        titleText,
        valueText,
        titleWidth,
        valueWidth,
        titleFontSize,
        valueFontSize,
        padH,
        padV,
        rowGap,
        iconSize,
        iconGap,
        width,
        height,
        radius,
        borderWidth,
        shadowOffsetY,
        shadowBlur,
        shadowPad: {
            top: edgePad,
            right: edgePad,
            bottom: shadowBlur + shadowOffsetY + borderWidth + 1,
            left: edgePad,
        },
    };
}

function computeMetadataCardPlacement(
    canvasWidth: number,
    canvasHeight: number,
    cardWidth: number,
    cardHeight: number,
    anchor: "top-right" | "bottom-right",
    shadowPad: MeasuredMetadataCard["shadowPad"],
) {
    return anchor === "top-right"
        ? {
              x: canvasWidth - shadowPad.right - cardWidth,
              y: shadowPad.top,
          }
        : {
              x: canvasWidth - shadowPad.right - cardWidth,
              y: canvasHeight - shadowPad.bottom - cardHeight,
          };
}

function drawMetadataCard(
    ctx: CanvasRenderingContext2D,
    card: MetadataCard,
    fontSize: number,
    canvasWidth: number,
    canvasHeight: number,
) {
    const cardBase = resolveThemeColor("--node-locked-bg", "#24272d");
    const cardBorderSoft = resolveThemeColor("--border-subtle", "#3e4652");
    const cardText = resolveThemeColor("--text", "#e8e8ec");
    const cardMuted = resolveThemeColor("--text-muted", "#a6afbc");
    const cardHighlight = resolveThemeColor("--bg-raised", "#343a45");
    const metrics = measureMetadataCard(ctx, card, fontSize);
    const titleFontSize = metrics.titleFontSize;
    const valueFontSize = metrics.valueFontSize;
    const { x: cardX, y: cardY } = computeMetadataCardPlacement(
        canvasWidth,
        canvasHeight,
        metrics.width,
        metrics.height,
        card.anchor,
        metrics.shadowPad,
    );

    ctx.save();
    ctx.shadowColor = cardBase + "48";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = metrics.shadowOffsetY;
    ctx.shadowBlur = metrics.shadowBlur;

    drawRoundedRect(ctx, cardX, cardY, metrics.width, metrics.height, metrics.radius);
    ctx.fillStyle = cardBase;
    ctx.fill();
    drawMetadataCardHighlight(
        ctx,
        cardX,
        cardY,
        metrics.width,
        metrics.height,
        metrics.radius,
        cardHighlight,
        cardBase,
    );

    ctx.shadowColor = "transparent";
    drawRoundedRect(ctx, cardX, cardY, metrics.width, metrics.height, metrics.radius);
    ctx.strokeStyle = cardBorderSoft;
    ctx.lineWidth = metrics.borderWidth;
    ctx.stroke();
    ctx.restore();

    const contentX = cardX + metrics.padH;
    let rowTop = cardY + metrics.padV;
    const textRight = cardX + metrics.width - metrics.padH;

    if (metrics.titleText) {
        ctx.font = `700 ${titleFontSize}px ${LABEL_FONT}`;
        ctx.fillStyle = cardText;
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(metrics.titleText, textRight, rowTop);
        rowTop += titleFontSize + metrics.rowGap;
    }

    ctx.font = `600 ${valueFontSize}px ${LABEL_FONT}`;
    ctx.fillStyle = cardMuted;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const valueCenterY =
        rowTop + Math.max(valueFontSize, metrics.iconSize) / 2;
    ctx.fillText(metrics.valueText, textRight, valueCenterY);

    const iconX =
        textRight -
        metrics.valueWidth -
        metrics.iconGap -
        metrics.iconSize;
    const iconY =
        rowTop +
        (Math.max(valueFontSize, metrics.iconSize) - metrics.iconSize) / 2;
    drawTechCrystalIcon(
        ctx,
        Math.max(contentX, iconX),
        iconY,
        metrics.iconSize,
        cardMuted,
    );
}

async function addMetadataCardsToTrees(
    trees: ThreeTreeBlobs,
    cards: readonly [CaptureTreeCard, CaptureTreeCard, CaptureTreeCard],
): Promise<ThreeTreeBlobs> {
    const images: (HTMLImageElement | null)[] = [];
    const sizes: { width: number; height: number }[] = [];
    let maxHeight = 0;

    for (let i = 0; i < NUM_TREES; i += 1) {
        if (trees[i]) {
            const img = await blobToImage(trees[i]!);
            const size = getImageIntrinsicSize(img);
            images.push(img);
            sizes.push(size);
            maxHeight = Math.max(maxHeight, size.height);
        } else {
            images.push(null);
            sizes.push({ width: 0, height: 0 });
        }
    }

    if (maxHeight === 0) return trees;

    const fontSize = computeLabelFontSize(maxHeight);
    const result: ThreeTreeBlobs = [null, null, null];

    for (let i = 0; i < NUM_TREES; i += 1) {
        const img = images[i];
        const size = sizes[i];
        const card = cards[i];
        if (!img || !card) {
            if (img) img.src = "";
            result[i] = trees[i];
            continue;
        }

        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
            img.src = "";
            result[i] = trees[i];
            continue;
        }

        ctx.drawImage(img, 0, 0);
        img.src = "";

        drawMetadataCard(
            ctx,
            {
                title: card.title,
                techCrystalsSpent: card.techCrystalsSpent,
                anchor: "top-right",
            },
            fontSize,
            size.width,
            size.height,
        );

        const labeled = await canvasToBlob(canvas);
        clearCanvasAndImages(ctx, canvas);
        result[i] = labeled ?? trees[i];
    }

    return result;
}

async function addBuildMetadataCard(
    blob: Blob,
    card: CaptureBuildCard,
): Promise<Blob> {
    const image = await blobToImage(blob);
    const { width, height } = getImageIntrinsicSize(image);

    const fontSize = computeLabelFontSize(height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
        image.src = "";
        return blob;
    }

    ctx.drawImage(image, 0, 0);
    image.src = "";

    drawMetadataCard(
        ctx,
        {
            title: card.buildTitle,
            techCrystalsSpent: card.techCrystalsSpent,
            anchor: "bottom-right",
        },
        fontSize,
        width,
        height,
    );

    const result = await canvasToBlob(canvas);
    clearCanvasAndImages(ctx, canvas);
    return result ?? blob;
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
            }, EXPORT_MIME);
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
        return combineTreeImagesHorizontally(b0, b1, b2, isIOSCaptureBug() ? getIOSCaptureBg().css : undefined);
    });
}

export type CaptureAllResult = {
    combined: Blob | null;
    trees: ThreeTreeBlobs;
};

export async function captureAllTreeImages(
    textOptions?: CaptureTextOptions,
): Promise<CaptureAllResult | null> {
    const bridge = treeBridge;
    if (!bridge) return null;

    return withCaptureState(async () => {
        let trees = await captureThreeTreeBlobs(bridge);

        if (textOptions?.treeCards) {
            trees = await addMetadataCardsToTrees(trees, textOptions.treeCards);
        }

        const [b0, b1, b2] = trees;
        let combined =
            b0 && b1 && b2
                ? await combineTreeImagesHorizontally(b0, b1, b2, isIOSCaptureBug() ? getIOSCaptureBg().css : undefined)
                : null;

        if (combined && textOptions?.buildCard) {
            combined = await addBuildMetadataCard(combined, {
                buildTitle: textOptions.buildCard.buildTitle,
                techCrystalsSpent: textOptions.buildCard.techCrystalsSpent,
            });
        }

        return { combined, trees };
    });
}
