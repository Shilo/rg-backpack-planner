/**
 * Svelte action that portals an element to the app container.
 * Useful for overlays, modals, and context menus that need to escape
 * their parent's stacking context.
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
