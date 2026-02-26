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
        background: color-mix(in srgb, color-mix(in srgb, var(--accent) 55%, var(--border)) 20%, transparent);
        border-bottom-left-radius: var(--radius);
        border-bottom-right-radius: var(--radius);
        padding-top: var(--spacing-md);
        margin-top: 0px !important;
        padding-bottom: var(--spacing-md) !important;
        margin-bottom: -7px;
        padding-left: var(--spacing-md);
        margin-left: -10px;
        padding-right: var(--spacing-md);
        margin-right: -10px;
    }
</style>
