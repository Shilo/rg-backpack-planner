<script lang="ts">
    import PreviewContextMenuList from "../PreviewContextMenuList.svelte";
    import CompareBuildsMenu from "../compare/CompareBuildsMenu.svelte";
    import { isPreviewMode } from "../previewModeStore";
    import {
        previewBuildName,
        getPreviewTitle,
    } from "../previewBuildNameStore";
    import SideMenuSection from "../SideMenuSection.svelte";
    import { t } from "svelte-whisper";

    let compareMenuOpen = false;
    let compareMenuX = 0;
    let compareMenuY = 0;

    function handleCompareOpen(x: number, y: number) {
        compareMenuX = x;
        compareMenuY = y;
        compareMenuOpen = true;
    }

    function closeCompareMenu() {
        compareMenuOpen = false;
    }

    $: sectionTitle = $t("preview.buildTitle", {
        name: getPreviewTitle($previewBuildName),
    });
</script>

{#if $isPreviewMode}
    <div class="preview-section">
        <SideMenuSection title={sectionTitle}>
            <PreviewContextMenuList onCompareOpen={handleCompareOpen} />
        </SideMenuSection>
    </div>
    <CompareBuildsMenu
        x={compareMenuX}
        y={compareMenuY}
        isOpen={compareMenuOpen}
        onClose={closeCompareMenu}
    />
{/if}

<style>
    .preview-section {
        background: color-mix(
            in srgb,
            color-mix(in srgb, var(--accent) 55%, var(--border)) 20%,
            transparent
        );
        border-bottom-left-radius: var(--radius);
        border-bottom-right-radius: var(--radius);
        padding-top: calc(var(--spacing-md) + var(--safe-top, 0px));
        margin-top: calc(-1 * (var(--spacing-md) + var(--safe-top, 0px))) !important;
        padding-bottom: var(--spacing-md) !important;
        margin-bottom: -7px;
        padding-left: var(--spacing-md);
        margin-left: calc(-1 * var(--spacing-md));
        padding-right: var(--spacing-md);
        margin-right: calc(-1 * var(--spacing-md));
    }

    @media (pointer: fine) and (hover: hover) {
        .preview-section {
            --offset-padding: 4px;
            padding-left: calc(var(--spacing-md) + var(--offset-padding, 0));
            margin-left: calc(
                -1 * var(--spacing-md) - var(--offset-padding, 0)
            );
            padding-right: calc(var(--spacing-md) + var(--offset-padding, 0));
            margin-right: calc(
                -1 * var(--spacing-md) - var(--offset-padding, 0)
            );
        }
    }
</style>
