<script lang="ts">
  import { ImageIcon, LinkSimpleIcon, ShareNetworkIcon } from "phosphor-svelte";
  import Button from "../Button.svelte";
  import ContextMenu from "../ContextMenu.svelte";
  import { showToast } from "../toast";
  import {
    saveBuildAsImage,
    saveBuildToUrl,
    shareBuildUrlNative,
  } from "../buildData/share";
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

  async function handleCopyScreenshot() {
    closeShareMenu();
    const success = await saveBuildAsImage();
    if (success) {
      showToast("Share image saved", { tone: "positive" });
    } else {
      showToast("Share image feature coming soon", { tone: "positive" });
    }
  }

  async function handleShareToApp() {
    closeShareMenu();

    const result = await shareBuildUrlNative({
      title: title ?? "Backpack tech tree setup",
    });

    if (result === "failed") {
      showToast("Unable to share link", { tone: "negative" });
    }
    // For "shared" and "cancelled", rely on native dialog UX and show no toast.
  }

  async function handleCopyLink() {
    closeShareMenu();
    const success = await saveBuildToUrl();
    if (success) {
      showToast("Share link copied to clipboard");
    } else {
      showToast("Unable to copy link", { tone: "negative" });
    }
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
      on:click={handleShareToApp}
      tooltipText={"Share via installed apps"}
      icon={ShareNetworkIcon}
    >
      Share to...
    </Button>
    <Button
      on:click={handleCopyLink}
      tooltipText={"Copy shareable link with build data"}
      icon={LinkSimpleIcon}
    >
      Copy Link
    </Button>
    <Button
      on:click={handleCopyScreenshot}
      tooltipText={"Copy a snapshot of all trees"}
      icon={ImageIcon}
    >
      Copy screenshot
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
