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

            // Capture the viewport with html2canvas
            // Use foreignObjectRendering to avoid CSS color parsing issues
            const canvas = await html2canvas(viewportEl, {
                scale: 2,
                backgroundColor: null,
                logging: false,
                useCORS: true,
                foreignObjectRendering: true,
                allowTaint: true,
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
