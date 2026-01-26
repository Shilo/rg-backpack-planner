<script lang="ts">
  import PreviewContextMenuList from "../PreviewContextMenuList.svelte";
  import { isPreviewMode } from "../previewModeStore";
  import SideMenuSection from "../SideMenuSection.svelte";
</script>

{#if $isPreviewMode}
  <div class="preview-section">
    <SideMenuSection title="Preview">
      <PreviewContextMenuList />
    </SideMenuSection>
  </div>
{/if}

<style>
  .preview-section {
    background: rgba(79, 111, 191, 0.2);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    padding-top: 8px;
    margin-top: 0px !important;
    padding-bottom: 7px !important;
    margin-bottom: -7px;
    padding-left: 10px;
    margin-left: -10px;
    padding-right: 10px;
    margin-right: -10px;
  }
</style>
