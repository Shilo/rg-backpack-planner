<script lang="ts">
  import {
    ImageIcon,
    LinkIcon,
    ShareNetworkIcon,
  } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { treeLevels } from "../treeLevelsStore";
  import { techCrystalsOwned } from "../techCrystalStore";
  import { showToast } from "../toast";

  export let onClose: (() => void) | null = null;

  let shareMenuOpen = false;
  let shareMenuX = 0;
  let shareMenuY = 0;
  let shareButtonElement: HTMLButtonElement | null = null;
  let contextMenuContainer: HTMLDivElement | null = null;

  function handleShareBuildClick() {
    if (!shareButtonElement) return;
    const rect = shareButtonElement.getBoundingClientRect();
    shareMenuX = rect.left + rect.width / 2;
    shareMenuY = rect.bottom + 8;
    shareMenuOpen = true;
  }

  function closeShareMenu() {
    shareMenuOpen = false;
  }

  async function handleShareImage() {
    closeShareMenu();
    // TODO: Implement screenshot functionality for all 3 trees
    // This would require html2canvas or similar library
    showToast("Share image feature coming soon", { tone: "positive" });
  }

  async function handleShareUrlLink() {
    closeShareMenu();
    try {
      // Encode build data: tree levels and tech crystals owned
      const buildData = {
        trees: $treeLevels,
        owned: $techCrystalsOwned,
      };
      const encoded = btoa(JSON.stringify(buildData));
      const shareUrl = `${window.location.origin}${window.location.pathname}?build=${encoded}`;

      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied to clipboard");
      onClose?.();
    } catch (error) {
      showToast("Unable to copy link", { tone: "negative" });
    }
  }

  function portalAction(node: HTMLDivElement) {
    if (typeof document === "undefined") return;
    
    contextMenuContainer = node;
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
      }
    };
  }
</script>

<Button
  bind:element={shareButtonElement}
  on:click={handleShareBuildClick}
  tooltipText={"Share your build"}
  icon={ShareNetworkIcon}
>
  Share Build
</Button>

<div use:portalAction class="share-menu-portal" class:menu-open={shareMenuOpen}>
  <ContextMenu
    x={shareMenuX}
    y={shareMenuY}
    isOpen={shareMenuOpen}
    title="Share Build"
    onClose={closeShareMenu}
  >
    <Button
      on:click={handleShareImage}
      tooltipText={"Screenshot all 3 trees"}
      icon={ImageIcon}
      small
    >
      Share Image
    </Button>
    <Button
      on:click={handleShareUrlLink}
      tooltipText={"Copy shareable link with build data"}
      icon={LinkIcon}
      small
    >
      Share URL Link
    </Button>
  </ContextMenu>
</div>

<style>
  .share-menu-portal {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 100;
  }

  /* Allow pointer events when menu is open so backdrop can block interactions */
  .share-menu-portal.menu-open {
    pointer-events: auto;
  }
</style>
