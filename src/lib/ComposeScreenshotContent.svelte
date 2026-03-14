<script lang="ts">
    import { onMount } from "svelte";
    import {
        CopySimpleIcon,
        DownloadSimpleIcon,
        ShareIcon,
        ArrowSquareOutIcon,
        ImageIcon,
        SquaresFourIcon,
        ArrowClockwiseIcon,
        TextTIcon,
        TextTSlashIcon,
        ChartBarIcon,
    } from "phosphor-svelte";
    import { GuardianIcon, VanguardIcon, CannonIcon } from "./customIcons";
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
    import { isDefaultPresetName } from "./buildData/url";
    import {
        createComposeImageFilename,
        createComposeImageFilenameSuffix,
    } from "./composeFilename";
    import { t, formatNumber, formatPercent } from "svelte-whisper";
    import { get } from "svelte/store";
    import { techCrystalsSpent } from "./techCrystalStore";
    import { treeLevelsTotal } from "./treeLevelsStore";
    import { skillBonuses, SKILL_DISPLAY_ORDER } from "./skillBonusStore";
    import { showTier, DEFAULT_SHOW_TIER } from "./showTierStore";
    import {
        showSkillName,
        DEFAULT_SHOW_SKILL_NAME,
    } from "./showSkillNameStore";
    import { textSize, DEFAULT_TEXT_SIZE_NOTCH } from "./textSizeStore";
    import {
        uppercaseText,
        DEFAULT_UPPERCASE_TEXT,
    } from "./uppercaseTextStore";
    import Button from "./Button.svelte";
    import ImageDetailsPopover from "./ImageDetailsPopover.svelte";
    import { isPreviewMode } from "./previewModeStore";
    import { previewBuildName } from "./previewBuildNameStore";

    export let isOpen = false;
    export let onClose: (() => void) | null = null;

    let isLoading = true;
    let closeRequested = false;
    let showLabels = true;
    let combinedBlob: Blob | null = null;
    let guardianBlob: Blob | null = null;
    let vanguardBlob: Blob | null = null;
    let cannonBlob: Blob | null = null;
    let statsBlob: Blob | null = null;
    let isStatsLoading = false;
    let activeTab = "all";
    let imageDetailsOpen = false;
    let imageDetailsTapX = 0;
    let imageDetailsTapY = 0;
    let imageNaturalWidth = 0;
    let imageNaturalHeight = 0;

    let tabs: TabBarItem[] = [];
    $: tabs = [
        {
            id: "all",
            label: "",
            icon: SquaresFourIcon,
            tooltip: $t("compose.tabs.all"),
        },
        {
            id: "stats",
            label: "",
            icon: ChartBarIcon,
            tooltip: $t("compose.tabs.stats"),
        },
        { id: "guardian", label: $t("trees.guardian"), icon: GuardianIcon },
        { id: "vanguard", label: $t("trees.vanguard"), icon: VanguardIcon },
        { id: "cannon", label: $t("trees.cannon"), icon: CannonIcon },
    ];

    $: currentBlob =
        activeTab === "stats"
            ? statsBlob
            : activeTab === "all"
              ? combinedBlob
              : activeTab === "guardian"
                ? guardianBlob
                : activeTab === "vanguard"
                  ? vanguardBlob
                  : cannonBlob;

    $: isCurrentTabLoading = activeTab === "stats" ? isStatsLoading : isLoading;

    $: activeBuildName = $isPreviewMode
        ? ($previewBuildName ?? $activePresetName)
        : $activePresetName;

    onMount(() => {
        if (isOpen) captureAll();
    });

    async function captureAll() {
        imageDetailsOpen = false;
        isLoading = true;
        const originalShowTier = get(showTier);
        const originalShowSkillName = get(showSkillName);
        const originalTextSizeNotch = get(textSize);
        const originalUppercaseText = get(uppercaseText);
        showTier.setWithoutPersistence(DEFAULT_SHOW_TIER);
        showSkillName.setWithoutPersistence(DEFAULT_SHOW_SKILL_NAME);
        textSize.setWithoutPersistence(DEFAULT_TEXT_SIZE_NOTCH);
        uppercaseText.setWithoutPersistence(DEFAULT_UPPERCASE_TEXT);
        try {
            const { captureAllTreeImages } = await import(
                "./buildImageExport/captureService"
            );
            const buildName = activeBuildName;
            const result = await captureAllTreeImages(
                showLabels
                    ? {
                          treeNames: [
                              $t("trees.guardian"),
                              $t("trees.vanguard"),
                              $t("trees.cannon"),
                          ],
                          buildTitle:
                              buildName && !isDefaultPresetName(buildName)
                                  ? buildName
                                  : undefined,
                      }
                    : undefined,
            );
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
            uppercaseText.setWithoutPersistence(originalUppercaseText);
            isLoading = false;
            if (closeRequested) {
                closeRequested = false;
                onClose?.();
            }
        }
    }

    function handleImageTap(x: number, y: number) {
        if (!currentBlob) return;
        imageDetailsTapX = x;
        imageDetailsTapY = y;
        imageDetailsOpen = true;
    }

    function handleImageLoad(width: number, height: number) {
        imageNaturalWidth = width;
        imageNaturalHeight = height;
    }

    function closeImageDetails() {
        imageDetailsOpen = false;
    }

    function handleTabChange(tabId: string) {
        imageDetailsOpen = false;
        activeTab = tabId;
        if (tabId === "stats" && !statsBlob && !isStatsLoading) {
            generateStatsImage();
        }
    }

    async function generateStatsImage() {
        isStatsLoading = true;
        try {
            const { generateStatsImageBlob } = await import(
                "./buildImageExport/statsImageService"
            );
            statsBlob = await generateStatsImageBlob(activeBuildName);
            if (!statsBlob) {
                showToast($t("compose.statsErrorToast"), {
                    tone: "negative",
                });
            }
        } catch (error) {
            console.error("Failed to generate stats image:", error);
            showToast($t("compose.statsErrorToast"), {
                tone: "negative",
            });
        } finally {
            isStatsLoading = false;
        }
    }

    function toggleLabels() {
        showLabels = !showLabels;
        captureAll();
    }

    function handleClose() {
        if (isLoading) {
            closeRequested = true;
            return;
        }
        onClose?.();
    }

    function getComposeFilename(tabId: string): string {
        return createComposeImageFilename(activeBuildName, tabId);
    }

    function getDownloadFilename(tabId: string): string {
        return createComposeImageFilename(
            activeBuildName,
            tabId,
            createComposeImageFilenameSuffix(),
        );
    }

    $: composeFabActions = [
        {
            id: "view",
            label: $t("compose.viewInBrowser"),
            icon: ArrowSquareOutIcon,
            onClick: handleViewInBrowser,
            disabled: isCurrentTabLoading,
        },
        {
            id: "copy",
            label: $t("common.copy"),
            icon: CopySimpleIcon,
            onClick: handleCopy,
            disabled: isCurrentTabLoading,
        },
        {
            id: "download",
            label: $t("common.download"),
            icon: DownloadSimpleIcon,
            onClick: handleDownload,
            disabled: isCurrentTabLoading,
        },
        {
            id: "share",
            label: $t("share.shareTo"),
            icon: ShareIcon,
            onClick: handleShare,
            disabled: isCurrentTabLoading,
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
        const filename = getDownloadFilename(activeTab);
        downloadImageBlob(currentBlob, filename);
        showToast($t("compose.downloadedToast"));
    }

    async function handleShare() {
        if (!currentBlob) return;
        const filename = getDownloadFilename(activeTab);
        const success = await shareImageBlobNative(currentBlob, filename);
        if (!success) {
            showToast($t("compose.shareErrorToast"), {
                tone: "negative",
            });
        }
    }

    function handleViewInBrowser() {
        if (!currentBlob) return;
        const url = URL.createObjectURL(currentBlob);
        window.open(url, "_blank");
    }
</script>

<FullscreenModal
    {isOpen}
    {tabs}
    {activeTab}
    onTabChange={handleTabChange}
    onClose={handleClose}
>
    {#if isCurrentTabLoading}
        <div class="compose-loading" role="status" aria-live="polite">
            <div class="compose-loading-icon">
                <ImageIcon size={42} weight="duotone" />
            </div>
            <p class="compose-loading-text">{$t("compose.loading")}</p>
        </div>
    {:else}
        <ImageViewer
            blob={currentBlob}
            onTap={handleImageTap}
            onImageLoad={handleImageLoad}
        />
    {/if}

    {#if activeTab !== "stats" && (currentBlob || isLoading)}
        <div class="compose-tools">
            <Button
                class="compose-tool-btn"
                type="button"
                aria-label={$t("compose.refreshTooltip")}
                tooltipText={$t("compose.refreshTooltip")}
                icon={ArrowClockwiseIcon}
                iconSize={24}
                disabled={isLoading}
                on:click={() => captureAll()}
            />
            <Button
                class="compose-tool-btn {showLabels ? 'active' : ''}"
                type="button"
                aria-label="Toggle labels"
                tooltipText="Toggle labels"
                icon={showLabels ? TextTIcon : TextTSlashIcon}
                iconSize={24}
                disabled={isLoading}
                on:click={toggleLabels}
            />
        </div>
    {/if}
    {#if currentBlob || isCurrentTabLoading}
        <div class="compose-fabs">
            <FabMenu
                actions={composeFabActions}
                ariaLabel={$t("compose.shareTooltip")}
                fabIcon={ShareIcon}
            />
        </div>
    {/if}
</FullscreenModal>

<ImageDetailsPopover
    isOpen={imageDetailsOpen}
    x={imageDetailsTapX}
    y={imageDetailsTapY}
    onClose={closeImageDetails}
    filename={getComposeFilename(activeTab)}
    naturalWidth={imageNaturalWidth}
    naturalHeight={imageNaturalHeight}
    fileSize={currentBlob?.size ?? 0}
    mimeType={currentBlob?.type ?? ""}
/>

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

    .compose-tools {
        position: absolute;
        bottom: var(--spacing-lg);
        left: calc(var(--spacing-lg) + var(--safe-left, 0px));
        z-index: 1;
        display: flex;
        flex-direction: row;
        gap: var(--spacing-lg);
    }

    :global(.compose-tool-btn) {
        width: 48px;
        height: 48px;
        padding: 0;
        border-radius: 50% !important;
        min-width: 48px;
        background: color-mix(
            in srgb,
            var(--bg-raised) 80%,
            transparent
        ) !important;
    }

    :global(.compose-tool-btn:disabled) {
        background: color-mix(
            in srgb,
            var(--bg-input) 80%,
            transparent
        ) !important;
    }

    :global(.compose-tool-btn.active) {
        background: color-mix(
            in srgb,
            var(--accent) 35%,
            var(--bg-raised)
        ) !important;
        border-color: color-mix(
            in srgb,
            var(--accent) 50%,
            var(--border-subtle)
        );
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

    :global(.fullscreen-modal .tab-bar__tab-button:first-child),
    :global(.fullscreen-modal .tab-bar__tab-button:nth-child(2)) {
        flex: 0 0 var(--side-menu-tab-height);
    }

    :global(
            .fullscreen-modal
                .tab-bar__tab-button:first-child
                .tab-bar__tab-label
        ),
    :global(
            .fullscreen-modal
                .tab-bar__tab-button:nth-child(2)
                .tab-bar__tab-label
        ) {
        display: none;
    }

    :global(.fullscreen-modal .tab-bar) {
        --tab-bar-font-size: var(--font-sm);
    }
</style>
