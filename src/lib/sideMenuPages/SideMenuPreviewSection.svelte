<script lang="ts">
  import PreviewContextMenuList from "../PreviewContextMenuList.svelte";
  import { isPreviewMode } from "../previewModeStore";
  import { previewBuildName, getPreviewTitle } from "../previewBuildNameStore";
  import SideMenuSection from "../SideMenuSection.svelte";

  $: sectionTitle = `${getPreviewTitle($previewBuildName)} Build`;
</script>

{#if $isPreviewMode}
  <div class="preview-section">
    <SideMenuSection title={sectionTitle}>
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
