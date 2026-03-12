import { getOSNameKey } from "../systemUtil";

// TODO: Remove `true ||` when iOS bug is fixed
export function isIOSCaptureBug(): boolean {
    return true || getOSNameKey() === "ios";
}

export type IosBg = {
    css: string;
    rgb: { r: number; g: number; b: number };
};

// Resolves --bg-modal (with --surface fallback) at runtime so the iOS background matches
// the current theme. Uses a temporary element so the browser converts any CSS value to rgb().
export function getIOSCaptureBg(): IosBg {
    const tmp = document.createElement("div");
    tmp.style.cssText =
        "position:absolute;visibility:hidden;background-color:var(--bg-modal,var(--surface))";
    document.body.appendChild(tmp);
    const computed = getComputedStyle(tmp).backgroundColor;
    document.body.removeChild(tmp);

    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
        return {
            css: computed,
            rgb: {
                r: parseInt(match[1], 10),
                g: parseInt(match[2], 10),
                b: parseInt(match[3], 10),
            },
        };
    }
    return { css: "black", rgb: { r: 0, g: 0, b: 0 } };
}

// iOS Safari renders SVG foreignObject content with a white background due to a
// long-standing WebKit rendering bug — the browser fills transparent areas with white
// during SVG rasterization regardless of snapdom's backgroundColor option.
// Workaround: inject the theme background color on root, covering both the snapdom() call
// and result.toCanvas(), then restore it. Returns the canvas and resolved bg so callers
// can apply bg-aware cropping.
// See: https://github.com/bubkoo/html-to-image/issues/361 (same bug in a similar library)
//      https://bugs.webkit.org/show_bug.cgi?id=156176 (WebKit: foreignObject taints canvas)
// Fix: https://github.com/zumerlab/snapdom/issues/172 (potential native snapdom fix)
export async function captureWithIOSBackground(
    root: HTMLElement,
    doCapture: () => Promise<{ toCanvas(): Promise<HTMLCanvasElement | null> }>,
): Promise<{ canvas: HTMLCanvasElement | null; bg: IosBg }> {
    const bg = getIOSCaptureBg();
    root.style.setProperty("background-color", bg.css, "important");
    let canvas: HTMLCanvasElement | null = null;
    try {
        const result = await doCapture();
        canvas = await result.toCanvas();
    } finally {
        root.style.removeProperty("background-color");
    }
    return { canvas, bg };
}
