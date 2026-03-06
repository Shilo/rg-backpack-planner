<script lang="ts">
    import { onMount, tick } from "svelte";
    import {
        SquaresFourIcon,
        CopySimpleIcon,
        DownloadSimpleIcon,
        ShareNetworkIcon,
    } from "phosphor-svelte";
    import FullscreenModal from "./FullscreenModal.svelte";
    import ImageViewer from "./ImageViewer.svelte";
    import Spinner from "./Spinner.svelte";
    import type { TabBarItem } from "./TabBar.svelte";
    import { showToast } from "./toast";
    import {
        copyImageBlobToClipboard,
        downloadImageBlob,
        shareImageBlobNative,
    } from "./buildData/share";
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
            icon: SquaresFourIcon,
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

    function waitForAnimationFrame(): Promise<void> {
        if (
            typeof window === "undefined" ||
            typeof window.requestAnimationFrame !== "function"
        ) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });
    }

    async function waitForNextPaint(): Promise<void> {
        await tick();
        await waitForAnimationFrame();
    }

    async function captureAll() {
        isLoading = true;
        await waitForNextPaint();

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
        const filename = `build-${activeTab}.png`;
        downloadImageBlob(currentBlob, filename);
        showToast($t("compose.downloadedToast"));
    }

    async function handleShare() {
        if (!currentBlob) return;
        const filename = `build-${activeTab}.png`;
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
        <Spinner />
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
</style>
