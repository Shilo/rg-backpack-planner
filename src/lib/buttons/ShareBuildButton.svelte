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

    export let title: string | undefined;
    export let disabled: boolean | undefined = false;
    export let tooltipSubject: string = "your";
    export let menuTitle = "Share Build";
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
            shareTitle ?? title ?? "Backpack tech tree build";
        const result = await shareBuildUrlNative({
            buildName: effectiveBuildName,
            title: effectiveTitle,
            text: shareText,
            customBuildData: buildData ?? undefined,
        });

        if (result === "failed") {
            showToast("Unable to share link", { tone: "negative" });
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
            showToast("Share link copied to clipboard");
        } else {
            showToast("Unable to copy link", { tone: "negative" });
        }
    }
</script>

<Button
    bind:element={shareButtonElement}
    on:click={handleShareBuildClick}
    tooltipText={`Share ${truncateText(tooltipSubject)} build`}
    icon={ShareIcon}
    {disabled}
>
    {title ?? "Share Build"}
</Button>

<div use:portal class="share-menu-portal" class:menu-open={shareMenuOpen}>
    <ContextMenu
        x={shareMenuX}
        y={shareMenuY}
        isOpen={shareMenuOpen}
        title={menuTitle}
        onClose={closeShareMenu}
    >
        {#if showShareToApp}
            <Button
                on:click={handleShareToApp}
                tooltipText={"Share via installed apps"}
                icon={ShareIcon}
            >
                Share to...
            </Button>
        {/if}
        {#if showCopyLink}
            <Button
                on:click={handleCopyLink}
                tooltipText={"Copy shareable link with build data"}
                icon={LinkSimpleIcon}
            >
                Copy Link
            </Button>
        {/if}
        {#if showScreenshot}
            <Button
                on:click={handleCopyScreenshot}
                tooltipText={"Copy a snapshot of all trees"}
                icon={ImageIcon}
            >
                Copy screenshot
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
