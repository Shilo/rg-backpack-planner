<script lang="ts">
  import { ImageIcon, LinkIcon, ShareNetworkIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { showToast } from "../toast";
  import { saveBuildAsImage, shareBuildUrlNative } from "../buildData/share";
  import { portal } from "../portal";

  export let title: string | undefined;
  export let disabled: boolean | undefined = false;
  export let tooltipSubject: string = "your";

  let shareMenuOpen = false;
  let shareMenuX = 0;
  let shareMenuY = 0;
  let shareButtonElement: HTMLButtonElement | null = null;

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

    const result = await shareBuildUrlNative({
      title: title ?? "Backpack tech tree setup",
    });

    if (result === "copied") {
      showToast("Share link copied to clipboard");
    } else if (result === "failed") {
      showToast("Unable to share link", { tone: "negative" });
    }
    // For "shared" and "cancelled", rely on native dialog UX and show no toast.
  }
</script>

<Button
  bind:element={shareButtonElement}
  on:click={handleShareBuildClick}
  tooltipText={`Share ${tooltipSubject} backpack tech tree setup`}
  icon={ShareNetworkIcon}
  {disabled}
>
  {title ?? "Share Build"}
</Button>

<div use:portal class="share-menu-portal" class:menu-open={shareMenuOpen}>
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
    >
      Share Image
    </Button>
    <Button
      on:click={handleShareUrlLink}
      tooltipText={"Copy shareable link with build data"}
      icon={LinkIcon}
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
