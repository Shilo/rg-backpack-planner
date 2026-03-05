/**
 * Svelte action that portals an element to the app container.
 * Useful for overlays, modals, and context menus that need to escape
 * their parent's stacking context.
 *
 * CAVEAT — Svelte 5 production DOM tracking:
 * Svelte 5 tracks each effect's DOM range via nodes.start / nodes.end and
 * traverses siblings between them during cleanup. If a portaled element is
 * the first or last top-level node of a component, it becomes nodes.start or
 * nodes.end. Moving it to a different parent breaks the sibling chain, causing
 * cleanup to walk past the component boundary and corrupt the parent {#if}
 * block (blank content on branch switch — only in production builds).
 *
 * FIX: wrap the `use:portal` element in a container (e.g. `<div hidden>`)
 * so the wrapper stays in the DOM as nodes.start/end while the inner node
 * is safely portaled. See SideMenuStatisticsPage.svelte for an example.
 */
export function portal(node: HTMLDivElement) {
    if (typeof document === "undefined") return;

    // Append to the app container for consistency with other overlays (ModalHost, Tooltip)
    // This ensures proper stacking context and DOM hierarchy
    const appContainer = document.getElementById("app");
    if (appContainer) {
        appContainer.appendChild(node);
    } else {
        // Fallback to body if app container not found
        document.body.appendChild(node);
    }

    return {
        destroy() {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        },
    };
}
