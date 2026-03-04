<script lang="ts">
    import { ImageIcon, LinkSimpleIcon, ShareIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { showToast } from "../toast";
    import {
        shareBuildAsImage,
        saveBuildToUrl,
        shareBuildUrlNative,
    } from "../buildData/share";
    import { portal } from "../portal";
    import { activePresetName } from "../buildPresetsStore";
    import type { BuildData } from "../buildData/encoder";
    import { truncateText } from "../stringUtil";
    import { t } from "svelte-whisper";

    export let title: string | undefined;
    export let disabled: boolean | undefined = false;
    export let tooltipSubject = "";
    export let menuTitle = "";
    export let buildName: string | null = null;
    export let buildData: BuildData | null = null;
    export let shareTitle: string | undefined = undefined;
    export let shareText: string | undefined = undefined;
    export let showShareToApp = true;
    export let showCopyLink = true;
    export let showScreenshot = true;

    let shareMenuOpen = false;
    let shareMenuX = 0;
    let shareMenuY = 0;
    let shareButtonElement: HTMLButtonElement | null = null;
    $: resolvedTooltipSubject =
        tooltipSubject || $t("techCrystals.subjectYour");
    $: resolvedMenuTitle = menuTitle || $t("share.buildButton");
    $: resolvedButtonTitle = title ?? $t("share.buildButton");
    $: resolvedTooltip = $t("share.shareTooltip", {
        subject: truncateText(resolvedTooltipSubject),
    });

    // Use active preset name as default if buildName not provided
    $: effectiveBuildName = buildName ?? $activePresetName;

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
        await shareBuildAsImage();
    }

    async function handleShareToApp() {
        closeShareMenu();
        const effectiveTitle =
            shareTitle ?? resolvedButtonTitle ?? $t("share.defaultShareTitle");
        const result = await shareBuildUrlNative({
            buildName: effectiveBuildName,
            title: effectiveTitle,
            text: shareText,
            customBuildData: buildData ?? undefined,
        });

        if (result === "failed") {
            showToast($t("share.unableToShareLinkToast"), { tone: "negative" });
        }
        // For "shared" and "cancelled", rely on native dialog UX and show no toast.
    }

    async function handleCopyLink() {
        closeShareMenu();
        const success = await saveBuildToUrl(
            effectiveBuildName,
            buildData ?? undefined,
        );
        if (success) {
            showToast($t("share.shareLinkCopiedToast"));
        } else {
            showToast($t("share.unableToCopyLinkToast"), { tone: "negative" });
        }
    }
</script>

<Button
    bind:element={shareButtonElement}
    on:click={handleShareBuildClick}
    tooltipText={resolvedTooltip}
    icon={ShareIcon}
    arrow="down"
    {disabled}
>
    {resolvedButtonTitle}
</Button>

<div use:portal class="share-menu-portal" class:menu-open={shareMenuOpen}>
    <ContextMenu
        x={shareMenuX}
        y={shareMenuY}
        isOpen={shareMenuOpen}
        title={resolvedMenuTitle}
        onClose={closeShareMenu}
    >
        {#if showShareToApp}
            <Button
                on:click={handleShareToApp}
                tooltipText={$t("share.shareViaAppsTooltip")}
                icon={ShareIcon}
                arrow="right"
            >
                {$t("share.shareTo")}
            </Button>
        {/if}
        {#if showCopyLink}
            <Button
                on:click={handleCopyLink}
                tooltipText={$t("share.copyLinkTooltip")}
                icon={LinkSimpleIcon}
            >
                {$t("share.copyLink")}
            </Button>
        {/if}
        {#if showScreenshot}
            <Button
                on:click={handleCopyScreenshot}
                tooltipText={$t("share.copyScreenshotTooltip")}
                icon={ImageIcon}
                arrow="right"
            >
                {$t("share.copyScreenshot")}
            </Button>
        {/if}
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
        z-index: var(--z-index-context-menu-share);
    }

    /* Allow pointer events when menu is open so backdrop can block interactions */
    .share-menu-portal.menu-open {
        pointer-events: auto;
    }
</style>
