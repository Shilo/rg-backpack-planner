import { get } from "svelte/store";
import { activeTabId } from "../../activeTabStore";
import { TreeImageCapturer } from "./TreeImageCapturer";
import { CanvasCombiner } from "./CanvasCombiner";
import { ImageClipboardHandler } from "./ImageClipboardHandler";
import { HiddenCanvasManager } from "./HiddenCanvasManager";

/**
 * Result type for consistent error handling across the image export system.
 * Used instead of throwing exceptions for better testability and type safety.
 */
export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * High-level orchestrator for the build image export process.
 * Coordinates all components to capture trees, combine them, and share the result.
 */
export class BuildImageExporter {
    private capturer: TreeImageCapturer;
    private combiner: CanvasCombiner;
    private handler: ImageClipboardHandler;
    private canvasManager: HiddenCanvasManager;

    constructor() {
        this.capturer = new TreeImageCapturer();
        this.combiner = new CanvasCombiner();
        this.handler = new ImageClipboardHandler();
        this.canvasManager = new HiddenCanvasManager();
    }

    /**
     * Export all trees as a combined image and share via clipboard or download.
     *
     * @param buildName - Optional build name to include in metadata
     * @returns Result indicating success method ("clipboard" | "download") or error
     */
    async export(
        buildName?: string,
    ): Promise<Result<"clipboard" | "download">> {
        // Save current active tab state
        const originalTabId = get(activeTabId);

        try {
            // Capture all three trees
            const treeIds: Array<"guardian" | "vanguard" | "cannon"> = [
                "guardian",
                "vanguard",
                "cannon",
            ];
            const blobs: Blob[] = [];

            for (const treeId of treeIds) {
                const result = await this.capturer.capture(treeId);

                if (!result.success) {
                    return {
                        success: false,
                        error: `Failed to capture ${treeId} tree: ${result.error}`,
                    };
                }

                blobs.push(result.data);
            }

            // Combine all canvases
            const combineResult = await this.combiner.combine(blobs, buildName);

            if (!combineResult.success) {
                return {
                    success: false,
                    error: `Failed to combine canvases: ${combineResult.error}`,
                };
            }

            // Share the combined image
            const shareResult = await this.handler.share(combineResult.data);

            if (!shareResult.success) {
                return {
                    success: false,
                    error: `Failed to share image: ${shareResult.error}`,
                };
            }

            return { success: true, data: shareResult.data };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: `Build image export failed: ${message}`,
            };
        } finally {
            // Always cleanup and restore state
            this.canvasManager.cleanup();
            activeTabId.set(originalTabId);
        }
    }
}
