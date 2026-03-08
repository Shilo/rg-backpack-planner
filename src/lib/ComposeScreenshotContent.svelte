<script lang="ts">
    import { onMount } from "svelte";
    import {
        CopySimpleIcon,
        DownloadSimpleIcon,
        ShareIcon,
        ImageIcon,
        SquaresFourIcon,
        ArrowClockwiseIcon,
    } from "phosphor-svelte";
    import FullscreenModal from "./FullscreenModal.svelte";
    import ImageViewer from "./ImageViewer.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { showToast } from "./toast";
    import {
        copyImageBlobToClipboard,
        downloadImageBlob,
        shareImageBlobNative,
    } from "./buildData/share";
    import FabMenu from "./FabMenu.svelte";
    import { activePresetName } from "./buildPresetsStore";
    import { createComposeImageFilename } from "./composeFilename";
    import { t } from "svelte-whisper";
    import { get } from "svelte/store";
    import { showTier, DEFAULT_SHOW_TIER } from "./showTierStore";
    import {
        showSkillName,
        DEFAULT_SHOW_SKILL_NAME,
    } from "./showSkillNameStore";
    import { textSize, DEFAULT_TEXT_SIZE_NOTCH } from "./textSizeStore";
    import Button from "./Button.svelte";

    export let isOpen = false;
    export let onClose: (() => void) | null = null;

    let isLoading = true;
    let closeRequested = false;
    let combinedBlob: Blob | null = null;
    let guardianBlob: Blob | null = null;
    let vanguardBlob: Blob | null = null;
    let cannonBlob: Blob | null = null;
    let activeTab = "all";

    let tabs: TabBarItem[] = [];
    $: tabs = [
        {
            id: "all",
            label: "",
            icon: SquaresFourIcon,
            tooltip: $t("compose.tabs.all"),
        },
        { id: "guardian", label: $t("trees.guardian") },
        { id: "vanguard", label: $t("trees.vanguard") },
        { id: "cannon", label: $t("trees.cannon") },
    ];

    $: currentBlob =
        activeTab === "all"
            ? combinedBlob
            : activeTab === "guardian"
              ? guardianBlob
              : activeTab === "vanguard"
                ? vanguardBlob
                : cannonBlob;

    onMount(() => {
        if (isOpen) captureAll();
    });

    async function captureAll() {
        isLoading = true;
        const originalShowTier = get(showTier);
        const originalShowSkillName = get(showSkillName);
        const originalTextSizeNotch = get(textSize);
        showTier.setWithoutPersistence(DEFAULT_SHOW_TIER);
        showSkillName.setWithoutPersistence(DEFAULT_SHOW_SKILL_NAME);
        textSize.setWithoutPersistence(DEFAULT_TEXT_SIZE_NOTCH);
        try {
            const { captureAllTreeImages } = await import(
                "./buildImageExport/captureService"
            );
            const result = await captureAllTreeImages();
            if (result) {
                combinedBlob = result.combined;
                [guardianBlob, vanguardBlob, cannonBlob] = result.trees;
            } else {
                showToast($t("compose.captureErrorToast"), {
                    tone: "negative",
                });
            }
        } catch (error) {
            console.error("Failed to capture tree images:", error);
            showToast($t("compose.captureErrorToast"), {
                tone: "negative",
            });
        } finally {
            showTier.setWithoutPersistence(originalShowTier);
            showSkillName.setWithoutPersistence(originalShowSkillName);
            textSize.setWithoutPersistence(originalTextSizeNotch);
            isLoading = false;
            if (closeRequested) {
                closeRequested = false;
                onClose?.();
            }
        }
    }

    function handleTabChange(tabId: string) {
        activeTab = tabId;
    }

    function handleClose() {
        if (isLoading) {
            closeRequested = true;
            return;
        }
        onClose?.();
    }

    function getComposeFilename(tabId: string): string {
        return createComposeImageFilename($activePresetName, tabId);
    }

    $: composeFabActions = [
        {
            id: "copy",
            label: $t("common.copy"),
            icon: CopySimpleIcon,
            onClick: handleCopy,
            disabled: isLoading,
        },
        {
            id: "download",
            label: $t("common.download"),
            icon: DownloadSimpleIcon,
            onClick: handleDownload,
            disabled: isLoading,
        },
        {
            id: "share",
            label: $t("share.shareTo"),
            icon: ShareIcon,
            onClick: handleShare,
            disabled: isLoading,
        },
    ];

    async function handleCopy() {
        if (!currentBlob) return;
        const success = await copyImageBlobToClipboard(currentBlob);
        showToast(
            success ? $t("compose.copiedToast") : $t("compose.copyErrorToast"),
            { tone: success ? "positive" : "negative" },
        );
    }

    function handleDownload() {
        if (!currentBlob) return;
        const filename = getComposeFilename(activeTab);
        downloadImageBlob(currentBlob, filename);
        showToast($t("compose.downloadedToast"));
    }

    async function handleShare() {
        if (!currentBlob) return;
        const filename = getComposeFilename(activeTab);
        const success = await shareImageBlobNative(currentBlob, filename);
        if (!success) {
            showToast($t("compose.shareErrorToast"), {
                tone: "negative",
            });
        }
    }
