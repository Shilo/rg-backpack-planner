<script lang="ts">
  import { EyeIcon } from "phosphor-svelte";
  import { isPreviewMode } from "./previewModeStore";
  import Button from "./Button.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import PreviewContextMenuList from "./PreviewContextMenuList.svelte";
  import { portal } from "./portal";

  let buttonElement: HTMLButtonElement | null = null;
  let menuOpen = false;
  let menuX = 0;
  let menuY = 0;

  function handleButtonClick() {
    if (!buttonElement) return;
    const rect = buttonElement.getBoundingClientRect();
    menuX = rect.left + rect.width / 2;
    menuY = rect.bottom + 8;
    menuOpen = true;
  }

  function closeMenu() {
    menuOpen = false;
  }
</script>

{#if $isPreviewMode}
  <Button
    bind:element={buttonElement}
    on:click={handleButtonClick}
    tooltipText={"Preview build options"}
    class="preview-indicator-button"
    icon={EyeIcon}
  >
    Preview
  </Button>

  <div
    use:portal
    class="preview-build-indicator-menu-portal"
    class:menu-open={menuOpen}
  >
    <ContextMenu
      x={menuX}
      y={menuY}
      isOpen={menuOpen}
      title="Preview Build"
      ariaLabel="Preview build options"
      onClose={closeMenu}
    >
      <PreviewContextMenuList />
    </ContextMenu>
  </div>
{/if}

<style>
  :global(.preview-indicator-button) {
    border-radius: 999px !important;
    font-weight: 600;
    font-size: 0.85rem !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 12px;
    pointer-events: auto;
    gap: 4px !important;
  }

  .preview-build-indicator-menu-portal {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 21;
  }

  .preview-build-indicator-menu-portal.menu-open {
    pointer-events: auto;
  }
</style>
