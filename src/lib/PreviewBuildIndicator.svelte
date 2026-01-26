<script lang="ts">
  import { GraphIcon } from "phosphor-svelte";
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
    icon={GraphIcon}
  >
    Preview
  </Button>

  <ContextMenu
    x={menuX}
    y={menuY}
    isOpen={menuOpen}
    title="Preview Build"
    ariaLabel="Preview build options"
    onClose={closeMenu}
  >
    <PreviewContextMenuList onButtonPress={closeMenu} />
  </ContextMenu>
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
  }
</style>
