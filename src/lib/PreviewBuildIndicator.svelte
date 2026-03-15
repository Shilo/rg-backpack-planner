<script lang="ts">
    import { EyeIcon } from "phosphor-svelte";
    import { isPreviewMode } from "./previewModeStore";
    import { previewBuildName, getPreviewTitle } from "./previewBuildNameStore";
    import { previewRecommendedBuild } from "./buildData/recommended";
    import { usePlaywrightIndicator } from "./dev/usePlaywrightIndicator";
    import Button from "./Button.svelte";
    import ContextMenu from "./ContextMenu.svelte";
    import PreviewContextMenuList from "./PreviewContextMenuList.svelte";
    import { portal } from "./portal";
    import { truncateText } from "./stringUtil";
    import { t } from "svelte-whisper";

    let buttonElement: HTMLButtonElement | null = null;
    let menuOpen = false;
    let menuX = 0;
    let menuY = 0;
    let devIndicatorState: {
        title: string;
        detail: string | null;
        tooltip: string;
    } | null = null;

    function handleButtonClick() {
        if (!buttonElement || !$isPreviewMode) return;
        const rect = buttonElement.getBoundingClientRect();
        menuX = rect.left + rect.width / 2;
        menuY = rect.bottom + 8;
        menuOpen = true;
    }

    function closeMenu() {
        menuOpen = false;
    }

    $: menuTitle = $t("preview.buildTitle", {
        name: getPreviewTitle($previewBuildName),
    });
    $: showIndicator =
        $isPreviewMode || (!$isPreviewMode && !!devIndicatorState);
    $: indicatorTitle = $isPreviewMode
        ? $t("preview.title")
        : (devIndicatorState?.title ?? "");
    $: indicatorDetail = $isPreviewMode
        ? $previewRecommendedBuild
            ? `${$previewRecommendedBuild.index}. ${$previewBuildName ?? $previewRecommendedBuild.displayName}`
            : $previewBuildName
        : (devIndicatorState?.detail ?? null);
    $: indicatorTooltip = $isPreviewMode
        ? $t("contextMenu.previewBuildOptions")
        : (devIndicatorState?.tooltip ?? "");

    usePlaywrightIndicator((value) => {
        devIndicatorState = value;
    });
</script>

{#if showIndicator}
    <Button
        bind:element={buttonElement}
        on:click={handleButtonClick}
        tooltipText={indicatorTooltip}
        class="preview-indicator-button"
        icon={EyeIcon}
        arrow="down"
    >
        <span class="indicator-title">{indicatorTitle}</span>
        {#if indicatorDetail}
            <br />
            <span class="build-name">{truncateText(indicatorDetail)}</span>
        {/if}
    </Button>

    {#if $isPreviewMode}
        <div
            use:portal
            class="preview-build-indicator-menu-portal"
            class:menu-open={menuOpen}
        >
            <ContextMenu
                x={menuX}
                y={menuY}
                isOpen={menuOpen}
                title={menuTitle}
                ariaLabel={$t("contextMenu.previewBuildOptions")}
                onClose={closeMenu}
            >
                <PreviewContextMenuList />
            </ContextMenu>
        </div>
    {/if}
{/if}

<style>
    :global(.preview-indicator-button) {
        border-radius: var(--radius-lg) !important;
        font-weight: var(--weight-bold);
        font-size: var(--font-base) !important;
        letter-spacing: 0.06em;
        padding: var(--spacing-sm) var(--spacing-lg);
        pointer-events: auto;
        gap: var(--spacing-sm) !important;
    }

    .build-name {
        color: var(--text-disabled);
        font-size: var(--font-sm);
    }

    .preview-build-indicator-menu-portal {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: var(--z-index-context-menu);
    }

    .preview-build-indicator-menu-portal.menu-open {
        pointer-events: auto;
    }
</style>
