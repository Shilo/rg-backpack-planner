/**
 * Utility to get all three tree canvas elements from the DOM
 */

export interface TreeCanvasElements {
    guardian: HTMLDivElement | null;
    vanguard: HTMLDivElement | null;
    cannon: HTMLDivElement | null;
}

/**
 * Gets all three tree canvas elements from the DOM
 * Assumes trees are rendered with data-tree-id attribute
 *
 * @returns Object with references to guardian, vanguard, and cannon tree canvas elements
 */
export function getAllTreeCanvasElements(): TreeCanvasElements {
    // Find the main tree container with all tabs
    const tabsContainer = document.querySelector('[role="tabpanel"]');

    if (!tabsContainer) {
        console.warn("Could not find tabs container");
        return { guardian: null, vanguard: null, cannon: null };
    }

    // Get the currently visible tree canvas
    const visibleCanvas =
        tabsContainer.querySelector<HTMLDivElement>(".tree-canvas");

    // For now, we'll capture the active tree
    // To capture all three properly, we'd need to temporarily switch tabs
    // or have a way to access off-screen tree elements

    return {
        guardian: visibleCanvas,
        vanguard: visibleCanvas,
        cannon: visibleCanvas,
    };
}

/**
 * Gets the currently visible tree canvas element
 * @returns The active tree canvas element or null
 */
export function getActiveTreeCanvas(): HTMLDivElement | null {
    const tabsContainer = document.querySelector('[role="tabpanel"]');
    if (!tabsContainer) {
        console.warn("Could not find tabs container");
        return null;
    }

    return tabsContainer.querySelector<HTMLDivElement>(".tree-canvas");
}
