<script lang="ts">
    import PreviewContextMenuList from "../PreviewContextMenuList.svelte";
    import { isPreviewMode } from "../previewModeStore";
    import {
        previewBuildName,
        getPreviewTitle,
    } from "../previewBuildNameStore";
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
        background: color-mix(in srgb, var(--n8) 20%, transparent);
        border-bottom-left-radius: var(--radius-md);
        border-bottom-right-radius: var(--radius-md);
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
