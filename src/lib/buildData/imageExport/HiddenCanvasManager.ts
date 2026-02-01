/**
 * Manages isolated off-screen tree render containers for image capture.
 * Creates hidden containers positioned off-screen to enable DOM rendering
 * without affecting visible layout.
 */
export class HiddenCanvasManager {
    private container: HTMLElement | null = null;

    /**
     * Creates and appends a hidden container to the DOM.
     * Container is positioned off-screen but maintains layout dimensions
     * for ResizeObserver and other layout-dependent APIs.
     *
     * @returns The created container element
     */
    createContainer(): HTMLElement {
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.width = "1280px";
        container.style.height = "960px";
        container.style.overflow = "hidden";

        document.body.appendChild(container);
        this.container = container;

        return container;
    }

    /**
     * Removes the hidden container from the DOM to prevent memory leaks.
     * Should be called after all capture operations are complete.
     */
    cleanup(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }
}
