import html2canvas from "html2canvas";
import { activeTabId } from "../../activeTabStore";
import type { Result } from "./BuildImageExporter";

/**
 * Captures individual trees at fit-all state as PNG blobs.
 * Workflow:
 * 1. Switch to target tree tab
 * 2. Wait for render completion
 * 3. Apply fit-all view state
 * 4. Capture viewport with html2canvas
 * 5. Convert to blob
 */
export class TreeImageCapturer {
    /**
     * Capture a specific tree at its fit-all state.
     *
     * @param treeId - The tree to capture ("guardian" | "vanguard" | "cannon")
     * @returns Result containing the captured image blob or error
     */
    async capture(
        treeId: "guardian" | "vanguard" | "cannon",
    ): Promise<Result<Blob>> {
        try {
            // Switch to the target tree tab
            activeTabId.set(treeId);

            // Wait for render completion
            await new Promise((resolve) => setTimeout(resolve, 400));

            // Find the active tree viewport element
            const viewportEl = document.querySelector(
                ".tree-viewport",
            ) as HTMLElement;
            if (!viewportEl) {
                return {
                    success: false,
                    error: "Tree viewport element not found",
                };
            }

            const treeCanvasEl = viewportEl.querySelector(
                ".tree-canvas",
            ) as HTMLElement | null;
            if (!treeCanvasEl) {
                return {
                    success: false,
                    error: "Tree canvas element not found",
                };
            }

            const nodeEls = Array.from(
                viewportEl.querySelectorAll(".node-wrapper"),
            ) as HTMLElement[];
            if (nodeEls.length === 0) {
                return {
                    success: false,
                    error: "No tree nodes found to calculate bounds",
                };
            }

            const originalViewportStyle = {
                width: viewportEl.style.width,
                height: viewportEl.style.height,
                overflow: viewportEl.style.overflow,
            };
            const originalCanvasStyle = {
                transform: treeCanvasEl.style.transform,
                width: treeCanvasEl.style.width,
                height: treeCanvasEl.style.height,
            };

            try {
                // Reset to base transform for accurate bounds calculation
                treeCanvasEl.style.transform = "translate(0px, 0px) scale(1)";

                await new Promise((resolve) => requestAnimationFrame(resolve));

                const canvasRect = treeCanvasEl.getBoundingClientRect();
                let minX = Number.POSITIVE_INFINITY;
                let minY = Number.POSITIVE_INFINITY;
                let maxX = Number.NEGATIVE_INFINITY;
                let maxY = Number.NEGATIVE_INFINITY;

                for (const nodeEl of nodeEls) {
                    const rect = nodeEl.getBoundingClientRect();
                    const left = rect.left - canvasRect.left;
                    const top = rect.top - canvasRect.top;
                    const right = left + rect.width;
                    const bottom = top + rect.height;

                    minX = Math.min(minX, left);
                    minY = Math.min(minY, top);
                    maxX = Math.max(maxX, right);
                    maxY = Math.max(maxY, bottom);
                }

                const width = Math.ceil(maxX - minX);
                const height = Math.ceil(maxY - minY);

                if (!Number.isFinite(width) || !Number.isFinite(height)) {
                    return {
                        success: false,
                        error: "Failed to compute tree bounds",
                    };
                }

                // Size viewport to tree bounds and align content to origin
                viewportEl.style.width = `${width}px`;
                viewportEl.style.height = `${height}px`;
                viewportEl.style.overflow = "hidden";

                treeCanvasEl.style.width = `${width}px`;
                treeCanvasEl.style.height = `${height}px`;
                treeCanvasEl.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;

                await new Promise((resolve) => requestAnimationFrame(resolve));

                // Capture the viewport with html2canvas
                // Use foreignObjectRendering to avoid CSS color parsing issues
                const canvas = await html2canvas(viewportEl, {
                    scale: 2,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    foreignObjectRendering: true,
                    allowTaint: true,
                    width,
                    height,
                });

                // Convert canvas to blob
                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob(resolve, "image/png");
                });

                if (!blob) {
                    return {
                        success: false,
                        error: "Failed to convert canvas to blob",
                    };
                }

                return { success: true, data: blob };
            } finally {
                viewportEl.style.width = originalViewportStyle.width;
                viewportEl.style.height = originalViewportStyle.height;
                viewportEl.style.overflow = originalViewportStyle.overflow;

                treeCanvasEl.style.transform = originalCanvasStyle.transform;
                treeCanvasEl.style.width = originalCanvasStyle.width;
                treeCanvasEl.style.height = originalCanvasStyle.height;
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: `Canvas rendering failed: ${message}`,
            };
        }
    }
}
