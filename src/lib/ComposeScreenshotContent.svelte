<script lang="ts">
    import { onMount } from "svelte";
    import {
        CopySimpleIcon,
        DownloadSimpleIcon,
        ShareNetworkIcon,
        ImageIcon,
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
    import { activePresetName } from "./buildPresetsStore";
    import { createComposeImageFilename } from "./composeFilename";
    import { t } from "svelte-whisper";

    export let isOpen = false;
    export let onClose: (() => void) | null = null;

    let isLoading = true;
    let combinedBlob: Blob | null = null;
    let guardianBlob: Blob | null = null;
    let vanguardBlob: Blob | null = null;
    let cannonBlob: Blob | null = null;
    let activeTab = "all";

    let tabs: TabBarItem[] = [];
    $: tabs = [
        {
            id: "all",
            label: $t("compose.tabs.all"),
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
            isLoading = false;
        }
    }

    function handleTabChange(tabId: string) {
        activeTab = tabId;
    }

    function handleClose() {
        onClose?.();
    }

    function getComposeFilename(tabId: string): string {
        return createComposeImageFilename($activePresetName, tabId);
    }

    async function handleCopy() {
        if (!currentBlob) return;
        const success = await copyImageBlobToClipboard(currentBlob);
        showToast(
            success
                ? $t("compose.copiedToast")
                : $t("compose.copyErrorToast"),
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

    {#if !isLoading && currentBlob}
        <div class="compose-fabs">
            <button
                class="compose-fab"
                on:click={handleCopy}
                aria-label={$t("compose.copyTooltip")}
                type="button"
            >
                <CopySimpleIcon size={24} />
            </button>
            <button
                class="compose-fab"
                on:click={handleDownload}
                aria-label={$t("compose.downloadTooltip")}
                type="button"
            >
                <DownloadSimpleIcon size={24} />
            </button>
            <button
                class="compose-fab"
                on:click={handleShare}
                aria-label={$t("compose.shareTooltip")}
                type="button"
            >
                <ShareNetworkIcon size={24} />
            </button>
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

    .compose-fabs {
        position: absolute;
        bottom: var(--spacing-lg);
        right: calc(var(--spacing-lg) + var(--safe-right, 0px));
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        z-index: 1;
    }

    .compose-fab {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: var(--border-width) solid var(--border-subtle);
        background: var(--bg-panel);
        color: var(--text);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--shadow);
        transition:
            background var(--ease),
            border-color var(--ease);
        padding: 0;
    }

    .compose-fab:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        .compose-fab:hover {
            filter: var(--brightness-hover);
        }
    }

    .compose-fab:active {
        transform: scale(0.93);
        filter: var(--brightness-hover);
    }

    :global(.fullscreen-modal .tab-bar__tab-button:not(.active)) {
        background: var(--bg-modal, var(--surface));
    }
</style>
