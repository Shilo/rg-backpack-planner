import { snapdom } from "@zumer/snapdom";

/**
 * Captures a tree element as a PNG image using SnapDOM
 * Excludes UI overlays like context menus and tooltips
 *
 * @param element The tree container element to capture
 * @returns Promise<Blob> of the captured tree as PNG, or null if capture fails
 */
export async function captureTreeAsPng(
    element: HTMLElement | null,
): Promise<Blob | null> {
    if (!element) {
        console.error("Tree element is null");
        return null;
    }

    try {
        // Capture the tree element as PNG with transparent background
        // - backgroundColor is used for any non-transparent areas
        // - exclude removes tooltips, context menus, and other overlays
        // - outerShadows false prevents expanding bounding box for shadows
        // - outerTransforms false removes external transforms for a flat capture
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
