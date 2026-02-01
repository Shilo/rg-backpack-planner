import { get } from "svelte/store";
import { techCrystalsOwned } from "../../techCrystalStore";
import type { Result } from "./BuildImageExporter";

/**
 * Combines multiple tree canvases into a single vertical stack with metadata overlay.
 * Layout: 1280px width × (3 × tree height + 60px gaps)
 * Metadata: Build name, tech crystals, timestamp
 */
export class CanvasCombiner {
    /**
     * Combine tree image blobs into a single PNG with metadata overlay.
     *
     * @param blobs - Array of tree image blobs (should be 3: guardian, vanguard, cannon)
     * @param buildName - Optional build name to display
     * @param techCrystals - Optional tech crystal count (defaults to store value)
     * @returns Result containing the combined image blob or error
     */
    async combine(
        blobs: Blob[],
        buildName?: string,
        techCrystals?: number,
    ): Promise<Result<Blob>> {
        try {
            if (blobs.length !== 3) {
                return {
                    success: false,
                    error: `Expected 3 blobs, got ${blobs.length}`,
                };
            }

            // Load all blobs as images
            const images = await Promise.all(
                blobs.map((blob) => this.blobToImage(blob)),
            );

            // Verify all images loaded
            for (let i = 0; i < images.length; i++) {
                if (!images[i]) {
                    return {
                        success: false,
                        error: `Failed to load image ${i}`,
                    };
                }
            }

            // Calculate dimensions
            const width = 1280;
            const gap = 30;
            const treeHeights = images.map((img) => img.height);
            const totalHeight =
                treeHeights.reduce((sum, h) => sum + h, 0) + gap * 2;

            // Create canvas
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = totalHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                return {
                    success: false,
                    error: "Failed to get canvas context",
                };
            }

            // Fill background
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(0, 0, width, totalHeight);

            // Draw trees with gaps
            let yOffset = 0;
            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                ctx.drawImage(img, 0, yOffset, width, img.height);
                yOffset += img.height + gap;
            }

            // Overlay metadata at top
            const crystals = techCrystals ?? get(techCrystalsOwned);
            const timestamp = new Date().toISOString();
            const metadataText = buildName
                ? `Build: ${buildName} | Tech Crystals: ${crystals} | ${timestamp}`
                : `Tech Crystals: ${crystals} | ${timestamp}`;

            ctx.fillStyle = "white";
            ctx.font = "14px sans-serif";
            ctx.fillText(metadataText, 10, 20);

            // Convert to blob
            const resultBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/png");
            });

            if (!resultBlob) {
                return {
                    success: false,
                    error: "Failed to convert combined canvas to blob",
                };
            }

            return { success: true, data: resultBlob };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: `Canvas combination failed: ${message}`,
            };
        }
    }

    /**
     * Convert a blob to an Image element.
     *
     * @param blob - The blob to convert
     * @returns Promise that resolves to an HTMLImageElement
     */
    private blobToImage(blob: Blob): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

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
}
