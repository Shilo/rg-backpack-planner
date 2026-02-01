<script lang="ts">
    import { ImageIcon, LinkSimpleIcon, ShareIcon } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { showToast } from "../toast";
    import {
        saveBuildAsImage,
        saveBuildToUrl,
        shareBuildUrlNative,
        type ShareBuildUrlResult,
    } from "../buildData/share";
    import { portal } from "../portal";

    export let title: string | undefined;
    export let disabled: boolean | undefined = false;
    export let tooltipSubject: string = "your";
    export let menuTitle = "Share Build";
    export let shareUrl: string | null = null;
    export let shareTitle: string | undefined = undefined;
    export let shareText: string | undefined = undefined;
    export let showShareToApp = true;
    export let showCopyLink = true;
    export let showScreenshot = true;

    let shareMenuOpen = false;
    let shareMenuX = 0;
    let shareMenuY = 0;
    let shareButtonElement: HTMLButtonElement | null = null;

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
        const success = await saveBuildAsImage();
        if (success) {
            showToast("Share image saved", { tone: "positive" });
        } else {
            showToast("Share image feature coming soon", { tone: "positive" });
        }
    }

    async function shareCustomUrlNative(
        url: string,
        options?: { title?: string; text?: string },
    ): Promise<ShareBuildUrlResult> {
        if (typeof window === "undefined" || typeof navigator === "undefined") {
            return "failed";
        }

        if (typeof navigator.share === "function") {
            try {
                await navigator.share({
                    url,
                    title: options?.title,
                    text: options?.text,
                });
                return "shared";
            } catch (error: unknown) {
                const err = error as { name?: string };
                if (err?.name === "AbortError") {
                    return "cancelled";
                }
            }
        }

        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
        ) {
            try {
                await navigator.clipboard.writeText(url);
                return "copied";
            } catch (error) {
                console.error("Failed to copy share URL to clipboard:", error);
                return "failed";
            }
        }

        return "failed";
    }

    async function handleShareToApp() {
        closeShareMenu();
        const effectiveTitle =
            shareTitle ?? title ?? "Backpack tech tree build";
        const result = shareUrl
            ? await shareCustomUrlNative(shareUrl, {
                  title: effectiveTitle,
                  text: shareText,
              })
            : await shareBuildUrlNative({
                  title: effectiveTitle,
                  text: shareText,
              });

        if (result === "failed") {
            showToast("Unable to share link", { tone: "negative" });
        }
        // For "shared" and "cancelled", rely on native dialog UX and show no toast.
    }

    async function handleCopyLink() {
        closeShareMenu();
        if (shareUrl) {
            if (
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === "function"
            ) {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast("Share link copied to clipboard");
                    return;
                } catch {
                    showToast("Unable to copy link", { tone: "negative" });
                    return;
                }
            }
            showToast("Unable to copy link", { tone: "negative" });
            return;
        }

        const success = await saveBuildToUrl();
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
    tooltipText={`Share ${tooltipSubject} backpack tech tree build`}
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
