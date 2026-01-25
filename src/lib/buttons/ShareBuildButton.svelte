<script lang="ts">
  import { ImageIcon, LinkIcon, ShareNetworkIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { showToast } from "../toast";
  import { saveBuildToUrl, saveBuildAsImage } from "../shareManager";

  export let title: string | undefined;
  export let disabled: boolean | undefined = false;
  export let tooltipSubject: string = "your";

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
    // Prevent event from bubbling to side menu backdrop
    // The context menu is portaled outside, so we need to ensure clicks don't propagate
  }

  function handleShareMenuOpen() {
    // When the share menu opens, we need to prevent the parent context menu
    // from closing. The share menu is portaled outside, so clicks on it
    // won't be contained within the parent menuEl.
    // We'll handle this by checking if the share menu is open in the parent.
  }

  async function handleShareImage() {
    closeShareMenu();
    const success = await saveBuildAsImage();
    if (success) {
      showToast("Build image saved", { tone: "positive" });
    } else {
      showToast("Share image feature coming soon", { tone: "positive" });
    }
  }

  async function handleShareUrlLink() {
    closeShareMenu();
    const success = await saveBuildToUrl();
    if (success) {
      showToast("Share link copied to clipboard");
    } else {
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
      },
    };
  }
</script>

<Button
  bind:element={shareButtonElement}
  on:click={handleShareBuildClick}
  tooltipText={`Share ${tooltipSubject} backpack tech tree setup`}
  icon={ShareNetworkIcon}
  disabled={disabled}
>
  {title ?? "Share Build"}
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
      Share Link
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
    z-index: 101;
  }

  /* Allow pointer events when menu is open so backdrop can block interactions */
  .share-menu-portal.menu-open {
    pointer-events: auto;
  }
</style>
