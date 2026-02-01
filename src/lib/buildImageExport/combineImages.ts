/**
 * Combines three PNG images horizontally into a single transparent image
 * Uses Canvas API for image composition
 *
 * @param tree1Blob Guardian tree PNG blob
 * @param tree2Blob Vanguard tree PNG blob
 * @param tree3Blob Cannon tree PNG blob
 * @returns Promise<Blob> of the combined image, or null if combination fails
 */
export async function combineTreeImagesHorizontally(
    tree1Blob: Blob,
    tree2Blob: Blob,
    tree3Blob: Blob,
): Promise<Blob | null> {
    try {
        const img1 = await blobToImage(tree1Blob);
        const img2 = await blobToImage(tree2Blob);
        const img3 = await blobToImage(tree3Blob);

        // Calculate combined dimensions (side-by-side)
        const padding = 10;
        const maxHeight = Math.max(img1.height, img2.height, img3.height);
        const totalWidth = img1.width + img2.width + img3.width + padding * 2;
        const totalHeight = maxHeight + padding * 2;

        // Create canvas with transparent background
        const canvas = document.createElement("canvas");
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get 2D context from canvas");
            return null;
        }

        // Canvas is transparent by default, so we don't need to do anything special

        // Draw images side-by-side
        const yOffset = padding + (maxHeight - img1.height) / 2;
        let xOffset = padding;

        ctx.drawImage(img1, xOffset, yOffset);
        xOffset += img1.width;

        ctx.drawImage(img2, xOffset, padding + (maxHeight - img2.height) / 2);
        xOffset += img2.width;

        ctx.drawImage(img3, xOffset, padding + (maxHeight - img3.height) / 2);

        // Convert canvas to blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, "image/png");
        });
    } catch (error) {
        console.error("Failed to combine tree images:", error);
        return null;
    }
}

/**
 * Converts a Blob to an Image element
 * @param blob Image blob
 * @returns Promise<HTMLImageElement>
 */
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
