<script lang="ts">
    import {
        ArrowsInLineHorizontalIcon,
        ArrowsOutLineHorizontalIcon,
        ImageIcon,
        LinkSimpleIcon,
        ShareIcon,
    } from "phosphor-svelte";
    import Button from "../Button.svelte";
    import ContextMenu from "../ContextMenu.svelte";
    import { showToast } from "../toast";
    import {
        copyShareUrl,
        getRecommendedShareUrlChoices,
        saveBuildToUrl,
        shareBuildUrlNative,
        shareUrlNative,
        type RecommendedShareUrlChoice,
    } from "../buildData/share";
    import { portal } from "../portal";
    import { openComposeScreenshot } from "../ComposeScreenshot.svelte";
    import { activePresetName } from "../buildPresetsStore";
    import type { BuildData } from "../buildData/encoder";
    import { truncateText } from "../stringUtil";
    import { t } from "svelte-whisper";
    import { getKeyboardActionLabel } from "../input";
    import { isPreviewMode } from "../previewModeStore";

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
    export let description: string | undefined = undefined;
    export let onComposeScreenshot: (() => void) | null = null;

    let shareMenuOpen = false;
    let shareMenuX = 0;
    let shareMenuY = 0;
    let linkMenuOpen = false;
    let linkMenuX = 0;
    let linkMenuY = 0;
    let linkMenuAction: "share" | "copy" | null = null;
    let recommendedShareChoices: RecommendedShareUrlChoice[] | null = null;
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
        recommendedShareChoices = $isPreviewMode
            ? getRecommendedShareUrlChoices({
                  buildName: effectiveBuildName,
                  customBuildData: buildData ?? undefined,
              })
            : null;
        closeLinkMenu();
        shareMenuOpen = true;
    }

    function closeShareMenu() {
        closeLinkMenu();
        recommendedShareChoices = null;
        shareMenuOpen = false;
        // Prevent event from bubbling to side menu backdrop
        // The context menu is portaled outside, so we need to ensure clicks don't propagate
    }

    function closeLinkMenu() {
        linkMenuOpen = false;
        linkMenuAction = null;
    }

    function getAnchorRect(
        event: CustomEvent<MouseEvent> | MouseEvent,
    ): DOMRect | null {
        const mouseEvent = event instanceof CustomEvent ? event.detail : event;
        const target =
            (mouseEvent.currentTarget as HTMLElement | null) ??
            (mouseEvent.target as HTMLElement | null)?.closest("button") ??
            null;
        return target?.getBoundingClientRect() ?? null;
    }

    function tryOpenRecommendedLinkMenu(
        event: CustomEvent<MouseEvent> | MouseEvent,
        action: "share" | "copy",
    ): boolean {
        if (!$isPreviewMode || !recommendedShareChoices?.length) {
            return false;
        }

        const rect = getAnchorRect(event);
        if (!rect) {
            return false;
        }

        linkMenuX = rect.left + rect.width / 2;
        linkMenuY = rect.bottom + 8;
        linkMenuAction = action;
        linkMenuOpen = true;
        return true;
    }

    function handleComposeScreenshot() {
        closeShareMenu();
        onComposeScreenshot?.();
        openComposeScreenshot();
    }

    async function handleShareToApp(event: CustomEvent<MouseEvent>) {
        if (tryOpenRecommendedLinkMenu(event, "share")) {
            return;
        }

        closeShareMenu();
        const effectiveTitle =
            shareTitle ?? resolvedButtonTitle ?? $t("share.defaultShareTitle");
        const result = await shareBuildUrlNative({
            buildName: effectiveBuildName,
            title: effectiveTitle,
            text: shareText,
            customBuildData: buildData ?? undefined,
        });

        if (result === "copied") {
            showToast($t("share.fallbackCopiedToast"));
        } else if (result === "failed") {
            showToast($t("share.shareFailedToast"), { tone: "negative" });
        }
    }

    async function handleCopyLink(event: CustomEvent<MouseEvent>) {
        if (tryOpenRecommendedLinkMenu(event, "copy")) {
            return;
        }

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

    async function handleRecommendedLinkChoice(
        choice: RecommendedShareUrlChoice,
    ) {
        const action = linkMenuAction;
        closeShareMenu();

        if (action === "share") {
            const effectiveTitle =
                shareTitle ??
                resolvedButtonTitle ??
                $t("share.defaultShareTitle");
            const result = await shareUrlNative({
                url: choice.url,
                title: effectiveTitle,
                text: shareText,
            });

            if (result === "copied") {
                showToast($t("share.fallbackCopiedToast"));
            } else if (result === "failed") {
                showToast($t("share.shareFailedToast"), {
                    tone: "negative",
                });
            }
            return;
        }

        const success = await copyShareUrl(choice.url);
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
    tooltipText={description ? undefined : resolvedTooltip}
    {description}
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
        anchorBelow
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
                arrow={recommendedShareChoices ? "right" : undefined}
            >
                {$t("share.copyLink")}
            </Button>
        {/if}
        {#if showScreenshot}
            <Button
                on:click={handleComposeScreenshot}
                tooltipText={$t("share.copyScreenshotTooltip")}
                shortcut={getKeyboardActionLabel("screenshot", $t)}
                icon={ImageIcon}
                arrow="right"
            >
                {$t("share.copyScreenshot")}
            </Button>
        {/if}
    </ContextMenu>
</div>

{#if linkMenuOpen}
    <div use:portal class="share-menu-portal link-submenu">
        <ContextMenu
            x={linkMenuX}
            y={linkMenuY}
            isOpen={true}
            title={
                linkMenuAction === "copy"
                    ? $t("share.copyLink")
                    : $t("share.shareLinkMenuTitle")
            }
            onClose={closeLinkMenu}
            anchorBelow
        >
            {#each recommendedShareChoices ?? [] as choice (choice.id)}
                <Button
                    on:click={() => handleRecommendedLinkChoice(choice)}
                    tooltipText={choice.url}
                    description={choice.displayUrl}
                    icon={
                        choice.id === "full"
                            ? ArrowsOutLineHorizontalIcon
                            : ArrowsInLineHorizontalIcon
                    }
                >
                    {choice.id === "full"
                        ? $t("share.fullUrlChoice")
                        : $t("share.shortUrlChoice")}
                </Button>
            {/each}
        </ContextMenu>
    </div>
{/if}

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

    .share-menu-portal.link-submenu {
        pointer-events: auto;
    }
</style>
