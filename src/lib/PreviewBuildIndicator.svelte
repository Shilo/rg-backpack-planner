<script lang="ts">
  import { isPreviewMode } from "./previewModeStore";
  import Button from "./Button.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import PreviewContextMenuList from "./PreviewContextMenuList.svelte";

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
  >
    Preview
  </Button>

  <ContextMenu
    x={menuX}
    y={menuY}
    isOpen={menuOpen}
    title="Preview"
    ariaLabel="Preview build options"
    onClose={closeMenu}
  >
    <PreviewContextMenuList
      onButtonPress={closeMenu}
    />
  </ContextMenu>
{/if}

<style>
  :global(.preview-indicator-button) {
    background: rgba(79, 111, 191, 0.2) !important;
    border: 1px solid rgba(79, 111, 191, 0.5) !important;
    border-radius: 999px !important;
    padding: 6px 12px !important;
    font-size: 0.85rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
    color: #c7d6ff !important;
    white-space: nowrap !important;
  }
</style>