</script>

<FullscreenModal
    {isOpen}
    {tabs}
    {activeTab}
    onTabChange={handleTabChange}
    onClose={handleClose}
>
    {#if isLoading}
        <div class="compose-loading" role="status" aria-live="polite">
            <div class="compose-loading-icon">
                <ImageIcon size={42} weight="duotone" />
            </div>
            <p class="compose-loading-text">{$t("compose.loading")}</p>
        </div>
    {:else}
        <ImageViewer blob={currentBlob} />
    {/if}

    {#if currentBlob || isLoading}
        <Button
            class="compose-reload"
            type="button"
            aria-label={$t("compose.refreshTooltip")}
            tooltipText={$t("compose.refreshTooltip")}
            icon={ArrowClockwiseIcon}
            iconClass="compose-reload__icon"
            iconSize={24}
            disabled={isLoading}
            on:click={() => captureAll()}
        />
    {/if}
    {#if currentBlob || isLoading}
        <div class="compose-fabs">
            <FabMenu
                actions={composeFabActions}
                ariaLabel={$t("compose.shareTooltip")}
            />
        </div>
    {/if}
</FullscreenModal>

<style>
    .compose-loading {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-sm);
    }

    .compose-loading-icon {
        color: var(--text-muted);
    }

    .compose-loading-text {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.95rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }

    :global(.compose-reload) {
        position: absolute;
        bottom: var(--spacing-lg);
        left: calc(var(--spacing-lg) + var(--safe-left, 0px));
        z-index: 1;
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 999px;
        min-width: 38px;
        background: color-mix(
            in srgb,
            var(--bg-raised) 80%,
            transparent
        ) !important;
    }

    :global(.compose-reload:disabled) {
        background: color-mix(
            in srgb,
            var(--bg-input) 80%,
            transparent
        ) !important;
    }

    .compose-fabs {
        position: absolute;
        bottom: var(--spacing-lg);
        right: calc(var(--spacing-lg) + var(--safe-right, 0px));
        z-index: 1;
    }

    :global(.fullscreen-modal .tab-bar__tab-button:not(.active)) {
        background: var(--bg-modal, var(--surface));
    }

    :global(.fullscreen-modal .tab-bar__tab-button:first-child) {
        flex: 0 0 var(--side-menu-tab-height);
    }

    :global(
            .fullscreen-modal
                .tab-bar__tab-button:first-child
                .tab-bar__tab-label
        ) {
        display: none;
    }

    :global(.fullscreen-modal .tab-bar) {
        --tab-bar-font-size: var(--font-sm);
    }
</style>
